'use client';

import { formatDuration } from '@devpulse/lib';
import { Clock, Code2, Layers, Zap } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { Panel } from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';

import { type DateRange, useDashboardStats } from '../hooks';

export function DashboardSummaryCards({
  range,
  projectId,
}: {
  range: DateRange;
  projectId?: string;
}): JSX.Element {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useDashboardStats(range, projectId);

  const activeTime = isLoading || !stats ? '—' : formatDuration(stats.totalActiveSeconds);
  const supportingMetrics = [
    {
      label: 'Focus Score',
      icon: Zap,
      value: isLoading || !stats ? '—' : `${Math.round(stats.averageFocusScore)}%`,
      sub: 'average',
    },
    {
      label: 'Sessions',
      icon: Layers,
      value: isLoading || !stats ? '—' : String(stats.totalSessionsCount),
      sub: 'this period',
    },
    {
      label: 'Top Language',
      icon: Code2,
      value: isLoading || !stats ? '—' : (stats.topLanguage ?? 'N/A'),
      sub: 'most active',
    },
  ];

  return (
    <Panel className="overflow-hidden p-0 lg:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_repeat(3,minmax(0,1fr))]">
        <div className="relative overflow-hidden border-b border-border p-6 lg:border-r lg:border-b-0 lg:p-7">
          <div className="pointer-events-none absolute -top-20 -left-16 h-44 w-44 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <p className="font-mono text-[10px] font-medium tracking-[0.18em] text-brand uppercase">
                {t('Active time')}
              </p>
              <Clock className="h-4 w-4 text-brand" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="mt-5 font-mono text-4xl font-medium tracking-tighter text-foreground tabular-nums sm:text-5xl">
              {activeTime}
            </div>
            <p className="mt-2 text-xs text-subtle">
              {t('Confirmed idle periods are excluded automatically')}
            </p>
          </div>
        </div>

        {supportingMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="group border-b border-border p-5 last:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-subtle">{t(metric.label)}</p>
                <Icon
                  className="h-3.5 w-3.5 text-subtle transition-colors group-hover:text-brand"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-6 font-mono text-2xl font-medium tracking-[-0.03em] text-foreground tabular-nums">
                {metric.value}
              </div>
              <p className="mt-1.5 text-xs text-subtle">{t(metric.sub)}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
