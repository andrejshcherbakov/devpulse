'use client';

import { formatDuration } from '@devpulse/lib';
import { Clock, FolderGit2, Layers, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { Panel } from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { type WorkSessionSummary } from '@/shared/types';

interface SessionsSummaryCardsProps {
  sessions: WorkSessionSummary[];
  isLoading: boolean;
  uniqueProjectsCount: number;
}

export function SessionsSummaryCards({
  sessions,
  isLoading,
  uniqueProjectsCount,
}: SessionsSummaryCardsProps): JSX.Element {
  const { t } = useLanguage();
  const totalSeconds = useMemo(() => {
    return sessions.reduce((acc, session) => acc + session.durationSeconds, 0);
  }, [sessions]);

  const avgFocus = useMemo(() => {
    if (!sessions.length) return 0;
    return Math.round(
      sessions.reduce((acc, session) => acc + session.focusScore, 0) / sessions.length,
    );
  }, [sessions]);

  const metrics = [
    {
      label: 'Total time',
      icon: Clock,
      value: isLoading ? '—' : formatDuration(totalSeconds),
      accent: true,
    },
    {
      label: 'Avg focus',
      icon: Zap,
      value: isLoading ? '—' : `${String(avgFocus)}%`,
      accent: false,
    },
    {
      label: 'Total sessions',
      icon: Layers,
      value: isLoading ? '—' : String(sessions.length),
      accent: false,
    },
    {
      label: 'Active projects',
      icon: FolderGit2,
      value: isLoading ? '—' : String(uniqueProjectsCount),
      accent: false,
    },
  ];

  return (
    <Panel className="overflow-hidden p-0 lg:p-0">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <div
              key={metric.label}
              className={cn(
                'min-h-28 p-4 sm:p-5',
                index < 2 && 'border-b border-white/[0.06] sm:border-b-0',
                index % 2 === 0 && 'border-r border-white/[0.06]',
                index === 1 && 'sm:border-r',
                index === 2 && 'sm:border-r',
              )}
            >
              <span className="flex items-center gap-1.5 text-xs text-subtle">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                {t(metric.label)}
              </span>
              <span
                className={cn(
                  'mt-3 block font-mono text-xl font-semibold tracking-tight tabular-nums',
                  metric.accent ? 'text-brand' : 'text-foreground',
                )}
              >
                {metric.value}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
