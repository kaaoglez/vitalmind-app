import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Helper: score a checkup recency value
function scoreRecency(value: string): number {
  if (value === 'within-year') return 1;
  if (value === '1-2years') return 0.6;
  if (value === '2-5years') return 0.3;
  if (value === '5+years') return 0.1;
  // 'never'
  return 0;
}

// Compute prevention score (0-10) and risk level
function calcPreventionScore(
  data: Record<string, unknown>
): { preventionScore: number; riskLevel: string; riskFactors: string[]; recommendations: string[] } {
  const lastCheckup = String(data.lastCheckup || 'within-year');
  const lastDentalCheckup = String(data.lastDentalCheckup || 'within-year');
  const lastEyeExam = String(data.lastEyeExam || 'within-year');
  const lastBloodWork = String(data.lastBloodWork || 'within-year');

  const vaccinationUpToDate = Boolean(data.vaccinationUpToDate);
  const fluVaccine = Boolean(data.fluVaccine);
  const covidVaccine = Boolean(data.covidVaccine);
  const tetanusVaccine = Boolean(data.tetanusVaccine);
  const otherVaccines = data.otherVaccines || '[]';

  const cancerScreeningUpToDate = Boolean(data.cancerScreeningUpToDate);
  const mammogramLast = String(data.mammogramLast || 'never');
  const papSmearLast = String(data.papSmearLast || 'never');
  const colonoscopyLast = String(data.colonoscopyLast || 'never');
  const prostateScreening = String(data.prostateScreening || 'never');
  const skinCheckLast = String(data.skinCheckLast || 'never');

  const age = Number(data.age) || 0;
  const gender = String(data.gender || '');
  const familyHistory = Array.isArray(data.familyHistory) ? data.familyHistory : [];
  const chronicConditions = Array.isArray(data.chronicConditions) ? data.chronicConditions : [];
  const medications = Array.isArray(data.medications) ? data.medications : [];

  const sunProtection = Number(data.sunProtection) || 5;
  const safeDriving = Number(data.safeDriving) || 7;
  const homeSafety = Number(data.homeSafety) || 7;
  const healthLiteracy = Number(data.healthLiteracy) || 5;

  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  // 1. Checkup score (0-3): within-year for all = 3, partial = 1.5-2, gaps = 0-1
  const checkupScores = [
    scoreRecency(lastCheckup),
    scoreRecency(lastDentalCheckup),
    scoreRecency(lastEyeExam),
    scoreRecency(lastBloodWork),
  ];
  const checkupAvg = checkupScores.reduce((a, b) => a + b, 0) / checkupScores.length;
  const checkupPoints = checkupAvg * 3;

  if (lastCheckup === 'never' || lastCheckup === '5+years') {
    riskFactors.push('Overdue for general checkup');
    recommendations.push('Schedule a general health checkup as soon as possible');
  }
  if (lastBloodWork === 'never' || lastBloodWork === '5+years') {
    riskFactors.push('Overdue for blood work');
    recommendations.push('Schedule blood work including lipid panel and glucose');
  }

  // 2. Vaccination score (0-2.5): each vaccine = 0.625
  let vaccPoints = 0;
  if (vaccinationUpToDate) vaccPoints += 0.625;
  if (fluVaccine) vaccPoints += 0.625;
  if (covidVaccine) vaccPoints += 0.625;
  if (tetanusVaccine) vaccPoints += 0.625;

  if (!vaccinationUpToDate) {
    riskFactors.push('Vaccinations not up to date');
    recommendations.push('Consult your doctor about catching up on recommended vaccinations');
  }

  // 3. Cancer screening score (0-2): upToDate = 2, partial = 1, gaps = 0
  let cancerPoints = 0;
  if (cancerScreeningUpToDate) {
    cancerPoints = 2;
  } else {
    // Partial scoring based on age/gender-appropriate screenings
    let screenCount = 0;
    let screenTotal = 0;

    if (age >= 40 || gender === 'female') {
      screenTotal++;
      if (mammogramLast === 'within-year' || mammogramLast === '1-2years') screenCount++;
    }
    if (gender === 'female') {
      screenTotal++;
      if (papSmearLast === 'within-year' || papSmearLast === '1-2years' || papSmearLast === '2-5years') screenCount++;
    }
    if (age >= 45) {
      screenTotal++;
      if (colonoscopyLast === 'within-year' || colonoscopyLast === '1-2years' || colonoscopyLast === '2-5years') screenCount++;
    }
    if (gender === 'male' && age >= 50) {
      screenTotal++;
      if (prostateScreening === 'within-year' || prostateScreening === '1-2years') screenCount++;
    }

    if (screenTotal === 0) {
      cancerPoints = 1; // No applicable screenings, partial
    } else {
      const ratio = screenCount / screenTotal;
      cancerPoints = ratio >= 0.7 ? 1 : 0;
    }

    riskFactors.push('Cancer screening not up to date');
    recommendations.push('Schedule age-appropriate cancer screenings');
  }

  // 4. Preventive behaviors (0-1.5): avg of sunProtection+safeDriving+homeSafety+healthLiteracy / 4 / 10 * 1.5
  const behaviorAvg = (sunProtection + safeDriving + homeSafety + healthLiteracy) / 4;
  const behaviorPoints = (behaviorAvg / 10) * 1.5;

  if (healthLiteracy <= 3) {
    riskFactors.push('Low health literacy');
    recommendations.push('Consider health education resources to better understand your health');
  }

  // 5. Risk factors penalty
  let riskFactorPenalty = 0;
  const familyHistoryPenalty = Math.min(0.5, familyHistory.length * 0.1);
  const chronicPenalty = Math.min(1, chronicConditions.length * 0.2);
  riskFactorPenalty = familyHistoryPenalty + chronicPenalty;

  if (familyHistory.length > 0) {
    riskFactors.push(`Family history of ${familyHistory.length} condition(s)`);
  }
  if (chronicConditions.length > 0) {
    riskFactors.push(`${chronicConditions.length} chronic condition(s) diagnosed`);
    recommendations.push('Follow up regularly with your healthcare provider for chronic condition management');
  }

  const raw = checkupPoints + vaccPoints + cancerPoints + behaviorPoints - riskFactorPenalty;
  const preventionScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (lastCheckup === 'never' && chronicConditions.length > 0) riskLevel = 'urgent';
  else if (preventionScore <= 3) riskLevel = 'risk';
  else if (preventionScore <= 6) riskLevel = 'mild';

  return { preventionScore, riskLevel, riskFactors, recommendations };
}

