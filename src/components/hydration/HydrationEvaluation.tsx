'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Droplets, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, Thermometer, Scale, User,
} from 'lucide-react';

type EvalStep = 'intake' | 'indicators' | 'results';

interface HydrationEvalData {
  dailyLiters: number;
  intakeFrequency: number;
  firstGlassMorning: boolean;
  withMeals: number;
  duringExercise: number;
  urineColor: number;
  dehydrationSigns: number;
  sugaryDrinksFreq: number;
  caffeineDrinksFreq: number;
  alcoholDrinksFreq: number;
  hotClimate: boolean;
  highAltitude: boolean;
}

const defaultData: HydrationEvalData = {
  dailyLiters: 1.5,
  intakeFrequency: 5,
  firstGlassMorning: false,
  withMeals: 5,
  duringExercise: 5,
  urineColor: 3,
  dehydrationSigns: 0,
  sugaryDrinksFreq: 3,
  caffeineDrinksFreq: 3,
  alcoholDrinksFreq: 1,
  hotClimate: false,
  highAltitude: false,
};

const DEHYDRATION_SIGNS_COUNT = 7;

function countBits(mask: number): number {
  let count = 0;
  let n = mask;
  while (n) { count += n & 1; n >>= 1; }
  return count;
}
const URINE_COLORS = [
  { level: 1, color: '#f5e6ab', label: 'urineL1' },
  { level: 2, color: '#f0d87a', label: 'urineL2' },
  { level: 3, color: '#e8c445', label: 'urineL3' },
  { level: 4, color: '#d4a017', label: 'urineL4' },
  { level: 5, color: '#b8860b', label: 'urineL5' },
  { level: 6, color: '#8b6914', label: 'urineL6' },
  { level: 7, color: '#6b4c11', label: 'urineL7' },
  { level: 8, color: '#4a3008', label: 'urineL8' },
];

interface ProfileData {
  weight: number;
  profileComplete: boolean;
}

