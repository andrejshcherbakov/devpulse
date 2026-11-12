import {
  Injectable,
  Logger,
  type MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { concat, filter, map, merge, type Observable, of, Subject, timer } from 'rxjs';

import { type TypeId } from '@devpulse/lib';

import { RedisService } from '../redis/services/redis.service';

const ANALYTICS_UPDATES_CHANNEL = 'devpulse:analytics-updates';
const KEEP_ALIVE_INTERVAL_MS = 25_000;
const RECONNECT_DELAY_MS = 5000;

const AFFECTED_AREAS = [
  'analytics',
  'sessions',
  'projects',
] as const;
const AFFECTED_AREA_SET: ReadonlySet<string> = new Set(AFFECTED_AREAS);

type AnalyticsAffectedArea = (typeof AFFECTED_AREAS)[number];

interface AnalyticsUpdateEnvelope {
  type: 'analytics.updated';
  userId: string;
  projectIds: Array<string>;
  affected: Array<AnalyticsAffectedArea>;
  occurredAt: string;
}

interface AnalyticsUpdatePayload {
  projectIds: Array<string>;
  affected: Array<AnalyticsAffectedArea>;
  occurredAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is Array<string> {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAffectedAreaArray(value: unknown): value is Array<AnalyticsAffectedArea> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === 'string' && AFFECTED_AREA_SET.has(item),
    )
  );
}

function parseEnvelope(raw: string): AnalyticsUpdateEnvelope | null {
  let value: unknown;

  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    value.type !== 'analytics.updated' ||
    typeof value.userId !== 'string' ||
    !isStringArray(value.projectIds) ||
    !isAffectedAreaArray(value.affected) ||
    typeof value.occurredAt !== 'string'
  ) {
    return null;
  }

  return {
    type: value.type,
    userId: value.userId,
    projectIds: value.projectIds,
    affected: value.affected,
    occurredAt: value.occurredAt,
  };
}

@Injectable()
export class AnalyticsUpdatesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsUpdatesService.name);
  private readonly updates = new Subject<AnalyticsUpdateEnvelope>();
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(redisService: RedisService) {
    this.publisher = redisService.getClient();
    this.subscriber = this.publisher.duplicate();
  }

  public async onModuleInit(): Promise<void> {
    this.subscriber.on('message', this.handleMessage);
    this.subscriber.on('error', this.handleSubscriberError);
    await this.subscriber.subscribe(ANALYTICS_UPDATES_CHANNEL);
  }

  public async onModuleDestroy(): Promise<void> {
    this.subscriber.off('message', this.handleMessage);
    this.subscriber.off('error', this.handleSubscriberError);
    this.updates.complete();
    await this.subscriber.quit();
  }

  public async publishAnalyticsUpdated(
    userId: TypeId<'users'>,
    projectIds: ReadonlyArray<TypeId<'projects'>>,
  ): Promise<void> {
    const envelope: AnalyticsUpdateEnvelope = {
      type: 'analytics.updated',
      userId,
      projectIds: [...new Set(projectIds)],
      affected: [...AFFECTED_AREAS],
      occurredAt: new Date().toISOString(),
    };

    try {
      await this.publisher.publish(ANALYTICS_UPDATES_CHANNEL, JSON.stringify(envelope));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Could not publish analytics update: ${message}`);
    }
  }

  public streamForUser(userId: TypeId<'users'>): Observable<MessageEvent> {
    const updates = this.updates.pipe(
      filter((update) => update.userId === userId),
      map((update): MessageEvent => {
        const payload: AnalyticsUpdatePayload = {
          projectIds: update.projectIds,
          affected: update.affected,
          occurredAt: update.occurredAt,
        };

        return {
          type: update.type,
          data: payload,
        };
      }),
    );

    const keepAlive = timer(KEEP_ALIVE_INTERVAL_MS, KEEP_ALIVE_INTERVAL_MS).pipe(
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: { occurredAt: new Date().toISOString() },
        }),
      ),
    );

    return concat(
      of<MessageEvent>({
        type: 'connected',
        retry: RECONNECT_DELAY_MS,
        data: { connectedAt: new Date().toISOString() },
      }),
      merge(updates, keepAlive),
    );
  }

  private readonly handleMessage = (channel: string, raw: string): void => {
    if (channel !== ANALYTICS_UPDATES_CHANNEL) return;

    const update = parseEnvelope(raw);
    if (update === null) {
      this.logger.warn('Ignored malformed analytics update event');
      return;
    }

    this.updates.next(update);
  };

  private readonly handleSubscriberError = (error: Error): void => {
    this.logger.error(`Analytics update subscriber failed: ${error.message}`, error.stack);
  };
}
