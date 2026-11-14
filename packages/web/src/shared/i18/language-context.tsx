'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { type JSX } from 'react/jsx-runtime';

import { DASHBOARD_COPY, type Locale, POLISH_TRANSLATIONS } from './dashboard-copy';

const STORAGE_KEY = 'devpulse.interfaceLocale';
const listeners = new Set<() => void>();
let currentLocale: Locale = 'en';

function getSnapshot(): Locale {
  return currentLocale;
}

function getServerSnapshot(): Locale {
  return 'en';
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateLocale(locale: Locale): void {
  currentLocale = locale;
  window.localStorage.setItem(STORAGE_KEY, locale);
  document.cookie = `${STORAGE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  for (const listener of listeners) listener();
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copy: (typeof DASHBOARD_COPY)[Locale];
  t: (englishText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps): JSX.Element {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    if (storedLocale === 'en' || storedLocale === 'pl') updateLocale(storedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale): void => {
    updateLocale(nextLocale);
  }, []);

  const t = useCallback(
    (englishText: string): string =>
      locale === 'pl' ? (POLISH_TRANSLATIONS[englishText] ?? englishText) : englishText,
    [locale],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      copy: DASHBOARD_COPY[locale],
      t,
    }),
    [locale, setLocale, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (context === null) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
}
