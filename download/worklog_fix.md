---
Task ID: 1
Agent: Main Agent
Task: Fix "Cannot read properties of undefined (reading 'create')" error - assessments not saving to database

Work Log:
- Investigated the error by reading all 9 API route files, Prisma schema, db.ts, and evaluation components
- Discovered the root cause: system environment variable DATABASE_URL was set to file:/home/z/my-project/db/custom.db (SQLite), overriding the Neon PostgreSQL URL in .env
- In Next.js, system env vars take precedence over .env files, so Prisma was trying to use SQLite instead of PostgreSQL
- This caused PrismaClient initialization to fail with "the URL must start with the protocol postgresql://" which resulted in the undefined.create error
- Fixed by renaming Prisma env vars from DATABASE_URL/DIRECT_URL to NEON_DATABASE_URL/NEON_DIRECT_URL
- Updated prisma/schema.prisma to use new env var names
- Updated .env file with new variable names
- Added fallback logic in src/lib/db.ts for backward compatibility
- Added env configuration in next.config.ts to ensure NEON_DATABASE_URL is available at build/runtime
- Added prisma generate to build script and postinstall in package.json
- Verified all 9 assessment types save successfully to Neon PostgreSQL database via direct Prisma test
- Verified Mental Assessment and Nutrition Assessment work through the full API flow

Stage Summary:
- Root cause: DATABASE_URL system env var (SQLite) overriding .env PostgreSQL URL
- Fix: Renamed Prisma env vars to NEON_DATABASE_URL / NEON_DIRECT_URL
- All 9 assessment types confirmed saving to database correctly
- Build succeeds without errors
- Files modified: prisma/schema.prisma, .env, src/lib/db.ts, next.config.ts, package.json
