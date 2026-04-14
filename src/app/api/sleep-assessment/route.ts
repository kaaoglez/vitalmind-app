import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute PSQI category from total score
function getPsqiCategory(total: number): string {
  if (total <= 4) return 'good';
  if (total <= 7) return 'mild';
  if (total <= 14) return 'poor';
  return 'severe';
}

// Compute sleep area score (0-10) and risk level
function calcSleepScore(
  data: Record<string, unknown>
): { sleepScore: number; riskLevel: string; psqiTotal: number; psqiCategory: string } {
  const psqiQuality = Number(data.psqiQuality) || 0;
  const psqiLatency = Number(data.psqiLatency) || 0;
  const psqiDuration = Number(data.psqiDuration) || 0;
  const psqiEfficiency = Number(data.psqiEfficiency) || 0;
  const psqiDisturbances = Number(data.psqiDisturbances) || 0;
  const psqiMedication = Number(data.psqiMedication) || 0;
  const psqiDysfunction = Number(data.psqiDysfunction) || 0;

  // PSQI global score (0-21)
  const psqiTotal = psqiQuality + psqiLatency + psqiDuration + psqiEfficiency + psqiDisturbances + psqiMedication + psqiDysfunction;
  const psqiCategory = getPsqiCategory(psqiTotal);

  // Additional indicators
  const sleepHours = Number(data.sleepHours) || 7;
  const timeToFallAsleep = Number(data.timeToFallAsleep) || 15;
  const nightAwakenings = Number(data.nightAwakenings) || 1;
  const energyOnWakeup = Number(data.energyOnWakeup) || 5;
  const sleepRegularity = Number(data.sleepRegularity) || 5;
  const screenBeforeBed = Number(data.screenBeforeBed) || 5;
  const caffeineAfternoon = Number(data.caffeineAfternoon) || 3;
  const circadianScore = Number(data.circadianScore) || 5;

  // 1. PSQI component (0-4 points) - inverse: lower PSQI = better score
  let psqiPoints = 0;
  if (psqiTotal <= 4) psqiPoints = 4;
  else if (psqiTotal <= 7) psqiPoints = 3;
  else if (psqiTotal <= 10) psqiPoints = 2;
  else if (psqiTotal <= 14) psqiPoints = 1;
  else psqiPoints = 0;

  // 2. Sleep duration score (0-2 points) - 7-9h optimal for adults
  let durationPoints = 0;
  if (sleepHours >= 7 && sleepHours <= 9) durationPoints = 2;
  else if (sleepHours >= 6 && sleepHours < 7) durationPoints = 1.5;
  else if (sleepHours >= 5 && sleepHours < 6) durationPoints = 1;
  else if (sleepHours > 9 && sleepHours <= 10) durationPoints = 1.5;
  else durationPoints = 0.5;

  // 3. Sleep latency (0-1.5 points)
  let latencyPoints = 0;
  if (timeToFallAsleep <= 15) latencyPoints = 1.5;
  else if (timeToFallAsleep <= 30) latencyPoints = 1;
  else if (timeToFallAsleep <= 60) latencyPoints = 0.5;
  else latencyPoints = 0;

  // 4. Habit quality (0-1.5 points) - regularity, low screen, low caffeine
  const habitAvg = (sleepRegularity + (10 - screenBeforeBed) + (10 - caffeineAfternoon)) / 3;
  const habitPoints = (habitAvg / 10) * 1.5;

  // 5. Night awakenings penalty (0 to -1)
  const awakeningPenalty = nightAwakenings >= 4 ? 1 : nightAwakenings >= 3 ? 0.5 : 0;

  // 6. Energy on wakeup (0-1 point)
  const energyPoints = (energyOnWakeup / 10) * 1;

  // 7. Circadian rhythm (0-0.5 points)
  const circadianPoints = (circadianScore / 10) * 0.5;

  const raw = psqiPoints + durationPoints + latencyPoints + habitPoints - awakeningPenalty + energyPoints + circadianPoints;
  const sleepScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (psqiTotal >= 15 || sleepHours < 4 || (sleepHours < 5 && nightAwakenings >= 4)) riskLevel = 'urgent';
  else if (psqiTotal >= 10 || sleepHours < 5 || sleepScore <= 4) riskLevel = 'risk';
  else if (psqiTotal >= 6 || sleepHours < 6 || sleepScore <= 6) riskLevel = 'mild';

  return { sleepScore, riskLevel, psqiTotal, psqiCategory };
}

// GET: List sleep assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.sleepAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get sleep assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new sleep assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const { sleepScore, riskLevel, psqiTotal, psqiCategory } = calcSleepScore({ ...body });

    const assessment = await db.sleepAssessment.create({
      data: {
        userId,
        psqiQuality: Number(body.psqiQuality) || 0,
        psqiLatency: Number(body.psqiLatency) || 0,
        psqiDuration: Number(body.psqiDuration) || 0,
        psqiEfficiency: Number(body.psqiEfficiency) || 0,
        psqiDisturbances: Number(body.psqiDisturbances) || 0,
        psqiMedication: Number(body.psqiMedication) || 0,
        psqiDysfunction: Number(body.psqiDysfunction) || 0,
        psqiTotal,
        psqiCategory,
        sleepHours: Number(body.sleepHours) || 7,
        timeToFallAsleep: Number(body.timeToFallAsleep) || 15,
        nightAwakenings: Number(body.nightAwakenings) || 1,
        energyOnWakeup: Number(body.energyOnWakeup) || 5,
        sleepRegularity: Number(body.sleepRegularity) || 5,
        screenBeforeBed: Number(body.screenBeforeBed) || 5,
        caffeineAfternoon: Number(body.caffeineAfternoon) || 3,
        chronotype: body.chronotype || 'intermediate',
        bedtimeConsistent: body.bedtimeConsistent !== false,
        wakeTimeConsistent: body.wakeTimeConsistent !== false,
        weekendShift: Number(body.weekendShift) || 0,
        circadianScore: Number(body.circadianScore) || 5,
        sleepScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create sleep assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
