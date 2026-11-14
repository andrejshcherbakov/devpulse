'use client';

import { formatDistanceToNow } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { type ApiKeySummary } from '@/shared/types';

interface ApiKeysTableProps {
  list: ApiKeySummary[];
  emptyMessage: string;
  onRevoke: (id: string) => void;
  isRevoking: boolean;
}

export function ApiKeysTable({
  list,
  emptyMessage,
  onRevoke,
  isRevoking,
}: ApiKeysTableProps): JSX.Element {
  const { locale, t } = useLanguage();
  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 grid grid-cols-12 gap-4 border-b border-border pb-3 text-xs font-medium tracking-wider text-subtle uppercase">
        <div className="col-span-4">{t('Name')}</div>
        <div className="col-span-3">{t('Device')}</div>
        <div className="col-span-3">{t('Created')}</div>
        <div className="col-span-2 text-right">{t('Actions')}</div>
      </div>

      {list.map((key, i) => (
        <div
          key={key.id}
          className={cn(
            'relative grid grid-cols-12 items-center gap-4 py-3.5 text-sm transition-colors',
            '-mx-2 rounded-lg px-2 hover:bg-gray-alpha-50',
            i !== list.length - 1 &&
              'after:pointer-events-none after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-border',
          )}
        >
          <div className="col-span-4 flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{key.name}</span>
            <span className="font-mono text-xs text-subtle">{key.keyPrefix}••••••••</span>
          </div>

          <div className="col-span-3 flex flex-col gap-0.5">
            {key.type === 'extension' && key.deviceLabel ? (
              <span className="font-mono text-xs text-secondary">{key.deviceLabel}</span>
            ) : (
              <span className="text-sm text-subtle">—</span>
            )}
          </div>

          <div className="col-span-3 flex flex-col gap-0.5" suppressHydrationWarning>
            <span className="text-sm text-secondary">
              {formatDistanceToNow(new Date(key.createdAt), {
                addSuffix: true,
                locale: locale === 'pl' ? pl : enUS,
              })}
            </span>
            <span className="text-xs text-subtle">
              {key.lastUsedAt !== null
                ? `${t('Used')} ${formatDistanceToNow(new Date(key.lastUsedAt), {
                    addSuffix: true,
                    locale: locale === 'pl' ? pl : enUS,
                  })}`
                : t('Never used')}
            </span>
          </div>

          <div className="col-span-2 flex items-center justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRevoke(key.id)}
              disabled={isRevoking}
            >
              {t('Revoke')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
