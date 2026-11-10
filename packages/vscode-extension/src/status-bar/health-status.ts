export type HealthStatus = 'ok' | 'missing-key' | 'invalid-key' | 'offline' | 'error';

const HEALTH_PRIORITY: Record<HealthStatus, number> = {
  ok: 0,
  offline: 1,
  error: 2,
  'missing-key': 3,
  'invalid-key': 4,
};

export function combineHealthStatuses(
  syncHealth: HealthStatus,
  statsHealth: HealthStatus,
): HealthStatus {
  return HEALTH_PRIORITY[syncHealth] >= HEALTH_PRIORITY[statsHealth] ? syncHealth : statsHealth;
}
