'use client';

import { useRouter } from 'next/navigation';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { type Locale, SUPPORTED_LOCALES } from '@/shared/i18/dashboard-copy';
import { useLanguage } from '@/shared/i18/language-context';

export function LanguageSwitcher(): JSX.Element {
  const { locale, setLocale, copy } = useLanguage();
  const router = useRouter();

  const changeLanguage = (nextLocale: Locale): void => {
    if (nextLocale === locale) {
      return;
    }

    setLocale(nextLocale);
    router.refresh();
  };

  return (
    <div
      role="group"
      aria-label={copy.languageSelectorLabel}
      className="flex items-center rounded-lg border border-border bg-background p-0.5"
    >
      {SUPPORTED_LOCALES.map((availableLocale) => {
        const isSelected = availableLocale === locale;

        return (
          <Button
            key={availableLocale}
            type="button"
            size="xs"
            variant={isSelected ? 'secondary' : 'ghost'}
            aria-pressed={isSelected}
            onClick={() => changeLanguage(availableLocale)}
            className="min-w-7 uppercase"
          >
            {availableLocale}
          </Button>
        );
      })}
    </div>
  );
}
