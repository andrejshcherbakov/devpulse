import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const Panel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative rounded-xl border border-white/[0.08] bg-surface p-5',
        'shadow-[0_1px_2px_rgba(0,0,0,0.18)]',
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = 'Panel';

const PanelHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    />
  ),
);
PanelHeader.displayName = 'PanelHeader';

const PanelTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-[15px] leading-5 font-semibold tracking-[-0.01em] text-foreground',
        className,
      )}
      {...props}
    />
  ),
);
PanelTitle.displayName = 'PanelTitle';

const PanelDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('mt-1 text-[13px] leading-5 text-secondary', className)} {...props} />
));
PanelDescription.displayName = 'PanelDescription';

const PanelContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />,
);
PanelContent.displayName = 'PanelContent';

export { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle };
