import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// ─── Classification helpers (clinical guidelines) ────────────────────

function getBpCategory(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) return 'crisis';
  if (systolic >= 140 || diastolic >= 90) return 'high2';
  if (systolic >= 130 || diastolic >= 80) return 'high1';
  if (systolic >= 120 && diastolic < 80) return 'elevated';
  return 'normal';
}

function getHrCategory(hr: number): string {
  if (hr < 50) return 'athlete';
  if (hr < 60) return 'excellent';
  if (hr <= 70) return 'good';
  if (hr <= 80) return 'average';
  return 'poor';
}

function getGlucoseCategory(glucose: number, hba1c: number): string {
  if (glucose >= 126 || hba1c >= 6.5) return 'diabetes';
  if (glucose >= 100 || hba1c >= 5.7) return 'prediabetes';
  return 'normal';
}

function getLipidCategory(total: number, ldl: number, trig: number): string {
  if (total >= 240 || ldl >= 160 || trig >= 200) return 'high';
  if (total >= 200 || ldl >= 130 || trig >= 150) return 'borderline';
  return 'desirable';
}

function getBmiCategory(bmi: number): string {
  if (bmi === 0) return 'normal'; // not provided
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'overweight';
  if (bmi < 35) return 'obese1';
  if (bmi < 40) return 'obese2';
  return 'obese3';
}

// ─── Score calculation (0-10) ────────────────────────────────────────

function calcBiomarkerScore(data: Record<string, unknown>) {
  const systolic = Number(data.systolicBP) || 120;
  const diastolic = Number(data.diastolicBP) || 80;
  const restingHR = Number(data.restingHR) || 70;
  const fastingGlucose = Number(data.fastingGlucose) || 90;
  const hba1c = Number(data.hba1c) || 5.0;
  const totalChol = Number(data.totalCholesterol) || 200;
  const hdl = Number(data.hdl) || 50;
  const ldl = Number(data.ldl) || 130;
  const trig = Number(data.triglycerides) || 150;
  const bmi = Number(data.bmi) || 0;
  const familyHTN = data.familyHistoryHTN === true;
  const familyDM = data.familyHistoryDM === true;
  const smoking = String(data.smokingStatus) || 'never';
  const activity = Number(data.physicalActivity) || 5;
  const stress = Number(data.stressLevel) || 5;
  const alcohol = String(data.alcoholFreq) || 'never';
  const age = Number(data.age) || 30;

  // Classifications
  const bpCategory = getBpCategory(systolic, diastolic);
  const hrCategory = getHrCategory(restingHR);
  const glucoseCategory = getGlucoseCategory(fastingGlucose, hba1c);
  const lipidCategory = getLipidCategory(totalChol, ldl, trig);
  const bmiCategory = getBmiCategory(bmi);

  // 1. Blood Pressure score (0-2.5 points)
  let bpPoints = 0;
  if (bpCategory === 'normal') bpPoints = 2.5;
  else if (bpCategory === 'elevated') bpPoints = 2;
  else if (bpCategory === 'high1') bpPoints = 1;
  else if (bpCategory === 'high2') bpPoints = 0.5;
  // crisis = 0

  // 2. Heart Rate score (0-1 point)
  let hrPoints = 0;
  if (hrCategory === 'athlete' || hrCategory === 'excellent') hrPoints = 1;
  else if (hrCategory === 'good') hrPoints = 0.8;
  else if (hrCategory === 'average') hrPoints = 0.5;
  // poor = 0.2

  // 3. Glucose / Metabolic score (0-2 points)
  let glucosePoints = 0;
  if (glucoseCategory === 'normal') glucosePoints = 2;
  else if (glucoseCategory === 'prediabetes') glucosePoints = 1;
  // diabetes = 0

  // 4. Lipid Profile score (0-2 points)
  let lipidPoints = 0;
  if (lipidCategory === 'desirable') lipidPoints = 2;
  else if (lipidCategory === 'borderline') lipidPoints = 1;
  // high = 0

  // HDL bonus (up to 0.5)
  const hdlBonus = hdl >= 60 ? 0.5 : hdl >= 40 ? 0.25 : 0;

  // 5. BMI score (0-1 point)
  let bmiPoints = 0;
  if (bmi === 0) bmiPoints = 0.5; // unknown = neutral
  else if (bmiCategory === 'normal') bmiPoints = 1;
  else if (bmiCategory === 'overweight') bmiPoints = 0.5;
  // underweight/obese = 0

  // 6. Risk factor adjustments (penalties)
  let riskPenalty = 0;
  if (familyHTN) riskPenalty += 0.3;
  if (familyDM) riskPenalty += 0.3;
  if (smoking === 'current') riskPenalty += 0.5;
  else if (smoking === 'former') riskPenalty += 0.2;
  if (alcohol === 'daily') riskPenalty += 0.3;
  else if (alcohol === 'weekly') riskPenalty += 0.1;
  if (stress >= 8) riskPenalty += 0.3;
  else if (stress >= 6) riskPenalty += 0.1;

  // Protective factor bonus (up to 0.5)
  let protectiveBonus = 0;
  if (activity >= 7) protectiveBonus += 0.3;
  else if (activity >= 5) protectiveBonus += 0.15;
  if (age < 40) protectiveBonus += 0.1;
  if (restingHR < 60 && restingHR > 0) protectiveBonus += 0.1;

  const raw = bpPoints + hrPoints + glucosePoints + lipidPoints + hdlBonus + bmiPoints - riskPenalty + protectiveBonus;
  const biomarkerScore = Math.round(Math.min(10, Math.max(0, raw)));

  // Sub-scores
  const cvRiskScore = Math.round(Math.min(10, Math.max(0, bpPoints + hrPoints + bmiPoints - riskPenalty + protectiveBonus)));
  const metabolicScore = Math.round(Math.min(10, Math.max(0, glucosePoints + lipidPoints + hdlBonus - (familyDM ? 0.5 : 0) - (bmi > 30 ? 0.5 : 0))));

  // Risk level
  let riskLevel = 'good';
  if (bpCategory === 'crisis' || glucoseCategory === 'diabetes' || (systolic >= 160 && fastingGlucose >= 126)) riskLevel = 'urgent';
  else if (bpCategory === 'high2' || glucoseCategory === 'prediabetes' || lipidCategory === 'high' || biomarkerScore <= 4) riskLevel = 'risk';
  else if (bpCategory === 'high1' || lipidCategory === 'borderline' || biomarkerScore <= 6) riskLevel = 'mild';

  return {
    bpCategory, hrCategory, glucoseCategory, lipidCategory, bmiCategory,
    cvRiskScore, metabolicScore, biomarkerScore, riskLevel,
  };
}

