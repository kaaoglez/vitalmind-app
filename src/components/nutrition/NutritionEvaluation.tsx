'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Apple, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, Leaf, Scale, User,
} from 'lucide-react';

const FFQ_ITEMS = 10;
const FREQ_OPTIONS = [0, 1, 2, 3, 4] as const;

type EvalStep = 'ffq' | 'indicators' | 'results';

interface NutritionEvalData {
  ffq: number[];
  dietQuality: number;
  macroBalance: number;
  processedFreq: number;
  naturalFoodPct: number;
  fruitVegServ: number;
  proteinPerKg: number;
  mealRegularity: number;
  hydrationWithMeals: number;
}

const defaultData: NutritionEvalData = {
  ffq: Array(FFQ_ITEMS).fill(0),
  dietQuality: 5,
  macroBalance: 5,
  processedFreq: 5,
  naturalFoodPct: 50,
  fruitVegServ: 3,
  proteinPerKg: 1.0,
  mealRegularity: 5,
  hydrationWithMeals: 5,
};

function calcScore(d: NutritionEvalData) {
  const positiveSum = d.ffq.slice(0, 5).reduce((a, b) => a + b, 0);
  const inverseSum = d.ffq.slice(5, 10).reduce((a, b) => a + b, 0);
  const positiveContrib = (positiveSum / 20) * 3.5;
  const inverseContrib = ((20 - inverseSum) / 20) * 3.5;
  const fruitVegContrib = Math.min(d.fruitVegServ / 5, 1) * 0.5;
  const naturalContrib = (d.naturalFoodPct / 100) * 0.5;
  const subjAvg = ((10 - d.processedFreq) + d.dietQuality + d.macroBalance + d.mealRegularity + d.hydrationWithMeals) / 5;
  const subjContrib = (subjAvg / 10) * 2;
  const raw = positiveContrib + inverseContrib + subjContrib + fruitVegContrib + naturalContrib;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (inverseSum >= 14 || score <= 2) riskLevel = 'urgent';
  else if (inverseSum >= 10 || score <= 4) riskLevel = 'risk';
  else if (inverseSum >= 6 || score <= 6) riskLevel = 'mild';

  return { score, riskLevel, positiveSum, inverseSum };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-green-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

interface ProfileData {
  bmi: number;
  weight: number;
  height: number;
  profileComplete: boolean;
}

export default function NutritionEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('ffq');
  const [data, setData] = useState<NutritionEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const et = t.nutritionEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/nutrition-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(err => {
  console.warn('Failed to load saved assessments:', err);
});
    fetch('/api/user-profile').then(r => r.json()).then(d => {
      if (d.profile) {
        setProfileData({
          bmi: d.profile.bmi || 0,
          weight: d.profile.weight || 0,
          height: d.profile.height || 0,
          profileComplete: d.profile.profileComplete || false,
        });
      }
    }).catch(err => {
  console.warn('Failed to load user profile:', err);
});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setFfq = (i: number, v: number) => setData(prev => {
    const ffq = [...prev.ffq]; ffq[i] = v; return { ...prev, ffq };
  });

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const body: Record<string, number> = {};
      data.ffq.forEach((v, i) => { body[`ffq${i + 1}`] = v; });
      body.dietQuality = data.dietQuality;
      body.macroBalance = data.macroBalance;
      body.processedFreq = data.processedFreq;
      body.naturalFoodPct = data.naturalFoodPct;
      body.fruitVegServ = data.fruitVegServ;
      body.proteinPerKg = data.proteinPerKg;
      body.mealRegularity = data.mealRegularity;
      body.hydrationWithMeals = data.hydrationWithMeals;
      if (profileData) {
        body.bmi = profileData.bmi;
        body.height = profileData.height;
        body.weight = profileData.weight;
      }

      const res = await fetch('/api/nutrition-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // REPORT VIEW
  if (viewReport) {
    const a = viewReport;
    const score = Number(a.nutritionScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const positiveSum = [1,2,3,4,5].reduce((s, i) => s + (Number(a[`ffq${i}`]) || 0), 0);
    const inverseSum = [6,7,8,9,10].reduce((s, i) => s + (Number(a[`ffq${i}`]) || 0), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {et.backToList}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <Apple className="w-8 h-8 text-wellness-emerald" />
                <h1 className="text-2xl font-bold text-foreground">VitalMind</h1>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{et.reportTitle}</h2>
              <p className="text-sm text-muted-foreground">{et.reportSubtitle}</p>
              <p className="text-xs text-muted-foreground">{a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : ''}</p>
            </div>

            {/* Area Score */}
            <div className="text-center space-y-3 mb-8">
              <div className="flex items-center justify-center gap-3">
                <span className={`text-5xl font-bold ${ri.color}`}>{score}</span>
                <span className="text-2xl text-muted-foreground">/10</span>
              </div>
              <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${ri.color}`}>
                {ri.icon} {ri.label}
              </div>
              <div className="max-w-md mx-auto bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-green-500' : risk === 'mild' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* FFQ Results */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.positiveFoods}</p>
                <p className={`text-2xl font-bold ${positiveSum >= 12 ? 'text-green-500' : positiveSum >= 8 ? 'text-blue-500' : positiveSum >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{positiveSum}/20</p>
                <p className="text-xs text-muted-foreground mt-1">{et.positiveDesc}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.inverseFoods}</p>
                <p className={`text-2xl font-bold ${inverseSum <= 4 ? 'text-green-500' : inverseSum <= 8 ? 'text-yellow-500' : 'text-red-500'}`}>{inverseSum}/20</p>
                <p className="text-xs text-muted-foreground mt-1">{et.inverseDesc}</p>
              </div>
            </div>

            {/* Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { key: 'dietQuality', label: et.indDietQuality },
                { key: 'macroBalance', label: et.indMacroBalance },
                { key: 'processedFreq', label: et.indProcessedFreq, inverse: true },
                { key: 'fruitVegServ', label: et.indFruitVeg, unit: et.servings },
                { key: 'naturalFoodPct', label: et.indNaturalPct, unit: '%' },
                { key: 'mealRegularity', label: et.indMealReg },
              ].map(ind => {
                const val = Number(a[ind.key]) || 0;
                const displayVal = ind.inverse ? 10 - val + 1 : val;
                return (
                  <div key={ind.key} className="p-3 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ind.label}</p>
                    <p className={`text-xl font-bold ${displayVal >= 7 ? 'text-green-500' : displayVal >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}{ind.unit ? ` ${ind.unit}` : ''}</p>
                  </div>
                );
              })}
            </div>

            {/* BMI from Profile */}
            {Number(a.bmi) > 0 && (() => {
              const bmiVal = Number(a.bmi);
              let bmiLabel = et.bmiNormal;
              let bmiColor = 'text-green-500';
              if (bmiVal < 18.5) { bmiLabel = et.bmiUnderweight; bmiColor = 'text-blue-500'; }
              else if (bmiVal >= 25 && bmiVal < 30) { bmiLabel = et.bmiOverweight; bmiColor = 'text-yellow-500'; }
              else if (bmiVal >= 30) { bmiLabel = et.bmiObese; bmiColor = 'text-red-500'; }
              const heightCm = Number(a.height) || profileData?.height || 0;
              const weightKg = Number(a.weight) || profileData?.weight || 0;
              const heightM = heightCm / 100;
              let kgOver = 0;
              if (bmiVal >= 25 && heightM > 0 && weightKg > 0) {
                const healthyWeight = 25 * heightM * heightM;
                kgOver = weightKg - healthyWeight;
              }
              return (
                <div className="p-4 rounded-xl border border-border text-center mb-6">
                  <p className="text-xs text-muted-foreground mb-1">{et.bmiFromProfile}</p>
                  <p className={`text-2xl font-bold ${bmiColor}`}>{bmiVal.toFixed(1)}</p>
                  <p className={`text-xs font-medium mt-1 ${bmiColor}`}>{bmiLabel}</p>
                  {kgOver > 0 && (
                    <p className={`text-sm font-semibold mt-1 ${bmiColor}`}>
                      +{kgOver.toFixed(1)} {et.bmiKgOver}
                    </p>
                  )}
                  {bmiVal < 18.5 && heightM > 0 && weightKg > 0 && (() => {
                    const minHealthyWeight = 18.5 * heightM * heightM;
                    const kgBelow = minHealthyWeight - weightKg;
                    return kgBelow > 0 ? (
                      <p className="text-sm font-semibold mt-1 text-blue-500">
                        {kgBelow.toFixed(1)} {et.bmiKgToGoal}
                      </p>
                    ) : null;
                  })()}
                  <div className="max-w-xs mx-auto mt-2 bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${bmiColor.replace('text-', 'bg-')}`}
                      style={{ width: `${Math.min((bmiVal / 40) * 100, 100)}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {positiveSum < 8 && (
                  <li className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recPositive}
                  </li>
                )}
                {inverseSum >= 8 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recInverse}
                  </li>
                )}
                {Number(a.fruitVegServ) < 3 && (
                  <li className="flex items-start gap-2 text-green-600 dark:text-green-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recFruitVeg}
                  </li>
                )}
                {Number(a.processedFreq) >= 7 && (
                  <li className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recProcessed}
                  </li>
                )}
                {Number(a.naturalFoodPct) < 40 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recNatural}
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

  // STEP FORM
  return (
    <div className="space-y-6">
      {/* Previous assessments */}
      {savedAssessments.length > 0 && step === 'ffq' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.nutritionScore) >= 7 ? 'bg-green-500' : Number(a.nutritionScore) >= 5 ? 'bg-blue-500' : Number(a.nutritionScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.nutritionScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">FFQ: {String(a.ffqTotal)}/40</p>
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
        {(['ffq', 'indicators', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['ffq', 'indicators', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepFfq, et.stepIndicators, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-wellness-emerald/15 text-wellness-emerald border border-wellness-emerald/30' : isDone ? 'bg-wellness-emerald/10 text-wellness-emerald' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Profile BMI Card (shown at top of form) */}
      {step === 'ffq' && profileData && profileData.bmi > 0 && (() => {
        const bmiColorClass = profileData.bmi < 18.5 ? 'text-blue-500' : profileData.bmi < 25 ? 'text-green-500' : profileData.bmi < 30 ? 'text-yellow-500' : 'text-red-500';
        const bmiLabel = profileData.bmi < 18.5 ? et.bmiUnderweight : profileData.bmi < 25 ? et.bmiNormal : profileData.bmi < 30 ? et.bmiOverweight : et.bmiObese;
        const heightM = profileData.height / 100;
        let kgOver = 0;
        if (profileData.bmi >= 25 && heightM > 0) {
          const healthyWeight = 25 * heightM * heightM;
          kgOver = profileData.weight - healthyWeight;
        }
        let kgBelow = 0;
        if (profileData.bmi < 18.5 && heightM > 0) {
          const minHealthyWeight = 18.5 * heightM * heightM;
          kgBelow = minHealthyWeight - profileData.weight;
        }
        return (
          <Card className="border-wellness-emerald/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-wellness-emerald/10 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-wellness-emerald" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{et.bmiFromProfile}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xl font-bold ${bmiColorClass}`}>
                      {profileData.bmi.toFixed(1)}
                    </span>
                    <span className={`text-xs font-medium ${bmiColorClass}`}>
                      {bmiLabel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({profileData.weight} kg / {profileData.height} cm)
                    </span>
                  </div>
                  {kgOver > 0 && (
                    <p className={`text-sm font-semibold mt-1 ${bmiColorClass}`}>
                      +{kgOver.toFixed(1)} {et.bmiKgOver}
                    </p>
                  )}
                  {kgBelow > 0 && (
                    <p className="text-sm font-semibold mt-1 text-blue-500">
                      {kgBelow.toFixed(1)} {et.bmiKgToGoal}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* No profile warning */}
      {step === 'ffq' && (!profileData || profileData.bmi === 0) && isAuthenticated && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">{et.noProfileData}</p>
          </div>
        </div>
      )}

      {/* FFQ Step */}
      {step === 'ffq' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-5 h-5 text-wellness-emerald" />
              <h3 className="font-semibold text-foreground">{et.ffqTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.ffqDesc}</p>

            {Array.from({ length: FFQ_ITEMS }, (_, i) => {
              const qKey = `ffqQ${i + 1}` as keyof typeof et;
              const isInverse = i >= 5;
              return (
                <div key={i} className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {isInverse && <span className="text-xs text-amber-500">⚠️</span>}
                    {et[qKey]}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setFfq(i, opt)}
                        className={`px-1.5 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                          data.ffq[i] === opt
                            ? isInverse
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                              : 'bg-wellness-emerald/20 text-wellness-emerald border border-wellness-emerald/40'
                            : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                        }`}>
                        {et[`freq${opt}` as keyof typeof et]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">{et.ffqSubtotal}: <span className="font-bold">{data.ffq.reduce((a, b) => a + b, 0)}/40</span></p>
              <p className="text-xs text-muted-foreground mt-1">{et.positiveLabel}: {data.ffq.slice(0, 5).reduce((a, b) => a + b, 0)}/20 | {et.inverseLabel}: {data.ffq.slice(5, 10).reduce((a, b) => a + b, 0)}/20</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('indicators')} className="gap-2 bg-wellness-emerald hover:bg-wellness-emerald/90">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicators Step */}
      {step === 'indicators' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Apple className="w-5 h-5 text-wellness-emerald" />
              <h3 className="font-semibold text-foreground">{et.indicatorsTitle}</h3>
            </div>

            {[
              { key: 'dietQuality', label: et.indDietQuality, min: 1, max: 10 },
              { key: 'macroBalance', label: et.indMacroBalance, min: 1, max: 10 },
              { key: 'processedFreq', label: et.indProcessedFreq, min: 1, max: 10, inverse: true },
              { key: 'mealRegularity', label: et.indMealReg, min: 1, max: 10 },
              { key: 'hydrationWithMeals', label: et.indHydrationMeals, min: 1, max: 10 },
            ].map(ind => {
              const val = data[ind.key as keyof NutritionEvalData] as number;
              const displayVal = ind.inverse ? 10 - val + 1 : val;
              return (
                <div key={ind.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{ind.label}</Label>
                    <span className={`text-sm font-bold ${displayVal >= 7 ? 'text-green-500' : displayVal >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}</span>
                  </div>
                  <input type="range" min={ind.min} max={ind.max} value={val}
                    onChange={e => setData(p => ({ ...p, [ind.key]: Number(e.target.value) }))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-wellness-emerald" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{ind.min}</span><span>{ind.max}</span>
                  </div>
                </div>
              );
            })}

            {/* Fruit & Veg Servings */}
            <div className="space-y-2">
              <Label className="text-sm">{et.indFruitVeg}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={10} value={data.fruitVegServ}
                  onChange={e => setData(p => ({ ...p, fruitVegServ: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-wellness-emerald" />
                <span className="text-sm font-bold w-20 text-right">{data.fruitVegServ} {et.servings}</span>
              </div>
            </div>

            {/* Natural Food % */}
            <div className="space-y-2">
              <Label className="text-sm">{et.indNaturalPct}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={100} step={5} value={data.naturalFoodPct}
                  onChange={e => setData(p => ({ ...p, naturalFoodPct: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-wellness-emerald" />
                <span className="text-sm font-bold w-16 text-right">{data.naturalFoodPct}%</span>
              </div>
            </div>

            {/* Protein per kg */}
            <div className="space-y-2">
              <Label className="text-sm">{et.indProteinPerKg}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0.5} max={3} step={0.1} value={data.proteinPerKg}
                  onChange={e => setData(p => ({ ...p, proteinPerKg: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-wellness-emerald" />
                <span className="text-sm font-bold w-20 text-right">{data.proteinPerKg.toFixed(1)} g/kg</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('ffq')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-wellness-emerald hover:bg-wellness-emerald/90">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Step */}
      {step === 'results' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.stepResults}</h3>
            </div>

            <div className="text-center space-y-3 mb-6">
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-green-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.positiveFoods}</p>
                <p className={`text-2xl font-bold ${results.positiveSum >= 12 ? 'text-green-500' : results.positiveSum >= 8 ? 'text-blue-500' : results.positiveSum >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{results.positiveSum}/20</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.inverseFoods}</p>
                <p className={`text-2xl font-bold ${results.inverseSum <= 4 ? 'text-green-500' : results.inverseSum <= 8 ? 'text-yellow-500' : 'text-red-500'}`}>{results.inverseSum}/20</p>
              </div>
            </div>

            {results.inverseSum >= 10 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.highProcessedWarning}
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
                  className="gap-2 bg-wellness-emerald hover:bg-wellness-emerald/90">
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
