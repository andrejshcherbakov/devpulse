'use client';

import { FolderGit2, Search } from 'lucide-react';
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
import { useLanguage } from '@/shared/i18/language-context';

import { useProjects } from '../hooks';
import { ProjectCard } from './project-card';

export function ProjectListView(): JSX.Element {
  const { data: projects = [], isLoading, error } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useRequireAuth();
  const { locale, t } = useLanguage();

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return projects;

    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.remote && p.remote.toLowerCase().includes(query)),
    );
  }, [projects, searchQuery]);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageEyebrow>{t('Workspace library')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{t('Projects')}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>
            {t('All repositories tracked by your workspace and VS Code extension.')}
          </PageDescription>
        </div>
      </PageHeader>

      <Panel className="p-3 lg:p-3">
        <PanelHeader className="m-0 border-0 p-0">
          <div data-tour="projects-search" className="relative w-full sm:w-72">
            <Search
              className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-subtle"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search projects by name...')}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2 self-end text-xs text-subtle sm:self-auto">
            <span>{t('Total projects:')}</span>
            <span className="font-mono text-xs font-medium text-foreground tabular-nums">
              {isLoading ? '—' : filteredProjects.length}
            </span>
          </div>
        </PanelHeader>
      </Panel>

      <div data-tour="projects-list">
        {isLoading && (
          <Panel className="flex h-48 items-center justify-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading repositories…')}</span>
          </Panel>
        )}

        {error && (
          <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-red-coral/20 bg-red-coral/10 p-4 text-center">
            <p className="text-sm font-medium text-red-coral">{t('Failed to load projects')}</p>
            <p className="mt-1 text-xs text-red-coral/80">
              {error instanceof Error ? error.message : t('Unknown error')}
            </p>
          </div>
        )}

        {!isLoading && !error && projects.length === 0 && (
          <Panel className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-gray-alpha-50">
              <FolderGit2 className="h-6 w-6 text-subtle" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-medium text-foreground">{t('No projects found')}</h3>
            <p className="mt-1 max-w-md text-sm text-secondary">
              {t('Make sure your VS Code extension is active and tracking your workspace.')}
            </p>
          </Panel>
        )}

        {!isLoading && !error && projects.length > 0 && filteredProjects.length === 0 && (
          <Panel className="py-12 text-center">
            <p className="text-sm text-secondary">
              {locale === 'pl' ? 'Brak projektów pasujących do' : 'No projects matching'} &ldquo;
              {searchQuery}&rdquo;
            </p>
            <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="mt-2">
              {t('Clear search query')}
            </Button>
          </Panel>
        )}

        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} timezone={user.timezone} />
            ))}
          </div>
        )}
      </div>
    </Page>
  );
}
