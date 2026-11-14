'use client';

import { addDays, differenceInCalendarDays } from 'date-fns';
import { enUS, pl } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import * as React from 'react';
import { useMemo, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { type DateRange as DayPickerRange } from 'react-day-picker';

import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { useLanguage } from '@/shared/i18/language-context';
import { cn } from '@/shared/lib/cn';
import { formatDateLabel, parseDateInput, toDateInput } from '@/shared/lib/date';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  active?: boolean;
  maxDays?: number;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  active = false,
  maxDays,
}: DateRangePickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const { locale } = useLanguage();

  const selected: DayPickerRange = useMemo(
    () => ({ from: parseDateInput(startDate), to: parseDateInput(endDate) }),
    [startDate, endDate],
  );

  const handleSelect = (range: DayPickerRange | undefined) => {
    if (!range?.from || !range.to) {
      return;
    }

    let { to } = range;

    if (maxDays !== undefined && differenceInCalendarDays(to, range.from) + 1 > maxDays) {
      const limit = addDays(range.from, maxDays - 1);
      const today = new Date();

      to = limit > today ? today : limit;
    }

    onChange({ startDate: toDateInput(range.from), endDate: toDateInput(to) });
    setOpen(false);
  };

  const from = selected.from ?? new Date();
  const to = selected.to ?? new Date();
  const isSameDay = toDateInput(from) === toDateInput(to);

  const label = isSameDay
    ? formatDateLabel(from, locale)
    : `${formatDateLabel(from, locale)} — ${formatDateLabel(to, locale)}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'min-w-44 justify-start gap-2 font-normal whitespace-nowrap',
            active && 'border-gray-alpha-300 bg-gray-alpha-50',
          )}
        >
          <CalendarDays
            className="h-4 w-4 shrink-0 text-subtle"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-[13px]">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected.from}
          disabled={{ after: new Date() }}
          numberOfMonths={2}
          locale={locale === 'pl' ? pl : enUS}
        />
      </PopoverContent>
    </Popover>
  );
}
