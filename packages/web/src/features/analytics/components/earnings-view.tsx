'use client';

import { type JSX } from 'react/jsx-runtime';

import { RateConfigPanel } from '@/features/users/components/rate-config-panel';
import {
  Page,
  PageDescription,
  PageEyebrow,
  PageHeader,
  PageHeaderHeading,
  PageTitle,
} from '@/shared/components/layout/page';
import { useLanguage } from '@/shared/i18/language-context';

import type { DateRange } from '../hooks';
import { EarningsSummaryCards } from './earnings-summary-cards';

interface EarningsViewProps {
  range30d: DateRange;
  range7d: DateRange;
}

export function EarningsView({ range30d, range7d }: EarningsViewProps): JSX.Element {
  const { t } = useLanguage();

  return (
    <Page>
      <PageHeader>
        <div>
          <PageEyebrow>{t('Value of focus')}</PageEyebrow>
          <PageHeaderHeading>
            <PageTitle>{t('Earnings')}</PageTitle>
          </PageHeaderHeading>
          <PageDescription>{t('Set your rate and see how much your focus is worth')}</PageDescription>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <div data-tour="earnings-rate" className="lg:col-span-5">
          <RateConfigPanel />
        </div>
        <div data-tour="earnings-summary" className="lg:col-span-7">
          <EarningsSummaryCards range30d={range30d} range7d={range7d} />
        </div>
      </div>
    </Page>
  );
}
