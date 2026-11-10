import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { type PipelineHealth, TypeId } from '@devpulse/lib';

import { WorkSession } from '../../telemetry/entities/work-session.entity';
import { TelemetryQueue } from '../../telemetry/queue/telemetry.queue';
import { User } from '../../users/entities/user.entity';
import { GetAnalyticsRangeRequestDto } from '../dto/request/get-analytics-range-request.dto';
import { GetAnalyticsBranchesResponseDto } from '../dto/response/get-analytics-branches-response.dto';
import {
  CommandStatItemDto,
  GetAnalyticsCommandsResponseDto,
} from '../dto/response/get-analytics-commands-response.dto';
import { GetAnalyticsDashboardResponseDto } from '../dto/response/get-analytics-dashboard-response.dto';
import { GetAnalyticsTimeseriesResponseDto } from '../dto/response/get-analytics-timeseries-response.dto';
import {
  BranchDistributionRaw,
  DashboardStatsRaw,
  TimeseriesRaw,
  TopLanguageRaw,
} from '../interfaces/analytics-raw.interfaces';

const LATENCY_THRESHOLD_MS = 100;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(WorkSession)
    private readonly sessionRepo: Repository<WorkSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly telemetryQueue: TelemetryQueue,
  ) {}

  private applyBaseFilters(
    qb: SelectQueryBuilder<WorkSession>,
    userId: TypeId<'users'>,
    query: GetAnalyticsRangeRequestDto,
  ): SelectQueryBuilder<WorkSession> {
    qb.where('session.user_id = :userId', { userId });

    if (query.projectId) {
      qb.andWhere('session.project_id = :projectId', { projectId: query.projectId });
    }
    if (query.startDate) {
      qb.andWhere('session.started_at >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('session.started_at <= :endDate', { endDate: query.endDate });
    }

    return qb;
  }

  public async getDashboardStats(
    userId: TypeId<'users'>,
    query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsDashboardResponseDto> {
    this.logger.log(`Fetching dashboard stats for user: ${userId}`);

    const qbStats = this.applyBaseFilters(
      this.sessionRepo.createQueryBuilder('session'),
      userId,
      query,
    );

    const weightedFocusSql =
      'SUM(session.focus_score * session.active_seconds) / NULLIF(SUM(session.active_seconds), 0)';

    const stats = await qbStats
      .select('SUM(session.active_seconds)', 'totalActiveSeconds')
      .addSelect('SUM(session.earned_money)', 'totalEarnedMoney')
      .addSelect(weightedFocusSql, 'averageFocusScore')
      .addSelect('COUNT(session.id)', 'totalSessionsCount')
      .getRawOne<DashboardStatsRaw>();

    const qbLang = this.applyBaseFilters(
      this.sessionRepo.createQueryBuilder('session'),
      userId,
      query,
    ).andWhere('session.primary_language IS NOT NULL');

    const topLanguageResult = await qbLang
      .select('session.primary_language', 'language')
      .addSelect('SUM(session.active_seconds)', 'totalTime')
      .groupBy('session.primary_language')
      .orderBy('"totalTime"', 'DESC')
      .limit(1)
      .getRawOne<TopLanguageRaw>();

    return {
      totalActiveSeconds: Number(stats?.totalActiveSeconds ?? 0),
      totalEarnedMoney: Number(stats?.totalEarnedMoney ?? 0),
      averageFocusScore: Math.round(Number(stats?.averageFocusScore ?? 0)),
      totalSessionsCount: Number(stats?.totalSessionsCount ?? 0),
      topLanguage: topLanguageResult?.language ?? null,
    };
  }

  public async getTimeseries(
    user: Pick<User, 'id' | 'timezone'>,
    query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsTimeseriesResponseDto> {
    this.logger.log(`Fetching timeseries for user: ${user.id}`);

    const timezone = user.timezone;

    const qb = this.applyBaseFilters(
      this.sessionRepo.createQueryBuilder('session'),
      user.id,
      query,
    );

    const dateTruncSql = "TO_CHAR(session.started_at AT TIME ZONE :timezone, 'YYYY-MM-DD')";

    const rawData = await qb
      .select(dateTruncSql, 'date')
      .addSelect('SUM(session.active_seconds)', 'activeSeconds')
      .addSelect('SUM(session.earned_money)', 'earnedMoney')
      .setParameter('timezone', timezone)
      .groupBy(dateTruncSql)
      .orderBy('"date"', 'ASC')
      .getRawMany<TimeseriesRaw>();

    const series = rawData.map((row) => ({
      date: row.date,
      activeSeconds: Number(row.activeSeconds ?? 0),
      earnedMoney: Number(row.earnedMoney ?? 0),
    }));

    return { series };
  }

  public async getBranchesDistribution(
    userId: TypeId<'users'>,
    query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsBranchesResponseDto> {
    const qb = this.applyBaseFilters(
      this.sessionRepo.createQueryBuilder('session'),
      userId,
      query,
    ).andWhere('session.git_branch IS NOT NULL');

    const rawData = await qb
      .select('session.git_branch', 'branchName')
      .addSelect('SUM(session.active_seconds)', 'activeSeconds')
      .groupBy('session.git_branch')
      .orderBy('"activeSeconds"', 'DESC')
      .limit(10)
      .getRawMany<BranchDistributionRaw>();

    const branches = rawData.map((row) => ({
      branchName: row.branchName ?? 'unknown',
      activeSeconds: Number(row.activeSeconds ?? 0),
    }));

    return { branches };
  }

  public async getCommandsBreakdown(
    userId: TypeId<'users'>,
    query: GetAnalyticsRangeRequestDto,
  ): Promise<GetAnalyticsCommandsResponseDto> {
    this.logger.log(`Fetching commands breakdown for user: ${userId}`);

    const params: Array<unknown> = [userId];

    let whereClause = 'ws.user_id = $1';

    if (query.startDate) {
      params.push(query.startDate);
      whereClause += ` AND ws.started_at >= $${String(params.length)}`;
    }
    if (query.endDate) {
      params.push(query.endDate);
      whereClause += ` AND ws.started_at <= $${String(params.length)}`;
    }
    if (query.projectId) {
      params.push(query.projectId);
      whereClause += ` AND ws.project_id = $${String(params.length)}`;
    }

    const raw = await this.sessionRepo.query<
      Array<{
        command: string | null;
        kind: string | null;
        runs: string | null;
        failedRuns: string | null;
        avgDurationMs: string | null;
      }>
    >(
      `
        SELECT
          cmd->>'command' AS command,
          cmd->>'kind' AS kind,
          COUNT(*)::int AS runs,
          COUNT(*) FILTER (WHERE (cmd->>'exitCode') IS NOT NULL
                             AND (cmd->>'exitCode')::int <> 0)::int AS "failedRuns",
          AVG((cmd->>'durationMs')::numeric)::int AS "avgDurationMs"
        FROM work_sessions ws,
             jsonb_array_elements(ws.terminal_commands) AS cmd
        WHERE ${whereClause}
        GROUP BY cmd->>'command', cmd->>'kind'
        ORDER BY runs DESC
        LIMIT 50
      `,
      params,
    );

    const commands: Array<CommandStatItemDto> = raw
      .filter((row): row is typeof row & { command: string } => row.command !== null)
      .map((row) => {
        const runs = Number(row.runs ?? 0);
        const failedRuns = Number(row.failedRuns ?? 0);
        const successRate = runs > 0 ? ((runs - failedRuns) / runs) * 100 : 0;

        return {
          command: row.command,
          kind: row.kind ?? 'other',
          runs,
          failedRuns,
          avgDurationMs: Number(row.avgDurationMs ?? 0),
          successRate: Math.round(successRate),
        };
      });

    const totalCommands = commands.reduce((acc, c) => acc + c.runs, 0);

    return { totalCommands, commands };
  }

  public async getPipelineHealth(userId: TypeId<'users'>): Promise<PipelineHealth> {
    const [lastEvent, queueMetrics, llmInfo, latencyMs] = await Promise.all([
      this.sessionRepo.findOne({
        where: { userId },
        order: { endedAt: 'DESC' },
        select: ['startedAt', 'endedAt'],
      }),
      this.telemetryQueue.getQueueMetrics(),
      this.userRepo
        .createQueryBuilder('user')
        .select(['user.llmProvider', 'user.llmModel'])
        .addSelect('(user.openai_key IS NOT NULL)', 'hasKey')
        .where('user.id = :userId', { userId })
        .getRawOne<{
          user_llm_provider: 'openrouter' | 'openai' | 'custom' | null;
          user_llm_model: string | null;
          hasKey: boolean;
        }>(),
      this.measureDbLatency(),
    ]);

    const lastEventAt = lastEvent ? (lastEvent.endedAt ?? lastEvent.startedAt) : null;
    const minutesSinceLastEvent = lastEventAt
      ? Math.floor((Date.now() - lastEventAt.getTime()) / 60_000)
      : null;

    return {
      telemetryBridge: {
        status:
          minutesSinceLastEvent !== null && minutesSinceLastEvent < 10 ? 'operational' : 'idle',
        lastEventAt: lastEventAt?.toISOString() ?? null,
        minutesSinceLastEvent,
      },
      bullmq: {
        waiting: queueMetrics.waiting,
        active: queueMetrics.active,
        failed: queueMetrics.failed,
        status: queueMetrics.failed === 0 ? 'operational' : 'degraded',
      },
      postgres: {
        latencyMs: latencyMs ?? 0,
        status: latencyMs !== null && latencyMs < LATENCY_THRESHOLD_MS ? 'operational' : 'degraded',
      },
      llm: {
        status: llmInfo?.hasKey ? 'operational' : 'unconfigured',
        provider: llmInfo?.user_llm_provider ?? null,
        model: llmInfo?.user_llm_model ?? null,
      },
    };
  }

  private async measureDbLatency(): Promise<number | null> {
    const start = performance.now();
    try {
      await this.sessionRepo.query('SELECT 1');
      return Math.round((performance.now() - start) * 10) / 10;
    } catch (error) {
      this.logger.warn('DB latency probe failed', error);
      return null;
    }
  }
}
