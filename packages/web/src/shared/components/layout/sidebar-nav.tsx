'use client';

import { FolderKanban, History, LayoutDashboard, Settings, Wallet } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { useLanguage } from '@/shared/i18/language-context';

import { NavItem } from './nav-item';

const mainNavItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Sessions', href: '/sessions', icon: History },
  { name: 'Earnings', href: '/earnings', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarNavProps {
  onNavClick?: () => void;
  isCollapsed?: boolean;
}

export function SidebarNav({ onNavClick, isCollapsed }: SidebarNavProps): JSX.Element {
  const { t } = useLanguage();

  return (
    <nav className="scroll-subtle flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-1.5 pb-3">
      <ul className="flex flex-col gap-1" aria-label={t('Main navigation')}>
        {mainNavItems.map((item) => (
          <li key={item.name}>
            <NavItem
              href={item.href}
              icon={item.icon}
              label={t(item.name)}
              onClick={onNavClick}
              isCollapsed={isCollapsed}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}
