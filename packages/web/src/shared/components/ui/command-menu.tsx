'use client';

import { Command } from 'cmdk';
import { BookOpen, Clock, DollarSign, FolderGit2, LayoutDashboard, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps): JSX.Element {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">{t('Navigation Menu')}</DialogTitle>

        <Command
          className={cn(
            'flex h-full w-full flex-col overflow-hidden bg-transparent',
            '**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:text-[11px] **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:tracking-wider **:[[cmdk-group-heading]]:text-subtle **:[[cmdk-group-heading]]:uppercase',
          )}
        >
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-subtle"
              placeholder={t('Type a command or search...')}
            />
          </div>

          <Command.List className="max-h-75 overflow-x-hidden overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-sm text-subtle">
              {t('No results found.')}
            </Command.Empty>

            <Command.Group heading={t('Pages')} className="px-0 py-1">
              <CommandItem onSelect={() => runCommand(() => router.push('/'))}>
                <LayoutDashboard className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Dashboard')}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/projects'))}>
                <FolderGit2 className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Projects')}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/sessions'))}>
                <Clock className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Sessions')}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/earnings'))}>
                <DollarSign className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Earnings')}
              </CommandItem>
              <CommandItem onSelect={() => runCommand(() => router.push('/settings'))}>
                <Settings className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Settings')}
              </CommandItem>
            </Command.Group>

            <Command.Separator className="mx-2 my-1 h-px bg-border" />

            <Command.Group heading={t('External')} className="px-0 py-1">
              <CommandItem onSelect={() => runCommand(() => router.push('/docs'))}>
                <BookOpen className="mr-2 h-4 w-4 text-subtle" strokeWidth={1.5} />
                {t('Docs and resources')}
              </CommandItem>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function CommandItem({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        'relative flex cursor-pointer items-center rounded-[10px] px-2.5 py-2 text-sm text-secondary transition-colors outline-none select-none',
        'data-[selected=true]:bg-gray-alpha-100 data-[selected=true]:text-foreground',
      )}
    >
      {children}
    </Command.Item>
  );
}
