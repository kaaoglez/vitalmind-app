import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// POST: Create a new mood log entry
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { date, mood, emotions, note } = body;

    if (!date || !mood) {
      return NextResponse.json({ error: 'Date and mood are required' }, { status: 400 });
    }

    const moodLog = await db.moodLog.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        mood,
        emotions: JSON.stringify(emotions ?? []),
        note: note ?? null,
      },
      update: {
        mood,
        emotions: JSON.stringify(emotions ?? []),
        note: note ?? null,
      },
    });

    return NextResponse.json({
      moodLog: {
        date: moodLog.date,
        mood: moodLog.mood,
        emotions: JSON.parse(moodLog.emotions),
        note: moodLog.note ?? undefined,
      },
    });
  } catch (error) {
    console.error('Create mood log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
