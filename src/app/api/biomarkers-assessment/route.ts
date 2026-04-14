import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute BP category from systolic/diastolic
function getBpCategory(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'high2';
  if (systolic >= 130 || diastolic >= 80) return 'high1';
  if (systolic >= 120) return 'elevated';
  return 'normal';
}

// Compute HR category from resting heart rate
function getHrCategory(hr: number): string {
  if (hr < 60) return 'low';
  if (hr <= 100) return 'normal';
  if (hr <= 110) return 'elevated';
  return 'high';
}

// Compute BMI category
function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese1';
  if (bmi < 40) return 'obese2';
  return 'obese3';
}

// Compute biomarkers score (0-10) and risk level
function calcBiomarkersScore(
  data: Record<string, unknown>
): { biomarkersScore: number; riskLevel: string; bpCategory: string; hrCategory: string; bmiCategory: string } {
  const systolicBP = Number(data.systolicBP) || 120;
  const diastolicBP = Number(data.diastolicBP) || 80;
  const fastingGlucose = Number(data.fastingGlucose) || 90;
  const totalCholesterol = Number(data.totalCholesterol) || 200;
  const hdl = Number(data.hdl) || 50;
  const ldl = Number(data.ldl) || 100;
  const triglycerides = Number(data.triglycerides) || 150;
  const restingHR = Number(data.restingHR) || 70;
  const bmi = Number(data.bmi) || 0;
  const hemoglobin = Number(data.hemoglobin) || 14.0;
  const creatinine = Number(data.creatinine) || 1.0;
  const vitaminD = Number(data.vitaminD) || 30.0;
  const hasDiabetes = Boolean(data.hasDiabetes);
  const hasHypertension = Boolean(data.hasHypertension);
  const hasDyslipidemia = Boolean(data.hasDyslipidemia);

  // 1. BP score (0-2.5)
  let bpScore = 0;
  if (systolicBP < 120 && diastolicBP < 80) bpScore = 2.5;
  else if (systolicBP < 130 && diastolicBP < 85) bpScore = 2;
  else if (systolicBP < 140 && diastolicBP < 90) bpScore = 1;
  else bpScore = 0;

  // 2. Glucose score (0-2)
  let glucoseScore = 0;
  if (fastingGlucose >= 70 && fastingGlucose <= 100) glucoseScore = 2;
  else if (fastingGlucose >= 101 && fastingGlucose <= 125) glucoseScore = 1.5;
  else if (fastingGlucose >= 126) glucoseScore = 0.5;
  else glucoseScore = 0.5;

  // 3. Lipid score (0-2.5)
  let lipidScore = 0;
  if (totalCholesterol < 200 && hdl > 50 && triglycerides < 150) lipidScore = 2.5;
  else if (totalCholesterol < 240 && hdl > 40 && triglycerides < 200) lipidScore = 1.5;
  else lipidScore = 0.5;

  // 4. HR score (0-1.5)
  let hrScore = 0;
  if (restingHR >= 60 && restingHR <= 100) hrScore = 1.5;
  else if ((restingHR >= 50 && restingHR <= 59) || (restingHR >= 101 && restingHR <= 110)) hrScore = 1;
  else hrScore = 0.5;

  // 5. BMI score (0-1)
  let bmiScore = 0;
  if (bmi >= 18.5 && bmi <= 24.9) bmiScore = 1;
  else if (bmi >= 25 && bmi <= 29.9) bmiScore = 0.5;
  else bmiScore = 0;

  // 6. Additional markers (0-0.5)
  const hemoglobinNormal = hemoglobin >= 12.0 && hemoglobin <= 17.5;
  const creatinineNormal = creatinine >= 0.6 && creatinine <= 1.3;
  const vitaminDSufficient = vitaminD >= 30;
  const additionalScore = (hemoglobinNormal && creatinineNormal && vitaminDSufficient) ? 0.5 : 0;

  // 7. Flags penalty
  let flagsPenalty = 0;
  if (hasDiabetes) flagsPenalty += 1;
  if (hasHypertension) flagsPenalty += 0.5;
  if (hasDyslipidemia) flagsPenalty += 0.5;

  const raw = bpScore + glucoseScore + lipidScore + hrScore + bmiScore + additionalScore - flagsPenalty;
  const biomarkersScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Categories
  const bpCategory = getBpCategory(systolicBP, diastolicBP);
  const hrCategory = getHrCategory(restingHR);
  const bmiCategory = getBmiCategory(bmi);

  // Risk level
  let riskLevel = 'good';
  if (systolicBP >= 180 || diastolicBP >= 120 || fastingGlucose >= 300) riskLevel = 'urgent';
  else if (biomarkersScore <= 4) riskLevel = 'risk';
  else if (biomarkersScore <= 6) riskLevel = 'mild';

  return { biomarkersScore, riskLevel, bpCategory, hrCategory, bmiCategory };
}

// GET: List biomarkers assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.biomarkersAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get biomarkers assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new biomarkers assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const { biomarkersScore, riskLevel, bpCategory, hrCategory, bmiCategory } = calcBiomarkersScore({ ...body });

    const assessment = await db.biomarkersAssessment.create({
      data: {
        userId,
        systolicBP: Number(body.systolicBP) || 120,
        diastolicBP: Number(body.diastolicBP) || 80,
        bpCategory,
        fastingGlucose: Number(body.fastingGlucose) || 90,
        totalCholesterol: Number(body.totalCholesterol) || 200,
        hdl: Number(body.hdl) || 50,
        ldl: Number(body.ldl) || 100,
        triglycerides: Number(body.triglycerides) || 150,
        restingHR: Number(body.restingHR) || 70,
        hrCategory,
        bmi: Number(body.bmi) || 0,
        bmiCategory,
        hemoglobin: Number(body.hemoglobin) || 14.0,
        creatinine: Number(body.creatinine) || 1.0,
        vitaminD: Number(body.vitaminD) || 30.0,
        hasDiabetes: Boolean(body.hasDiabetes),
        hasHypertension: Boolean(body.hasHypertension),
        hasDyslipidemia: Boolean(body.hasDyslipidemia),
        biomarkersScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create biomarkers assessment error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
