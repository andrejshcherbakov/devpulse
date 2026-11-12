'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { projectsKeys } from '@/features/projects/hooks';
import { sessionsKeys } from '@/features/sessions/hooks';
import { buildApiUrl } from '@/shared/api/api-client';

import { analyticsKeys } from './hooks';

const ANALYTICS_UPDATED_EVENT = 'analytics.updated';

export function useLiveAnalyticsUpdates(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(buildApiUrl('/analytics/stream'), {
      withCredentials: true,
    });

    const refreshVisibleData = (): void => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionsKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
      ]);
    };

    source.addEventListener(ANALYTICS_UPDATED_EVENT, refreshVisibleData);

    source.addEventListener('open', refreshVisibleData);

    return () => {
      source.removeEventListener(ANALYTICS_UPDATED_EVENT, refreshVisibleData);
      source.removeEventListener('open', refreshVisibleData);
      source.close();
    };
  }, [queryClient]);
}
