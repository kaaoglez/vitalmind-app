import { PrismaClient } from '@prisma/client'

// Ensure the Neon PostgreSQL URL is used even if a system-level DATABASE_URL (e.g., SQLite) exists
// The Prisma schema uses NEON_DATABASE_URL / NEON_DIRECT_URL to avoid conflicts
if (!process.env.NEON_DATABASE_URL && process.env.DATABASE_URL?.startsWith('postgresql://')) {
  process.env.NEON_DATABASE_URL = process.env.DATABASE_URL
}
if (!process.env.NEON_DIRECT_URL && process.env.DIRECT_URL?.startsWith('postgresql://')) {
  process.env.NEON_DIRECT_URL = process.env.DIRECT_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prismaClient: PrismaClient

try {
  prismaClient =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

  // Validate that the Prisma client was properly generated
  // If prisma generate was never run, the models will be undefined
  if (typeof (prismaClient as unknown as Record<string, unknown>).user === 'undefined') {
    console.error(
      '⚠️  Prisma Client is not generated! Run: npx prisma generate\n' +
      '   Then run: npx prisma db push\n' +
      '   Make sure .env has NEON_DATABASE_URL set.'
    )
  }

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaClient
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error)
  console.error(
    'Please ensure:\n' +
    '  1. Run: npm install (or bun install)\n' +
    '  2. Run: npx prisma generate\n' +
    '  3. Run: npx prisma db push\n' +
    '  4. .env file has NEON_DATABASE_URL set'
  )
  // Re-throw to prevent the app from running with a broken DB
  throw error
}

export const db = prismaClient

/**
 * Check if the Prisma client is properly generated and can connect to the database.
 * Returns { ok: true } or { ok: false, error: string }
 */
export async function checkDbConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Quick check: are the models defined?
    if (typeof (db as unknown as Record<string, unknown>).user === 'undefined') {
      return {
        ok: false,
        error: 'Prisma Client not generated. Run: npx prisma generate && npx prisma db push',
      }
    }
    // Try a lightweight query to verify DB connection
    await db.$queryRaw`SELECT 1`
    return { ok: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { ok: false, error: msg }
  }
}
