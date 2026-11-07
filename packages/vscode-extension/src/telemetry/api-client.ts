import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import type * as vscode from 'vscode';

import type { TelemetryEventDto } from '@devpulse/lib';

import { requireApiBaseUrl } from '../configuration.js';
import { DEVPULSE_API_KEY_SECRET } from '../secret-keys.js';

import { TelemetryRequestError } from './telemetry-request-error.js';

const gzipAsync = promisify(gzip);

const COMPRESSION_THRESHOLD_BYTES = 10_240;
const BATCH_TIMEOUT_MS = 30_000;
const STATS_TIMEOUT_MS = 10_000;

export class MissingApiKeyError extends Error {
  constructor() {
    super('DevPulse API key is missing');
    this.name = 'MissingApiKeyError';
  }
}

export interface TodayStats {
  activeSeconds: number;
  focusScore: number;
  sessionsCount: number;
}

interface PostEventsPayload {
  events: Array<TelemetryEventDto>;
  batchId?: string;
}

interface TodayStatsResponse {
  totalActiveSeconds: number;
  averageFocusScore: number | null;
  sessionsCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTodayStatsResponse(value: unknown): value is TodayStatsResponse {
  return (
    isRecord(value) &&
    typeof value.totalActiveSeconds === 'number' &&
    (typeof value.averageFocusScore === 'number' || value.averageFocusScore === null) &&
    typeof value.sessionsCount === 'number'
  );
}

async function readData(response: Response): Promise<unknown> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = isRecord(body) ? body.error : undefined;
    const message =
      isRecord(error) && typeof error.message === 'string'
        ? error.message
        : `HTTP ${String(response.status)}`;

    throw new TelemetryRequestError(
      message,
      response.status,
      isRecord(error) ? error.details : undefined,
    );
  }

  return isRecord(body) ? body.data : undefined;
}

export class TelemetryApiClient {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly log?: vscode.LogOutputChannel,
  ) {}

  public async postEventsBatch(payload: PostEventsPayload, signal?: AbortSignal): Promise<void> {
    const apiKey = await this.requireApiKey();
    const url = `${requireApiBaseUrl()}/telemetry/events/batch`;

    const bodyRaw = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': apiKey,
    };

    let body: string | ArrayBuffer = bodyRaw;
    const rawSize = Buffer.byteLength(bodyRaw, 'utf8');

    if (rawSize > COMPRESSION_THRESHOLD_BYTES) {
      const before = performance.now();
      const compressed = await gzipAsync(bodyRaw);
      const after = performance.now();

      body = compressed.buffer.slice(
        compressed.byteOffset,
        compressed.byteOffset + compressed.byteLength,
      );

      headers['content-encoding'] = 'gzip';

      const ratio = ((1 - compressed.byteLength / rawSize) * 100).toFixed(1);
      this.log?.info(
        `compressed ${String(rawSize)}B → ${String(compressed.byteLength)}B ` +
          `(${ratio}% reduction, ${(after - before).toFixed(2)}ms)`,
      );
    }

    this.log?.info(`POST ${url} size=${String(rawSize)}B`);

    const response = await this.request(url, {
      method: 'POST',
      headers,
      body,
      signal: signal ?? AbortSignal.timeout(BATCH_TIMEOUT_MS),
    });

    await readData(response);
  }

  public async getTodayStats(): Promise<TodayStats> {
    const apiKey = await this.requireApiKey();
    const url = `${requireApiBaseUrl()}/telemetry/today`;

    const response = await this.request(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(STATS_TIMEOUT_MS),
    });

    const data = await readData(response);

    if (!isTodayStatsResponse(data)) {
      throw new TelemetryRequestError('Unexpected response shape', null);
    }

    return {
      activeSeconds: data.totalActiveSeconds,
      focusScore: data.averageFocusScore ?? 0,
      sessionsCount: data.sessionsCount,
    };
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error: unknown) {
      this.log?.error(`network error: ${String(error)}`);
      throw new TelemetryRequestError('Network error', null);
    }
  }

  private async requireApiKey(): Promise<string> {
    const apiKey = await this.context.secrets.get(DEVPULSE_API_KEY_SECRET);
    if (apiKey === undefined || apiKey.trim().length === 0) {
      throw new MissingApiKeyError();
    }
    return apiKey.trim();
  }
}
