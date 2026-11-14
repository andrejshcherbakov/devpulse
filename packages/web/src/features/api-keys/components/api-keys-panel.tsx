'use client';

import { Blocks, BookOpen, Key, Plus, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/shared/components/layout/panel';
import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';

import { useApiKeys, useRevokeApiKey } from '../hooks';
import { ApiKeysTable } from './api-keys-table';
import { CreateApiKeyDialog } from './create-api-key-dialog';
import { RevealedKeyDialog } from './revealed-key-dialog';
import { RevokeKeyDialog } from './revoke-key-dialog';

export function ApiKeysPanel(): JSX.Element {
  const { data: keys = [], isLoading, isError } = useApiKeys();
  const revokeKey = useRevokeApiKey();
  const { t } = useLanguage();

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  const extensionKeys = keys.filter((k) => k.type === 'extension');
  const integrationKeys = keys.filter((k) => k.type === 'integration');

  return (
    <Panel>
      <PanelHeader>
        <div>
          <PanelTitle>{t('API Keys')}</PanelTitle>
          <PanelDescription>{t('Manage API keys for VS Code and external integrations')}</PanelDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/docs">
              <BookOpen className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {t('API docs')}
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
            {t('Create Key')}
          </Button>
        </div>
      </PanelHeader>

      <PanelContent>
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <span className="animate-pulse text-sm text-secondary">{t('Loading keys…')}</span>
          </div>
        )}

        {isError && (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-red-coral">{t('Failed to load API keys.')}</p>
          </div>
        )}

        {!isLoading && !isError && keys.length === 0 && (
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-gray-alpha-50">
              <Key className="h-5 w-5 text-subtle" strokeWidth={1.5} />
            </div>
            <p className="max-w-md text-sm text-secondary">
              {t('Create an API key to track your metrics from VS Code or connect external integrations.')}
            </p>
            <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.5} />
              {t('Create Key')}
            </Button>
          </div>
        )}

        {!isLoading && !isError && keys.length > 0 && (
          <div className="flex flex-col gap-8">
            <section>
              <div className="mb-4 flex items-start gap-2">
                <Terminal
                  className="mt-0.5 h-4 w-4 text-subtle"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-base font-medium text-foreground">{t('Extension Keys')}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-subtle">
                    {t('Write-only keys for uploading telemetry from the VS Code extension.')}
                  </p>
                </div>
              </div>
              <ApiKeysTable
                list={extensionKeys}
                emptyMessage={t('No extension keys found.')}
                onRevoke={setPendingRevokeId}
                isRevoking={revokeKey.isPending}
              />
            </section>

            <section>
              <div className="mb-4 flex items-start gap-2">
                <Blocks
                  className="mt-0.5 h-4 w-4 text-subtle"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-base font-medium text-foreground">{t('Integration Keys')}</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-subtle">
                    {t('Read-only keys for external systems using the documented analytics API.')}
                  </p>
                </div>
              </div>
              <ApiKeysTable
                list={integrationKeys}
                emptyMessage={t('No integration keys found.')}
                onRevoke={setPendingRevokeId}
                isRevoking={revokeKey.isPending}
              />
            </section>
          </div>
        )}
      </PanelContent>

      <CreateApiKeyDialog
        open={isCreateOpen}
        onOpenChange={setCreateOpen}
        onKeyCreated={setRevealedKey}
      />

      <RevealedKeyDialog apiKey={revealedKey} onClose={() => setRevealedKey(null)} />

      <RevokeKeyDialog
        keyId={pendingRevokeId}
        onClose={() => setPendingRevokeId(null)}
        onConfirm={(id) => {
          setPendingRevokeId(null);
          revokeKey.mutate(id);
        }}
        isPending={revokeKey.isPending}
      />
    </Panel>
  );
}
