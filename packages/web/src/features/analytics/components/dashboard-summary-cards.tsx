'use client';

import { formatDuration } from '@devpulse/lib';
import { Clock, Code2, Layers, Zap } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { Panel } from '@/shared/components/layout/panel';
import { InfoPopover } from '@/shared/components/ui/info-popover';
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
      help:
        'A weighted session average based on active versus idle time, with a limited penalty for failed test, build, lint and task runs. It is not a productivity score.',
    },
    {
      label: 'Sessions',
      icon: Layers,
      value: isLoading || !stats ? '—' : String(stats.totalSessionsCount),
      sub: 'this period',
      help:
        'The number of tracked work sessions that started in the selected period. A session is not the same as a task.',
    },
    {
      label: 'Top Language',
      icon: Code2,
      value: isLoading || !stats ? '—' : (stats.topLanguage ?? 'N/A'),
      sub: 'most active',
      help:
        'The primary session language with the most active time in the selected period. It does not describe the repository size or number of files.',
    },
  ];

  return (
    <Panel className="overflow-hidden p-0 lg:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
        <div className="relative overflow-hidden border-b border-border p-5 lg:border-r lg:border-b-0">
          <div className="pointer-events-none absolute -top-20 -left-16 h-40 w-40 rounded-full bg-brand/[0.07] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-4">
              <p className="flex items-center gap-1 font-mono text-[10px] font-medium tracking-[0.18em] text-brand uppercase">
                {t('Active time')}
                <InfoPopover
                  label={t('About active time')}
                  content={t(
                    'The sum of active seconds from matching sessions. Confirmed idle and paused periods are excluded, but work outside VS Code is not measured.',
                  )}
                />
              </p>
              <Clock className="h-4 w-4 text-brand" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div className="mt-4 font-mono text-3xl font-medium tracking-[-0.04em] text-foreground tabular-nums sm:text-4xl">
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
                <p className="flex items-center gap-1 text-xs font-medium text-subtle">
                  {t(metric.label)}
                  <InfoPopover
                    label={`${t('More information')}: ${t(metric.label)}`}
                    content={t(metric.help)}
                  />
                </p>
                <Icon
                  className="h-3.5 w-3.5 text-subtle transition-colors group-hover:text-brand"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-5 font-mono text-2xl font-medium tracking-[-0.03em] text-foreground tabular-nums">
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
