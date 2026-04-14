'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Beer, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Smartphone, Clock, ShieldAlert, Cigarette, Activity,
} from 'lucide-react';

type EvalStep = 'substances' | 'screens' | 'lifestyle' | 'results';

type AlcoholFrequency = 'never' | 'monthly' | 'weekly' | 'daily';
type SmokingStatus = 'never' | 'former' | 'current';
type VapingStatus = 'never' | 'former' | 'current';
type SubstanceUse = 'none' | 'occasional' | 'regular';

interface HabitsEvalData {
  alcoholFrequency: AlcoholFrequency;
  alcoholDrinksPerOccasion: number;
  alcoholBinge: boolean;
  smokingStatus: SmokingStatus;
  cigarettesPerDay: number;
  yearsSmoking: number;
  vapingStatus: VapingStatus;
  screenTimeHours: number;
  recreationalScreen: number;
  screenBeforeSleep: number;
  socialMediaHours: number;
  digitalDetoxDays: number;
  routineRegularity: number;
  mealSchedule: number;
  substanceUse: SubstanceUse;
  caffeineDependency: number;
  stressManagement: number;
}

const defaultData: HabitsEvalData = {
  alcoholFrequency: 'never',
  alcoholDrinksPerOccasion: 0,
  alcoholBinge: false,
  smokingStatus: 'never',
  cigarettesPerDay: 0,
  yearsSmoking: 0,
  vapingStatus: 'never',
  screenTimeHours: 4,
  recreationalScreen: 2,
  screenBeforeSleep: 5,
  socialMediaHours: 2,
  digitalDetoxDays: 0,
  routineRegularity: 5,
  mealSchedule: 5,
  substanceUse: 'none',
  caffeineDependency: 3,
  stressManagement: 5,
};

