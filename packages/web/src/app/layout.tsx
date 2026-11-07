import './globals.css';

import type { Metadata } from 'next';
import { type JSX } from 'react/jsx-runtime';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DevPulse | Workflow Analytics',
  description: 'Time-tracking and workflow analytics for developers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
