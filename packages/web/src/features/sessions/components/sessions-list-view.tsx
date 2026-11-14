'use client';

import { formatDuration } from '@devpulse/lib';
import { Calendar, FolderGit2, GitBranch, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { useRequireAuth } from '@/features/auth/context';
import {
  Page,
  PageDescription,
  PageEyebrow,
  PageHeader,
  PageHeaderHeading,
  PageTitle,
} from '@/shared/components/layout/page';
import { Panel, PanelHeader } from '@/shared/components/layout/panel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { formatDateTimeLabel } from '@/shared/lib/date';

import { useSessions } from '../hooks';
import { SessionsSummaryCards } from './sessions-summary-cards';

export function SessionsListView(): JSX.Element {
  const { data: sessions = [], isLoading, error } = useSessions();
  const { user } = useRequireAuth();
  const { locale, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const uniqueProjects = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.projectName).filter(Boolean)));
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        s.projectName?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (s.gitBranch && s.gitBranch.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchesProject = projectFilter === 'all' || s.projectName === projectFilter;

      return matchesSearch && matchesProject;
    });
  }, [sessions, searchQuery, projectFilter]);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageEyebrow>{t('Activity timeline')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{t('Sessions')}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>
            {t('Detailed log of your tracked development activity and focus metrics')}
          </PageDescription>
        </div>
      </PageHeader>

      <div data-tour="sessions-summary">
        <SessionsSummaryCards
          sessions={sessions}
          isLoading={isLoading}
          uniqueProjectsCount={uniqueProjects.length}
        />
      </div>

      <Panel>
        <PanelHeader>
          <div
            data-tour="sessions-filters"
            className="flex w-full flex-1 items-center gap-2.5 sm:w-auto"
          >
            <div className="relative w-full sm:w-72">
              <Search
                className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search by project or branch...')}
                className="pl-8"
              />
            </div>

            <div className="hidden w-44 shrink-0 sm:block">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('All projects')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All projects')}</SelectItem>
                  {uniqueProjects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end text-xs text-subtle sm:self-auto">
            <span>{t('Showing:')}</span>
            <span className="font-mono text-xs font-medium text-foreground tabular-nums">
              {isLoading
                ? '—'
                : locale === 'pl'
                  ? `${filteredSessions.length} z ${sessions.length}`
                  : `${filteredSessions.length} of ${sessions.length}`}
            </span>
          </div>
        </PanelHeader>

        <div
          data-tour="sessions-columns"
          className="grid grid-cols-12 gap-4 border-b border-border pb-3 text-xs font-medium tracking-wider text-subtle uppercase"
        >
          <div className="col-span-4 sm:col-span-3">{t('Start Time')}</div>
          <div className="col-span-4 sm:col-span-3">{t('Project')}</div>
          <div className="hidden sm:col-span-3 sm:block">{t('Branch')}</div>
          <div className="col-span-2 sm:col-span-2">{t('Duration')}</div>
          <div className="col-span-2 text-right sm:col-span-1">{t('Focus')}</div>
        </div>

        {isLoading && (
          <div className="py-16 text-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading session history…')}</span>
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-sm text-red-coral">
            {t('Failed to load sessions')}: {error instanceof Error ? error.message : t('Unknown error')}
          </div>
        )}

        {!isLoading && !error && sessions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-secondary">{t('No sessions recorded yet.')}</p>
            <p className="mt-1 text-xs text-subtle">
              {t('Make sure your VS Code extension is running to track your activity.')}
            </p>
          </div>
        )}

        {!isLoading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-secondary">{t('No sessions match your search filters.')}</p>
            {(searchQuery || projectFilter !== 'all') && (
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setProjectFilter('all');
                }}
                className="mt-2"
              >
                {t('Reset filters')}
              </Button>
            )}
          </div>
        )}

        {!isLoading && !error && filteredSessions.length > 0 && (
          <div className="flex flex-col">
            {filteredSessions.map((session, i) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className={cn(
                  'relative grid grid-cols-12 items-center gap-4 py-3.5 text-sm transition-colors duration-150 outline-none',
                  '-mx-2 rounded-lg px-2 hover:bg-gray-alpha-50',
                  'focus-visible:ring-2 focus-visible:ring-white/15',
                  i !== filteredSessions.length - 1 &&
                    'after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border',
                )}
              >
                <div className="col-span-4 flex items-center gap-2 sm:col-span-3">
                  <Calendar
                    className="hidden h-3.5 w-3.5 shrink-0 text-subtle sm:block"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs text-secondary tabular-nums">
                    {formatDateTimeLabel(session.startedAt, user.timezone, locale)}
                  </span>
                </div>

                <div className="col-span-4 flex items-center gap-2 truncate text-sm font-medium text-foreground sm:col-span-3">
                  <FolderGit2
                    className="hidden h-4 w-4 shrink-0 text-subtle sm:block"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <span className="truncate">{session.projectName}</span>
                </div>

                <div className="hidden items-center gap-1.5 truncate sm:col-span-3 sm:flex">
                  <span className="inline-flex items-center gap-1 truncate rounded-md border border-border bg-gray-alpha-50 px-2 py-0.5 font-mono text-xs text-secondary">
                    <GitBranch
                      className="h-3 w-3 shrink-0 text-subtle"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                    <span className="truncate">{session.gitBranch ?? 'main'}</span>
                  </span>
                </div>

                <div className="col-span-2 font-mono text-xs text-foreground tabular-nums sm:col-span-2">
                  {formatDuration(session.durationSeconds)}
                </div>

                <div className="col-span-2 text-right font-mono text-xs text-brand tabular-nums sm:col-span-1">
                  {session.focusScore}%
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </Page>
  );
}
