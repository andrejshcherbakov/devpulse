'use client';

import { type JSX } from 'react/jsx-runtime';

import { DateRangePicker } from '@/shared/components/ui/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useLanguage } from '@/shared/i18/language-context';

const periods = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
];

interface TimeSwitcherProps {
  value?: string;
  onValueChange?: (value: string) => void;
  customRange?: { startDate: string; endDate: string };
  onCustomRangeChange?: (range: { startDate: string; endDate: string }) => void;
}

export function TimeSwitcher({
  value = '7d',
  onValueChange,
  customRange,
  onCustomRangeChange,
}: TimeSwitcherProps): JSX.Element {
  const { t } = useLanguage();
  const handleRangeChange = (range: { startDate: string; endDate: string }) => {
    onCustomRangeChange?.(range);
    if (value !== 'custom') {
      onValueChange?.('custom');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={value} onValueChange={onValueChange}>
        <TabsList>
          {periods.map((p) => (
            <TabsTrigger key={p.id} value={p.id}>
              {t(p.label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DateRangePicker
        active={value === 'custom'}
        startDate={customRange?.startDate ?? ''}
        endDate={customRange?.endDate ?? ''}
        onChange={handleRangeChange}
      />
    </div>
  );
}
