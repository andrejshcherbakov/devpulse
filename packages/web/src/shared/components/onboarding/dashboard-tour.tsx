'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { type JSX } from 'react/jsx-runtime';
import { type EventHandler, Joyride, type Locale, type Options, STATUS } from 'react-joyride';

import { useLanguage } from '@/shared/i18/language-context';

import { findTourById, findTourByPath } from './tour-steps';
import { hasSeenTour, markTourSeen } from './tour-storage';
import { tourStore } from './tour-store';
import { TourTooltip } from './tour-tooltip';

const DESKTOP_QUERY = '(min-width: 1024px)';

const TOUR_OPTIONS: Partial<Options> = {
  skipBeacon: true,
  zIndex: 10000,
  overlayColor: 'rgb(0 0 0 / 0.7)',
  spotlightPadding: 6,
  spotlightRadius: 12,
  offset: 12,
  blockTargetInteraction: true,
  overlayClickAction: false,
  dismissKeyAction: false,
};

interface DashboardTourProps {
  userId: string;
}

export function DashboardTour({ userId }: DashboardTourProps): JSX.Element | null {
  const { t } = useLanguage();
  const pathname = usePathname();
  const activeTourId = useSyncExternalStore(
    tourStore.subscribe,
    tourStore.getSnapshot,
    tourStore.getServerSnapshot,
  );

  useEffect(() => {
    const tour = findTourByPath(pathname);
    if (!tour) return undefined;

    const shouldRun = window.matchMedia(DESKTOP_QUERY).matches && !hasSeenTour(tour.id, userId);
    if (!shouldRun) return undefined;

    tourStore.start(tour.id);
    return () => tourStore.stop();
  }, [pathname, userId]);

  const tour = activeTourId ? findTourById(activeTourId) : undefined;
  if (!tour) return null;

  const translatedSteps = tour.steps.map((step) => ({
    ...step,
    title: typeof step.title === 'string' ? t(step.title) : step.title,
    content: typeof step.content === 'string' ? t(step.content) : step.content,
  }));

  const tourLocale: Locale = {
    back: t('Back'),
    close: t('Close'),
    last: t('Done'),
    next: t('Next'),
    skip: t('Skip'),
  };

  const handleEvent: EventHandler = (data) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      markTourSeen(tour.id, userId);
      tourStore.stop();
    }
  };

  return (
    <Joyride
      key={tour.id}
      run
      continuous
      steps={translatedSteps}
      options={TOUR_OPTIONS}
      locale={tourLocale}
      tooltipComponent={TourTooltip}
      floatingOptions={{ hideArrow: true }}
      onEvent={handleEvent}
    />
  );
}
