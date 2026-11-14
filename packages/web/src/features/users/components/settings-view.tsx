'use client';

import { Compass, Globe, Key } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { ApiKeysPanel } from '@/features/api-keys/components/api-keys-panel';
import { useRequireAuth } from '@/features/auth/context';
import {
  Page,
  PageDescription,
  PageEyebrow,
  PageHeader,
  PageHeaderHeading,
  PageTitle,
} from '@/shared/components/layout/page';
import { Panel, PanelHeader, PanelTitle } from '@/shared/components/layout/panel';
import { RestartTourButton } from '@/shared/components/onboarding/restart-tour-button';
import { useLanguage } from '@/shared/i18/language-context';

import { LlmSettings } from './llm-settings';
import { TimezonePreference } from './timezone-preference';

export function SettingsView(): JSX.Element {
  const { user, updateProfile } = useRequireAuth();
  const { t } = useLanguage();

  return (
    <Page className="mx-auto max-w-4xl">
      <PageHeader>
        <div>
          <PageEyebrow>{t('Workspace controls')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{t('Settings')}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>{t('Manage your account and preferences')}</PageDescription>
        </div>
      </PageHeader>

      <div data-tour="api-keys">
        <ApiKeysPanel />
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t('Preferences')}</PanelTitle>
        </PanelHeader>

        <div className="flex flex-col gap-6">
          <div
            data-tour="settings-timezone"
            className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-gray-alpha-50">
                <Globe className="h-4.5 w-4.5 text-subtle" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('Timezone')}</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {t('Used for calculating daily active coding sessions and metrics')}
                </p>
              </div>
            </div>
            <TimezonePreference
              key={user.timezone}
              initialTimezone={user.timezone}
              onSave={(timezone) => updateProfile({ timezone })}
            />
          </div>

          <div
            data-tour="settings-openai"
            className="flex flex-col gap-4 border-t border-border pt-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-gray-alpha-50">
                <Key className="h-4.5 w-4.5 text-subtle" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('AI provider')}</p>
                <p className="mt-0.5 max-w-sm text-xs text-subtle">
                  {t(
                    'Required to generate AI worklogs. OpenRouter, OpenAI or any OpenAI-compatible API.',
                  )}
                </p>
              </div>
            </div>

            <LlmSettings
              key={`${user.llmProvider ?? 'openrouter'}-${user.llmModel ?? ''}-${String(user.hasOpenaiKey)}`}
              initial={{
                provider: user.llmProvider ?? 'openrouter',
                model: user.llmModel ?? '',
                baseUrl: user.llmBaseUrl ?? '',
              }}
              hasKey={user.hasOpenaiKey}
              onSave={(patch) => updateProfile(patch)}
            />
          </div>

          <div
            data-tour="settings-tour"
            className="flex flex-col justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-gray-alpha-50">
                <Compass className="h-4.5 w-4.5 text-subtle" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('Onboarding tour')}</p>
                <p className="mt-0.5 max-w-sm text-xs text-subtle">
                  {t('Replay the guided tour of every page, starting from the dashboard')}
                </p>
              </div>
            </div>
            <RestartTourButton userId={user.id} />
          </div>
        </div>
      </Panel>
    </Page>
  );
}
