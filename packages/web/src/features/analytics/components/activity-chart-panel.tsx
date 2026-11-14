'use client';

import { differenceInCalendarDays } from 'date-fns';
import { Download } from 'lucide-react';
import { useMemo } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/shared/components/layout/panel';
import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';
import { formatChartAxisLabel, toDateInput } from '@/shared/lib/date';

import { type DateRange, useAnalyticsTimeseries, useExportSessions } from '../hooks';
import { ActivityChartTooltip } from './activity-chart-tooltip';

export function ActivityChartPanel({
  range,
  projectId,
}: {
  range: DateRange;
  projectId?: string;
}): JSX.Element {
  const { data: timeseries = [], isLoading } = useAnalyticsTimeseries(range, projectId);
  const { locale, t } = useLanguage();
  const exportMutation = useExportSessions();

  const chartData = useMemo(() => {
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    const rangeDays = differenceInCalendarDays(end, start);

    const byDate = new Map(timeseries.map((p) => [p.date, p.activeSeconds]));
    const filled: Array<{ date: string; hours: number }> = [];

    const cursor = new Date(start);
    while (cursor <= end) {
      const iso = toDateInput(cursor);
      const seconds = byDate.get(iso) ?? 0;
      filled.push({
        date: formatChartAxisLabel(iso, rangeDays, locale),
        hours: Math.round((seconds / 3600) * 10) / 10,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return filled;
  }, [timeseries, range.startDate, range.endDate, locale]);

  return (
    <Panel className="h-full">
      <PanelHeader>
        <div>
          <PanelTitle>{t('Activity')}</PanelTitle>
          <PanelDescription>{t('Active coding time by day')}</PanelDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportMutation.mutate(range)}
          disabled={exportMutation.isPending}
          aria-label={t('Export activity data to CSV')}
        >
          <Download className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {exportMutation.isPending ? t('Exporting…') : t('Export')}
        </Button>
      </PanelHeader>

      <PanelContent>
        {isLoading ? (
          <div className="flex h-55 items-center justify-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading activity…')}</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-55 items-center justify-center rounded-xl border border-dashed border-border">
            <span className="text-sm text-secondary">{t('No activity recorded for this period')}</span>
          </div>
        ) : (
          <div className="h-55 w-full" role="region" aria-label={t('Activity chart')}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="var(--color-subtle)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-subtle)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  unit="h"
                />
                <Tooltip
                  content={<ActivityChartTooltip />}
                  cursor={{ fill: 'var(--color-gray-alpha-50)' }}
                />
                <Bar
                  dataKey="hours"
                  fill="var(--color-brand)"
                  fillOpacity={0.7}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  minPointSize={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelContent>
    </Panel>
  );
}
