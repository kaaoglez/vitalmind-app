import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

function calcBMI(weight: number, heightCm: number): number {
  if (weight <= 0 || heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

// GET: Retrieve user profile
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    let profile = await db.userProfile.findUnique({ where: { userId } });

    if (!profile) {
      // Auto-create empty profile on first request
      profile = await db.userProfile.create({
        data: { userId },
      });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update user profile (mini-profile + optional clinical data)
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();

    // Core fields
    const age = body.age !== undefined ? Number(body.age) : undefined;
    const gender = body.gender !== undefined ? String(body.gender) : undefined;
    const weight = body.weight !== undefined ? Number(body.weight) : undefined;
    const height = body.height !== undefined ? Number(body.height) : undefined;
    const smoking = body.smoking !== undefined ? String(body.smoking) : undefined;
    const alcoholFreq = body.alcoholFreq !== undefined ? String(body.alcoholFreq) : undefined;

    // Optional clinical fields
    const systolicBP = body.systolicBP !== undefined ? (body.systolicBP === null ? null : Number(body.systolicBP)) : undefined;
    const diastolicBP = body.diastolicBP !== undefined ? (body.diastolicBP === null ? null : Number(body.diastolicBP)) : undefined;
    const fastingGlucose = body.fastingGlucose !== undefined ? (body.fastingGlucose === null ? null : Number(body.fastingGlucose)) : undefined;
    const totalCholesterol = body.totalCholesterol !== undefined ? (body.totalCholesterol === null ? null : Number(body.totalCholesterol)) : undefined;
    const hdl = body.hdl !== undefined ? (body.hdl === null ? null : Number(body.hdl)) : undefined;
    const restingHR = body.restingHR !== undefined ? (body.restingHR === null ? null : Number(body.restingHR)) : undefined;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (weight !== undefined) updateData.weight = weight;
    if (height !== undefined) updateData.height = height;
    if (smoking !== undefined) updateData.smoking = smoking;
    if (alcoholFreq !== undefined) updateData.alcoholFreq = alcoholFreq;
    if (systolicBP !== undefined) updateData.systolicBP = systolicBP;
    if (diastolicBP !== undefined) updateData.diastolicBP = diastolicBP;
    if (fastingGlucose !== undefined) updateData.fastingGlucose = fastingGlucose;
    if (totalCholesterol !== undefined) updateData.totalCholesterol = totalCholesterol;
    if (hdl !== undefined) updateData.hdl = hdl;
    if (restingHR !== undefined) updateData.restingHR = restingHR;

    // Auto-calculate BMI if weight and height are available
    const currentProfile = await db.userProfile.findUnique({ where: { userId } });
    const effectiveWeight = Number(updateData.weight) || Number(currentProfile?.weight) || 0;
    const effectiveHeight = Number(updateData.height) || Number(currentProfile?.height) || 0;

    if (effectiveWeight > 0 && effectiveHeight > 0) {
      updateData.bmi = calcBMI(effectiveWeight, effectiveHeight);
    }

    // Check profile completeness (core fields must be filled)
    const effectiveAge = Number(updateData.age) || Number(currentProfile?.age) || 0;
    const effectiveGender = String(updateData.gender || currentProfile?.gender || '');
    const effectiveSmoking = String(updateData.smoking || currentProfile?.smoking || '');
    const effectiveAlcohol = String(updateData.alcoholFreq || currentProfile?.alcoholFreq || '');

    const isComplete = effectiveAge > 0 && effectiveGender !== '' &&
      effectiveWeight > 0 && effectiveHeight > 0 &&
      effectiveSmoking !== '' && effectiveAlcohol !== '';

    updateData.profileComplete = isComplete;
    updateData.onboardingDone = isComplete;

    const profile = await db.userProfile.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        ...updateData,
        profileComplete: isComplete,
        onboardingDone: isComplete,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Update user profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
