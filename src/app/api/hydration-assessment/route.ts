import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute hydration area score (0-10)
function calcHydrationScore(
  data: Record<string, unknown>,
  weight: number
): { score: number; riskLevel: string; recommendedMlPerKg: number } {
  const dailyLiters = Number(data.dailyLiters) || 1.5;
  const intakeFreq = Number(data.intakeFrequency) || 5;
  const withMeals = Number(data.withMeals) || 5;
  const duringExercise = Number(data.duringExercise) || 5;
  const urineColor = Number(data.urineColor) || 3;
  const dehydrationSigns = Number(data.dehydrationSigns) || 0;
  const sugaryFreq = Number(data.sugaryDrinksFreq) || 3;
  const caffeineFreq = Number(data.caffeineDrinksFreq) || 3;
  const alcoholFreq = Number(data.alcoholDrinksFreq) || 1;
  const hotClimate = data.hotClimate === true;
  const highAltitude = data.highAltitude === true;
  const firstGlass = data.firstGlassMorning === true;

  // Calculate recommended intake based on weight (30-35 ml/kg)
  const recommendedMlPerKg = weight > 0 ? Math.round(weight * 33) : 0;

  // 1. Volume score (0-3.5 points)
  let volumeScore = 0;
  if (weight > 0 && recommendedMlPerKg > 0) {
    const actualMl = dailyLiters * 1000;
    const ratio = actualMl / recommendedMlPerKg;
    if (ratio >= 0.9 && ratio <= 1.3) volumeScore = 3.5; // optimal range
    else if (ratio >= 0.7 && ratio <= 1.5) volumeScore = 2.5;
    else if (ratio >= 0.5) volumeScore = 1.5;
    else volumeScore = 0.5;
  } else {
    // No weight data, use general guidelines (2L+ = good)
    if (dailyLiters >= 2.0 && dailyLiters <= 3.5) volumeScore = 3.5;
    else if (dailyLiters >= 1.5 && dailyLiters <= 4.0) volumeScore = 2.5;
    else if (dailyLiters >= 1.0) volumeScore = 1.5;
    else volumeScore = 0.5;
  }

  // 2. Urine color score (0-2 points) - lower is better
  let urineScore = 0;
  if (urineColor <= 2) urineScore = 2; // well hydrated
  else if (urineColor <= 3) urineScore = 1.5;
  else if (urineColor <= 4) urineScore = 1;
  else if (urineColor <= 5) urineScore = 0.5;
  else urineScore = 0; // dehydrated

  // 3. Habit quality (0-2.5 points)
  const habitAvg = (intakeFreq + withMeals + duringExercise) / 3;
  const habitScore = (habitAvg / 10) * 2;
  const morningBonus = firstGlass ? 0.25 : 0;
  const habitTotal = habitScore + morningBonus;

  // 4. Dehydration signs penalty (0 to -2)
  const dehydPenalty = Math.min(dehydrationSigns * 0.3, 2);

  // 5. Beverage quality (0-1.5 points) - less sugary/caffeine/alcohol = better
  const beverageAvg = ((10 - sugaryFreq) + (10 - caffeineFreq) + (10 - alcoholFreq)) / 3;
  const beverageScore = (beverageAvg / 10) * 1.5;

  // 6. Climate factors bonus/penalty
  let climateAdj = 0;
  if (hotClimate && dailyLiters < 2.5) climateAdj = -0.5;
  if (highAltitude && dailyLiters < 2.5) climateAdj = -0.3;

  const raw = volumeScore + urineScore + habitTotal - dehydPenalty + beverageScore + climateAdj;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (urineColor >= 6 || dehydrationSigns >= 5 || dailyLiters < 0.8) riskLevel = 'urgent';
  else if (urineColor >= 5 || dehydrationSigns >= 3 || score <= 4) riskLevel = 'risk';
  else if (urineColor >= 4 || dehydrationSigns >= 2 || score <= 6) riskLevel = 'mild';

  return { score, riskLevel, recommendedMlPerKg };
}

// GET: List hydration assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.hydrationAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get hydration assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new hydration assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    // Try to get weight from user profile
    let weight = 0;
    try {
      const profile = await db.userProfile.findUnique({ where: { userId } });
      if (profile && profile.weight > 0) weight = profile.weight;
    } catch { /* profile may not exist */ }

    const { score: hydrationScore, riskLevel, recommendedMlPerKg } = calcHydrationScore(
      { ...body },
      weight
    );

    const assessment = await db.hydrationAssessment.create({
      data: {
        userId,
        dailyLiters: Number(body.dailyLiters) || 1.5,
        intakeFrequency: Number(body.intakeFrequency) || 5,
        firstGlassMorning: body.firstGlassMorning === true,
        withMeals: Number(body.withMeals) || 5,
        duringExercise: Number(body.duringExercise) || 5,
        urineColor: Number(body.urineColor) || 3,
        dehydrationSigns: Number(body.dehydrationSigns) || 0,
        sugaryDrinksFreq: Number(body.sugaryDrinksFreq) || 3,
        caffeineDrinksFreq: Number(body.caffeineDrinksFreq) || 3,
        alcoholDrinksFreq: Number(body.alcoholDrinksFreq) || 1,
        hotClimate: body.hotClimate === true,
        highAltitude: body.highAltitude === true,
        weight,
        recommendedMlPerKg,
        hydrationScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create hydration assessment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
