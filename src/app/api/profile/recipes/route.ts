import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List all custom recipes for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const recipes = await db.customRecipe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ recipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new custom recipe
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, ingredients, steps, time, calories } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });
    }

    const recipe = await db.customRecipe.create({
      data: {
        userId,
        name: name.trim(),
        ingredients: ingredients || '',
        steps: steps || '',
        time: time || 0,
        calories: calories || 0,
      },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    console.error('Create recipe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
