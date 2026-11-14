'use client';

import { useMemo, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/shared/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useLanguage } from '@/shared/i18/language-context';

const SUPPORTED_TIMEZONES = Intl.supportedValuesOf('timeZone');

interface TimezonePreferenceProps {
  initialTimezone: string;
  onSave: (timezone: string) => Promise<void>;
}

export function TimezonePreference({
  initialTimezone,
  onSave,
}: TimezonePreferenceProps): JSX.Element {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  const options = useMemo(
    () =>
      SUPPORTED_TIMEZONES.includes(initialTimezone)
        ? SUPPORTED_TIMEZONES
        : [initialTimezone, ...SUPPORTED_TIMEZONES],
    [initialTimezone],
  );

  const form = useForm({ defaultValues: { timezone: initialTimezone } });
  const currentValue = useWatch({ control: form.control, name: 'timezone' });

  const onSubmit = async (values: { timezone: string }) => {
    setIsPending(true);
    setError(null);
    try {
      await onSave(values.timezone);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('An unknown error occurred'));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem className="w-full sm:w-64">
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('Select timezone')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={currentValue === initialTimezone || isPending}
            loading={isPending}
            size="sm"
          >
            {t('Save')}
          </Button>
        </form>
      </Form>
      {error && <p className="text-xs text-red-coral">{error}</p>}
    </div>
  );
}
