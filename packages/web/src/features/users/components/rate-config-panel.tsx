'use client';

import { useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { useRequireAuth } from '@/features/auth/context';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/shared/components/layout/panel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useLanguage } from '@/shared/i18/language-context';

export function RateConfigPanel(): JSX.Element {
  const { user, updateProfile } = useRequireAuth();
  const { t } = useLanguage();

  const [rateType, setRateType] = useState<'hourly' | 'monthly'>('hourly');
  const [rateInput, setRateInput] = useState<string>(user.hourlyRate.toString());
  const [currencyInput, setCurrencyInput] = useState<string>(user.currency);
  const [isSaving, setIsSaving] = useState(false);
  const parsedRate = Number(rateInput);
  const isRateValid = rateInput.trim().length > 0 && Number.isFinite(parsedRate) && parsedRate >= 0;

  const handleRateTypeChange = (newType: string) => {
    if (newType === rateType) return;
    const type = newType as 'hourly' | 'monthly';
    setRateType(type);

    if (!isRateValid) return;

    if (type === 'monthly') {
      setRateInput(Math.round(parsedRate * 160).toString());
    } else {
      setRateInput(Number((parsedRate / 160).toFixed(2)).toString());
    }
  };

  const handleSave = async () => {
    if (!isRateValid) return;

    setIsSaving(true);
    try {
      const hourlyRate = rateType === 'hourly' ? parsedRate : parsedRate / 160;
      await updateProfile({ hourlyRate, currency: currencyInput });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel className="h-full">
      <PanelHeader>
        <PanelTitle>{t('Rate configuration')}</PanelTitle>
      </PanelHeader>

      <PanelContent>
        <div className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-2">
            <Label>{t('Type')}</Label>
            <Tabs value={rateType} onValueChange={handleRateTypeChange}>
              <TabsList aria-label={t('Select rate type')}>
                <TabsTrigger value="hourly" disabled={isSaving}>
                  {t('Hourly')}
                </TabsTrigger>
                <TabsTrigger value="monthly" disabled={isSaving}>
                  {t('Monthly')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rate-amount">
              {rateType === 'hourly' ? t('Hourly rate') : t('Monthly rate')}
            </Label>

            <div className="flex items-center gap-2">
              <div className="w-28">
                <Select value={currencyInput} onValueChange={setCurrencyInput} disabled={isSaving}>
                  <SelectTrigger aria-label={t('Select currency')}>
                    <SelectValue placeholder={t('Currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="RUB">RUB (₽)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                id="rate-amount"
                type="number"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                min="0"
                step="0.1"
                disabled={isSaving}
                className="w-32 font-mono"
              />

              <Button onClick={handleSave} loading={isSaving} disabled={isSaving || !isRateValid}>
                {t('Save')}
              </Button>
            </div>
          </div>
        </div>
      </PanelContent>
    </Panel>
  );
}
