'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Check, Copy, X } from 'lucide-react';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

import type { useWorklogRun } from '../hooks';
import { buildReportText } from '../lib/build-report';
import { WorklogDayEntry } from './worklog-day-entry';

const COPIED_RESET_MS = 2000;

interface WorklogDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ReturnType<typeof useWorklogRun>['plan'];
  days: ReturnType<typeof useWorklogRun>['days'];
  phase: ReturnType<typeof useWorklogRun>['phase'];
  onRegenerateDay: (date: string) => void;
  onCancel: () => void;
}

export function WorklogDrawer({
  open,
  onOpenChange,
  plan,
  days,
  phase,
  onRegenerateDay,
  onCancel,
}: WorklogDrawerProps): JSX.Element {
  const [copied, setCopied] = useState(false);
  const { locale, t } = useLanguage();

  const isBusy = phase === 'planning' || phase === 'running';
  const doneCount = days.filter((item) => item.status === 'done').length;

  const handleCopy = () => {
    if (!plan) return;
    navigator.clipboard
      .writeText(buildReportText(plan, days))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), COPIED_RESET_MS);
      })
      .catch(() => {});
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            'data-[state=open]:animation-duration-[200ms]',
            'data-[state=closed]:animation-duration-[150ms]',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed top-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface shadow-lg',
            'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
            'data-[state=open]:animation-duration-[240ms]',
            'data-[state=closed]:animation-duration-[180ms]',
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {t('AI Worklog')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 truncate text-xs text-subtle">
                {plan ? `${plan.startDate} → ${plan.endDate}` : t('Report')}
                {days.length > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-foreground">{String(doneCount)}</span>
                    {locale === 'pl' ? ' z ' : ' of '}
                    {String(days.length)} {locale === 'pl' ? 'dni gotowych' : 'days ready'}
                  </>
                )}
              </DialogPrimitive.Description>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {phase === 'running' && (
                <Button size="sm" variant="outline" onClick={onCancel}>
                  {t('Stop')}
                </Button>
              )}

              <Button size="sm" variant="outline" onClick={handleCopy} disabled={doneCount === 0}>
                {copied ? (
                  <Check className="mr-1.5 h-4 w-4 text-brand" strokeWidth={1.5} />
                ) : (
                  <Copy className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
                )}
                {copied ? t('Copied') : t('Copy all')}
              </Button>

              <DialogPrimitive.Close asChild>
                <Button size="icon" variant="ghost" aria-label={t('Close')}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex flex-col gap-3">
              {days.map((item) => (
                <WorklogDayEntry
                  key={item.day.date}
                  state={item}
                  disabled={isBusy}
                  onRegenerate={onRegenerateDay}
                />
              ))}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
