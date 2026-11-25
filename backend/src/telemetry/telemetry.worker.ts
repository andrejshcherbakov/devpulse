import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { DataSource, EntityManager, IsNull, LessThan, Repository } from 'typeorm';

import { stripUrlCredentials, typeIdGenerator } from '@devpulse/lib';

import { Project } from '../projects/entities/project.entity';
import { AnalyticsUpdatesService } from '../realtime/analytics-updates.service';
import { BULL_REDIS_CLIENT } from '../redis/redis.module';
import { User } from '../users/entities/user.entity';
import { UserRepository } from '../users/repositories/users.repository';

import { SESSION_GAP_MS } from './constants/telemetry.constants';
import { TelemetryEventItemDto } from './dto/request/ingest-telemetry-batch-request.dto';
import { TelemetryEvent } from './entities/telemetry-event.entity';
import { WorkSession, WorkSessionStatus } from './entities/work-session.entity';
import { TelemetryJobData } from './queue/telemetry.queue';
import { WorkSessionAccumulator } from './services/work-session-accumulator.service';
import { normalizeWorkspaceFilePath } from './utils/file-activity';
import { resolveIdleStartedAt } from './utils/session-time';

const QUEUE_NAME = 'telemetry-ingestion';
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UNKNOWN_PROJECT_NAME = 'Unknown';
const RAW_EVENTS_CHUNK_SIZE = 100;

interface TimedEvent {
  event: TelemetryEventItemDto;
  branch: string;
  time: Date;
}

function resolveEventTime(raw: string | undefined, nowMs: number): Date | null {
  if (!raw) {
    return new Date(nowMs);
  }

  const time = new Date(raw);
  const ms = time.getTime();

  if (Number.isNaN(ms) || ms > nowMs + MAX_FUTURE_SKEW_MS || ms < nowMs - MAX_EVENT_AGE_MS) {
    return null;
  }

  return time;
}

function resolveActivityChangedAt(event: object, eventTime: Date): Date {
  if (!('activityChangedAt' in event) || typeof event.activityChangedAt !== 'string') {
    return eventTime;
  }

  const changedAt = new Date(event.activityChangedAt);
  const changedAtMs = changedAt.getTime();
  const eventTimeMs = eventTime.getTime();

  if (
    Number.isNaN(changedAtMs) ||
    changedAtMs > eventTimeMs ||
    changedAtMs < eventTimeMs - MAX_EVENT_AGE_MS
  ) {
    return eventTime;
  }

  return changedAt;
}

function deriveProjectName(gitRemoteUrl: string): string {
  const name = gitRemoteUrl
    .split(/[/:]/)
    .pop()
    ?.replace(/\.git$/i, '');

  return name ?? UNKNOWN_PROJECT_NAME;
}

