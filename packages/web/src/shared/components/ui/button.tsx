'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap',
    'border border-transparent bg-clip-padding',
    'transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out',
    'active:translate-y-px motion-reduce:transform-none',
    'outline-none select-none',
    'focus-visible:ring-2 focus-visible:ring-white/15',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    "[&_svg:not([class*='size-'])]:size-[18px]",
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:bg-foreground/90 active:bg-foreground/80',

        outline:
          'border-gray-alpha-200 bg-background text-foreground hover:border-gray-alpha-300 hover:bg-gray-alpha-50 active:bg-gray-alpha-100',

        secondary:
          'bg-gray-alpha-100 text-foreground hover:bg-gray-alpha-150 active:bg-gray-alpha-200',

        ghost:
          'bg-transparent text-secondary hover:bg-gray-alpha-100 hover:text-foreground active:bg-gray-alpha-150',

        danger:
          'bg-transparent text-red-coral hover:bg-red-coral/10 active:bg-red-coral/20 disabled:text-red-coral/50',

        link: 'bg-transparent text-secondary underline-offset-4 hover:text-foreground hover:underline',
      },

      size: {
        xs: 'h-6 rounded-md px-1.5 text-xs [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-7 rounded-md px-2 text-xs [&_svg:not([class*="size-"])]:size-3.5',
        default: 'h-8 rounded-lg px-2.5 text-[13px]',
        lg: 'h-10 rounded-lg px-4 text-sm',
        icon: 'h-8 w-8 rounded-lg p-0',
        'icon-sm': 'h-7 w-7 rounded-lg p-0',
        'icon-lg': 'h-10 w-10 rounded-lg p-0',
      },
    },

    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          disabled={props.disabled || loading}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-current" />
        )}

        <span
          className={cn(
            'inline-flex items-center justify-center gap-2 transition-opacity',
            loading ? 'opacity-0' : 'opacity-100',
          )}
        >
          {children}
        </span>
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
