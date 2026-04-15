import { NextResponse } from 'next/server';
import { checkDbConnection } from '@/lib/db';

/**
 * GET /api/health
 * Health check endpoint to verify database connectivity and Prisma client status.
 * Returns { ok, db, error? }
 */
export async function GET() {
  const dbCheck = await checkDbConnection();

  return NextResponse.json({
    ok: dbCheck.ok,
    db: dbCheck.ok ? 'connected' : 'disconnected',
    ...(dbCheck.error ? { error: dbCheck.error } : {}),
    timestamp: new Date().toISOString(),
  });
}