@Injectable()
export class TelemetryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryWorker.name);
  private worker!: Worker<TelemetryJobData>;

  constructor(
    @Inject(BULL_REDIS_CLIENT)
    private readonly redisConnection: Redis,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
    private readonly analyticsUpdates: AnalyticsUpdatesService,
    private readonly sessionAccumulator: WorkSessionAccumulator,
  ) {}

  public onModuleInit(): void {
    this.worker = new Worker<TelemetryJobData>(
      QUEUE_NAME,
      async (job: Job<TelemetryJobData>) => {
        await this.processTelemetryBatch(job.data);
      },
      {
        connection: this.redisConnection,
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      const jobId = job.id ?? 'unknown';
      const eventsCount = String(job.data.events.length);
      this.logger.log(`Job ${jobId} successfully processed ${eventsCount} events.`);
    });

    this.worker.on('failed', (job, err) => {
      const jobId = job?.id ?? 'unknown';
      const userId = job?.data.userId ?? 'unknown';
      this.logger.error(
        `Job ${jobId} FAILED processing telemetry for user ${userId}. Error: ${err.message}`,
        err.stack,
      );
    });

    this.worker.on('error', (err) => {
      this.logger.error(`Worker System Error: ${err.message}`, err.stack);
    });
  }

  public async onModuleDestroy(): Promise<void> {
    await this.worker.close();
  }

  private async processTelemetryBatch(data: TelemetryJobData): Promise<void> {
    const user = await this.userRepository.findById(data.userId);

    if (!user) {
      this.logger.warn(`User ${data.userId} not found, dropping batch.`);
      return;
    }

    const events = this.prepareEvents(data.events);

    if (events.length === 0) {
      return;
    }

    const projectIds = await this.dataSource.transaction(async (manager: EntityManager) => {
      const projectCache = new Map<string, Project>();
      const rawEventsBatch: Array<TelemetryEvent> = [];

      for (const item of events) {
        await this.processEvent(manager, user, item, projectCache, rawEventsBatch);
      }

      if (rawEventsBatch.length > 0) {
        await manager
          .getRepository(TelemetryEvent)
          .save(rawEventsBatch, { chunk: RAW_EVENTS_CHUNK_SIZE });
      }

      return [...new Set([...projectCache.values()].map((project) => project.id))];
    });

    await this.analyticsUpdates.publishAnalyticsUpdated(user.id, projectIds);
  }

  private prepareEvents(events: ReadonlyArray<TelemetryEventItemDto>): Array<TimedEvent> {
    const nowMs = Date.now();
    const prepared: Array<TimedEvent> = [];
    let dropped = 0;

    for (const event of events) {
      const time = resolveEventTime(event.clientTimestamp, nowMs);
      const branch = event.gitBranch;

      if (time === null || !branch) {
        dropped += 1;
        continue;
      }

      prepared.push({ event, branch, time });
    }

    if (dropped > 0) {
      this.logger.warn(
        `Dropped ${String(dropped)} events with invalid timestamp or missing git branch.`,
      );
    }

    return prepared.sort((first, second) => first.time.getTime() - second.time.getTime());
  }

  private async processEvent(
    manager: EntityManager,
    user: User,
    item: TimedEvent,
    projectCache: Map<string, Project>,
    rawEventsBatch: Array<TelemetryEvent>,
  ): Promise<void> {
    const { event, branch, time } = item;
    const sessionRepo = manager.getRepository(WorkSession);

    const project = await this.resolveProject(manager, user, event.gitRemoteUrl, projectCache);
    const active = await this.findActiveSession(sessionRepo, user, branch, project);

    if (event.type === 'session_end') {
      let appliedIdleSeconds = 0;

      if (active) {
        const idleCreditSeconds = this.sessionAccumulator.getIdleCreditSeconds(event);
        const activeUntil = this.sessionAccumulator.resolveActiveUntil(time, idleCreditSeconds);

        this.sessionAccumulator.accumulateActivity(active, activeUntil);
        this.extendSession(active, time);
        appliedIdleSeconds = this.sessionAccumulator.addIdleCredit(active, idleCreditSeconds);
        active.status = WorkSessionStatus.CLOSED;
        this.sessionAccumulator.recomputeDerived(active, user);
        await sessionRepo.save(active);
      }

      rawEventsBatch.push(
        this.buildRawEvent(manager, user, project, active, item, appliedIdleSeconds),
      );
      return;
    }

    const gapMs = active?.endedAt
      ? time.getTime() - active.endedAt.getTime()
      : Number.POSITIVE_INFINITY;
    const requestedIdleSeconds = this.sessionAccumulator.getIdleCreditSeconds(event);

    let session: WorkSession;
    let appliedIdleSeconds = 0;

    if (active !== null && gapMs <= SESSION_GAP_MS) {
      if (event.type !== 'idle_end') {
        this.sessionAccumulator.accumulateActivity(active, time);
      }

      this.sessionAccumulator.applyEvent(active, event, time);
      if (event.type === 'idle_start') {
        const idleStartedAt = resolveActivityChangedAt(event, time);
        active.endedAt = resolveIdleStartedAt(active.startedAt, idleStartedAt);
      } else {
        this.extendSession(active, time);
      }
      appliedIdleSeconds = this.sessionAccumulator.addIdleCredit(active, requestedIdleSeconds);
      this.sessionAccumulator.recomputeDerived(active, user);

      session = await sessionRepo.save(active);
    } else {
      await this.closeStaleSessions(sessionRepo, user, time);

      const created = this.createSession(sessionRepo, user, project, branch, time);
      this.sessionAccumulator.applyEvent(created, event, time);
      this.sessionAccumulator.recomputeDerived(created, user);

      session = await sessionRepo.save(created);
    }

    rawEventsBatch.push(
      this.buildRawEvent(manager, user, project, session, item, appliedIdleSeconds),
    );
  }

  private findActiveSession(
    sessionRepo: Repository<WorkSession>,
    user: User,
    branch: string,
    project: Project | null,
  ): Promise<WorkSession | null> {
    return sessionRepo.findOne({
      where: {
        userId: user.id,
        gitBranch: branch,
        projectId: project?.id ?? IsNull(),
        status: WorkSessionStatus.ACTIVE,
      },
      order: { endedAt: 'DESC' },
    });
  }

  private createSession(
    sessionRepo: Repository<WorkSession>,
    user: User,
    project: Project | null,
    branch: string,
    startedAt: Date,
  ): WorkSession {
    const session = sessionRepo.create({
      user,
      userId: user.id,
      project,
      projectId: project?.id ?? null,
      gitBranch: branch,
      startedAt,
      endedAt: startedAt,
      activeSeconds: 0,
      idleSeconds: 0,
      focusScore: 0,
      earnedMoney: 0,
      primaryLanguage: null,
      currentLanguage: null,
      languageSeconds: {},
      currentFilePath: null,
      fileSeconds: {},
      commandsRun: 0,
      failedCommands: 0,
      terminalCommands: [],
      commitsCount: 0,
      commits: [],
      workingTreeChanges: null,
      touchedSymbols: {},
      machineId: null,
      aiAssisted: false,
      aiInteractionsCount: 0,
      status: WorkSessionStatus.ACTIVE,
    });
    session.id = typeIdGenerator('workSessions');

    return session;
  }

  private async closeStaleSessions(
    sessionRepo: Repository<WorkSession>,
    user: User,
    now: Date,
  ): Promise<void> {
    const threshold = new Date(now.getTime() - SESSION_GAP_MS);

    const stale = await sessionRepo.find({
      where: {
        userId: user.id,
        status: WorkSessionStatus.ACTIVE,
        endedAt: LessThan(threshold),
      },
    });

    if (stale.length === 0) {
      return;
    }

    for (const session of stale) {
      session.status = WorkSessionStatus.CLOSED;
      this.sessionAccumulator.recomputeDerived(session, user);
    }

    await sessionRepo.save(stale);
  }

  private async resolveProject(
    manager: EntityManager,
    user: User,
    rawRemoteUrl: string | undefined,
    cache: Map<string, Project>,
  ): Promise<Project | null> {
    if (!rawRemoteUrl) {
      return null;
    }

    const gitRemoteUrl = stripUrlCredentials(rawRemoteUrl);

    if (gitRemoteUrl === '') {
      return null;
    }

    const cached = cache.get(gitRemoteUrl);

    if (cached) {
      return cached;
    }

    const projectRepo = manager.getRepository(Project);
    const existing = await projectRepo.findOneBy({ gitRemoteUrl, userId: user.id });

    let project: Project;

    if (existing) {
      project = existing;
    } else {
      const created = projectRepo.create({
        gitRemoteUrl,
        name: deriveProjectName(gitRemoteUrl),
        user,
        userId: user.id,
      });
      created.id = typeIdGenerator('projects');
      project = await projectRepo.save(created);
    }

    cache.set(gitRemoteUrl, project);

    return project;
  }

  private extendSession(session: WorkSession, time: Date): void {
    if (session.endedAt === null || time.getTime() > session.endedAt.getTime()) {
      session.endedAt = time;
    }
  }

  private buildRawEvent(
    manager: EntityManager,
    user: User,
    project: Project | null,
    session: WorkSession | null,
    item: TimedEvent,
    idleCreditSec: number,
  ): TelemetryEvent {
    const { event, branch, time } = item;
    const repo = manager.getRepository(TelemetryEvent);

    const rawFiles: Array<string> = event.workingTreeChanges
      ? event.workingTreeChanges.map((change) => change.path)
      : event.filesList && event.filesList.length > 0
        ? event.filesList
        : event.filePath
          ? [event.filePath]
          : [];
    const filesChanged = rawFiles
      .map((filePath) => normalizeWorkspaceFilePath(filePath))
      .filter((filePath): filePath is string => filePath !== null);

    const rawEvent = repo.create({
      user,
      project,
      session,
      gitBranch: branch,
      eventTimestamp: time,
      activeSeconds: 0,
      idleSeconds: idleCreditSec,
      filesChanged,
      fileExtensions: event.language ? [event.language] : [],
      machineId: event.machineId ?? null,
      vscodeSessionId: event.sessionId ?? null,
      command: event.command ?? null,
      commandCwd: event.commandCwd ?? null,
      exitCode: event.exitCode ?? null,
      taskName: event.taskName ?? null,
      taskSource: event.taskSource ?? null,
      commitHash: event.commitHash ?? null,
      commitMessage: event.commitMessage ?? null,
      insertions: event.insertions ?? null,
      deletions: event.deletions ?? null,
    });
    rawEvent.id = typeIdGenerator('telemetryEvents');

    return rawEvent;
  }
}