function calcScore(d: HydrationEvalData, weight: number) {
  const recommendedMlPerKg = weight > 0 ? Math.round(weight * 33) : 0;

  // Volume score (0-3.5)
  let volumeScore = 0;
  if (weight > 0 && recommendedMlPerKg > 0) {
    const actualMl = d.dailyLiters * 1000;
    const ratio = actualMl / recommendedMlPerKg;
    if (ratio >= 0.9 && ratio <= 1.3) volumeScore = 3.5;
    else if (ratio >= 0.7 && ratio <= 1.5) volumeScore = 2.5;
    else if (ratio >= 0.5) volumeScore = 1.5;
    else volumeScore = 0.5;
  } else {
    if (d.dailyLiters >= 2.0 && d.dailyLiters <= 3.5) volumeScore = 3.5;
    else if (d.dailyLiters >= 1.5 && d.dailyLiters <= 4.0) volumeScore = 2.5;
    else if (d.dailyLiters >= 1.0) volumeScore = 1.5;
    else volumeScore = 0.5;
  }

  // Urine color score (0-2)
  let urineScore = 0;
  if (d.urineColor <= 2) urineScore = 2;
  else if (d.urineColor <= 3) urineScore = 1.5;
  else if (d.urineColor <= 4) urineScore = 1;
  else if (d.urineColor <= 5) urineScore = 0.5;
  else urineScore = 0;

  // Habit quality (0-2.5)
  const habitAvg = (d.intakeFrequency + d.withMeals + d.duringExercise) / 3;
  const habitScore = (habitAvg / 10) * 2;
  const morningBonus = d.firstGlassMorning ? 0.25 : 0;
  const habitTotal = habitScore + morningBonus;

  // Dehydration signs penalty (0 to -2)
  const dehydCount = countBits(d.dehydrationSigns);
  const dehydPenalty = Math.min(dehydCount * 0.3, 2);

  // Beverage quality (0-1.5)
  const beverageAvg = ((10 - d.sugaryDrinksFreq) + (10 - d.caffeineDrinksFreq) + (10 - d.alcoholDrinksFreq)) / 3;
  const beverageScore = (beverageAvg / 10) * 1.5;

  // Climate adjustment
  let climateAdj = 0;
  if (d.hotClimate && d.dailyLiters < 2.5) climateAdj = -0.5;
  if (d.highAltitude && d.dailyLiters < 2.5) climateAdj = -0.3;

  const raw = volumeScore + urineScore + habitTotal - dehydPenalty + beverageScore + climateAdj;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (d.urineColor >= 6 || dehydCount >= 5 || d.dailyLiters < 0.8) riskLevel = 'urgent';
  else if (d.urineColor >= 5 || dehydCount >= 3 || score <= 4) riskLevel = 'risk';
  else if (d.urineColor >= 4 || dehydCount >= 2 || score <= 6) riskLevel = 'mild';

  return { score, riskLevel, recommendedMlPerKg };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-cyan-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

export default function HydrationEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('intake');
  const [data, setData] = useState<HydrationEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const et = t.hydrationEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/hydration-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(err => {
  console.warn('Failed to load saved assessments:', err);
});
    fetch('/api/user-profile').then(r => r.json()).then(d => {
      if (d.profile) {
        setProfileData({
          weight: d.profile.weight || 0,
          profileComplete: d.profile.profileComplete || false,
        });
      }
    }).catch(err => {
  console.warn('Failed to load user profile:', err);
});
  }, [isAuthenticated]);

  const weight = profileData?.weight || 0;
  const results = useMemo(() => calcScore(data, weight), [data, weight]);

  const setField = <K extends keyof HydrationEvalData>(key: K, v: HydrationEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const toggleDehydrationSign = (idx: number) => {
    const signs = data.dehydrationSigns;
    const mask = 1 << idx;
    const isSet = (signs & mask) !== 0;
    setField('dehydrationSigns', isSet ? signs & ~mask : signs | mask);
  };

  const isSignChecked = (idx: number) => (data.dehydrationSigns & (1 << idx)) !== 0;

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/hydration-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.assessment) {
          setSavedAssessments(prev => [result.assessment, ...prev]);
          setViewReport(result.assessment);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setSubmitError('You must be logged in to save reports. Please log in and try again.');
        } else {
          setSubmitError(String(errorData.error || `Failed to save assessment (${res.status}). Please try again.`));
        }
      }
    } catch { setSubmitError('Failed to save assessment. Please try again.'); }
    setIsSubmitting(false);
  };

  // ─── REPORT VIEW ────────────────────────────────────────────────
  if (viewReport) {
    const a = viewReport;
    const score = Number(a.hydrationScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const dailyL = Number(a.dailyLiters) || 1.5;
    const urine = Number(a.urineColor) || 3;
    const recMl = Number(a.recommendedMlPerKg) || 0;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {et.backToList}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <Droplets className="w-8 h-8 text-cyan-500" />
                <h1 className="text-2xl font-bold text-foreground">VitalMind</h1>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{et.reportTitle}</h2>
              <p className="text-sm text-muted-foreground">{et.reportSubtitle}</p>
              <p className="text-xs text-muted-foreground">{a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : ''}</p>
            </div>

            {/* Score */}
            <div className="text-center space-y-3 mb-8">
              <div className="flex items-center justify-center gap-3">
                <span className={`text-5xl font-bold ${ri.color}`}>{score}</span>
                <span className="text-2xl text-muted-foreground">/10</span>
              </div>
              <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${ri.color}`}>
                {ri.icon} {ri.label}
              </div>
              <div className="max-w-md mx-auto bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-cyan-500' : risk === 'mild' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.dailyIntake}</p>
                <p className={`text-2xl font-bold ${dailyL >= 2.0 ? 'text-cyan-500' : dailyL >= 1.5 ? 'text-blue-500' : 'text-red-500'}`}>{dailyL.toFixed(1)}L</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.urineColorLabel}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-border" style={{ backgroundColor: URINE_COLORS[urine - 1]?.color || '#e8c445' }} />
                  <span className={`text-sm font-bold ${urine <= 3 ? 'text-green-500' : urine <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>{et[`urineL${urine}` as keyof typeof et]}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.dehydrationSignsLabel}</p>
                <p className={`text-2xl font-bold ${countBits(Number(a.dehydrationSigns)) === 0 ? 'text-green-500' : countBits(Number(a.dehydrationSigns)) <= 2 ? 'text-yellow-500' : 'text-red-500'}`}>{countBits(Number(a.dehydrationSigns))}/7</p>
              </div>
            </div>

            {/* Recommended intake */}
            {recMl > 0 && (
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-center mb-6">
                <p className="text-xs text-muted-foreground mb-1">{et.recommendedIntake}</p>
                <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">{(recMl / 1000).toFixed(1)}L ({recMl} ml)</p>
                <p className="text-xs text-muted-foreground mt-1">{et.basedOnWeight}: {String(a.weight)} kg (33 ml/kg)</p>
              </div>
            )}

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {dailyL < 1.5 && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowIntake}
                  </li>
                )}
                {urine >= 5 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recDarkUrine}
                  </li>
                )}
                {countBits(Number(a.dehydrationSigns)) >= 3 && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recDehydrationSigns}
                  </li>
                )}
                {Number(a.sugaryDrinksFreq) >= 6 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recSugary}
                  </li>
                )}
                {Number(a.caffeineDrinksFreq) >= 7 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recCaffeine}
                  </li>
                )}
                {!a.firstGlassMorning && (
                  <li className="flex items-start gap-2 text-cyan-600 dark:text-cyan-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recMorning}
                  </li>
                )}
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recGeneral}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground italic text-center">{et.disclaimer}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── STEP FORM ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Previous assessments */}
      {savedAssessments.length > 0 && step === 'intake' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.hydrationScore) >= 7 ? 'bg-cyan-500' : Number(a.hydrationScore) >= 5 ? 'bg-blue-500' : Number(a.hydrationScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.hydrationScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{Number(a.dailyLiters).toFixed(1)}L/day</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step indicator */}
      <div className="flex gap-1">
        {(['intake', 'indicators', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['intake', 'indicators', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepIntake, et.stepIndicators, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30' : isDone ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Profile weight card */}
      {step === 'intake' && profileData && profileData.weight > 0 && (
        <Card className="border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Scale className="w-6 h-6 text-cyan-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{et.weightFromProfile}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{profileData.weight} kg</span>
                  <span className="text-xs text-muted-foreground">{et.recommendedIntake}: <span className="font-bold text-foreground">{Math.round(profileData.weight * 33)} ml ({(profileData.weight * 33 / 1000).toFixed(1)}L)</span></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No profile warning */}
      {step === 'intake' && (!profileData || profileData.weight === 0) && isAuthenticated && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">{et.noProfileData}</p>
          </div>
        </div>
      )}

      {/* ─── Intake Step ───────────────────────────────────────── */}
      {step === 'intake' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-foreground">{et.intakeTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.intakeDesc}</p>

            {/* Daily liters */}
            <div className="space-y-2">
              <Label className="text-sm">{et.dailyLiters}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={5} step={0.1} value={data.dailyLiters}
                  onChange={e => setField('dailyLiters', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                <span className="text-lg font-bold text-cyan-600 dark:text-cyan-400 w-16 text-right">{data.dailyLiters.toFixed(1)}L</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0L</span><span>2.5L</span><span>5L</span>
              </div>
            </div>

            {/* Intake frequency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.intakeFrequency}</Label>
                <span className={`text-sm font-bold ${data.intakeFrequency >= 7 ? 'text-green-500' : data.intakeFrequency >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.intakeFrequency}</span>
              </div>
              <input type="range" min={1} max={10} value={data.intakeFrequency}
                onChange={e => setField('intakeFrequency', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            </div>

            {/* First glass morning */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <Label className="text-sm">{et.firstGlassMorning}</Label>
              <button onClick={() => setField('firstGlassMorning', !data.firstGlassMorning)}
                className={`w-12 h-6 rounded-full transition-colors ${data.firstGlassMorning ? 'bg-cyan-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.firstGlassMorning ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* With meals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.withMeals}</Label>
                <span className="text-sm font-bold">{data.withMeals}</span>
              </div>
              <input type="range" min={1} max={10} value={data.withMeals}
                onChange={e => setField('withMeals', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            </div>

            {/* During exercise */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.duringExercise}</Label>
                <span className="text-sm font-bold">{data.duringExercise}</span>
              </div>
              <input type="range" min={1} max={10} value={data.duringExercise}
                onChange={e => setField('duringExercise', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500" />
            </div>

            {/* Climate factors */}
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">{et.climateFactors}</p>
              <div className="flex gap-3">
                {([
                  { key: 'hotClimate' as const, label: et.hotClimate, icon: <Thermometer className="w-4 h-4" /> },
                  { key: 'highAltitude' as const, label: et.highAltitude, icon: <Activity className="w-4 h-4" /> },
                ]).map(item => (
                  <button key={item.key} onClick={() => setField(item.key, !data[item.key])}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${data[item.key] ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30' : 'bg-muted text-muted-foreground border border-transparent'}`}>
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('indicators')} className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Indicators Step ──────────────────────────────────── */}
      {step === 'indicators' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-cyan-500" />
              <h3 className="font-semibold text-foreground">{et.indicatorsTitle}</h3>
            </div>

            {/* Urine color chart */}
            <div className="space-y-3">
              <Label className="text-sm">{et.urineColorLabel}</Label>
              <p className="text-xs text-muted-foreground">{et.urineColorDesc}</p>
              <div className="grid grid-cols-4 gap-2">
                {URINE_COLORS.map(uc => (
                  <button key={uc.level} onClick={() => setField('urineColor', uc.level)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${data.urineColor === uc.level ? 'ring-2 ring-cyan-500 bg-cyan-500/10' : 'bg-muted/50 hover:bg-muted'}`}>
                    <div className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: uc.color }} />
                    <span className="text-[10px] text-muted-foreground">{uc.level}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">{et[uc.label as keyof typeof et]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dehydration signs */}
            <div className="space-y-3">
              <Label className="text-sm">{et.dehydrationSignsLabel}</Label>
              <p className="text-xs text-muted-foreground">{et.dehydrationSignsDesc}</p>
              <div className="space-y-2">
                {Array.from({ length: DEHYDRATION_SIGNS_COUNT }, (_, i) => {
                  const key = `dehydrSign${i + 1}` as keyof typeof et;
                  return (
                    <button key={i} onClick={() => toggleDehydrationSign(i)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-sm text-left transition-colors ${isSignChecked(i) ? 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300' : 'bg-muted/30 border border-transparent text-foreground'}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${isSignChecked(i) ? 'bg-amber-500 text-white' : 'bg-muted border border-border'}`}>
                        {isSignChecked(i) && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      {et[key]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Beverage choices */}
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">{et.beverageSection}</p>
              {[
                { key: 'sugaryDrinksFreq' as const, label: et.sugaryDrinks, inverse: true },
                { key: 'caffeineDrinksFreq' as const, label: et.caffeineDrinks, inverse: true },
                { key: 'alcoholDrinksFreq' as const, label: et.alcoholDrinks, inverse: true },
              ].map(ind => {
                const val = data[ind.key];
                const displayVal = ind.inverse ? 10 - val + 1 : val;
                return (
                  <div key={ind.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{ind.label}</Label>
                      <span className={`text-sm font-bold ${displayVal >= 7 ? 'text-green-500' : displayVal >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}/10</span>
                    </div>
                    <input type="range" min={1} max={10} value={val}
                      onChange={e => setField(ind.key, Number(e.target.value))}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('intake')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Results Step ──────────────────────────────────────── */}
      {step === 'results' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.stepResults}</h3>
            </div>

            <div className="text-center space-y-3 mb-6">
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-cyan-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.dailyIntake}</p>
                <p className={`text-2xl font-bold ${data.dailyLiters >= 2.0 ? 'text-cyan-500' : data.dailyLiters >= 1.5 ? 'text-blue-500' : 'text-red-500'}`}>{data.dailyLiters.toFixed(1)}L</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.urineColorLabel}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: URINE_COLORS[data.urineColor - 1]?.color || '#e8c445' }} />
                  <span className="text-sm font-bold">{et[`urineL${data.urineColor}` as keyof typeof et]}</span>
                </div>
              </div>
            </div>

            {(data.urineColor >= 5 || countBits(data.dehydrationSigns) >= 3) && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.dehydrationWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('indicators')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-amber-500">Please log in to generate and save reports.</p>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}
                  className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                  {isSubmitting ? et.saving : et.generateReport}
                </Button>
              )}
            </div>
            {submitError && (
  <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>
  </div>
)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
