import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Fetch combined wellness data for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch or create wellness data
    let wellnessData = await db.wellnessData.findUnique({ where: { userId } });
    if (!wellnessData) {
      wellnessData = await db.wellnessData.create({ data: { userId } });
    }

    // Fetch recent mood logs (last 30)
    const moodLogs = await db.moodLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Fetch exercise logs (last 30)
    const exerciseLogs = await db.exerciseLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // Fetch challenge logs
    const challengeLogs = await db.challengeLog.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
    });

    // Transform DB data to match the WellnessData interface
    const data = {
      waterGlasses: wellnessData.waterGlasses,
      waterDate: wellnessData.waterDate,
      moodLogs: moodLogs.map(log => ({
        date: log.date,
        mood: log.mood,
        emotions: JSON.parse(log.emotions),
        note: log.note ?? undefined,
      })),
      stressLevel: wellnessData.stressLevel,
      sleepAnswers: JSON.parse(wellnessData.sleepAnswers),
      completedChallenges: challengeLogs.map(log => log.challengeName),
      challengeStreak: 0, // Calculate streak dynamically
      selfCareChecked: JSON.parse(wellnessData.selfCareChecked),
      exerciseMinutes: wellnessData.exerciseMinutes,
      exerciseWeek: wellnessData.exerciseWeek,
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Get wellness data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update wellness data for the authenticated user
export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();

    // Update wellness data
    const updateData: Record<string, unknown> = {};
    if (body.waterGlasses !== undefined) updateData.waterGlasses = body.waterGlasses;
    if (body.waterDate !== undefined) updateData.waterDate = body.waterDate;
    if (body.stressLevel !== undefined) updateData.stressLevel = body.stressLevel;
    if (body.sleepAnswers !== undefined) updateData.sleepAnswers = JSON.stringify(body.sleepAnswers);
    if (body.selfCareChecked !== undefined) updateData.selfCareChecked = JSON.stringify(body.selfCareChecked);
    if (body.exerciseMinutes !== undefined) updateData.exerciseMinutes = body.exerciseMinutes;
    if (body.exerciseWeek !== undefined) updateData.exerciseWeek = body.exerciseWeek;

    if (Object.keys(updateData).length > 0) {
      await db.wellnessData.upsert({
        where: { userId },
        create: { userId, ...updateData },
        update: updateData,
      });
    }

    // Sync mood logs - upsert each
    if (body.moodLogs && Array.isArray(body.moodLogs)) {
      for (const log of body.moodLogs) {
        await db.moodLog.upsert({
          where: { userId_date: { userId, date: log.date } },
          create: {
            userId,
            date: log.date,
            mood: log.mood,
            emotions: JSON.stringify(log.emotions ?? []),
            note: log.note ?? null,
          },
          update: {
            mood: log.mood,
            emotions: JSON.stringify(log.emotions ?? []),
            note: log.note ?? null,
          },
        });
      }
    }

    // Sync challenge completions
    if (body.completedChallenges && Array.isArray(body.completedChallenges)) {
      // Get existing challenge names
      const existing = await db.challengeLog.findMany({
        where: { userId },
        select: { challengeName: true },
      });
      const existingNames = new Set(existing.map(e => e.challengeName));

      // Create only new challenges
      for (const name of body.completedChallenges) {
        if (!existingNames.has(name)) {
          await db.challengeLog.create({
            data: { userId, challengeName: name },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update wellness data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
