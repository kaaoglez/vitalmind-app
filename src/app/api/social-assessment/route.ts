import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute social score (0-10) and risk level
function calcSocialScore(
  data: Record<string, unknown>
): { socialScore: number; riskLevel: string; riskFactors: string[]; recommendations: string[] } {
  const emotionalSupport = Number(data.emotionalSupport) || 5;
  const instrumentalSupport = Number(data.instrumentalSupport) || 5;
  const informationalSupport = Number(data.informationalSupport) || 5;
  const socialIntegration = Number(data.socialIntegration) || 5;
  const supportNetworkSize = Number(data.supportNetworkSize) || 3;
  const jobSatisfaction = Number(data.jobSatisfaction) || 5;
  const workLifeBalance = Number(data.workLifeBalance) || 5;
  const workStress = Number(data.workStress) || 5;
  const commuteTime = Number(data.commuteTime) || 30;
  const financialSecurity = Number(data.financialSecurity) || 5;
  const lonelinessFrequency = Number(data.lonelinessFrequency) || 3;
  const isolationLevel = Number(data.isolationLevel) || 3;
  const relationshipQuality = Number(data.relationshipQuality) || 5;
  const communityInvolvement = Number(data.communityInvolvement) || 5;
  const digitalOverload = Number(data.digitalOverload) || 5;
  const overallSatisfaction = Number(data.overallSatisfaction) || 5;
  const purposeInLife = Number(data.purposeInLife) || 5;

  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // 1. Support score (0-3): avg of emotional+instrumental+informational+socialIntegration / 10 * 3
  const supportAvg = (emotionalSupport + instrumentalSupport + informationalSupport + socialIntegration) / 4;
  const supportPoints = (supportAvg / 10) * 3;

  if (supportAvg <= 3) {
    riskFactors.push('Low social support');
    recommendations.push('Consider building a support network through community groups or therapy');
  }

  // 2. Work score (0-2): avg of jobSatisfaction+workLifeBalance+(10-workStress)+financialSecurity / 4 / 10 * 2
  const workAvg = (jobSatisfaction + workLifeBalance + (10 - workStress) + financialSecurity) / 4;
  const workPoints = (workAvg / 10) * 2;

  if (workAvg <= 3) {
    riskFactors.push('Poor work-life conditions');
    recommendations.push('Explore work-life balance strategies or career counseling');
  }

  // 3. Loneliness score (0-2.5): (10-lonelinessFrequency)+(10-isolationLevel)+relationshipQuality / 3 / 10 * 2.5
  const lonelinessAvg = ((10 - lonelinessFrequency) + (10 - isolationLevel) + relationshipQuality) / 3;
  const lonelinessPoints = (lonelinessAvg / 10) * 2.5;

  if (lonelinessFrequency >= 7) {
    riskFactors.push('High loneliness frequency');
    recommendations.push('Consider social activities or professional support for loneliness');
  }

  // 4. Community score (0-1)
  const communityPoints = (communityInvolvement / 10) * 1;

  if (communityInvolvement <= 2) {
    riskFactors.push('Low community involvement');
    recommendations.push('Explore local community groups, volunteering, or social clubs');
  }

  // 5. Purpose score (0-1): avg of overallSatisfaction+purposeInLife / 2 / 10
  const purposeAvg = (overallSatisfaction + purposeInLife) / 2;
  const purposePoints = (purposeAvg / 10) * 1;

  // 6. Digital overload penalty
  let digitalPenalty = 0;
  if (digitalOverload >= 7) {
    digitalPenalty = 0.5;
    riskFactors.push('Digital communication overload');
    recommendations.push('Consider digital detox strategies and setting communication boundaries');
  }

  const raw = supportPoints + workPoints + lonelinessPoints + communityPoints + purposePoints - digitalPenalty;
  const socialScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (lonelinessFrequency >= 9 && isolationLevel >= 8) riskLevel = 'urgent';
  else if (socialScore <= 3) riskLevel = 'risk';
  else if (socialScore <= 6) riskLevel = 'mild';

  return { socialScore, riskLevel, riskFactors, recommendations };
}

// GET: List social assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.socialAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get social assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new social assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const { socialScore, riskLevel, riskFactors, recommendations } = calcSocialScore({ ...body });

    const assessment = await db.socialAssessment.create({
      data: {
        userId,
        emotionalSupport: Number(body.emotionalSupport) || 5,
        instrumentalSupport: Number(body.instrumentalSupport) || 5,
        informationalSupport: Number(body.informationalSupport) || 5,
        socialIntegration: Number(body.socialIntegration) || 5,
        supportNetworkSize: Number(body.supportNetworkSize) || 3,
        jobSatisfaction: Number(body.jobSatisfaction) || 5,
        workLifeBalance: Number(body.workLifeBalance) || 5,
        workStress: Number(body.workStress) || 5,
        commuteTime: Number(body.commuteTime) || 30,
        financialSecurity: Number(body.financialSecurity) || 5,
        lonelinessFrequency: Number(body.lonelinessFrequency) || 3,
        isolationLevel: Number(body.isolationLevel) || 3,
        relationshipQuality: Number(body.relationshipQuality) || 5,
        communityInvolvement: Number(body.communityInvolvement) || 5,
        digitalOverload: Number(body.digitalOverload) || 5,
        overallSatisfaction: Number(body.overallSatisfaction) || 5,
        purposeInLife: Number(body.purposeInLife) || 5,
        socialScore,
        riskLevel,
        riskFactors,
        recommendations,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create social assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
