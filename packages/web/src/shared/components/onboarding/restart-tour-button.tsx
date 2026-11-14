'use client';

import { useRouter } from 'next/navigation';
import { type JSX } from 'react/jsx-runtime';

import { Button } from '@/shared/components/ui/button';
import { useLanguage } from '@/shared/i18/language-context';

import { TOUR_START_PATH } from './tour-steps';
import { resetAllTours } from './tour-storage';

interface RestartTourButtonProps {
  userId: string;
}

export function RestartTourButton({ userId }: RestartTourButtonProps): JSX.Element {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        resetAllTours(userId);
        router.push(TOUR_START_PATH);
      }}
    >
      {t('Restart tour')}
    </Button>
  );
}
