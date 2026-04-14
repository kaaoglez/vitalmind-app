import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

interface AssessmentEntry {
  id: string;
  area: string;
  areaKey: string;
  score: number;
  riskLevel: string;
  createdAt: string;
  rawData: Record<string, unknown>;
}

// GET: Fetch all assessments across all areas for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const allAssessments: AssessmentEntry[] = [];

    // Mental
    try {
      const mental = await db.mentalAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      mental.forEach(a => allAssessments.push({ id: a.id, area: 'Mental Health', areaKey: 'mental', score: a.mentalScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Nutrition
    try {
      const nutrition = await db.nutritionAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      nutrition.forEach(a => allAssessments.push({ id: a.id, area: 'Nutrition', areaKey: 'nutrition', score: a.nutritionScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Physical Activity
    try {
      const physical = await db.physicalActivityAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      physical.forEach(a => allAssessments.push({ id: a.id, area: 'Physical Activity', areaKey: 'physical', score: a.physicalScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Hydration
    try {
      const hydration = await db.hydrationAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      hydration.forEach(a => allAssessments.push({ id: a.id, area: 'Hydration', areaKey: 'hydration', score: a.hydrationScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Sleep
    try {
      const sleep = await db.sleepAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      sleep.forEach(a => allAssessments.push({ id: a.id, area: 'Sleep', areaKey: 'sleep', score: a.sleepScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Biomarkers
    try {
      const biomarkers = await db.biomarkersAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      biomarkers.forEach(a => allAssessments.push({ id: a.id, area: 'Biomarkers', areaKey: 'biomarkers', score: a.biomarkersScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Habits
    try {
      const habits = await db.habitsAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      habits.forEach(a => allAssessments.push({ id: a.id, area: 'Habits & Lifestyle', areaKey: 'habits', score: a.habitsScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Social
    try {
      const social = await db.socialAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      social.forEach(a => allAssessments.push({ id: a.id, area: 'Social Environment', areaKey: 'social', score: a.socialScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Prevention
    try {
      const prevention = await db.preventionAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      prevention.forEach(a => allAssessments.push({ id: a.id, area: 'Prevention', areaKey: 'prevention', score: a.preventionScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Health Assessment (comprehensive)
    try {
      const health = await db.healthAssessment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
      health.forEach(a => allAssessments.push({ id: a.id, area: 'Comprehensive Assessment', areaKey: 'comprehensive', score: a.totalScore, riskLevel: a.riskLevel, createdAt: a.createdAt.toISOString(), rawData: a as unknown as Record<string, unknown> }));
    } catch { /* table may not exist yet */ }

    // Sort all by date descending
    allAssessments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Summary stats
    const areaSummary = ['mental', 'nutrition', 'physical', 'hydration', 'sleep', 'biomarkers', 'habits', 'social', 'prevention'].map(key => {
      const areaEntries = allAssessments.filter(a => a.areaKey === key);
      const latest = areaEntries[0];
      const avgScore = areaEntries.length > 0 ? Math.round(areaEntries.reduce((s, a) => s + a.score, 0) / areaEntries.length) : 0;
      return { areaKey: key, count: areaEntries.length, latestScore: latest?.score ?? null, latestRisk: latest?.riskLevel ?? null, avgScore, latestDate: latest?.createdAt ?? null };
    });

    return NextResponse.json({ assessments: allAssessments, areaSummary, total: allAssessments.length });
  } catch (error) {
    console.error('Get all assessments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
