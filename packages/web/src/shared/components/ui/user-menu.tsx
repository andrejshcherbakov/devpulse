'use client';

import { BookOpen, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { type JSX } from 'react/jsx-runtime';

import { useRequireAuth } from '@/features/auth/context';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useLanguage } from '@/shared/i18/language-context';

export function UserMenu(): JSX.Element {
  const { user, logout } = useRequireAuth();
  const { t } = useLanguage();

  const getInitials = (name: string) => {
    const target = name.trim();
    return target
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('Your profile')}
          className="rounded-full hover:bg-gray-alpha-100"
        >
          <Avatar>
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
          <p className="mt-0.5 truncate text-xs text-secondary">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} aria-hidden="true" />
              <span>{t('Settings')}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href="/docs" target="_blank" rel="noreferrer">
              <BookOpen className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} aria-hidden="true" />
              <span>{t('Docs and resources')}</span>
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => logout()}
          className="text-secondary hover:bg-red-coral/10 hover:text-red-coral focus:bg-red-coral/10 focus:text-red-coral"
        >
          <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          <span>{t('Sign out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
