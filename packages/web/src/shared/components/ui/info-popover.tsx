'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { cn } from '@/shared/lib/cn';

import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface InfoPopoverProps {
  content: string;
  label: string;
  className?: string;
}

export function InfoPopover({ content, label, className }: InfoPopoverProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-subtle',
            'transition-colors hover:bg-gray-alpha-100 hover:text-foreground',
            'focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:outline-none',
            className,
          )}
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') setOpen(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setOpen(false);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onClick={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        role="tooltip"
        side="top"
        align="start"
        className="max-w-80 text-xs leading-5 text-secondary"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
}
