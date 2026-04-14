import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Scoring logic for each area (0-10)
function calcMentalScore(d: Record<string, unknown>): number {
  const stress = Number(d.mentalStress) || 5;
  const mood = Number(d.mentalMood) || 5;
  const emotionReg = Number(d.mentalEmotionReg) || 5;
  const socialRel = Number(d.mentalSocialRel) || 5;
  const purpose = Number(d.mentalPurpose) || 5;
  const negThoughts = Number(d.mentalNegThoughts) || 5;
  // Stress and negThoughts are inverse (higher = worse)
  const raw = ((10 - stress) + mood + emotionReg + socialRel + purpose + (10 - negThoughts)) / 6;
  return Math.round(Math.min(10, Math.max(0, raw)));
}

function calcNutScore(d: Record<string, unknown>): number {
  const quality = Number(d.nutDietQuality) || 5;
  const macro = Number(d.nutMacroBalance) || 5;
  const processed = Number(d.nutProcessedFreq) || 5; // inverse
  const naturalPct = Number(d.nutNaturalPct) || 50;
  const fruitVeg = Number(d.nutFruitVegServ) || 3;
  const protein = Number(d.nutProteinPerKg) || 1.0;
  const bmi = Number(d.nutBMI) || 0;

  let score = (quality + macro + (10 - processed)) / 3;
  if (naturalPct >= 80) score += 1; else if (naturalPct < 30) score -= 1;
  if (fruitVeg >= 5) score += 1; else if (fruitVeg < 2) score -= 1;
  if (protein >= 1.2 && protein <= 2.0) score += 0.5;
  if (bmi > 0 && bmi >= 18.5 && bmi <= 24.9) score += 1;
  else if (bmi > 30 || (bmi > 0 && bmi < 18.5)) score -= 1;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcPhysScore(d: Record<string, unknown>): number {
  const weeklyMin = Number(d.physWeeklyMin) || 0;
  const cardio = Number(d.physCardio) || 5;
  const strength = Number(d.physStrength) || 5;
  const mobility = Number(d.physMobility) || 5;
  const steps = Number(d.physDailySteps) || 5000;

  let score = (cardio + strength + mobility) / 3;
  if (weeklyMin >= 150) score += 2; else if (weeklyMin >= 75) score += 1; else if (weeklyMin < 30) score -= 1;
  if (steps >= 10000) score += 1; else if (steps < 3000) score -= 1;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcHydScore(d: Record<string, unknown>): number {
  const liters = Number(d.hydDailyLiters) || 1.5;
  const freq = Number(d.hydFrequency) || 5;
  const signs = Number(d.hydDehydrationSigns) || 0;

  let score = freq;
  if (liters >= 2.0) score += 2; else if (liters >= 1.5) score += 1; else if (liters < 1.0) score -= 2;
  if (signs === 0) score += 1; else if (signs >= 3) score -= 2;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcSlpScore(d: Record<string, unknown>): number {
  const hours = Number(d.slpHours) || 7;
  const quality = Number(d.slpQuality) || 5;
  const timeToFall = Number(d.slpTimeToFall) || 15;
  const energy = Number(d.slpEnergyWakeup) || 5;
  const circadian = Number(d.slpCircadian) || 5;

  let score = (quality + energy + circadian) / 3;
  if (hours >= 7 && hours <= 9) score += 2; else if (hours >= 6 && hours < 7) score += 0.5; else if (hours < 6) score -= 2;
  if (timeToFall <= 15) score += 1; else if (timeToFall > 45) score -= 1;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcBioScore(d: Record<string, unknown>): number {
  const sys = Number(d.bioSystolicBP) || 120;
  const dia = Number(d.bioDiastolicBP) || 80;
  const glucose = Number(d.bioFastingGlucose) || 90;
  const chol = Number(d.bioTotalCholesterol) || 200;
  const hdl = Number(d.bioHDL) || 50;
  const hr = Number(d.bioRestingHR) || 70;

  let score = 7; // start neutral-good if not measured
  if (sys <= 120 && dia <= 80) score += 1; else if (sys > 140 || dia > 90) score -= 2;
  if (glucose < 100) score += 0.5; else if (glucose > 126) score -= 2;
  if (chol < 200) score += 0.5; else if (chol > 240) score -= 1;
  if (hdl >= 60) score += 0.5; else if (hdl < 40) score -= 1;
  if (hr < 70) score += 0.5; else if (hr > 90) score -= 0.5;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcHabScore(d: Record<string, unknown>): number {
  const alcohol = Number(d.habAlcoholWeekly) || 0;
  const smoking = String(d.habSmoking) || 'never';
  const screen = Number(d.habScreenHours) || 4;
  const routine = Number(d.habRoutineScore) || 5;

  let score = routine;
  if (smoking === 'never') score += 2; else if (smoking === 'former') score += 1; else if (smoking === 'current') score -= 3;
  if (alcohol === 0) score += 1; else if (alcohol <= 3) score += 0; else if (alcohol > 7) score -= 2;
  if (screen <= 2) score += 1; else if (screen > 8) score -= 2;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function calcSocScore(d: Record<string, unknown>): number {
  const support = Number(d.socSupport) || 5;
  const job = Number(d.socJobSatisfaction) || 5;
  const isolation = Number(d.socIsolation) || 5;

  const raw = (support + job + (10 - isolation)) / 3;
  return Math.round(Math.min(10, Math.max(0, raw)));
}

function calcPrevScore(d: Record<string, unknown>): number {
  const lastCheckup = String(d.prevLastCheckup) || 'within-year';
  const exams = Number(d.prevExamsUpToDate) || 5;
  const vacc = Number(d.prevVaccination) || 5;

  let score = (exams + vacc) / 2;
  if (lastCheckup === 'within-year') score += 2; else if (lastCheckup === '1-2-years') score += 0; else if (lastCheckup === 'over-2-years') score -= 2; else if (lastCheckup === 'never') score -= 3;

  return Math.round(Math.min(10, Math.max(0, score)));
}

function getRiskLevel(total: number): string {
  if (total >= 80) return 'excellent';
  if (total >= 60) return 'good';
  if (total >= 40) return 'risk';
  return 'urgent';
}

function calculateAllScores(data: Record<string, unknown>) {
  const mentalScore = calcMentalScore(data);
  const nutScore = calcNutScore(data);
  const physScore = calcPhysScore(data);
  const hydScore = calcHydScore(data);
  const slpScore = calcSlpScore(data);
  const bioScore = calcBioScore(data);
  const habScore = calcHabScore(data);
  const socScore = calcSocScore(data);
  const prevScore = calcPrevScore(data);
  const totalScore = mentalScore + nutScore + physScore + hydScore + slpScore + bioScore + habScore + socScore + prevScore;
  const riskLevel = getRiskLevel(totalScore);

  return { mentalScore, nutScore, physScore, hydScore, slpScore, bioScore, habScore, socScore, prevScore, totalScore, riskLevel };
}

// GET: List assessments for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.healthAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const scores = calculateAllScores(body);

    const assessment = await db.healthAssessment.create({
      data: {
        userId,
        age: Number(body.age) || 0,
        gender: String(body.gender || ''),
        weight: Number(body.weight) || 0,
        height: Number(body.height) || 0,
        mentalStress: Number(body.mentalStress) || 5,
        mentalMood: Number(body.mentalMood) || 5,
        mentalEmotionReg: Number(body.mentalEmotionReg) || 5,
        mentalSocialRel: Number(body.mentalSocialRel) || 5,
        mentalPurpose: Number(body.mentalPurpose) || 5,
        mentalNegThoughts: Number(body.mentalNegThoughts) || 5,
        mentalWeeklySocial: Number(body.mentalWeeklySocial) || 3,
        mentalScore: scores.mentalScore,
        nutDietQuality: Number(body.nutDietQuality) || 5,
        nutMacroBalance: Number(body.nutMacroBalance) || 5,
        nutProcessedFreq: Number(body.nutProcessedFreq) || 5,
        nutDeficiencies: String(body.nutDeficiencies || ''),
        nutNaturalPct: Number(body.nutNaturalPct) || 50,
        nutFruitVegServ: Number(body.nutFruitVegServ) || 3,
        nutProteinPerKg: Number(body.nutProteinPerKg) || 1.0,
        nutBMI: Number(body.nutBMI) || 0,
        nutScore: scores.nutScore,
        physWeeklyMin: Number(body.physWeeklyMin) || 0,
        physCardio: Number(body.physCardio) || 5,
        physStrength: Number(body.physStrength) || 5,
        physMobility: Number(body.physMobility) || 5,
        physDailySteps: Number(body.physDailySteps) || 5000,
        physRestingHR: Number(body.physRestingHR) || 70,
        physScore: scores.physScore,
        hydDailyLiters: Number(body.hydDailyLiters) || 1.5,
        hydFrequency: Number(body.hydFrequency) || 5,
        hydDehydrationSigns: Number(body.hydDehydrationSigns) || 0,
        hydScore: scores.hydScore,
        slpHours: Number(body.slpHours) || 7,
        slpQuality: Number(body.slpQuality) || 5,
        slpTimeToFall: Number(body.slpTimeToFall) || 15,
        slpEnergyWakeup: Number(body.slpEnergyWakeup) || 5,
        slpCircadian: Number(body.slpCircadian) || 5,
        slpScore: scores.slpScore,
        bioSystolicBP: Number(body.bioSystolicBP) || 120,
        bioDiastolicBP: Number(body.bioDiastolicBP) || 80,
        bioFastingGlucose: Number(body.bioFastingGlucose) || 90,
        bioTotalCholesterol: Number(body.bioTotalCholesterol) || 200,
        bioHDL: Number(body.bioHDL) || 50,
        bioRestingHR: Number(body.bioRestingHR) || 70,
        bioScore: scores.bioScore,
        habAlcoholWeekly: Number(body.habAlcoholWeekly) || 0,
        habSmoking: String(body.habSmoking || 'never'),
        habScreenHours: Number(body.habScreenHours) || 4,
        habRoutineScore: Number(body.habRoutineScore) || 5,
        habScore: scores.habScore,
        socSupport: Number(body.socSupport) || 5,
        socJobSatisfaction: Number(body.socJobSatisfaction) || 5,
        socIsolation: Number(body.socIsolation) || 5,
        socScore: scores.socScore,
        prevLastCheckup: String(body.prevLastCheckup || 'within-year'),
        prevExamsUpToDate: Number(body.prevExamsUpToDate) || 5,
        prevVaccination: Number(body.prevVaccination) || 5,
        prevScore: scores.prevScore,
        totalScore: scores.totalScore,
        riskLevel: scores.riskLevel,
      },
    });

    return NextResponse.json({ assessment, scores }, { status: 201 });
  } catch (error) {
    console.error('Create assessment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
