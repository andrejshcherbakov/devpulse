'use client';

import { type ReactNode, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { LiveAnalyticsProvider } from '@/features/analytics/live-analytics-provider';
import { AuthenticatedUserProvider } from '@/features/auth/context';
import { DashboardTour } from '@/shared/components/onboarding/dashboard-tour';
import { type User } from '@/shared/types';

import { Header } from './header';
import { Sidebar } from './sidebar';

interface DashboardShellProps {
  children: ReactNode;
  user: User;
}

export function DashboardShell({ children, user }: DashboardShellProps): JSX.Element {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <AuthenticatedUserProvider initialUser={user}>
      <LiveAnalyticsProvider>
        <div
          className="relative flex min-h-dvh w-full bg-background text-foreground"
          style={
            {
              '--sidebar-width': isSidebarCollapsed ? 'var(--sidebar-width-collapsed)' : '16rem',
            } as React.CSSProperties
          }
        >
          <Sidebar
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            isCollapsed={isSidebarCollapsed}
          />

          <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out lg:pl-(--sidebar-width)">
            <Header
              onMenuToggle={() => setIsMobileMenuOpen((p) => !p)}
              isMenuOpen={isMobileMenuOpen}
              isSidebarCollapsed={isSidebarCollapsed}
              onToggleSidebar={() => setIsSidebarCollapsed((p) => !p)}
            />

            <main className="flex-1 overflow-y-auto pt-14">
              <div className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </div>
            </main>
          </div>
        </div>

        <DashboardTour userId={user.id} />
      </LiveAnalyticsProvider>
    </AuthenticatedUserProvider>
  );
}
