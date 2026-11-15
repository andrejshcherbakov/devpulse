'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const inputVariants = cva(
  [
    'block w-full border bg-background text-foreground shadow-none transition-colors duration-150 ease-out',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    'placeholder:text-subtle',
    'focus-visible:ring-2 focus-visible:ring-white/15 focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'border-gray-alpha-200',
          'hover:border-gray-alpha-300',
          'focus-visible:border-gray-alpha-300',
        ].join(' '),
      },
      size: {
        sm: 'h-7 rounded-lg px-2 text-xs',
        default: 'h-8 rounded-lg px-2.5 text-[13px]',
        lg: 'h-10 rounded-lg px-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input, inputVariants };
