'use client';

import { formatDuration } from '@devpulse/lib';
import { ChartNoAxesColumnIncreasing } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/shared/components/layout/panel';
import { InfoPopover } from '@/shared/components/ui/info-popover';
import { useLanguage } from '@/shared/i18/language-context';

import { useLanguagesBreakdown } from '../hooks';

const LANGUAGE_COLORS = [
  '#15ffab',
  '#0ac5ef',
  '#6d5ce8',
  '#ffbe0c',
  '#ff3c3c',
  '#00cec9',
  '#e43a8d',
  '#fa5607',
] as const;

export function LanguagesPanel({ projectId }: { projectId?: string }): JSX.Element {
  const { data, isLoading } = useLanguagesBreakdown(projectId);
  const { t } = useLanguage();
  const languages = data?.languages ?? [];

  return (
    <Panel className="h-full">
      <PanelHeader>
        <div className="min-w-0">
          <PanelTitle className="flex items-center gap-2">
            <ChartNoAxesColumnIncreasing
              className="h-4 w-4 text-brand"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            {t('Language footprint')}
            <InfoPopover
              label={t('About language footprint')}
              content={t(
                'Shows the share of tracked active time by the language of the active VS Code document. It measures time, not repository size or lines of code, and currently uses all tracked time.',
              )}
            />
          </PanelTitle>
          <PanelDescription>{t('Share of all tracked active time by language')}</PanelDescription>
        </div>
        {data && data.totalActiveSeconds > 0 && (
          <span className="shrink-0 font-mono text-xs text-secondary tabular-nums">
            {formatDuration(data.totalActiveSeconds)}
          </span>
        )}
      </PanelHeader>

      <PanelContent>
        {isLoading && (
          <div className="flex min-h-64 items-center justify-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading…')}</span>
          </div>
        )}

        {!isLoading && languages.length === 0 && (
          <div className="flex min-h-64 items-center justify-center text-center">
            <span className="text-sm text-secondary">{t('No language activity yet')}</span>
          </div>
        )}

        {!isLoading && languages.length > 0 && (
          <div className="space-y-5">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]"
              aria-label={t('Language footprint')}
            >
              {languages.map((language, index) => (
                <div
                  key={language.language}
                  className="h-full min-w-px transition-[width] duration-500 ease-out"
                  style={{
                    width: `${String(language.percentage)}%`,
                    backgroundColor: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
                  }}
                  title={`${language.language}: ${String(language.percentage)}%`}
                />
              ))}
            </div>

            <div className="divide-y divide-border">
              {languages.map((language, index) => (
                <div
                  key={language.language}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="truncate font-medium text-foreground capitalize">
                      {language.language}
                    </span>
                  </div>
                  <span className="font-mono text-secondary tabular-nums">
                    {language.formattedTime}
                  </span>
                  <span className="w-9 text-right font-mono text-subtle tabular-nums">
                    {language.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </PanelContent>
    </Panel>
  );
}
