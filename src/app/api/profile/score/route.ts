import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// GET: Get scoring summary for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const allActivities = await db.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date().toISOString().split('T')[0];

    const todayActivities = allActivities.filter(a => a.date === today);
    const totalPoints = allActivities.reduce((sum, a) => sum + a.points, 0);
    const todayPoints = todayActivities.reduce((sum, a) => sum + a.points, 0);
    const todayCaloriesBurned = todayActivities.filter(a => a.type === 'exercise').reduce((sum, a) => sum + a.caloriesBurned, 0);
    const todayCaloriesConsumed = todayActivities.filter(a => a.type === 'nutrition').reduce((sum, a) => sum + a.calories, 0);
    const todayExerciseMin = todayActivities.filter(a => a.type === 'exercise').reduce((sum, a) => sum + a.duration, 0);

    // Weekly points (last 7 days)
    const weeklyPoints = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayPoints = allActivities.filter(a => a.date === dateStr).reduce((sum, a) => sum + a.points, 0);
      weeklyPoints.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        points: dayPoints,
      });
    }

    // Level calculation
    let level: string;
    let levelName: string;
    if (totalPoints < 50) { level = 'beginner'; levelName = 'Beginner'; }
    else if (totalPoints < 150) { level = 'active'; levelName = 'Active'; }
    else if (totalPoints < 400) { level = 'fit'; levelName = 'Fit'; }
    else if (totalPoints < 800) { level = 'warrior'; levelName = 'Warrior'; }
    else { level = 'champion'; levelName = 'Champion'; }

    return NextResponse.json({
      totalPoints,
      todayPoints,
      todayCaloriesBurned,
      todayCaloriesConsumed,
      todayExerciseMin,
      weeklyPoints,
      level,
      levelName,
      totalActivities: allActivities.length,
    });
  } catch (error) {
    console.error('Get score error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
