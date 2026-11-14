'use client';

import { formatDuration } from '@devpulse/lib';
import { GitBranch } from 'lucide-react';
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

import { type DateRange, useBranchesDistribution } from '../hooks';

export function BranchesPanel({
  range,
  projectId,
}: {
  range: DateRange;
  projectId?: string;
}): JSX.Element {
  const { data: branches = [], isLoading } = useBranchesDistribution(range, projectId);
  const { t } = useLanguage();

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>{t('Branches')}</PanelTitle>
          <PanelDescription>{t('Where you spent time')}</PanelDescription>
        </div>
      </PanelHeader>

      <PanelContent className="flex flex-col">
        <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border pb-2 text-xs font-medium tracking-wider text-subtle uppercase">
          <div className="col-span-8">{t('Branch')}</div>
          <div className="col-span-4 text-right">{t('Active Time')}</div>
        </div>

        {isLoading && (
          <div className="py-8 text-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading…')}</span>
          </div>
        )}

        {!isLoading && branches.length === 0 && (
          <div className="py-8 text-center">
            <span className="text-sm text-secondary">{t('No branches')}</span>
          </div>
        )}

        {branches.map((branch, i) => (
          <div
            key={branch.branchName}
            className={cn(
              'relative grid grid-cols-12 items-center gap-4 py-3.5 text-sm transition-colors',
              '-mx-2 rounded-lg px-2 hover:bg-gray-alpha-50',
              i !== branches.length - 1 &&
                'after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border',
            )}
          >
            <div className="col-span-8 flex min-w-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-gray-alpha-50 px-2.5 py-1 font-mono text-xs text-foreground">
                <GitBranch className="h-3 w-3 text-subtle" strokeWidth={1.5} aria-hidden="true" />
                {branch.branchName}
              </span>
            </div>
            <div className="col-span-4 text-right font-mono text-xs font-medium text-foreground tabular-nums">
              {formatDuration(branch.activeSeconds)}
            </div>
          </div>
        ))}
      </PanelContent>
    </Panel>
  );
}