function calcScore(d: HabitsEvalData) {
  // AUDIT-C alcohol score (0-2.5)
  let auditScore = 0;
  if (d.alcoholFrequency === 'never') auditScore = 2.5;
  else if (d.alcoholFrequency === 'monthly') auditScore = 2;
  else if (d.alcoholFrequency === 'weekly') {
    auditScore = d.alcoholDrinksPerOccasion <= 2 && !d.alcoholBinge ? 1.5 : 1;
  } else {
    auditScore = d.alcoholDrinksPerOccasion <= 1 ? 0.5 : 0;
  }

  // Smoking score (0-2.5)
  let smokingScore = 0;
  if (d.smokingStatus === 'never') smokingScore = 2.5;
  else if (d.smokingStatus === 'former') smokingScore = 2;
  else {
    smokingScore = d.cigarettesPerDay < 10 ? 0.5 : 0;
  }

  // Vaping penalty
  let vapingPenalty = 0;
  if (d.vapingStatus === 'current') vapingPenalty = 0.5;

  // Screen score (0-2.5)
  let screenScore = 0;
  if (d.screenTimeHours < 2) screenScore = 2.5;
  else if (d.screenTimeHours < 4) screenScore = 2;
  else if (d.screenTimeHours < 6) screenScore = 1;
  else if (d.screenTimeHours < 8) screenScore = 0.5;
  else screenScore = 0;

  // Routine score (0-1.5) — avg of regularity and meal schedule, scaled to 1.5
  const routineAvg = (d.routineRegularity + d.mealSchedule) / 2;
  const routineScore = (routineAvg / 10) * 1.5;

  // Stress score (0-1) — stressManagement scaled to 1
  const stressScore = (d.stressManagement / 10) * 1;

  const raw = auditScore + smokingScore - vapingPenalty + screenScore + routineScore + stressScore;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (d.smokingStatus === 'current' && d.cigarettesPerDay >= 20) riskLevel = 'urgent';
  else if (d.alcoholFrequency === 'daily' && d.alcoholBinge) riskLevel = 'urgent';
  else if (score <= 4) riskLevel = 'risk';
  else if (score <= 6) riskLevel = 'mild';

  return { score, riskLevel, auditScore, smokingScore, vapingPenalty, screenScore, routineScore, stressScore };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-green-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-amber-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-orange-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

export default function HabitsEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('substances');
  const [data, setData] = useState<HabitsEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const et = t.habitsEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/habits-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setField = <K extends keyof HabitsEvalData>(key: K, v: HabitsEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/habits-assessment', {
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
      }
    } catch { /* silent */ }
    setIsSubmitting(false);
  };

  // ─── REPORT VIEW ────────────────────────────────────────────────
  if (viewReport) {
    const a = viewReport;
    const score = Number(a.habitsScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const screenHrs = Number(a.screenTimeHours) || 4;
    const smoking = String(a.smokingStatus) || 'never';
    const alcohol = String(a.alcoholFrequency) || 'never';
    const stressMgmt = Number(a.stressManagement) || 5;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {et.backToList}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* VitalMind Header */}
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <Beer className="w-8 h-8 text-amber-500" />
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
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-green-500' : risk === 'mild' ? 'bg-amber-500' : risk === 'risk' ? 'bg-orange-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.alcoholLabel}</p>
                <p className={`text-lg font-bold ${alcohol === 'never' ? 'text-green-500' : alcohol === 'monthly' ? 'text-amber-500' : 'text-red-500'}`}>
                  {et[`alc${alcohol.charAt(0).toUpperCase() + alcohol.slice(1)}` as keyof typeof et] || alcohol}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.smokingLabel}</p>
                <p className={`text-lg font-bold ${smoking === 'never' ? 'text-green-500' : smoking === 'former' ? 'text-amber-500' : 'text-red-500'}`}>
                  {et[`smoke${smoking.charAt(0).toUpperCase() + smoking.slice(1)}` as keyof typeof et] || smoking}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.screenTimeLabel}</p>
                <p className={`text-2xl font-bold ${screenHrs < 4 ? 'text-green-500' : screenHrs < 6 ? 'text-amber-500' : 'text-red-500'}`}>
                  {screenHrs}h
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.stressMgmtLabel}</p>
                <p className={`text-2xl font-bold ${stressMgmt >= 7 ? 'text-green-500' : stressMgmt >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {stressMgmt}/10
                </p>
              </div>
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {(alcohol === 'daily' || a.alcoholBinge) && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHighAlcohol}
                  </li>
                )}
                {smoking === 'current' && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recSmoking}
                  </li>
                )}
                {screenHrs >= 6 && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHighScreen}
                  </li>
                )}
                {Number(a.routineRegularity) <= 4 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowRoutine}
                  </li>
                )}
                {stressMgmt <= 4 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowStressMgmt}
                  </li>
                )}
                {a.vapingStatus === 'current' && (
                  <li className="flex items-start gap-2 text-cyan-600 dark:text-cyan-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recVaping}
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
      {savedAssessments.length > 0 && step === 'substances' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.habitsScore) >= 7 ? 'bg-green-500' : Number(a.habitsScore) >= 5 ? 'bg-amber-500' : Number(a.habitsScore) >= 3 ? 'bg-orange-500' : 'bg-red-500'}`}>
                      {String(a.habitsScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{String(a.alcoholFrequency)} / {String(a.smokingStatus)}</p>
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
        {(['substances', 'screens', 'lifestyle', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['substances', 'screens', 'lifestyle', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepSubstances, et.stepScreens, et.stepLifestyle, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' : isDone ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* ─── Substances Step ─────────────────────────────────── */}
      {step === 'substances' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Beer className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.substancesTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.substancesDesc}</p>

            {/* Alcohol Frequency */}
            <div className="space-y-2">
              <Label className="text-sm">{et.alcoholFrequency}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['never', 'monthly', 'weekly', 'daily'] as const).map(opt => (
                  <button key={opt} onClick={() => setField('alcoholFrequency', opt)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.alcoholFrequency === opt ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                    {et[`alc${opt.charAt(0).toUpperCase() + opt.slice(1)}` as keyof typeof et]}
                  </button>
                ))}
              </div>
            </div>

            {/* Alcohol Drinks Per Occasion */}
            {data.alcoholFrequency !== 'never' && (
              <div className="space-y-2">
                <Label className="text-sm">{et.drinksPerOccasion}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={10} step={1} value={data.alcoholDrinksPerOccasion}
                    onChange={e => setField('alcoholDrinksPerOccasion', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-10 text-right">{data.alcoholDrinksPerOccasion}</span>
                </div>
              </div>
            )}

            {/* Alcohol Binge */}
            {data.alcoholFrequency !== 'never' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <Label className="text-sm">{et.alcoholBinge}</Label>
                <button onClick={() => setField('alcoholBinge', !data.alcoholBinge)}
                  className={`w-12 h-6 rounded-full transition-colors ${data.alcoholBinge ? 'bg-amber-500' : 'bg-muted'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.alcoholBinge ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )}

            {/* Smoking Status */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm flex items-center gap-2">
                <Cigarette className="w-4 h-4 text-amber-500" /> {et.smokingStatus}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['never', 'former', 'current'] as const).map(opt => (
                  <button key={opt} onClick={() => setField('smokingStatus', opt)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.smokingStatus === opt ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                    {et[`smoke${opt.charAt(0).toUpperCase() + opt.slice(1)}` as keyof typeof et]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cigarettes Per Day (shown only if current) */}
            {data.smokingStatus === 'current' && (
              <div className="space-y-2">
                <Label className="text-sm">{et.cigarettesPerDay}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={40} step={1} value={data.cigarettesPerDay}
                    onChange={e => setField('cigarettesPerDay', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-10 text-right">{data.cigarettesPerDay}</span>
                </div>
              </div>
            )}

            {/* Years Smoking (shown only if current) */}
            {data.smokingStatus === 'current' && (
              <div className="space-y-2">
                <Label className="text-sm">{et.yearsSmoking}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={60} step={1} value={data.yearsSmoking}
                    onChange={e => setField('yearsSmoking', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-10 text-right">{data.yearsSmoking}</span>
                </div>
              </div>
            )}

            {/* Vaping Status */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-sm">{et.vapingStatus}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['never', 'former', 'current'] as const).map(opt => (
                  <button key={opt} onClick={() => setField('vapingStatus', opt)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.vapingStatus === opt ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                    {et[`vape${opt.charAt(0).toUpperCase() + opt.slice(1)}` as keyof typeof et]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('screens')} className="gap-2 bg-amber-500 hover:bg-amber-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Screens Step ────────────────────────────────────── */}
      {step === 'screens' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.screensTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.screensDesc}</p>

            {/* Screen Time Hours */}
            <div className="space-y-2">
              <Label className="text-sm">{et.screenTimeHours}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={14} step={0.5} value={data.screenTimeHours}
                  onChange={e => setField('screenTimeHours', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.screenTimeHours < 4 ? 'text-green-500' : data.screenTimeHours < 6 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.screenTimeHours}h
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0h</span><span>4h</span><span>8h</span><span>14h</span>
              </div>
            </div>

            {/* Recreational Screen */}
            <div className="space-y-2">
              <Label className="text-sm">{et.recreationalScreen}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={8} step={0.5} value={data.recreationalScreen}
                  onChange={e => setField('recreationalScreen', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-16 text-right">{data.recreationalScreen}h</span>
              </div>
            </div>

            {/* Screen Before Sleep */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.screenBeforeSleep}</Label>
                <span className={`text-sm font-bold ${data.screenBeforeSleep <= 3 ? 'text-green-500' : data.screenBeforeSleep <= 6 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.screenBeforeSleep}/10
                </span>
              </div>
              <input type="range" min={1} max={10} value={data.screenBeforeSleep}
                onChange={e => setField('screenBeforeSleep', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            {/* Social Media Hours */}
            <div className="space-y-2">
              <Label className="text-sm">{et.socialMediaHours}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={8} step={0.5} value={data.socialMediaHours}
                  onChange={e => setField('socialMediaHours', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.socialMediaHours < 2 ? 'text-green-500' : data.socialMediaHours < 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.socialMediaHours}h
                </span>
              </div>
            </div>

            {/* Digital Detox Days */}
            <div className="space-y-2">
              <Label className="text-sm">{et.digitalDetoxDays}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={7} step={1} value={data.digitalDetoxDays}
                  onChange={e => setField('digitalDetoxDays', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 w-16 text-right">{data.digitalDetoxDays} {et.days}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('substances')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('lifestyle')} className="gap-2 bg-amber-500 hover:bg-amber-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Lifestyle Step ──────────────────────────────────── */}
      {step === 'lifestyle' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.lifestyleTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.lifestyleDesc}</p>

            {/* Routine Regularity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.routineRegularity}</Label>
                <span className={`text-sm font-bold ${data.routineRegularity >= 7 ? 'text-green-500' : data.routineRegularity >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.routineRegularity}/10
                </span>
              </div>
              <input type="range" min={1} max={10} value={data.routineRegularity}
                onChange={e => setField('routineRegularity', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            {/* Meal Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.mealSchedule}</Label>
                <span className={`text-sm font-bold ${data.mealSchedule >= 7 ? 'text-green-500' : data.mealSchedule >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.mealSchedule}/10
                </span>
              </div>
              <input type="range" min={1} max={10} value={data.mealSchedule}
                onChange={e => setField('mealSchedule', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            {/* Substance Use */}
            <div className="space-y-2">
              <Label className="text-sm">{et.substanceUse}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['none', 'occasional', 'regular'] as const).map(opt => (
                  <button key={opt} onClick={() => setField('substanceUse', opt)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${data.substanceUse === opt ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                    {et[`sub${opt.charAt(0).toUpperCase() + opt.slice(1)}` as keyof typeof et]}
                  </button>
                ))}
              </div>
            </div>

            {/* Caffeine Dependency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.caffeineDependency}</Label>
                <span className={`text-sm font-bold ${data.caffeineDependency <= 3 ? 'text-green-500' : data.caffeineDependency <= 6 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.caffeineDependency}/10
                </span>
              </div>
              <input type="range" min={1} max={10} value={data.caffeineDependency}
                onChange={e => setField('caffeineDependency', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            {/* Stress Management */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.stressManagement}</Label>
                <span className={`text-sm font-bold ${data.stressManagement >= 7 ? 'text-green-500' : data.stressManagement >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.stressManagement}/10
                </span>
              </div>
              <input type="range" min={1} max={10} value={data.stressManagement}
                onChange={e => setField('stressManagement', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('screens')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-amber-500 hover:bg-amber-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Results Step ────────────────────────────────────── */}
      {step === 'results' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">{et.stepResults}</h3>
            </div>

            <div className="text-center space-y-3 mb-6">
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-green-500' : results.score >= 5 ? 'text-amber-500' : results.score >= 3 ? 'text-orange-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.alcoholLabel}</p>
                <p className={`text-lg font-bold ${data.alcoholFrequency === 'never' ? 'text-green-500' : data.alcoholFrequency === 'monthly' ? 'text-amber-500' : 'text-red-500'}`}>
                  {et[`alc${data.alcoholFrequency.charAt(0).toUpperCase() + data.alcoholFrequency.slice(1)}` as keyof typeof et]}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.smokingLabel}</p>
                <p className={`text-lg font-bold ${data.smokingStatus === 'never' ? 'text-green-500' : data.smokingStatus === 'former' ? 'text-amber-500' : 'text-red-500'}`}>
                  {et[`smoke${data.smokingStatus.charAt(0).toUpperCase() + data.smokingStatus.slice(1)}` as keyof typeof et]}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.screenTimeLabel}</p>
                <p className={`text-2xl font-bold ${data.screenTimeHours < 4 ? 'text-green-500' : data.screenTimeHours < 6 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.screenTimeHours}h
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.stressMgmtLabel}</p>
                <p className={`text-2xl font-bold ${data.stressManagement >= 7 ? 'text-green-500' : data.stressManagement >= 4 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.stressManagement}/10
                </p>
              </div>
            </div>

            {(results.riskLevel === 'urgent' || results.riskLevel === 'risk') && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.riskWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('lifestyle')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={submit} disabled={isSubmitting}
                className="gap-2 bg-amber-500 hover:bg-amber-600">
                {isSubmitting ? et.saving : et.generateReport}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
