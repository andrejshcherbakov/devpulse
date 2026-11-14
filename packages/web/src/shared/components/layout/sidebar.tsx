'use client';

import { type JSX } from 'react/jsx-runtime';

import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

import { SidebarHeader } from './sidebar-header';
import { SidebarNav } from './sidebar-nav';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
}

export function Sidebar({ isOpen, onClose, isCollapsed }: SidebarProps): JSX.Element {
  const { t } = useLanguage();
  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onClose?.();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        data-tour="sidebar"
        aria-label={t('Main navigation')}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'border-r border-border bg-surface',
          'transition-[width,transform] duration-200 ease-out',
          'w-[var(--sidebar-width)] lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarHeader isCollapsed={isCollapsed} />
        <SidebarNav onNavClick={handleNavClick} isCollapsed={isCollapsed} />
      </aside>
    </>
  );
}
