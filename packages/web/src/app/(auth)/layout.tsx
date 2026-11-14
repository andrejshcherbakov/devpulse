'use client';

import React from 'react';
import { type JSX } from 'react/jsx-runtime';

import { LanguageSwitcher } from '@/shared/components/layout/language-switcher';
import { useLanguage } from '@/shared/i18/language-context';

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen bg-background p-2 md:p-4">
      <section className="relative hidden w-1/2 overflow-hidden rounded-3xl border border-border bg-surface lg:block">
        <BackdropGrid />
        <SoftGlow />

        <div className="relative z-10 flex h-full flex-col justify-between p-10">
          <Brand />

          <div className="mx-auto w-full max-w-md">
            <ActivityShowcase />
          </div>

          <p className="text-xs text-subtle">
            © {new Date().getFullYear()} DevPulse · {t('Workflow analytics')}
          </p>
        </div>
      </section>

      <main className="flex flex-1 flex-col items-center justify-center px-6 lg:px-12">
        <div className="absolute top-5 right-5">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_12px_var(--color-brand-glow)]"
      />
      <span className="text-sm font-medium tracking-tight text-foreground">DevPulse</span>
    </div>
  );
}

function BackdropGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        color: 'var(--color-foreground)',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 40%, transparent 100%)',
      }}
    />
  );
}

function SoftGlow() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-64 w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/8 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 -bottom-24 h-72 w-72 rounded-full bg-purple-blue/10 blur-[120px]"
      />
    </>
  );
}

function ActivityShowcase() {
  const { t } = useLanguage();
  const bars = [24, 38, 52, 44, 61, 78, 66, 82, 71, 58, 46, 68, 74, 88, 62, 40];

  return (
    <div className="rounded-2xl border border-border bg-background/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-subtle">{t('Today')}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight text-foreground tabular-nums">
            6h 12m
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--color-brand-glow)]" />
          {t('Coding now')}
        </div>
      </div>

      <div className="mt-6 flex h-24 items-end gap-1.5" aria-hidden="true">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-foreground/8"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] tracking-wider text-subtle uppercase">
        <span>9:00</span>
        <span>12:00</span>
        <span>15:00</span>
        <span>18:00</span>
      </div>
    </div>
  );
}
