'use client';

import { formatDuration, type HotPathMetric } from '@devpulse/lib';
import { FileCode2, Folder, Info } from 'lucide-react';
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

import { type DateRange, useHotFiles } from '../hooks';

interface HotFilesPanelProps {
  range: DateRange;
  projectId?: string;
}

interface HotPathListProps {
  title: string;
  items: Array<HotPathMetric>;
  kind: 'file' | 'folder';
}

function HotPathList({ title, items, kind }: HotPathListProps): JSX.Element {
  const Icon = kind === 'file' ? FileCode2 : Folder;
  const { t } = useLanguage();

  return (
    <div className="min-w-0">
      <div className="mb-2 border-b border-border pb-2 text-xs font-medium tracking-wider text-subtle uppercase">
        {title}
      </div>

      <div className="flex flex-col">
        {items.map((item, index) => (
          <div
            key={item.path}
            className={cn(
              'relative -mx-2 grid grid-cols-12 items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-gray-alpha-50',
              index !== items.length - 1 &&
                'after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border',
            )}
          >
            <div className="col-span-8 flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <Icon
                  className="h-4 w-4 shrink-0 text-subtle"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <span
                  className="truncate font-mono text-xs font-medium text-foreground"
                  title={item.path}
                >
                  {kind === 'folder' && item.path === '.' ? t('Project root') : item.path}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-gray-alpha-100">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                  style={{ width: `${String(item.percentage)}%` }}
                />
              </div>
            </div>

            <div className="col-span-4 flex flex-col items-end gap-0.5 font-mono text-xs tabular-nums">
              <span className="font-medium text-foreground">
                {formatDuration(item.activeSeconds)}
              </span>
              <span className="text-subtle">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HotFilesPanel({ range, projectId }: HotFilesPanelProps): JSX.Element {
  const { t } = useLanguage();
  const { data, isLoading } = useHotFiles(range, projectId);
  const hasData = (data?.files.length ?? 0) > 0;

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>{t('Hot files')}</PanelTitle>
          <PanelDescription>
            {t('The files and folders that held your active editor time')}
          </PanelDescription>
        </div>
        {data && data.totalAttributedSeconds > 0 && (
          <div className="text-right">
            <div className="font-mono text-sm font-medium text-foreground tabular-nums">
              {formatDuration(data.totalAttributedSeconds)}
            </div>
            <div className="text-xs text-subtle">{t('file-attributed time')}</div>
          </div>
        )}
      </PanelHeader>

      <PanelContent>
        {isLoading && (
          <div className="py-10 text-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading file activity…')}</span>
          </div>
        )}

        {!isLoading && !hasData && (
          <div className="py-10 text-center">
            <FileCode2 className="mx-auto mb-3 h-6 w-6 text-subtle" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">{t('No file activity yet')}</p>
            <p className="mt-1 text-xs text-secondary">
              {t('File-level time appears after the VS Code extension reports an active editor.')}
            </p>
          </div>
        )}

        {!isLoading && hasData && data && (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
            <HotPathList title={t('Top files')} items={data.files} kind="file" />
            <HotPathList title={t('Top folders')} items={data.folders} kind="folder" />
          </div>
        )}

        <div className="mt-5 flex gap-3 rounded-xl border border-border bg-gray-alpha-50 p-3.5">
          <Info
            className="mt-0.5 h-4 w-4 shrink-0 text-brand"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-secondary">
            {t(
              'DevPulse attributes the interval between active VS Code events to the file open in the editor. Idle periods are excluded and each uninterrupted interval is capped at five minutes. Percentages use file-attributed time, so the total can be lower than your overall session time. Paths are relative to the workspace; file contents are never read or uploaded.',
            )}
          </p>
        </div>
      </PanelContent>
    </Panel>
  );
}
