'use client';

import { formatDuration } from '@devpulse/lib';
import { formatDistanceToNow } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { AlertCircle, Clock, GitBranch, GitCommit, Layers, Terminal, Zap } from 'lucide-react';
import Link from 'next/link';
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
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';
import { formatDateTimeLabel } from '@/shared/lib/date';

import { useProject } from '../hooks';

interface ProjectDetailViewProps {
  projectId: string;
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps): JSX.Element {
  const { data: project, isLoading, error } = useProject(projectId);
  const { user } = useRequireAuth();
  const { locale, t } = useLanguage();

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-secondary">{t('Loading project details…')}</div>;
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-coral" strokeWidth={1.5} />
        <p className="text-sm text-red-coral">{t('Project not found')}</p>
        <p className="mt-1 text-xs text-secondary">
          {error instanceof Error ? error.message : t('The project may have been deleted.')}
        </p>
      </div>
    );
  }

  return (
    <Page>
      <PageHeader>
        <div>
          <PageEyebrow>{t('Project profile')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{project.name}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>{project.remote ?? t('Local repository')}</PageDescription>
        </div>
      </PageHeader>

      <Panel className="overflow-hidden p-0 lg:p-0">
        <div className="grid grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Active time', icon: Clock, value: project.activeTime, accent: true },
            {
              label: 'Focus score',
              icon: Zap,
              value: `${String(project.focusScore)}%`,
              accent: false,
            },
            { label: 'Sessions', icon: Layers, value: String(project.sessions), accent: false },
            {
              label: 'Commits',
              icon: GitCommit,
              value: String(project.totalCommits),
              accent: false,
            },
            {
              label: 'Commands',
              icon: Terminal,
              value: String(project.totalCommands),
              accent: false,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;

            return (
              <div
                key={metric.label}
                className={`min-h-28 border-white/[0.06] p-5 ${
                  index !== 4 ? 'border-b lg:border-r lg:border-b-0' : ''
                } ${index % 2 === 0 && index < 4 ? 'border-r lg:border-r' : ''} ${
                  index === 4 ? 'col-span-2 lg:col-span-1' : ''
                }`}
              >
                <span className="flex items-center gap-1.5 text-xs text-subtle">
                  <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  {t(metric.label)}
                </span>
                <span
                  className={`mt-3 block font-mono text-2xl font-semibold tracking-tight tabular-nums ${
                    metric.accent ? 'text-brand' : 'text-foreground'
                  }`}
                >
                  {metric.value}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t('Languages')}</PanelTitle>
          </PanelHeader>
          <PanelContent className="flex flex-col gap-3">
            {project.languages.length === 0 && (
              <span className="py-4 text-center text-sm text-secondary">{t('No language data yet')}</span>
            )}
            {project.languages.map((lang) => (
              <div key={lang.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground capitalize">{lang.name}</span>
                  <span className="font-mono text-xs text-secondary">
                    {formatDuration(lang.seconds)} · {lang.percentage}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-alpha-100">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${lang.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t('Branches')}</PanelTitle>
          </PanelHeader>
          <PanelContent className="flex flex-col">
            {project.branches.length === 0 && (
              <span className="py-4 text-center text-sm text-secondary">{t('No branch data yet')}</span>
            )}
            {project.branches.map((branch, i) => (
              <div
                key={branch.name}
                className={`flex items-center justify-between py-3 text-sm ${
                  i !== project.branches.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-subtle" strokeWidth={1.5} />
                  <span className="truncate font-mono text-foreground">{branch.name}</span>
                </div>
                <span className="font-mono text-xs text-secondary">
                  {formatDuration(branch.seconds)}
                </span>
              </div>
            ))}
          </PanelContent>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t('Recent Sessions')}</PanelTitle>
        </PanelHeader>
        <PanelContent className="flex flex-col">
          {project.recentSessions.length === 0 && (
            <span className="py-4 text-center text-sm text-secondary">{t('No sessions yet')}</span>
          )}
          {project.recentSessions.map((session, i) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className={`grid grid-cols-12 items-center gap-4 py-3 text-sm ${
                i !== project.recentSessions.length - 1 ? 'border-b border-border' : ''
              } rounded-lg px-2 transition-colors duration-150 hover:bg-gray-alpha-50 focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none`}
            >
              <div className="col-span-4 font-mono text-xs text-secondary">
                {formatDateTimeLabel(session.startedAt, user.timezone, locale)}
              </div>
              <div className="col-span-4 flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-subtle" strokeWidth={1.5} />
                <span className="truncate font-mono text-xs text-foreground">
                  {session.gitBranch ?? 'main'}
                </span>
              </div>
              <div className="col-span-2 font-mono text-xs text-foreground">
                {formatDuration(session.durationSeconds)}
              </div>
              <div className="col-span-2 text-right text-xs text-secondary capitalize">
                {session.primaryLanguage ?? '—'}
              </div>
            </Link>
          ))}
        </PanelContent>
      </Panel>

      <div className="mt-2 text-right text-xs text-subtle">
        {t('Last active')}:{' '}
        {project.lastActive
          ? formatDistanceToNow(new Date(project.lastActive), {
              addSuffix: true,
              locale: locale === 'pl' ? pl : enUS,
            })
          : t('Never')}
      </div>
    </Page>
  );
}
