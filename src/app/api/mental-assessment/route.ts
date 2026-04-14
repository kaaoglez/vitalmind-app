import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// PHQ-9 severity classification
function getPhqSeverity(total: number): string {
  if (total <= 4) return 'none';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  if (total <= 19) return 'modSevere';
  return 'severe';
}

// GAD-7 severity classification
function getGadSeverity(total: number): string {
  if (total <= 4) return 'none';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  return 'severe';
}

// Compute mental health area score (0-10)
function calcMentalScore(data: Record<string, unknown>): { score: number; riskLevel: string } {
  const phqTotal = Number(data.phqTotal) || 0;
  const gadTotal = Number(data.gadTotal) || 0;
  const stress = Number(data.perceivedStress) || 5;
  const emotionReg = Number(data.emotionalRegulation) || 5;
  const socialRel = Number(data.socialRelationships) || 5;
  const purpose = Number(data.senseOfPurpose) || 5;
  const negThoughts = Number(data.negThoughtsFreq) || 5;

  // PHQ-9 contributes up to ~3 points (0-27 → 0-3)
  const phqContrib = Math.max(0, 3 - (phqTotal / 9));
  // GAD-7 contributes up to ~2.5 points (0-21 → 0-2.5)
  const gadContrib = Math.max(0, 2.5 - (gadTotal / 8.4));
  // Subjective indicators (avg of 5 scales, inverse where needed)
  const subjectiveAvg = ((10 - stress) + emotionReg + socialRel + purpose + (10 - negThoughts)) / 5;
  const subjectiveContrib = (subjectiveAvg / 10) * 4.5;

  const raw = phqContrib + gadContrib + subjectiveContrib;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (phqTotal >= 20 || gadTotal >= 15) riskLevel = 'urgent';
  else if (phqTotal >= 15 || gadTotal >= 10 || score <= 3) riskLevel = 'risk';
  else if (phqTotal >= 10 || gadTotal >= 5 || score <= 5) riskLevel = 'mild';

  return { score, riskLevel };
}

// GET: List mental assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.mentalAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get mental assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new mental assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const phqTotal = [1,2,3,4,5,6,7,8,9].reduce((sum, i) => sum + (Number(body[`phq${i}`]) || 0), 0);
    const gadTotal = [1,2,3,4,5,6,7].reduce((sum, i) => sum + (Number(body[`gad${i}`]) || 0), 0);
    const phqSeverity = getPhqSeverity(phqTotal);
    const gadSeverity = getGadSeverity(gadTotal);
    const { score: mentalScore, riskLevel } = calcMentalScore({
      ...body, phqTotal, gadTotal,
    });

    const assessment = await db.mentalAssessment.create({
      data: {
        userId,
        phq1: Number(body.phq1) || 0,
        phq2: Number(body.phq2) || 0,
        phq3: Number(body.phq3) || 0,
        phq4: Number(body.phq4) || 0,
        phq5: Number(body.phq5) || 0,
        phq6: Number(body.phq6) || 0,
        phq7: Number(body.phq7) || 0,
        phq8: Number(body.phq8) || 0,
        phq9: Number(body.phq9) || 0,
        phqTotal,
        phqSeverity,
        gad1: Number(body.gad1) || 0,
        gad2: Number(body.gad2) || 0,
        gad3: Number(body.gad3) || 0,
        gad4: Number(body.gad4) || 0,
        gad5: Number(body.gad5) || 0,
        gad6: Number(body.gad6) || 0,
        gad7: Number(body.gad7) || 0,
        gadTotal,
        gadSeverity,
        perceivedStress: Number(body.perceivedStress) || 5,
        emotionalRegulation: Number(body.emotionalRegulation) || 5,
        socialRelationships: Number(body.socialRelationships) || 5,
        senseOfPurpose: Number(body.senseOfPurpose) || 5,
        weeklySocialInt: Number(body.weeklySocialInt) || 3,
        negThoughtsFreq: Number(body.negThoughtsFreq) || 5,
        mentalScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create mental assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
