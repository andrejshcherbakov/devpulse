import {
  type AiRoiMetrics,
  type DashboardStats,
  type HotFilesAnalytics,
  type PipelineHealth,
} from '@devpulse/lib';
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { type QueryParams } from '@/shared/api/api-client';
import { analyticsService } from '@/shared/api/services';
import { downloadBlob } from '@/shared/lib/download';
import {
  type BranchDataPoint,
  type CommandsBreakdown,
  type LanguagesBreakdown,
  type LiveStatus,
  type TimeseriesPoint,
} from '@/shared/types';

import { type AnalyticsRangeParams } from './api';

export type AnalyticsPeriod = 'today' | '7d' | '30d' | 'custom';

export interface DateRange extends QueryParams {
  startDate: string;
  endDate: string;
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  status: () => [...analyticsKeys.all, 'status'] as const,
  pipelineHealth: () => [...analyticsKeys.all, 'pipeline-health'] as const,
  languages: (projectId?: string) => [...analyticsKeys.all, 'languages', projectId] as const,
  commands: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'commands', range.startDate, range.endDate, projectId] as const,
  hotFiles: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'hot-files', range.startDate, range.endDate, projectId] as const,
  dashboard: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'dashboard', range.startDate, range.endDate, projectId] as const,
  timeseries: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'timeseries', range.startDate, range.endDate, projectId] as const,
  branches: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'branches', range.startDate, range.endDate, projectId] as const,
  aiRoi: (range: DateRange, projectId?: string) =>
    [...analyticsKeys.all, 'ai-roi', range.startDate, range.endDate, projectId] as const,
};

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function periodToDateRange(
  period: AnalyticsPeriod,
  custom?: { startDate: string; endDate: string },
  currentDate = new Date(),
): DateRange {
  if (period === 'custom' && custom?.startDate && custom?.endDate) {
    const startDate = new Date(`${custom.startDate}T00:00:00`);
    const endDate = endOfDay(new Date(`${custom.endDate}T00:00:00`));

    return startDate <= endDate
      ? { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      : { startDate: endDate.toISOString(), endDate: startDate.toISOString() };
  }

  const now = new Date(currentDate);
  now.setSeconds(0, 0);

  const start = new Date(now);

  if (period === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (period === '30d') {
    start.setDate(start.getDate() - 30);
  } else {
    start.setDate(start.getDate() - 7);
  }

  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

export function getHeatmapRange(now = new Date()): DateRange {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 5);
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);

  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function useLiveStatus(): UseQueryResult<LiveStatus, Error> {
  return useQuery<LiveStatus>({
    queryKey: analyticsKeys.status(),
    queryFn: () => analyticsService.getLiveStatus(),
    refetchInterval: 30000,
  });
}

export function useLanguagesBreakdown(
  projectId?: string,
): UseQueryResult<LanguagesBreakdown, Error> {
  return useQuery<LanguagesBreakdown>({
    queryKey: analyticsKeys.languages(projectId),
    queryFn: () => analyticsService.getLanguages({ projectId }),
  });
}

export function useDashboardStats(
  range: DateRange,
  projectId?: string,
): UseQueryResult<DashboardStats, Error> {
  return useQuery<DashboardStats>({
    queryKey: analyticsKeys.dashboard(range, projectId),
    queryFn: () => analyticsService.getDashboard({ ...range, projectId }),
  });
}

export function useAnalyticsTimeseries(
  range: DateRange,
  projectId?: string,
): UseQueryResult<Array<TimeseriesPoint>, Error> {
  return useQuery<Array<TimeseriesPoint>>({
    queryKey: analyticsKeys.timeseries(range, projectId),
    queryFn: () => analyticsService.getTimeseries({ ...range, projectId }),
  });
}

export function useBranchesDistribution(
  range: DateRange,
  projectId?: string,
): UseQueryResult<Array<BranchDataPoint>, Error> {
  return useQuery<Array<BranchDataPoint>>({
    queryKey: analyticsKeys.branches(range, projectId),
    queryFn: () => analyticsService.getBranches({ ...range, projectId }),
  });
}

export function useCommandsBreakdown(
  range: DateRange,
  projectId?: string,
): UseQueryResult<CommandsBreakdown, Error> {
  return useQuery<CommandsBreakdown>({
    queryKey: analyticsKeys.commands(range, projectId),
    queryFn: () => analyticsService.getCommands({ ...range, projectId }),
    refetchInterval: 60_000,
  });
}

export function useHotFiles(
  range: DateRange,
  projectId?: string,
): UseQueryResult<HotFilesAnalytics, Error> {
  return useQuery<HotFilesAnalytics>({
    queryKey: analyticsKeys.hotFiles(range, projectId),
    queryFn: () => analyticsService.getHotFiles({ ...range, projectId }),
  });
}

export function useExportSessions(): UseMutationResult<Blob, Error, AnalyticsRangeParams, unknown> {
  return useMutation({
    mutationFn: (params: AnalyticsRangeParams) => analyticsService.exportSessions(params),
    onSuccess: (blob: Blob, params: AnalyticsRangeParams) => {
      const start = params.startDate?.split('T')[0] ?? 'all';
      const end = params.endDate?.split('T')[0] ?? 'now';
      downloadBlob(blob, `devpulse-sessions_${start}_${end}.csv`);
    },
  });
}

export function previousPeriod(range: DateRange): DateRange {
  const start = new Date(range.startDate).getTime();
  const end = new Date(range.endDate).getTime();
  const duration = end - start;

  const prevEnd = start - 1;
  const prevStart = prevEnd - duration;

  return {
    startDate: new Date(prevStart).toISOString(),
    endDate: new Date(prevEnd).toISOString(),
  };
}

interface DashboardComparison {
  current: DashboardStats | undefined;
  previous: DashboardStats | undefined;
  isLoading: boolean;
}

export function useDashboardComparison(range: DateRange, projectId?: string): DashboardComparison {
  const current = useDashboardStats(range, projectId);
  const prevRange = useMemo(() => previousPeriod(range), [range]);
  const previous = useDashboardStats(prevRange, projectId);

  return {
    current: current.data,
    previous: previous.data,
    isLoading: current.isLoading || previous.isLoading,
  };
}

export function useAiRoiMetrics(
  range: DateRange,
  projectId?: string,
): UseQueryResult<AiRoiMetrics, Error> {
  return useQuery<AiRoiMetrics>({
    queryKey: analyticsKeys.aiRoi(range, projectId),
    queryFn: () => analyticsService.getAiRoi({ ...range, projectId }),
  });
}

export function usePipelineHealth(): UseQueryResult<PipelineHealth, Error> {
  return useQuery<PipelineHealth>({
    queryKey: analyticsKeys.pipelineHealth(),
    queryFn: () => analyticsService.getPipelineHealth(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
