import { useCallback, useRef, useState } from 'react';

import { worklogService } from '@/shared/api/services';
import { getErrorMessage } from '@/shared/lib/error';
import type {
  WorklogDayResult,
  WorklogFormat,
  WorklogLanguage,
  WorklogPlan,
  WorklogPlanDay,
} from '@/shared/types';

export type DayStatus = 'pending' | 'loading' | 'done' | 'failed';
export type RunPhase = 'idle' | 'planning' | 'running' | 'finished';

export interface DayState {
  day: WorklogPlanDay;
  status: DayStatus;
  result?: WorklogDayResult;
  error?: string;
}

export interface WorklogRunOptions {
  startDate: string;
  endDate: string;
  format: WorklogFormat;
  language: WorklogLanguage;
}

export interface WorklogRunResult {
  phase: RunPhase;
  plan: WorklogPlan | null;
  days: Array<DayState>;
  error: string | null;
  start: (options: WorklogRunOptions) => Promise<void>;
  resume: () => void;
  cancel: () => void;
  regenerateDay: (date: string, language: WorklogLanguage) => Promise<void>;
}

export function useWorklogRun(): WorklogRunResult {
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [plan, setPlan] = useState<WorklogPlan | null>(null);
  const [days, setDays] = useState<Array<DayState>>([]);
  const [error, setError] = useState<string | null>(null);

  const optionsRef = useRef<WorklogRunOptions | null>(null);
  const cancelledRef = useRef(false);

  const patchDay = useCallback((date: string, patch: Partial<DayState>) => {
    setDays((previous) =>
      previous.map((item) => (item.day.date === date ? { ...item, ...patch } : item)),
    );
  }, []);

  const generateDay = useCallback(
    async (date: string, force: boolean, language?: WorklogLanguage): Promise<boolean> => {
      const options = optionsRef.current;

      if (!options) return false;

      patchDay(date, { status: 'loading', error: undefined });

      try {
        const result = await worklogService.generateDay({
          date,
          format: options.format,
          language: language ?? options.language,
          force,
        });

        patchDay(date, { status: 'done', result });
        return true;
      } catch (err) {
        patchDay(date, { status: 'failed', error: getErrorMessage(err) });
        return false;
      }
    },
    [patchDay],
  );

  const runDates = useCallback(
    async (dates: ReadonlyArray<string>) => {
      cancelledRef.current = false;
      setPhase('running');

      for (const date of dates) {
        if (cancelledRef.current) break;

        const succeeded = await generateDay(date, false);

        if (!succeeded) break;
      }

      setPhase('finished');
    },
    [generateDay],
  );

  const start = useCallback(
    async (options: WorklogRunOptions) => {
      optionsRef.current = options;
      setError(null);
      setPlan(null);
      setDays([]);
      setPhase('planning');

      try {
        const nextPlan = await worklogService.getPlan({
          startDate: options.startDate,
          endDate: options.endDate,
        });

        setPlan(nextPlan);
        setDays(nextPlan.days.map((day) => ({ day, status: 'pending' })));

        if (nextPlan.exceedsLimit) {
          setPhase('finished');
          return;
        }

        await runDates(nextPlan.days.map((day) => day.date));
      } catch (err) {
        setError(getErrorMessage(err));
        setPhase('idle');
      }
    },
    [runDates],
  );

  const resume = useCallback(() => {
    const dates = days.filter((item) => item.status !== 'done').map((item) => item.day.date);

    void runDates(dates);
  }, [days, runDates]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const regenerateDay = useCallback(
    async (date: string, language: WorklogLanguage) => {
      await generateDay(date, true, language);
    },
    [generateDay],
  );

  return { phase, plan, days, error, start, resume, cancel, regenerateDay };
}
