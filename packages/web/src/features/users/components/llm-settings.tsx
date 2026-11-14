'use client';

import { type ReactNode, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

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
import type { LlmProvider } from '@/shared/types';

const PROVIDER_OPTIONS: ReadonlyArray<{ value: LlmProvider; label: string }> = [
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
];

const KEY_PLACEHOLDER: Record<LlmProvider, string> = {
  openrouter: 'sk-or-...',
  openai: 'sk-...',
  custom: 'API key',
};

const MODEL_PLACEHOLDER: Record<LlmProvider, string> = {
  openrouter: 'Leave empty to use free models',
  openai: 'Model id from your OpenAI account',
  custom: 'Model id',
};

function validateKey(provider: LlmProvider, key: string): string | null {
  if (provider === 'openrouter' && !key.startsWith('sk-or-')) {
    return 'OpenRouter keys start with sk-or-';
  }

  if (provider === 'openai' && (!key.startsWith('sk-') || key.startsWith('sk-or-'))) {
    return 'OpenAI keys start with sk- (sk-or- keys belong to OpenRouter)';
  }

  return null;
}

export interface LlmSettingsPatch {
  llmProvider: LlmProvider;
  llmModel: string | null;
  llmBaseUrl: string | null;
  openaiKey?: string | null;
}

interface LlmSettingsProps {
  initial: { provider: LlmProvider; model: string; baseUrl: string };
  hasKey: boolean;
  onSave: (patch: LlmSettingsPatch) => Promise<void>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-secondary">{label}</span>
      {children}
      {hint && <span className="text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export function LlmSettings({ initial, hasKey, onSave }: LlmSettingsProps): JSX.Element {
  const { t } = useLanguage();
  const [provider, setProvider] = useState<LlmProvider>(initial.provider);
  const [model, setModel] = useState(initial.model);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [key, setKey] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedKey = key.trim();
  const providerChanged = provider !== initial.provider;
  const needsModel = provider !== 'openrouter';
  const needsBaseUrl = provider === 'custom';

  const keyProblem = trimmedKey === '' ? null : validateKey(provider, trimmedKey);
  const needsNewKey = !hasKey || providerChanged;

  const canSave =
    !isPending &&
    keyProblem === null &&
    (!needsNewKey || trimmedKey !== '') &&
    (!needsModel || model.trim() !== '') &&
    (!needsBaseUrl || baseUrl.trim() !== '');

  const buildPatch = (): LlmSettingsPatch => ({
    llmProvider: provider,
    llmModel: model.trim() || null,
    llmBaseUrl: needsBaseUrl ? baseUrl.trim() : null,
    ...(trimmedKey === '' ? {} : { openaiKey: trimmedKey }),
  });

  const handleSave = async () => {
    setIsPending(true);
    setError(null);
    try {
      await onSave(buildPatch());
      setKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to save settings'));
    } finally {
      setIsPending(false);
    }
  };

  const handleRemoveKey = async () => {
    setIsPending(true);
    setError(null);
    try {
      await onSave({ ...buildPatch(), openaiKey: null });
      setKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to remove key'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('Provider')}>
          <Select
            value={provider}
            onValueChange={(value) => setProvider(value as LlmProvider)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={t('Model')}
          hint={
            provider === 'openrouter'
              ? t('Without a model a chain of free models is used. It is limited to a few days per run.')
              : undefined
          }
        >
          <Input
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={t(MODEL_PLACEHOLDER[provider])}
            disabled={isPending}
            autoComplete="off"
          />
        </Field>
      </div>

      {needsBaseUrl && (
        <Field
          label={t('Base URL')}
          hint={t('Requests are sent from the DevPulse server. A localhost address works only when the backend runs on the same machine and LLM_ALLOW_PRIVATE_BASE_URL=true.')}
        >
          <Input
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://your-host/v1"
            disabled={isPending}
            autoComplete="off"
          />
        </Field>
      )}

      <Field
        label={t('API key')}
        hint={
          hasKey && !providerChanged
            ? t('A key is saved. Enter a new one to replace it.')
            : t('Used only for your own requests.')
        }
      >
        <Input
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder={KEY_PLACEHOLDER[provider]}
          disabled={isPending}
          autoComplete="off"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => void handleSave()} disabled={!canSave} loading={isPending}>
          {t('Save')}
        </Button>
        {hasKey && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleRemoveKey()}
            disabled={isPending}
          >
            {t('Remove key')}
          </Button>
        )}
      </div>

      {keyProblem && (
        <p className="text-xs text-red-coral" role="alert">
          {t(keyProblem)}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-coral" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
