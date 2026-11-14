'use client';

import { formatDuration } from '@devpulse/lib';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

import { type DateRange, useDashboardComparison } from '../hooks';

interface ComparisonPanelProps {
  range: DateRange;
  projectId?: string;
}

interface MetricDelta {
  label: string;
  current: string;
  diff: number;
  format: (v: number) => string;
}

function deltaColor(diff: number): string {
  if (diff > 0) return 'text-brand';
  if (diff < 0) return 'text-red-coral';
  return 'text-subtle';
}

function DeltaIcon({ diff }: { diff: number }) {
  if (diff > 0) return <ArrowUp className="h-3 w-3" strokeWidth={1.5} />;
  if (diff < 0) return <ArrowDown className="h-3 w-3" strokeWidth={1.5} />;
  return <ArrowRight className="h-3 w-3" strokeWidth={1.5} />;
}

export function ComparisonPanel({ range, projectId }: ComparisonPanelProps): JSX.Element {
  const { t } = useLanguage();
  const { current, previous, isLoading } = useDashboardComparison(range, projectId);

  if (isLoading || !current || !previous) {
    return (
      <Panel className="h-full">
        <PanelHeader>
          <div>
            <PanelTitle>{t('Comparison')}</PanelTitle>
            <PanelDescription>{t('vs previous period of the same length')}</PanelDescription>
          </div>
        </PanelHeader>
        <PanelContent className="grid grid-cols-2 gap-2.5" aria-busy={isLoading}>
          {['active-time', 'focus-score', 'sessions', 'top-language'].map((metric) => (
            <div
              key={metric}
              className="min-h-24 animate-pulse rounded-xl border border-border bg-white/[0.02]"
            />
          ))}
        </PanelContent>
      </Panel>
    );
  }

  if (previous.totalActiveSeconds === 0 && previous.totalSessionsCount === 0) {
    return (
      <Panel className="flex h-full flex-col">
        <PanelHeader>
          <div>
            <PanelTitle>{t('Comparison')}</PanelTitle>
            <PanelDescription>{t('vs previous period of the same length')}</PanelDescription>
          </div>
        </PanelHeader>
        <PanelContent className="flex flex-1 items-center justify-center py-10 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">{t('A baseline is taking shape')}</p>
            <p className="mt-1 max-w-60 text-xs leading-5 text-subtle">
              {t('Keep tracking activity and this space will compare your next complete period.')}
            </p>
          </div>
        </PanelContent>
      </Panel>
    );
  }

  const metrics: Array<MetricDelta> = [
    {
      label: 'Active time',
      current: formatDuration(current.totalActiveSeconds),
      diff: current.totalActiveSeconds - previous.totalActiveSeconds,
      format: (v) => formatDuration(Math.abs(v)),
    },
    {
      label: 'Focus score',
      current: `${String(Math.round(current.averageFocusScore))}%`,
      diff: current.averageFocusScore - previous.averageFocusScore,
      format: (v) => `${String(Math.round(Math.abs(v)))}%`,
    },
    {
      label: 'Sessions',
      current: String(current.totalSessionsCount),
      diff: current.totalSessionsCount - previous.totalSessionsCount,
      format: (v) => String(Math.abs(v)),
    },
    {
      label: 'Top language',
      current: current.topLanguage ?? 'N/A',
      diff: current.topLanguage === previous.topLanguage ? 0 : 1,
      format: () => '',
    },
  ];

  return (
    <Panel className="h-full">
      <PanelHeader>
        <div>
          <PanelTitle>{t('Comparison')}</PanelTitle>
          <PanelDescription>{t('vs previous period of the same length')}</PanelDescription>
        </div>
      </PanelHeader>
      <PanelContent>
        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex min-h-24 flex-col justify-between rounded-xl border border-border bg-white/[0.02] p-3.5"
            >
              <span className="text-xs text-subtle">{t(m.label)}</span>
              <span className="font-mono text-lg font-semibold tracking-tight text-foreground tabular-nums">
                {m.current}
              </span>
              {m.label === 'Top language' ? (
                m.diff !== 0 && <span className="text-xs text-subtle">{t('changed')}</span>
              ) : m.diff === 0 ? (
                <span className="flex items-center gap-1 text-xs text-subtle">
                  <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                  {t('no change')}
                </span>
              ) : (
                <span
                  className={cn(
                    'flex items-center gap-1 font-mono text-xs tabular-nums',
                    deltaColor(m.diff),
                  )}
                >
                  <DeltaIcon diff={m.diff} />
                  {m.diff > 0 ? '+' : '−'}
                  {m.format(m.diff)}
                </span>
              )}
            </div>
          ))}
        </div>
      </PanelContent>
    </Panel>
  );
}
