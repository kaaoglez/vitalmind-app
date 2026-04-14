import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute AUDIT-C category
function getAuditCCategory(score: number): string {
  if (score <= 2) return 'low';
  if (score <= 4) return 'medium';
  return 'high';
}

// Compute habits score (0-10) and risk level
function calcHabitsScore(
  data: Record<string, unknown>
): { habitsScore: number; riskLevel: string; auditCScore: number; packYears: number; riskFactors: string[]; recommendations: string[] } {
  const alcoholFrequency = String(data.alcoholFrequency || 'never');
  const alcoholDrinksPerOccasion = Number(data.alcoholDrinksPerOccasion) || 0;
  const alcoholBinge = Boolean(data.alcoholBinge);
  const smokingStatus = String(data.smokingStatus || 'never');
  const cigarettesPerDay = Number(data.cigarettesPerDay) || 0;
  const yearsSmoking = Number(data.yearsSmoking) || 0;
  const vapingStatus = String(data.vapingStatus || 'never');
  const screenTimeHours = Number(data.screenTimeHours) || 4;
  const recreationalScreen = Number(data.recreationalScreen) || 2;
  const screenBeforeSleep = Number(data.screenBeforeSleep) || 5;
  const socialMediaHours = Number(data.socialMediaHours) || 1.5;
  const digitalDetoxDays = Number(data.digitalDetoxDays) || 0;
  const routineRegularity = Number(data.routineRegularity) || 5;
  const mealSchedule = Number(data.mealSchedule) || 5;
  const substanceUse = String(data.substanceUse || 'none');
  const caffeineDependency = Number(data.caffeineDependency) || 3;
  const stressManagement = Number(data.stressManagement) || 5;

  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // 1. AUDIT-C score computation (0-12 scale)
  let auditCFreq = 0;
  if (alcoholFrequency === 'never') auditCFreq = 0;
  else if (alcoholFrequency === 'monthly') auditCFreq = 1;
  else if (alcoholFrequency === 'weekly') auditCFreq = 2;
  else if (alcoholFrequency === 'daily') auditCFreq = 3;

  let auditCDrinks = 0;
  if (alcoholDrinksPerOccasion <= 1) auditCDrinks = 0;
  else if (alcoholDrinksPerOccasion <= 2) auditCDrinks = 1;
  else if (alcoholDrinksPerOccasion <= 4) auditCDrinks = 2;
  else auditCDrinks = 3;

  let auditCBinge = 0;
  if (alcoholBinge) auditCBinge = 1;

  const auditCScore = auditCFreq + auditCDrinks + auditCBinge;

  // AUDIT-C points (0-2.5): never=2.5, low=2, medium=1, high=0
  let auditCPoints = 0;
  if (alcoholFrequency === 'never') auditCPoints = 2.5;
  else if (auditCScore <= 2) auditCPoints = 2;
  else if (auditCScore <= 4) auditCPoints = 1;
  else auditCPoints = 0;

  if (auditCScore > 4) {
    riskFactors.push('Harmful alcohol consumption (AUDIT-C > 4)');
    recommendations.push('Consider reducing alcohol intake and consult a professional');
  }

  // 2. Smoking score (0-2.5)
  let smokingPoints = 0;
  if (smokingStatus === 'never') smokingPoints = 2.5;
  else if (smokingStatus === 'former') smokingPoints = 2;
  else if (smokingStatus === 'current' && cigarettesPerDay < 10) smokingPoints = 0.5;
  else smokingPoints = 0;

  if (smokingStatus === 'current') {
    riskFactors.push('Active smoking');
    recommendations.push('Smoking cessation is the single most impactful health improvement');
  }

  // 3. Vaping penalty
  let vapingPenalty = 0;
  if (vapingStatus === 'current') {
    vapingPenalty = 0.5;
    riskFactors.push('Active vaping');
    recommendations.push('Consider vaping cessation programs');
  }

  // 4. Screen score (0-2.5)
  let screenPoints = 0;
  if (screenTimeHours < 2) screenPoints = 2.5;
  else if (screenTimeHours < 4) screenPoints = 2;
  else if (screenTimeHours < 6) screenPoints = 1;
  else if (screenTimeHours < 8) screenPoints = 0.5;
  else screenPoints = 0;

  if (screenTimeHours >= 8) {
    riskFactors.push('Excessive screen time (8+ hours/day)');
    recommendations.push('Set screen time limits and take regular breaks');
  }

  // 5. Routine score (0-1.5): avg of routineRegularity + mealSchedule / 2, scaled
  const routineAvg = (routineRegularity + mealSchedule) / 2;
  const routinePoints = (routineAvg / 10) * 1.5;

  // 6. Stress management (0-1)
  const stressPoints = (stressManagement / 10) * 1;

  if (stressManagement <= 3) {
    riskFactors.push('Low stress management effectiveness');
    recommendations.push('Explore stress management techniques like meditation or therapy');
  }

  // Pack years calculation
  const packYears = smokingStatus === 'current' || smokingStatus === 'former'
    ? (cigarettesPerDay * yearsSmoking) / 20
    : 0;

  const raw = auditCPoints + smokingPoints - vapingPenalty + screenPoints + routinePoints + stressPoints;
  const habitsScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (smokingStatus === 'current' && auditCScore >= 4) riskLevel = 'urgent';
  else if (habitsScore <= 3) riskLevel = 'risk';
  else if (habitsScore <= 6) riskLevel = 'mild';

  return { habitsScore, riskLevel, auditCScore, packYears, riskFactors, recommendations };
}

// GET: List habits assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.habitsAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get habits assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new habits assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const { habitsScore, riskLevel, auditCScore, packYears, riskFactors, recommendations } = calcHabitsScore({ ...body });

    const assessment = await db.habitsAssessment.create({
      data: {
        userId,
        alcoholFrequency: body.alcoholFrequency || 'never',
        alcoholDrinksPerOccasion: Number(body.alcoholDrinksPerOccasion) || 0,
        alcoholBinge: Boolean(body.alcoholBinge),
        auditCScore,
        smokingStatus: body.smokingStatus || 'never',
        cigarettesPerDay: Number(body.cigarettesPerDay) || 0,
        yearsSmoking: Number(body.yearsSmoking) || 0,
        packYears,
        vapingStatus: body.vapingStatus || 'never',
        screenTimeHours: Number(body.screenTimeHours) || 4,
        recreationalScreen: Number(body.recreationalScreen) || 2,
        screenBeforeSleep: Number(body.screenBeforeSleep) || 5,
        socialMediaHours: Number(body.socialMediaHours) || 1.5,
        digitalDetoxDays: Number(body.digitalDetoxDays) || 0,
        routineRegularity: Number(body.routineRegularity) || 5,
        mealSchedule: Number(body.mealSchedule) || 5,
        substanceUse: body.substanceUse || 'none',
        caffeineDependency: Number(body.caffeineDependency) || 3,
        stressManagement: Number(body.stressManagement) || 5,
        habitsScore,
        riskLevel,
        riskFactors,
        recommendations,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create habits assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