// ─── GET: List biomarker assessments ─────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.biomarkerAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get biomarker assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Create new biomarker assessment ───────────────────────────

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const computed = calcBiomarkerScore({ ...body });

    const assessment = await db.biomarkerAssessment.create({
      data: {
        userId,
        // Vital signs
        systolicBP: Number(body.systolicBP) || 120,
        diastolicBP: Number(body.diastolicBP) || 80,
        bpCategory: computed.bpCategory,
        restingHR: Number(body.restingHR) || 70,
        hrCategory: computed.hrCategory,
        // Lab values
        fastingGlucose: Number(body.fastingGlucose) || 90,
        hba1c: Number(body.hba1c) || 5.0,
        glucoseCategory: computed.glucoseCategory,
        totalCholesterol: Number(body.totalCholesterol) || 200,
        hdl: Number(body.hdl) || 50,
        ldl: Number(body.ldl) || 130,
        triglycerides: Number(body.triglycerides) || 150,
        lipidCategory: computed.lipidCategory,
        // BMI
        bmi: Number(body.bmi) || 0,
        bmiCategory: computed.bmiCategory,
        // Risk factors
        familyHistoryHTN: body.familyHistoryHTN === true,
        familyHistoryDM: body.familyHistoryDM === true,
        smokingStatus: body.smokingStatus || 'never',
        physicalActivity: Number(body.physicalActivity) || 5,
        stressLevel: Number(body.stressLevel) || 5,
        alcoholFreq: body.alcoholFreq || 'never',
        age: Number(body.age) || 30,
        // Computed scores
        cvRiskScore: computed.cvRiskScore,
        metabolicScore: computed.metabolicScore,
        biomarkerScore: computed.biomarkerScore,
        riskLevel: computed.riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create biomarker assessment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
