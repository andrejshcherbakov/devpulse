'use client';

import { formatMinutes } from '@devpulse/lib';
import { Activity, AlertCircle, CheckCircle2, Cpu, Database, Radio } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { Panel } from '@/shared/components/layout/panel';
import { cn } from '@/shared/lib/cn';

import { usePipelineHealth } from '../hooks';

const PROVIDER_LABELS: Record<'openrouter' | 'openai' | 'custom', string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  custom: 'Custom',
};

export function StatusMonitoringPanel(): JSX.Element | null {
  const { data: health, isLoading } = usePipelineHealth();

  if (isLoading) {
    return (
      <Panel className="p-6">
        <div className="h-32 animate-pulse rounded-lg bg-surface-hover/30" />
      </Panel>
    );
  }

  if (!health) return null;

  const services = [
    {
      name: 'VS Code Telemetry Bridge',
      status: health.telemetryBridge.status,
      metric:
        health.telemetryBridge.lastEventAt === null
          ? 'No events yet'
          : health.telemetryBridge.status === 'operational'
            ? 'Receiving signals'
            : health.telemetryBridge.minutesSinceLastEvent === null
              ? 'Last event time unavailable'
              : `Last seen ${formatMinutes(health.telemetryBridge.minutesSinceLastEvent)} ago`,
      icon: Radio,
    },
    {
      name: 'BullMQ Event Ingestion',
      status: health.bullmq.status,
      metric:
        health.bullmq.failed > 0
          ? `${String(health.bullmq.failed)} failed jobs`
          : `${String(health.bullmq.waiting)} waiting · ${String(health.bullmq.active)} active`,
      icon: Cpu,
    },
    {
      name: 'PostgreSQL & Cache',
      status: health.postgres.status,
      metric: `${String(health.postgres.latencyMs)}ms query latency`,
      icon: Database,
    },
    {
      name: 'AI Provider',
      status: health.llm.status === 'operational' ? 'operational' : 'idle',
      metric:
        health.llm.status === 'operational' && health.llm.provider
          ? `${PROVIDER_LABELS[health.llm.provider]}${health.llm.model ? ` · ${health.llm.model}` : ''}`
          : 'Not configured — open Settings',
      icon: health.llm.status === 'operational' ? CheckCircle2 : AlertCircle,
    },
  ] as const;

  const anyDegraded = services.some((s) => s.status === 'degraded');
  const allOperational = services.every((s) => s.status === 'operational');

  const overallLabel = anyDegraded
    ? 'Degraded'
    : allOperational
      ? 'All Systems Operational'
      : 'Some Services Idle';

  const overallClass = anyDegraded
    ? 'border-red-coral/30 bg-red-coral/10 text-red-coral'
    : allOperational
      ? 'border-brand/30 bg-brand-soft text-brand'
      : 'border-yellow-amber/30 bg-yellow-amber/10 text-yellow-amber';

  return (
    <Panel className="h-full p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-hover text-brand">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Pipeline Health & Ingestion</h3>
              <p className="text-xs text-subtle">
                Real-time status of telemetry collectors and worker queues
              </p>
            </div>
          </div>

          <div
            className={cn('flex items-center gap-2 rounded-full border px-3 py-1', overallClass)}
          >
            <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
            <span className="font-mono text-xs font-medium">{overallLabel}</span>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2">
          {services.map((srv) => {
            const Icon = srv.icon;
            const dotColor =
              srv.status === 'operational'
                ? 'bg-brand shadow-[0_0_8px_rgba(21,255,171,0.5)]'
                : srv.status === 'degraded'
                  ? 'bg-red-coral'
                  : 'bg-yellow-amber';
            return (
              <div
                key={srv.name}
                className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-white/2 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-subtle">{srv.name}</span>
                  <Icon className="h-3.5 w-3.5 text-subtle" />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs font-medium text-foreground">
                    {srv.metric}
                  </span>
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
