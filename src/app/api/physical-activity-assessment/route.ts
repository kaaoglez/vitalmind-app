import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// IPAQ MET computation
// Vigorous: 8 MET, Moderate: 4 MET, Walking: 3.3 MET
function computeIPAQ(data: Record<string, unknown>) {
  const vigDays = Number(data.ipaqVigorousDays) || 0;
  const vigMin = Number(data.ipaqVigorousMin) || 0;
  const modDays = Number(data.ipaqModerateDays) || 0;
  const modMin = Number(data.ipaqModerateMin) || 0;
  const walkDays = Number(data.ipaqWalkingDays) || 0;
  const walkMin = Number(data.ipaqWalkingMin) || 0;

  const vigorousMET = Math.round(vigDays * vigMin * 8);
  const moderateMET = Math.round(modDays * modMin * 4);
  const walkingMET = Math.round(walkDays * walkMin * 3.3);
  const totalMET = vigorousMET + moderateMET + walkingMET;

  // IPAQ classification
  // High: vigorous >= 3 days && >= 20 min/day OR vigorous >= 1500 MET-min/week OR total >= 3000 MET-min/week
  // Moderate: vigorous >= 3 days && >= 20 min/day OR moderate/walking >= 5 days && >= 30 min/day OR total >= 600 MET-min/week
  // Low: everything else
  let ipaqCategory = 'low';
  if (
    (vigDays >= 3 && vigMin >= 20) ||
    vigorousMET >= 1500 ||
    totalMET >= 3000
  ) {
    ipaqCategory = 'high';
  } else if (
    (vigDays >= 3 && vigMin >= 20) ||
    (modDays + walkDays >= 5 && (modMin + walkMin) >= 30) ||
    totalMET >= 600
  ) {
    ipaqCategory = 'moderate';
  }

  return { vigorousMET, moderateMET, walkingMET, totalMET, ipaqCategory };
}

// Compute physical activity area score (0-10)
function calcPhysicalScore(
  data: Record<string, unknown>,
  ipaq: ReturnType<typeof computeIPAQ>
): { score: number; riskLevel: string } {
  // IPAQ contribution (0-4 points)
  let ipaqPoints = 0;
  if (ipaq.ipaqCategory === 'high') ipaqPoints = 4;
  else if (ipaq.ipaqCategory === 'moderate') ipaqPoints = 2.5;
  else ipaqPoints = Math.min(ipaq.totalMET / 600, 1) * 1.5;

  // Daily steps (0-1.5 points) - OMS recommends 7000-10000
  const steps = Number(data.dailySteps) || 5000;
  const stepsPoints = Math.min(steps / 10000, 1) * 1.5;

  // Subjective indicators (0-3 points)
  const cardio = Number(data.cardioEndurance) || 5;
  const strength = Number(data.muscularStrength) || 5;
  const mob = Number(data.mobility) || 5;
  const variety = Number(data.exerciseVariety) || 5;
  const recovery = Number(data.recoveryQuality) || 5;
  const subjAvg = (cardio + strength + mob + variety + recovery) / 5;
  const subjPoints = (subjAvg / 10) * 3;

  // Weekly active days (0-1 point) - OMS recommends >= 3 days
  const activeDays = Number(data.weeklyActiveDays) || 3;
  const activeDaysPoints = Math.min(activeDays / 5, 1) * 1;

  // Sedentary penalty (0-0.5 points)
  const sitting = Number(data.ipaqSittingMin) || 480;
  const sittingPenalty = sitting > 600 ? -0.5 : sitting > 480 ? 0 : Math.min((480 - sitting) / 480, 1) * 0.5;

  // Resting HR bonus from profile (0-0) but affects risk
  const restingHR = Number(data.restingHR) || 0;

  const raw = ipaqPoints + stepsPoints + subjPoints + activeDaysPoints + sittingPenalty;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (ipaq.ipaqCategory === 'low' && score <= 2) riskLevel = 'urgent';
  else if (ipaq.ipaqCategory === 'low' || score <= 4) riskLevel = 'risk';
  else if (score <= 6 || sitting > 540) riskLevel = 'mild';

  // Elevated resting HR increases risk
  if (restingHR > 90 && riskLevel === 'mild') riskLevel = 'risk';
  if (restingHR > 100) riskLevel = 'risk';

  return { score, riskLevel };
}

// GET: List physical activity assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.physicalActivityAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get physical activity assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new physical activity assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    // Compute IPAQ METs
    const ipaq = computeIPAQ(body);

    // Try to get resting HR from user profile
    let restingHR = 0;
    try {
      const profile = await db.userProfile.findUnique({ where: { userId } });
      if (profile && profile.restingHR) restingHR = profile.restingHR;
    } catch { /* profile may not exist */ }

    // Compute score
    const { score: physicalScore, riskLevel } = calcPhysicalScore(
      { ...body, restingHR },
      ipaq
    );

    const assessment = await db.physicalActivityAssessment.create({
      data: {
        userId,
        ipaqVigorousDays: Number(body.ipaqVigorousDays) || 0,
        ipaqVigorousMin: Number(body.ipaqVigorousMin) || 0,
        ipaqModerateDays: Number(body.ipaqModerateDays) || 0,
        ipaqModerateMin: Number(body.ipaqModerateMin) || 0,
        ipaqWalkingDays: Number(body.ipaqWalkingDays) || 0,
        ipaqWalkingMin: Number(body.ipaqWalkingMin) || 0,
        ipaqSittingMin: Number(body.ipaqSittingMin) || 480,
        vigorousMET: ipaq.vigorousMET,
        moderateMET: ipaq.moderateMET,
        walkingMET: ipaq.walkingMET,
        totalMET: ipaq.totalMET,
        ipaqCategory: ipaq.ipaqCategory,
        dailySteps: Number(body.dailySteps) || 5000,
        cardioEndurance: Number(body.cardioEndurance) || 5,
        muscularStrength: Number(body.muscularStrength) || 5,
        mobility: Number(body.mobility) || 5,
        exerciseVariety: Number(body.exerciseVariety) || 5,
        recoveryQuality: Number(body.recoveryQuality) || 5,
        weeklyActiveDays: Number(body.weeklyActiveDays) || 3,
        restingHR,
        physicalScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create physical activity assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