// GET: List prevention assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.preventionAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get prevention assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new prevention assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const { preventionScore, riskLevel, riskFactors, recommendations } = calcPreventionScore({ ...body });

    const assessment = await db.preventionAssessment.create({
      data: {
        userId,
        lastCheckup: body.lastCheckup || 'within-year',
        lastDentalCheckup: body.lastDentalCheckup || 'within-year',
        lastEyeExam: body.lastEyeExam || 'within-year',
        lastBloodWork: body.lastBloodWork || 'within-year',
        vaccinationUpToDate: Boolean(body.vaccinationUpToDate),
        fluVaccine: Boolean(body.fluVaccine),
        covidVaccine: Boolean(body.covidVaccine),
        tetanusVaccine: Boolean(body.tetanusVaccine),
        otherVaccines: body.otherVaccines || '[]',
        cancerScreeningUpToDate: Boolean(body.cancerScreeningUpToDate),
        mammogramLast: body.mammogramLast || 'never',
        papSmearLast: body.papSmearLast || 'never',
        colonoscopyLast: body.colonoscopyLast || 'never',
        prostateScreening: body.prostateScreening || 'never',
        skinCheckLast: body.skinCheckLast || 'never',
        age: Number(body.age) || 0,
        gender: body.gender || '',
        familyHistory: body.familyHistory || [],
        chronicConditions: body.chronicConditions || [],
        medications: body.medications || [],
        sunProtection: Number(body.sunProtection) || 5,
        safeDriving: Number(body.safeDriving) || 7,
        homeSafety: Number(body.homeSafety) || 7,
        healthLiteracy: Number(body.healthLiteracy) || 5,
        preventionScore,
        riskLevel,
        riskFactors,
        recommendations,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create prevention assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
