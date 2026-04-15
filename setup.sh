#!/bin/bash
echo "═════════════════════════════════════════════════════════"
echo "  VitalMind - Setup Script (Linux/Mac)"
echo "═════════════════════════════════════════════════════════"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "[1/5] Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "   IMPORTANT: Edit .env with your Neon PostgreSQL credentials!"
    echo "   Open .env and replace the placeholder values."
    echo ""
    ${EDITOR:-nano} .env
else
    echo "[1/5] .env already exists - skipping"
fi

# Install dependencies
echo ""
echo "[2/5] Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install
elif command -v npm &> /dev/null; then
    npm install
else
    echo "   ERROR: Neither bun nor npm found. Please install Node.js first."
    exit 1
fi

# Generate Prisma client
echo ""
echo "[3/5] Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "   ERROR: Prisma generate failed. Make sure .env has NEON_DATABASE_URL set."
    exit 1
fi

# Push database schema
echo ""
echo "[4/5] Pushing database schema to Neon..."
npx prisma db push
if [ $? -ne 0 ]; then
    echo "   ERROR: Prisma db push failed. Check your NEON_DATABASE_URL in .env"
    exit 1
fi

# Done
echo ""
echo "[5/5] Setup complete!"
echo ""
echo "═════════════════════════════════════════════════════════"
echo "  To start the development server:"
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:3000"
echo "═════════════════════════════════════════════════════════"
