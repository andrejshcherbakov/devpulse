'use client';

import { Menu, PanelLeft, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { inputVariants } from '@/shared/components/ui/input';
import { UserMenu } from '@/shared/components/ui/user-menu';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

import { CommandMenu } from '../ui/command-menu';
import { LanguageSwitcher } from './language-switcher';

interface HeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({
  onMenuToggle,
  isMenuOpen,
  isSidebarCollapsed,
  onToggleSidebar,
}: HeaderProps): JSX.Element {
  const pathname = usePathname();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const { copy, t } = useLanguage();

  const getPageTitle = (): string => {
    if (pathname === '/') {
      return copy.pageTitles.dashboard;
    }

    if (pathname.startsWith('/projects')) {
      return copy.pageTitles.projects;
    }

    if (pathname.startsWith('/sessions')) {
      return copy.pageTitles.sessions;
    }

    if (pathname.startsWith('/earnings')) {
      return copy.pageTitles.earnings;
    }

    if (pathname.startsWith('/settings')) {
      return copy.pageTitles.settings;
    }

    return copy.pageTitles.fallback;
  };
  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-14',
        'w-full lg:w-[calc(100%-var(--sidebar-width))]',
        'border-b border-border bg-background/90 backdrop-blur-[8px]',
        'transition-[width] duration-200 ease-out',
      )}
    >
      <div className="grid h-full w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="h-8 w-8 text-secondary hover:text-foreground lg:hidden"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="hidden h-8 w-8 text-secondary transition-colors hover:text-foreground lg:flex"
            title={isSidebarCollapsed ? t('Expand sidebar') : t('Collapse sidebar')}
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>

          <h1 className="ml-1 truncate text-sm font-medium text-foreground">{getPageTitle()}</h1>
        </div>

        <div className="flex w-full max-w-md justify-center">
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className={cn(
              inputVariants({ size: 'default' }),
              'flex cursor-pointer items-center justify-between gap-3 text-subtle hover:bg-gray-alpha-50',
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Search className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="truncate text-[13px]">{copy.searchPlaceholder}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <kbd className="mono-sm hidden h-5 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[10px] text-subtle sm:inline-flex">
                ⌘
              </kbd>
              <kbd className="mono-sm hidden h-5 items-center justify-center rounded-md border border-border bg-background px-1.5 text-[10px] text-subtle sm:inline-flex">
                K
              </kbd>
            </div>
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
            <Link href="/docs" target="_blank" rel="noreferrer">
              {copy.docs}
            </Link>
          </Button>
          <UserMenu />
        </div>
      </div>
      <CommandMenu open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </header>
  );
}
