'use client';

import { ArrowUpRight, Clock, FolderGit2, Layers, Zap } from 'lucide-react';
import Link from 'next/link';
import { type JSX } from 'react/jsx-runtime';

import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { formatDateTimeLabel } from '@/shared/lib/date';
import { type ProjectSummary } from '@/shared/types';

interface ProjectCardProps {
  project: ProjectSummary;
  timezone: string;
}

export function ProjectCard({ project, timezone }: ProjectCardProps): JSX.Element {
  const { locale, t } = useLanguage();

  return (
    <Link
      href={`/projects/${project.id}`}
      aria-label={
        locale === 'pl'
          ? `Wyświetl szczegóły projektu ${project.name}`
          : `View details for project ${project.name}`
      }
      className={cn(
        'interactive-surface group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/90 p-5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_18px_50px_rgba(0,0,0,0.12)] outline-none',
        'hover:border-brand/20 hover:bg-surface-hover/70 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_22px_60px_rgba(0,0,0,0.2)]',
        'focus-visible:ring-2 focus-visible:ring-white/15',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-gray-alpha-50">
              <FolderGit2
                className="h-5 w-5 text-subtle transition-colors group-hover:text-secondary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-medium text-foreground">{project.name}</h3>
              <p className="mt-0.5 truncate font-mono text-xs text-subtle">
                {project.remote ?? t('Local repository')}
              </p>
            </div>
          </div>

          <ArrowUpRight
            className={cn(
              'h-4 w-4 shrink-0 translate-x-1 -translate-y-1 text-subtle opacity-0 transition-[transform,opacity] duration-200',
              'group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100',
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-y border-white/[0.06] py-4">
        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {t('Time')}
          </span>
          <span className="mt-1 font-mono text-xs font-medium text-foreground tabular-nums">
            {project.activeTime}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Zap className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {t('Focus')}
          </span>
          <span className="mt-1 font-mono text-xs font-medium text-brand tabular-nums">
            {project.focusScore}%
          </span>
        </div>

        <div className="flex flex-col">
          <span className="flex items-center gap-1 text-xs text-subtle">
            <Layers className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
            {t('Sessions')}
          </span>
          <span className="mt-1 font-mono text-xs font-medium text-foreground tabular-nums">
            {project.sessions}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-subtle">
        <span>{t('Last active')}</span>
        <span className="font-medium text-secondary" suppressHydrationWarning>
          {project.lastActive
            ? formatDateTimeLabel(project.lastActive, timezone, locale)
            : t('Never')}
        </span>
      </div>
    </Link>
  );
}
