import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Compute nutrition area score (0-10)
function calcNutritionScore(data: Record<string, unknown>): { score: number; riskLevel: string } {
  // FFQ positive items (1-5): higher is better (0-4 each, max 20)
  const positiveSum = [1, 2, 3, 4, 5].reduce((sum, i) => sum + (Number(data[`ffq${i}`]) || 0), 0);
  // FFQ inverse items (6-10): lower is better (0-4 each, max 20)
  const inverseSum = [6, 7, 8, 9, 10].reduce((sum, i) => sum + (Number(data[`ffq${i}`]) || 0), 0);

  // Positive contribution: 0-20 → 0-3.5 points
  const positiveContrib = (positiveSum / 20) * 3.5;
  // Inverse contribution: 0-20 → 3.5-0 points (less processed = more points)
  const inverseContrib = ((20 - inverseSum) / 20) * 3.5;

  // Subjective indicators
  const dietQuality = Number(data.dietQuality) || 5;
  const macroBalance = Number(data.macroBalance) || 5;
  const processedFreq = Number(data.processedFreq) || 5;
  const mealReg = Number(data.mealRegularity) || 5;
  const hydrationMeals = Number(data.hydrationWithMeals) || 5;
  const fruitVeg = Number(data.fruitVegServ) || 3;
  const naturalPct = Number(data.naturalFoodPct) || 50;

  // Fruit/veg scoring: 5+ servings = full points, 0 = 0
  const fruitVegContrib = Math.min(fruitVeg / 5, 1) * 0.5;
  // Natural food %: 80%+ = full points
  const naturalContrib = (naturalPct / 100) * 0.5;

  // Subjective average (inverse for processed)
  const subjAvg = ((10 - processedFreq) + dietQuality + macroBalance + mealReg + hydrationMeals) / 5;
  const subjContrib = (subjAvg / 10) * 2;

  const raw = positiveContrib + inverseContrib + subjContrib + fruitVegContrib + naturalContrib;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (inverseSum >= 14 || score <= 2) riskLevel = 'urgent';
  else if (inverseSum >= 10 || score <= 4) riskLevel = 'risk';
  else if (inverseSum >= 6 || score <= 6) riskLevel = 'mild';

  return { score, riskLevel };
}

// GET: List nutrition assessments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const assessments = await db.nutritionAssessment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error('Get nutrition assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create new nutrition assessment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    const ffqTotal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce(
      (sum, i) => sum + (Number(body[`ffq${i}`]) || 0), 0
    );

    // Try to get BMI from user profile
    let bmi = Number(body.bmi) || 0;
    let height = Number(body.height) || 0;
    let weight = Number(body.weight) || 0;
    if (!bmi) {
      try {
        const profile = await db.userProfile.findUnique({ where: { userId } });
        if (profile && profile.bmi > 0) {
          bmi = profile.bmi;
          height = profile.height || 0;
          weight = profile.weight || 0;
        }
      } catch { /* profile may not exist */ }
    }

    const { score: nutritionScore, riskLevel } = calcNutritionScore({
      ...body, ffqTotal,
    });

    const assessment = await db.nutritionAssessment.create({
      data: {
        userId,
        ffq1: Number(body.ffq1) || 0,
        ffq2: Number(body.ffq2) || 0,
        ffq3: Number(body.ffq3) || 0,
        ffq4: Number(body.ffq4) || 0,
        ffq5: Number(body.ffq5) || 0,
        ffq6: Number(body.ffq6) || 0,
        ffq7: Number(body.ffq7) || 0,
        ffq8: Number(body.ffq8) || 0,
        ffq9: Number(body.ffq9) || 0,
        ffq10: Number(body.ffq10) || 0,
        ffqTotal,
        dietQuality: Number(body.dietQuality) || 5,
        macroBalance: Number(body.macroBalance) || 5,
        processedFreq: Number(body.processedFreq) || 5,
        naturalFoodPct: Number(body.naturalFoodPct) || 50,
        fruitVegServ: Number(body.fruitVegServ) || 3,
        proteinPerKg: Number(body.proteinPerKg) || 1.0,
        mealRegularity: Number(body.mealRegularity) || 5,
        hydrationWithMeals: Number(body.hydrationWithMeals) || 5,
        bmi,
        height,
        weight,
        nutritionScore,
        riskLevel,
      },
    });

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create nutrition assessment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
