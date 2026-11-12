'use client';

import { useMemo, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { useRequireAuth } from '@/features/auth/context';
import { RecentSessionsPanel } from '@/features/sessions/components/recent-sessions-panel';
import { AiWorklogCard } from '@/features/worklog/components/ai-worklog-card';
import { Page } from '@/shared/components/layout/page';
import { toDateInput } from '@/shared/lib/date';

import {
  type AnalyticsPeriod,
  type DateRange,
  getHeatmapRange,
  periodToDateRange,
  useLiveStatus,
} from '../hooks';
import { useLiveAnalyticsUpdatedAt } from '../live-analytics-provider';
import { ActivityChartPanel } from './activity-chart-panel';
import { AiRoiPanel } from './ai-roi-panel';
import { ComparisonPanel } from './comparison-panel';
import { DashboardHero } from './dashboard-hero';
import { DashboardSummaryCards } from './dashboard-summary-cards';
import { HeatmapPanel } from './heatmap-panel';
import { HotFilesPanel } from './hot-files-panel';
import { ProjectSelector } from './project-selector';
import { StatusMonitoringPanel } from './status-monitoring-panel';
import { TerminalActivityPanel } from './terminal-activity-panel';
import { TimeSwitcher } from './time-switcher';
import { WorkspaceBreakdownPanel } from './workspace-breakdown-panel';

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}): JSX.Element {
  return (
    <div className="flex items-end gap-4 border-b border-border pb-3">
      <span className="pb-0.5 font-mono text-[10px] tracking-[0.18em] text-brand">{index}</span>
      <div>
        <h2 className="text-lg font-medium tracking-[-0.02em] text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-subtle">{description}</p>
      </div>
    </div>
  );
}

function getInitialCustomDates() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  return { startDate: toDateInput(from), endDate: toDateInput(to) };
}

interface DashboardViewProps {
  initialRange: DateRange;
  initialHeatmapRange: DateRange;
}

export function DashboardView({
  initialRange = periodToDateRange('7d'),
  initialHeatmapRange = getHeatmapRange(),
}: DashboardViewProps): JSX.Element {
  const { user } = useRequireAuth();
  const { data: liveStatus } = useLiveStatus();
  const liveUpdatedAt = useLiveAnalyticsUpdatedAt();

  const [period, setPeriod] = useState<AnalyticsPeriod>('7d');
  const [customDates, setCustomDates] = useState(getInitialCustomDates);
  const range = useMemo(() => {
    if (liveUpdatedAt === null && period === '7d') return initialRange;

    const currentDate = new Date(liveUpdatedAt ?? initialRange.endDate);
    return periodToDateRange(period, customDates, currentDate);
  }, [customDates, initialRange, liveUpdatedAt, period]);

  const [projectId, setProjectId] = useState<string | undefined>();

  return (
    <Page className="space-y-6">
      <DashboardHero
        displayName={user.displayName}
        liveStatus={liveStatus}
        controls={
          <>
            <ProjectSelector value={projectId} onChange={setProjectId} />
            <div data-tour="period-switcher">
              <TimeSwitcher
                value={period}
                onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}
                customRange={customDates}
                onCustomRangeChange={setCustomDates}
              />
            </div>
          </>
        }
      />

      <div data-tour="stats-overview">
        <DashboardSummaryCards range={range} projectId={projectId} />
      </div>

      <section className="space-y-4">
        <SectionHeading
          index="01"
          title="Momentum"
          description="The headline movement in your current period."
        />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div data-tour="activity-chart" className="xl:col-span-8 [&>div]:h-full">
            <ActivityChartPanel range={range} projectId={projectId} />
          </div>
          <div data-tour="comparison" className="xl:col-span-4 [&>div]:h-full">
            <ComparisonPanel range={range} projectId={projectId} />
          </div>
        </div>
        <div data-tour="ai-roi">
          <AiRoiPanel range={range} projectId={projectId} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          index="02"
          title="Patterns"
          description="Where consistency, tools and attention accumulate over time."
        />
        <div data-tour="heatmap">
          <HeatmapPanel range={initialHeatmapRange} projectId={projectId} />
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div data-tour="hot-files" className="xl:col-span-8 [&>div]:h-full">
            <HotFilesPanel range={range} projectId={projectId} />
          </div>
          <div data-tour="breakdown" className="xl:col-span-4 [&>div]:h-full">
            <WorkspaceBreakdownPanel range={range} projectId={projectId} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          index="03"
          title="Operations"
          description="Recent work and the systems quietly keeping it in motion."
        />
        <div data-tour="recent-sessions">
          <RecentSessionsPanel projectId={projectId} />
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div data-tour="terminal-activity" className="xl:col-span-7 [&>div]:h-full">
            <TerminalActivityPanel range={range} projectId={projectId} />
          </div>
          <div data-tour="system-status" className="xl:col-span-5 [&>div]:h-full">
            <StatusMonitoringPanel />
          </div>
        </div>
        <div data-tour="ai-worklog">
          <AiWorklogCard />
        </div>
      </section>
    </Page>
  );
}
