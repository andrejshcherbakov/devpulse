'use client';

import { Clock, DollarSign, TrendingUp } from 'lucide-react';
import { type JSX } from 'react/jsx-runtime';

import { useRequireAuth } from '@/features/auth/context';
import { Panel } from '@/shared/components/layout/panel';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';

import { type DateRange, useDashboardStats } from '../hooks';

interface EarningsSummaryCardsProps {
  range30d: DateRange;
  range7d: DateRange;
}

export function EarningsSummaryCards({
  range30d,
  range7d,
}: EarningsSummaryCardsProps): JSX.Element {
  const { user } = useRequireAuth();
  const { locale, t } = useLanguage();

  const { data: stats30d } = useDashboardStats(range30d);
  const { data: stats7d } = useDashboardStats(range7d);

  const activeHoursThisMonth = Number(((stats30d?.totalActiveSeconds ?? 0) / 3600).toFixed(1));
  const activeHoursThisWeek = Number(((stats7d?.totalActiveSeconds ?? 0) / 3600).toFixed(1));

  const earnedThisMonth = activeHoursThisMonth * user.hourlyRate;
  const earnedThisWeek = activeHoursThisWeek * user.hourlyRate;

  const earningsCards = [
    {
      label: 'This week',
      icon: Clock,
      value: `${earnedThisWeek.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: 0 })} ${user.currency}`,
      sub: locale === 'pl' ? `${activeHoursThisWeek}h aktywnego kodowania` : `${activeHoursThisWeek}h active coding`,
      accent: false,
    },
    {
      label: 'This month (30d)',
      icon: TrendingUp,
      value: `${earnedThisMonth.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: 0 })} ${user.currency}`,
      sub: locale === 'pl' ? `${activeHoursThisMonth}h aktywnego kodowania` : `${activeHoursThisMonth}h active coding`,
      accent: true,
    },
    {
      label: 'Effective hourly',
      icon: DollarSign,
      value: `${user.hourlyRate.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US', { maximumFractionDigits: 2 })} ${user.currency}`,
      sub: 'Based on your saved rate',
      accent: false,
    },
  ];

  return (
    <Panel className="h-full overflow-hidden p-0 lg:p-0">
      <div className="grid h-full grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {earningsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={cn(
                'flex min-h-36 flex-col justify-between border-white/[0.06] p-5',
                index < earningsCards.length - 1 &&
                  'border-b sm:border-r sm:border-b-0 lg:border-r-0 lg:border-b xl:border-r xl:border-b-0',
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-subtle">{t(card.label)}</p>
                  <Icon className="h-4 w-4 text-subtle" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <p
                  className={cn(
                    'mt-3 font-mono text-2xl font-semibold tracking-tight tabular-nums',
                    card.accent ? 'text-brand' : 'text-foreground',
                  )}
                >
                  {card.value}
                </p>
              </div>
              <p className="mt-2 text-xs text-subtle">{t(card.sub)}</p>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
