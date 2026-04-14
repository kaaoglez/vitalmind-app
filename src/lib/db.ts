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

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
