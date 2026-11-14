'use client';

import { type JSX } from 'react/jsx-runtime';
import type { TooltipRenderProps } from 'react-joyride';

import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

export function TourTooltip({
  index,
  size,
  isLastStep,
  step,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps): JSX.Element {
  const isFirst = index === 0;
  const { t } = useLanguage();

  return (
    <div
      {...tooltipProps}
      className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-alpha-200 bg-background p-4 shadow-2xl"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: size }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= index ? 'bg-foreground' : 'bg-gray-alpha-200',
              )}
            />
          ))}
        </div>
        <span className="text-xs text-secondary tabular-nums">
          {index + 1} / {size}
        </span>
      </div>

      {step.title ? <h2 className="text-sm font-semibold text-foreground">{step.title}</h2> : null}
      <div className="mt-1.5 text-[13px] leading-relaxed text-secondary">{step.content}</div>

      <div className="mt-4 flex items-center justify-between">
        {isLastStep ? (
          <span />
        ) : (
          <Button type="button" variant="ghost" {...skipProps}>
            {t('Skip')}
          </Button>
        )}

        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button type="button" variant="outline" {...backProps}>
              {t('Back')}
            </Button>
          )}
          <Button type="button" {...primaryProps}>
            {isLastStep ? t('Done') : t('Next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
