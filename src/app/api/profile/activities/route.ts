import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

function calculatePoints(type: string, name: string, duration: number, calories: number): number {
  if (type === 'exercise') {
    const pointsPerMin: Record<string, number> = {
      'Cardio': 2, 'Fuerza': 2.5, 'Força': 2.5, 'Strength': 2.5, 'Force': 2.5, '力量': 2.5, '有氧': 2,
      'Flexibility': 1.5, 'Flexibilidad': 1.5, 'Flexibilité': 1.5, '柔韧': 1.5,
      'Yoga': 2, '瑜伽': 2,
      'Stretching': 1, 'Estiramiento': 1, 'Étirement': 1, 'Alongamento': 1, '拉伸': 1,
    };
    const rate = pointsPerMin[name] || 1.5;
    return Math.round(duration * rate);
  } else if (type === 'nutrition') {
    if (calories <= 0) return 5;
    if (calories <= 300) return 15;
    if (calories <= 500) return 12;
    if (calories <= 700) return 10;
    return 8;
  } else {
    return 5; // relaxation
  }
}

// GET: List activity logs for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date');

    const where: Record<string, unknown> = { userId };
    if (dateFilter) {
      where.date = dateFilter;
    }

    const activities = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Get activities error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Log a new activity
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, duration, calories, caloriesBurned, date } = body;

    if (!type || !name?.trim()) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    const points = calculatePoints(type, name, duration || 0, calories || 0);
    const today = date || new Date().toISOString().split('T')[0];

    const activity = await db.activityLog.create({
      data: {
        userId,
        type,
        name: name.trim(),
        duration: duration || 0,
        calories: calories || 0,
        caloriesBurned: caloriesBurned || 0,
        date: today,
        points,
      },
    });

    return NextResponse.json({ activity, points }, { status: 201 });
  } catch (error) {
    console.error('Create activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
