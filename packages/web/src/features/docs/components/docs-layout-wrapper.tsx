'use client';

import { ArrowLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { LanguageSwitcher } from '@/shared/components/layout/language-switcher';
import { Button } from '@/shared/components/ui/button';
import { useIntersectionObserver } from '@/shared/hooks/use-intersection-observer';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { type EndpointData, groupEndpointsByPath } from '@/shared/lib/docs';

interface DocsLayoutWrapperProps {
  children: React.ReactNode;
  endpoints: Array<EndpointData>;
}

export function DocsLayoutWrapper({ children, endpoints }: DocsLayoutWrapperProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const { activeId, mainRef } = useIntersectionObserver();

  const navigation = useMemo(() => groupEndpointsByPath(endpoints), [endpoints]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          'ease-out motion-reduce:transition-none',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/" className="group flex items-center gap-2">
            <ArrowLeft
              className="size-4 text-subtle transition-colors group-hover:text-foreground"
              strokeWidth={1.5}
            />
            <span className="font-mono text-xs text-secondary transition-colors group-hover:text-foreground">
              {t('Dashboard')}
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X strokeWidth={1.5} />
          </Button>
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div className="px-2">
            <div className="mb-1 text-xs font-medium tracking-wider text-subtle uppercase">
              DevPulse API
            </div>
            <div className="text-xs text-secondary">v1.0 {t('Public Reference')}</div>
          </div>

          {navigation.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="mb-2 px-2 text-[11px] font-medium tracking-wider text-subtle uppercase">
                {group.category}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const targetId = item.href.replace('#', '');
                  const isActive = activeId === targetId;

                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'block rounded-[10px] px-2.5 py-1.5 text-xs transition-colors',
                          isActive
                            ? 'bg-gray-alpha-100 font-medium text-foreground'
                            : 'text-secondary hover:bg-gray-alpha-100 hover:text-foreground',
                        )}
                      >
                        {item.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-sm lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <Menu strokeWidth={1.5} />
          </Button>
          <span className="text-sm font-medium text-foreground">{t('API Reference')}</span>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto scroll-smooth motion-reduce:scroll-auto"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
