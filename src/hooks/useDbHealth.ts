'use client';

import { useState, useEffect, useCallback } from 'react';

interface DbHealthStatus {
  ok: boolean;
  db: string;
  error?: string;
  checked: boolean;
}

/**
 * Hook to check database connection health.
 * Polls /api/health to verify the Prisma client is generated
 * and the database is reachable.
 */
export function useDbHealth(intervalMs = 30000): DbHealthStatus & { recheck: () => void } {
  const [status, setStatus] = useState<DbHealthStatus>({
    ok: false,
    db: 'unchecked',
    checked: false,
  });

  const check = useCallback(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => {
        setStatus({
          ok: data.ok === true,
          db: data.db || 'unknown',
          error: data.error,
          checked: true,
        });
      })
      .catch(err => {
        setStatus({
          ok: false,
          db: 'error',
          error: err instanceof Error ? err.message : 'Health check failed',
          checked: true,
        });
      });
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [check, intervalMs]);

  return { ...status, recheck: check };
}
