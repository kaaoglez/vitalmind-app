import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List all custom exercises for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const exercises = await db.customExercise.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ exercises });
  } catch (error) {
    console.error('Get exercises error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new custom exercise
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { name, duration, type, notes, caloriesBurned } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 });
    }

    const exercise = await db.customExercise.create({
      data: {
        userId,
        name: name.trim(),
        duration: duration || 0,
        type: type || 'Cardio',
        notes: notes || '',
        caloriesBurned: caloriesBurned || 0,
      },
    });

    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    console.error('Create exercise error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
