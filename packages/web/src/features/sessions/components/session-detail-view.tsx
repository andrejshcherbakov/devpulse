'use client';

import { formatDuration, formatMilliseconds } from '@devpulse/lib';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FolderGit2,
  GitBranch,
  GitCommit,
  Hourglass,
  Play,
  Terminal,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { formatDateTimeLabel, formatTimeRange } from '@/shared/lib/date';

import { useSessionDetail } from '../hooks';

interface SessionDetailViewProps {
  id: string;
}

function kindIcon(kind: string) {
  switch (kind) {
    case 'test':
      return '🧪';
    case 'build':
      return '🔨';
    case 'lint':
      return '🐛';
    case 'install':
      return '📦';
    case 'git':
      return '🌿';
    case 'task':
      return '⚙️';
    default:
      return '🖥';
  }
}

function focusColorClass(score: number): string {
  if (score >= 80) return 'text-brand';
  if (score >= 50) return 'text-yellow-amber';
  return 'text-red-coral';
}

export function SessionDetailView({ id }: SessionDetailViewProps): JSX.Element {
  const { user } = useRequireAuth();
  const router = useRouter();
  const { locale, t } = useLanguage();
  const { data, isLoading, error } = useSessionDetail(id);

  const backButton = (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-xs text-secondary transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      {t('Back')}
    </button>
  );

  if (isLoading) {
    return (
      <Page>
        <div className="py-16 text-center">
          <span className="animate-pulse text-sm text-secondary">{t('Loading session…')}</span>
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page>
        <div className="py-16 text-center">
          <p className="text-sm text-red-coral">
            {error instanceof Error ? error.message : t('Session not found')}
          </p>
          <Link
            href="/sessions"
            className="mt-3 inline-block text-xs text-secondary hover:text-foreground"
          >
            {t('Back to sessions')}
          </Link>
        </div>
      </Page>
    );
  }

  const languages = Object.entries(data.languageSeconds)
    .sort(([, a], [, b]) => b - a)
    .map(([language, seconds]) => ({ language, seconds }));

  const totalLanguageSeconds = languages.reduce((sum, l) => sum + l.seconds, 0);

  const commands = [...data.terminalCommands].reverse();

  return (
    <Page>
      <PageHeader>
        <div>
          <div className="mb-2">{backButton}</div>
          <PageEyebrow>{t('Session detail')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{data.projectName ?? t('Unknown project')}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>
            {formatDateTimeLabel(data.startedAt, user.timezone, locale)} ·{' '}
            {formatTimeRange(data.startedAt, data.endedAt, user.timezone, locale)}
          </PageDescription>
        </div>
      </PageHeader>

      <Panel className="overflow-hidden p-0 lg:p-0">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: 'Active time',
              icon: Clock,
              value: formatDuration(data.activeSeconds),
              sub: 'this session',
              valueClass: 'text-foreground',
            },
            {
              label: 'Idle time',
              icon: Hourglass,
              value: formatDuration(data.idleSeconds),
              sub: 'this session',
              valueClass: 'text-foreground',
            },
            {
              label: 'Focus Score',
              icon: Zap,
              value: `${String(data.focusScore)}%`,
              sub: 'average',
              valueClass: focusColorClass(data.focusScore),
            },
            {
              label: 'Commands',
              icon: Terminal,
              value: String(data.commandsRun),
              sub:
                data.failedCommands > 0 ? `${String(data.failedCommands)} failed` : 'this session',
              valueClass: 'text-foreground',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={cn(
                  'flex min-h-32 flex-col justify-between border-white/[0.06] p-5',
                  card.label === 'Active time' && 'border-r border-b sm:border-b-0',
                  card.label === 'Idle time' && 'border-b sm:border-r sm:border-b-0',
                  card.label === 'Focus Score' && 'border-r',
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-subtle">{t(card.label)}</p>
                    <Icon className="h-4 w-4 text-subtle" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className={cn(
                        'font-mono text-2xl font-semibold tracking-tight tabular-nums',
                        card.valueClass,
                      )}
                    >
                      {card.value}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-subtle">{t(card.sub)}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
        <Panel className={cn(languages.length === 0 && 'lg:col-span-2')}>
          <PanelHeader>
            <div>
              <PanelTitle>{t('Context')}</PanelTitle>
              <PanelDescription>{t('Where and when this session happened')}</PanelDescription>
            </div>
          </PanelHeader>
          <PanelContent>
            <dl className="grid grid-cols-1 gap-5 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <FolderGit2 className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.5} />
                <div>
                  <dt className="text-xs text-subtle">{t('Project')}</dt>
                  <dd className="mt-0.5 text-foreground">{data.projectName ?? '—'}</dd>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.5} />
                <div>
                  <dt className="text-xs text-subtle">{t('Branch')}</dt>
                  <dd className="mt-0.5 font-mono text-foreground">{data.gitBranch ?? '—'}</dd>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.5} />
                <div>
                  <dt className="text-xs text-subtle">{t('Started')}</dt>
                  <dd className="mt-0.5 text-foreground">
                    {formatDateTimeLabel(data.startedAt, user.timezone, locale)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Play className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.5} />
                <div>
                  <dt className="text-xs text-subtle">{t('Status')}</dt>
                  <dd className="mt-0.5 text-foreground capitalize">{data.status}</dd>
                </div>
              </div>
            </dl>
          </PanelContent>
        </Panel>

        {languages.length > 0 && (
          <Panel>
            <PanelHeader>
              <div>
                <PanelTitle>{t('Languages')}</PanelTitle>
                <PanelDescription>{t('Time spent per language in this session')}</PanelDescription>
              </div>
            </PanelHeader>
            <PanelContent>
              <div className="flex flex-col gap-4">
                {languages.map(({ language, seconds }) => {
                  const percent =
                    totalLanguageSeconds > 0 ? (seconds / totalLanguageSeconds) * 100 : 0;
                  return (
                    <div key={language} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground capitalize">{language}</span>
                        <span className="font-mono text-xs text-secondary">
                          {formatDuration(seconds)} · {percent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-alpha-100">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelContent>
          </Panel>
        )}
      </div>

      <Panel>
        <PanelHeader>
          <div>
            <PanelTitle>{t('Terminal activity')}</PanelTitle>
            <PanelDescription>
              {commands.length === 0
                ? t('Commands you ran in this session')
                : locale === 'pl'
                  ? `${commands.length} poleceń`
                  : `${commands.length} commands`}
            </PanelDescription>
          </div>
        </PanelHeader>
        <PanelContent>
          {commands.length === 0 ? (
            <div className="py-6 text-center text-sm text-secondary">{t('No commands recorded')}</div>
          ) : (
            <div className="flex flex-col">
              <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border pb-2 text-xs font-medium tracking-wider text-subtle uppercase">
                <div className="col-span-7">{t('Command')}</div>
                <div className="col-span-2 text-right">{t('Duration')}</div>
                <div className="col-span-3 text-right">{t('Exit')}</div>
              </div>

              {commands.map((cmd, i) => {
                const isFailed = cmd.exitCode !== null && cmd.exitCode !== 0;
                return (
                  <div
                    key={`${cmd.timestamp}-${i}`}
                    className={cn(
                      'grid grid-cols-12 items-center gap-4 py-2.5 text-sm',
                      i !== commands.length - 1 && 'border-b border-border',
                    )}
                  >
                    <div className="col-span-7 flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-sm">{kindIcon(cmd.kind)}</span>
                      <span
                        className="truncate font-mono text-xs text-foreground"
                        title={cmd.command}
                      >
                        {cmd.command}
                      </span>
                    </div>

                    <div className="col-span-2 text-right font-mono text-xs text-secondary tabular-nums">
                      {formatMilliseconds(cmd.durationMs)}
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1.5 font-mono text-xs">
                      {cmd.exitCode === null ? (
                        <span className="text-subtle">—</span>
                      ) : isFailed ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-red-coral" strokeWidth={1.5} />
                          <span className="text-red-coral">{cmd.exitCode}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-brand" strokeWidth={1.5} />
                          <span className="text-brand">0</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelContent>
      </Panel>

      {data.commits.length > 0 && (
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{t('Commits')}</PanelTitle>
              <PanelDescription>
                {locale === 'pl'
                  ? `${data.commitsCount} ${data.commitsCount === 1 ? 'commit' : 'commitów'} w tej sesji`
                  : `${data.commitsCount} ${data.commitsCount === 1 ? 'commit' : 'commits'} in this session`}
              </PanelDescription>
            </div>
          </PanelHeader>
          <PanelContent>
            <div className="flex flex-col">
              {data.commits.map((commit, i) => (
                <div
                  key={commit.hash}
                  className={cn(
                    'grid grid-cols-12 gap-4 py-3 text-sm',
                    i !== data.commits.length - 1 && 'border-b border-border',
                  )}
                >
                  <div className="col-span-8 flex min-w-0 items-start gap-2">
                    <GitCommit className="mt-0.5 h-4 w-4 shrink-0 text-subtle" strokeWidth={1.5} />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-foreground" title={commit.message}>
                        {commit.message}
                      </span>
                      <span className="font-mono text-xs text-subtle">
                        {commit.hash.slice(0, 7)} · {commit.filesChanged}{' '}
                        {commit.filesChanged === 1 ? t('file') : t('files')}
                      </span>
                    </div>
                  </div>
                  <div className="mono-sm col-span-4 flex items-center justify-end gap-3 text-xs tabular-nums">
                    <span className="text-brand">+{commit.insertions}</span>
                    <span className="text-red-coral">−{commit.deletions}</span>
                  </div>
                </div>
              ))}
            </div>
          </PanelContent>
        </Panel>
      )}
    </Page>
  );
}
