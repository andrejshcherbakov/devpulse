'use client';

import { formatDuration } from '@devpulse/lib';
import { Activity, Code2, Radio } from 'lucide-react';
import { type ReactNode } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { useLanguage } from '@/shared/i18/language-context';
import { type LiveStatus } from '@/shared/types';

interface DashboardHeroProps {
  displayName: string;
  liveStatus?: LiveStatus;
  controls: ReactNode;
}

const INACTIVE_COPY: Record<
  Exclude<LiveStatus['inactiveReason'], null>,
  { label: string; detail: string }
> = {
  'no-data': {
    label: 'No tracker signal yet',
    detail: 'Start DevPulse in VS Code to begin tracking.',
  },
  'session-closed': {
    label: 'Tracker session stopped',
    detail: 'Open DevPulse in VS Code for the exact local reason.',
  },
  'signal-stale': {
    label: 'Tracker signal is stale',
    detail: 'Check the DevPulse status in VS Code.',
  },
};

export function DashboardHero({
  displayName,
  liveStatus,
  controls,
}: DashboardHeroProps): JSX.Element {
  const { locale, t } = useLanguage();
  const firstName = displayName.trim().split(/\s+/, 1)[0] || displayName;
  const isLive = liveStatus?.isCodingNow === true;
  const inactiveCopy = liveStatus?.inactiveReason
    ? INACTIVE_COPY[liveStatus.inactiveReason]
    : {
        label: 'Checking tracker…',
        detail: 'Reading the latest activity signal.',
      };

  return (
    <section className="dashboard-hero relative isolate overflow-hidden rounded-3xl border border-white/8 px-5 py-6 sm:px-7 sm:py-7 lg:px-9 lg:py-8">
      <div className="relative z-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.22em] text-brand uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_12px_var(--color-brand-glow)]" />
            {t('Personal workspace')}
          </div>
          <h1 className="max-w-2xl text-3xl leading-[1.05] font-medium tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[3.2rem]">
            {t('Your work,')}
            <span className="text-secondary"> {t('in motion.')}</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-secondary sm:text-base">
            {locale === 'pl'
              ? `Witaj ponownie, ${firstName}. Spokojny podgląd sygnałów, które tworzą rytm Twojej pracy.`
              : `Welcome back, ${firstName}. A quieter view of the signals that shaped your development rhythm.`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[10px] tracking-[0.18em] text-subtle uppercase">
              {t('Current signal')}
            </span>
            <div className="text-right">
              <span
                className={
                  isLive
                    ? 'inline-flex items-center gap-1.5 text-xs font-medium text-brand'
                    : 'inline-flex items-center gap-1.5 text-xs font-medium text-subtle'
                }
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLive ? 'bg-brand shadow-[0_0_8px_var(--color-brand-glow)]' : 'bg-subtle'
                  }`}
                />
                {isLive ? t('Coding now') : t(inactiveCopy.label)}
              </span>
              {!isLive && (
                <p className="mt-1 max-w-56 text-[11px] text-subtle">{t(inactiveCopy.detail)}</p>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-3">
              <span className="flex items-center gap-2 text-xs text-subtle">
                <Activity className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('Project')}
              </span>
              <span className="truncate text-right text-sm font-medium text-foreground">
                {liveStatus?.currentProject ?? t('No live project')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-3">
              <span className="flex items-center gap-2 text-xs text-subtle">
                <Code2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('Language')}
              </span>
              <span className="text-sm font-medium text-foreground capitalize">
                {liveStatus?.currentLanguage ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-xs text-subtle">
                <Radio className="h-3.5 w-3.5" strokeWidth={1.5} /> {t('Session')}
              </span>
              <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                {liveStatus?.currentSessionDurationSeconds
                  ? formatDuration(liveStatus.currentSessionDurationSeconds)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[0.18em] text-subtle uppercase">
            {t('Perspective')}
          </div>
          <p className="mt-1 text-xs text-secondary">
            {t('Shape every insight with one shared filter.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">{controls}</div>
      </div>
    </section>
  );
}
