'use client';

import { type AiRoiMetrics, formatDuration } from '@devpulse/lib';
import { Bot, Clock, Gauge, Sparkles, TrendingUp } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { Panel } from '@/shared/components/layout/panel';
import { InfoPopover } from '@/shared/components/ui/info-popover';
import { useLanguage } from '@/shared/i18/language-context';

import { type DateRange, useAiRoiMetrics } from '../hooks';

type AiComparisonSample = Pick<
  AiRoiMetrics,
  'aiActiveSeconds' | 'manualActiveSeconds' | 'minimumComparisonSeconds' | 'comparisonReady'
>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasAiComparisonSample(value: unknown): value is AiComparisonSample {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'aiActiveSeconds' in value &&
    isFiniteNumber(value.aiActiveSeconds) &&
    'manualActiveSeconds' in value &&
    isFiniteNumber(value.manualActiveSeconds) &&
    'minimumComparisonSeconds' in value &&
    isFiniteNumber(value.minimumComparisonSeconds) &&
    value.minimumComparisonSeconds > 0 &&
    'comparisonReady' in value &&
    typeof value.comparisonReady === 'boolean'
  );
}

export function AiRoiPanel({
  range,
  projectId,
}: {
  range: DateRange;
  projectId?: string;
}): JSX.Element {
  const { t } = useLanguage();
  const { data: roi, isError, isLoading } = useAiRoiMetrics(range, projectId);

  if (isLoading) {
    return (
      <Panel className="p-6">
        <div className="h-28 animate-pulse rounded-lg bg-surface-hover/30" />
      </Panel>
    );
  }

  if (isError || !roi) {
    return (
      <Panel className="p-6">
        <p className="text-sm font-medium text-foreground">{t('AI-assisted activity')}</p>
        <p className="mt-1 text-xs text-subtle">
          {t('The comparison could not be loaded for the selected period.')}
        </p>
      </Panel>
    );
  }

  const hasAiActivity = roi.aiSessionsCount > 0 || roi.totalAiInteractions > 0;
  const sample = hasAiComparisonSample(roi) ? roi : null;
  const aiRemainingSeconds = sample
    ? Math.max(0, sample.minimumComparisonSeconds - sample.aiActiveSeconds)
    : 0;
  const otherRemainingSeconds = sample
    ? Math.max(0, sample.minimumComparisonSeconds - sample.manualActiveSeconds)
    : 0;
  const aiProgress = sample
    ? Math.min(100, (sample.aiActiveSeconds / sample.minimumComparisonSeconds) * 100)
    : 0;
  const otherProgress = sample
    ? Math.min(100, (sample.manualActiveSeconds / sample.minimumComparisonSeconds) * 100)
    : 0;
  const speedupPrefix = roi.speedupPercentage > 0 ? '+' : '';

  return (
    <Panel className="relative overflow-hidden bg-[radial-gradient(circle_at_12%_0%,rgba(21,255,171,0.09),transparent_36%)] p-6">
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand/30 bg-brand-soft">
            <Sparkles className="h-4.5 w-4.5 text-brand" strokeWidth={1.5} aria-hidden="true" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-1 text-sm font-medium text-foreground">
                {t('AI-assisted activity')}
                <InfoPopover
                  label={t('About AI-assisted activity')}
                  content={t(
                    'DevPulse estimates AI use from likely AI-assisted insertions and recognised AI terminal commands. One detected interaction marks the whole session as AI-assisted. Inserted code is never sent.',
                  )}
                />
              </h3>
              {hasAiActivity && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                  {sample?.comparisonReady ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {sample === null
                    ? t('Waiting for data')
                    : sample.comparisonReady
                      ? t('Comparison ready')
                      : t('Collecting data')}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-subtle">
              {hasAiActivity
                ? t('Shows how much activity included detected AI use and compares committed line changes per active hour.')
                : t('No AI-assisted activity was detected in the selected period.')}
            </p>
            <p className="text-muted mt-2 max-w-3xl text-xs leading-relaxed">
              {t('This is an experimental workflow estimate, not a score of code quality or developer performance. A comparison needs at least')}{' '}
              {sample ? formatDuration(sample.minimumComparisonSeconds) : t('one hour')}
              {t(' activity and the same amount without detected AI use.')}
            </p>
          </div>
        </div>

        {hasAiActivity ? (
          <>
            <div className="grid grid-cols-2 gap-4 border-y border-border/70 py-5 sm:grid-cols-4 lg:gap-8">
              <Metric
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label={t('AI-assisted time')}
                value={sample ? formatDuration(sample.aiActiveSeconds) : '—'}
                help={t(
                  'Total active time from sessions with at least one detected AI interaction. It does not mean AI was used for the entire session.',
                )}
                accent
              />
              <Metric
                icon={<Clock className="h-3.5 w-3.5" />}
                label={t('Other active time')}
                value={sample ? formatDuration(sample.manualActiveSeconds) : '—'}
                help={t(
                  'Active time from sessions without a detected AI interaction. AI used outside VS Code or not recognised by DevPulse may still be included.',
                )}
              />
              <Metric
                icon={<Bot className="h-3.5 w-3.5" />}
                label={t('Detected interactions')}
                value={String(roi.totalAiInteractions)}
                help={t(
                  'Estimated AI signals detected by the extension, not the exact number of prompts sent to an AI model.',
                )}
              />
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
                  <Gauge className="h-3.5 w-3.5" />
                  {t('Compared sessions')}
                  <InfoPopover
                    label={t('About compared sessions')}
                    content={t(
                      'The number of sessions with detected AI activity and sessions without it. One detected interaction marks the whole session as AI-assisted.',
                    )}
                  />
                </p>
                <p className="mt-1 font-mono text-xl font-semibold tracking-tight text-foreground">
                  {roi.aiSessionsCount}
                  <span className="text-xs font-normal text-subtle"> AI</span>
                  <span className="mx-1.5 text-subtle">·</span>
                  {roi.manualSessionsCount}
                  <span className="text-xs font-normal text-subtle"> {t('other')}</span>
                </p>
              </div>
            </div>

            {sample?.comparisonReady ? (
              <div className="grid gap-4 rounded-xl border border-border/70 bg-background/25 p-4 sm:grid-cols-3">
                <ComparisonMetric
                  label={t('Estimated throughput change')}
                  value={`${speedupPrefix}${String(roi.speedupPercentage)}%`}
                  help={t(
                    'The percentage difference between committed line changes per active hour in both groups. It does not measure code quality.',
                  )}
                  accent={roi.speedupPercentage > 0}
                />
                <ComparisonMetric
                  label={t('Estimated time saved')}
                  value={`~${String(roi.estimatedHoursSaved)}h`}
                  help={t(
                    'An approximation based on committed line-change rates. It is not a direct measurement of time saved by AI.',
                  )}
                />
                <div>
                  <p className="flex items-center gap-1 text-xs font-medium text-subtle">
                    {t('Committed changes / active hour')}
                    <InfoPopover
                      label={t('About committed changes per active hour')}
                      content={t(
                        'Added and deleted lines from observed commits divided by active hours in each group.',
                      )}
                    />
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                    {roi.aiVelocityLinesPerHour}
                    <span className="text-xs font-normal text-subtle"> AI</span>
                    <span className="mx-1.5 text-subtle">·</span>
                    {roi.manualVelocityLinesPerHour}
                    <span className="text-xs font-normal text-subtle"> {t('other')}</span>
                  </p>
                </div>
              </div>
            ) : sample ? (
              <div className="grid gap-4 rounded-xl border border-border/70 bg-background/25 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                    {t('Comparison requirements')}
                    <InfoPopover
                      label={t('About comparison requirements')}
                      content={t(
                        'A comparison needs at least one hour of active time in each group and committed line changes in the group without detected AI.',
                      )}
                    />
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    {t('DevPulse needs enough active time in both groups before comparing committed changes per hour.')}
                  </p>
                </div>
                <SampleProgress
                  label={t('AI-assisted activity')}
                  progress={aiProgress}
                  remainingSeconds={aiRemainingSeconds}
                  help={t(
                    'Total active time from sessions with at least one detected AI interaction. It does not mean AI was used for the entire session.',
                  )}
                />
                <SampleProgress
                  label={t('Activity without detected AI')}
                  progress={otherProgress}
                  remainingSeconds={otherRemainingSeconds}
                  help={t(
                    'Active time from sessions without a detected AI interaction. AI used outside VS Code or not recognised by DevPulse may still be included.',
                  )}
                />
                {aiRemainingSeconds === 0 && otherRemainingSeconds === 0 && (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-subtle sm:col-span-2">
                    {t('The active-time requirement is met. DevPulse is waiting for committed line changes in activity without detected AI before it can calculate a comparison.')}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/70 bg-background/25 p-4 text-xs text-subtle">
                {t('Activity samples are temporarily unavailable. Refresh after the analytics service has been updated.')}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-subtle">
            {t('Use a supported AI coding tool while editing to start building an AI-assisted sample.')}
          </div>
        )}
      </div>
    </Panel>
  );
}

function Metric({
  icon,
  label,
  value,
  help,
  accent = false,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  help: string;
  accent?: boolean;
}): JSX.Element {
  const { t } = useLanguage();

  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-subtle">
        {icon}
        {label}
        <InfoPopover label={`${t('More information')}: ${label}`} content={help} />
      </p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tracking-tight ${accent ? 'text-brand' : 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  );
}

function ComparisonMetric({
  label,
  value,
  help,
  accent = false,
}: {
  label: string;
  value: string;
  help: string;
  accent?: boolean;
}): JSX.Element {
  const { t } = useLanguage();

  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-medium text-subtle">
        {label}
        <InfoPopover label={`${t('More information')}: ${label}`} content={help} />
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${accent ? 'text-brand' : 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  );
}

function SampleProgress({
  label,
  progress,
  remainingSeconds,
  help,
}: {
  label: string;
  progress: number;
  remainingSeconds: number;
  help: string;
}): JSX.Element {
  const { t } = useLanguage();

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1 font-medium text-foreground">
          {label}
          <InfoPopover label={`${t('More information')}: ${label}`} content={help} />
        </span>
        <span className="text-subtle">
          {remainingSeconds > 0
            ? `${formatDuration(remainingSeconds)} ${t('remaining')}`
            : t('Time threshold met')}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${String(progress)}%` }}
        />
      </div>
    </div>
  );
}
