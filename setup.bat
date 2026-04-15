@echo off
echo ═══════════════════════════════════════════════════════
echo   VitalMind - Setup Script (Windows)
echo ═══════════════════════════════════════════════════════
echo.

:: Check if .env exists
if not exist .env (
    echo [1/5] Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo    IMPORTANT: Edit .env with your Neon PostgreSQL credentials!
    echo    Open .env and replace the placeholder values.
    echo.
    start notepad .env
    echo    Press any key after you've edited .env...
    pause > nul
) else (
    echo [1/5] .env already exists - skipping
)

:: Install dependencies
echo.
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo    ERROR: npm install failed. Trying with bun...
    call bun install
)

:: Generate Prisma client
echo.
echo [3/5] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo    ERROR: Prisma generate failed. Make sure .env has NEON_DATABASE_URL set.
    pause
    exit /b 1
)

:: Push database schema
echo.
echo [4/5] Pushing database schema to Neon...
call npx prisma db push
if errorlevel 1 (
    echo    ERROR: Prisma db push failed. Check your NEON_DATABASE_URL in .env
    pause
    exit /b 1
)

:: Done
echo.
echo [5/5] Setup complete!
echo.
echo ═══════════════════════════════════════════════════════
echo   To start the development server:
echo     npm run dev
echo.
echo   Then open http://localhost:3000
echo ═══════════════════════════════════════════════════════
pause
