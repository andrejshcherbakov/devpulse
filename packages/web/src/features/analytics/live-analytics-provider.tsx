'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { type JSX } from 'react/jsx-runtime';

import { projectsKeys } from '@/features/projects/hooks';
import { sessionsKeys } from '@/features/sessions/hooks';
import { buildApiUrl } from '@/shared/api/api-client';

import { analyticsKeys } from './hooks';

const ANALYTICS_UPDATED_EVENT = 'analytics.updated';

const LiveAnalyticsContext = createContext<string | null>(null);

export function LiveAnalyticsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const queryClient = useQueryClient();
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const source = new EventSource(buildApiUrl('/analytics/stream'), {
      withCredentials: true,
    });

    const refreshVisibleData = (): void => {
      setUpdatedAt(new Date().toISOString());

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: analyticsKeys.all }),
        queryClient.invalidateQueries({ queryKey: sessionsKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectsKeys.all }),
      ]);
    };

    source.addEventListener(ANALYTICS_UPDATED_EVENT, refreshVisibleData);

    // A reconnect can happen after one or more update events were missed.
    source.addEventListener('open', refreshVisibleData);

    return () => {
      source.removeEventListener(ANALYTICS_UPDATED_EVENT, refreshVisibleData);
      source.removeEventListener('open', refreshVisibleData);
      source.close();
    };
  }, [queryClient]);

  return (
    <LiveAnalyticsContext.Provider value={updatedAt}>{children}</LiveAnalyticsContext.Provider>
  );
}

export function useLiveAnalyticsUpdatedAt(): string | null {
  return useContext(LiveAnalyticsContext);
}
