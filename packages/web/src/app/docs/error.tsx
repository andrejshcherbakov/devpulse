'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';

export default function DocsError({ reset }: { reset: () => void }): JSX.Element {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-yellow-amber/25 bg-yellow-amber/10">
          <AlertTriangle className="size-5 text-yellow-amber" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold">{t('API reference is temporarily unavailable')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary">
          {t('The documentation is generated from the live DevPulse OpenAPI specification. Check that the backend is reachable, then try again.')}
        </p>
        <Button className="mt-6" onClick={reset}>
          <RefreshCw className="mr-2 size-4" strokeWidth={1.5} />
          {t('Try again')}
        </Button>
      </div>
    </main>
  );
}
