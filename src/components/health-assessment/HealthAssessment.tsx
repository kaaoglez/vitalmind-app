'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Brain, Apple, Dumbbell, Droplets, Moon, Activity, Cigarette, Users, ShieldCheck,
  ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Printer, FileDown,
  Trophy, TrendingUp, AlertCircle, Heart, Star
} from 'lucide-react';

// Slider component for 1-10 scale inputs
function Slider({ label, value, onChange, icon, inverse, min = 1, max = 10 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  inverse?: boolean;
  min?: number;
  max?: number;
}) {
  const displayValue = inverse ? max - value + min : value;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-1.5">
          {icon} {label}
        </Label>
        <span className={`text-sm font-bold ${displayValue >= 7 ? 'text-green-500' : displayValue >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{inverse ? (max as number) : (min as number)}</span>
        <span>{inverse ? (min as number) : (max as number)}</span>
      </div>
    </div>
  );
}

interface AssessmentData {
  age: number; gender: string; weight: number; height: number;
  mentalStress: number; mentalMood: number; mentalEmotionReg: number; mentalSocialRel: number;
  mentalPurpose: number; mentalNegThoughts: number; mentalWeeklySocial: number;
  nutDietQuality: number; nutMacroBalance: number; nutProcessedFreq: number; nutDeficiencies: string;
  nutNaturalPct: number; nutFruitVegServ: number; nutProteinPerKg: number; nutBMI: number;
  physWeeklyMin: number; physCardio: number; physStrength: number; physMobility: number;
  physDailySteps: number; physRestingHR: number;
  hydDailyLiters: number; hydFrequency: number; hydDehydrationSigns: number;
  slpHours: number; slpQuality: number; slpTimeToFall: number; slpEnergyWakeup: number; slpCircadian: number;
  bioSystolicBP: number; bioDiastolicBP: number; bioFastingGlucose: number;
  bioTotalCholesterol: number; bioHDL: number; bioRestingHR: number;
  habAlcoholWeekly: number; habSmoking: string; habScreenHours: number; habRoutineScore: number;
  socSupport: number; socJobSatisfaction: number; socIsolation: number;
  prevLastCheckup: string; prevExamsUpToDate: number; prevVaccination: number;
}

const defaultData: AssessmentData = {
  age: 0, gender: '', weight: 0, height: 0,
  mentalStress: 5, mentalMood: 5, mentalEmotionReg: 5, mentalSocialRel: 5,
  mentalPurpose: 5, mentalNegThoughts: 5, mentalWeeklySocial: 3,
  nutDietQuality: 5, nutMacroBalance: 5, nutProcessedFreq: 5, nutDeficiencies: '',
  nutNaturalPct: 50, nutFruitVegServ: 3, nutProteinPerKg: 1.0, nutBMI: 0,
  physWeeklyMin: 0, physCardio: 5, physStrength: 5, physMobility: 5,
  physDailySteps: 5000, physRestingHR: 70,
  hydDailyLiters: 1.5, hydFrequency: 5, hydDehydrationSigns: 0,
  slpHours: 7, slpQuality: 5, slpTimeToFall: 15, slpEnergyWakeup: 5, slpCircadian: 5,
  bioSystolicBP: 120, bioDiastolicBP: 80, bioFastingGlucose: 90,
  bioTotalCholesterol: 200, bioHDL: 50, bioRestingHR: 70,
  habAlcoholWeekly: 0, habSmoking: 'never', habScreenHours: 4, habRoutineScore: 5,
  socSupport: 5, socJobSatisfaction: 5, socIsolation: 5,
  prevLastCheckup: 'within-year', prevExamsUpToDate: 5, prevVaccination: 5,
};

// Scoring (same logic as API)
function calcScores(d: AssessmentData) {
  const mental = Math.round(Math.min(10, Math.max(0, ((10 - d.mentalStress) + d.mentalMood + d.mentalEmotionReg + d.mentalSocialRel + d.mentalPurpose + (10 - d.mentalNegThoughts)) / 6)));
  let nut = (d.nutDietQuality + d.nutMacroBalance + (10 - d.nutProcessedFreq)) / 3;
  if (d.nutNaturalPct >= 80) nut += 1; else if (d.nutNaturalPct < 30) nut -= 1;
  if (d.nutFruitVegServ >= 5) nut += 1; else if (d.nutFruitVegServ < 2) nut -= 1;
  if (d.nutBMI > 0 && d.nutBMI >= 18.5 && d.nutBMI <= 24.9) nut += 1;
  else if (d.nutBMI > 30 || (d.nutBMI > 0 && d.nutBMI < 18.5)) nut -= 1;
  const nutrition = Math.round(Math.min(10, Math.max(0, nut)));
  let phys = (d.physCardio + d.physStrength + d.physMobility) / 3;
  if (d.physWeeklyMin >= 150) phys += 2; else if (d.physWeeklyMin >= 75) phys += 1; else if (d.physWeeklyMin < 30) phys -= 1;
  if (d.physDailySteps >= 10000) phys += 1; else if (d.physDailySteps < 3000) phys -= 1;
  const physical = Math.round(Math.min(10, Math.max(0, phys)));
  let hyd = d.hydFrequency;
  if (d.hydDailyLiters >= 2.0) hyd += 2; else if (d.hydDailyLiters >= 1.5) hyd += 1; else if (d.hydDailyLiters < 1.0) hyd -= 2;
  if (d.hydDehydrationSigns === 0) hyd += 1; else if (d.hydDehydrationSigns >= 3) hyd -= 2;
  const hydration = Math.round(Math.min(10, Math.max(0, hyd)));
  let slp = (d.slpQuality + d.slpEnergyWakeup + d.slpCircadian) / 3;
  if (d.slpHours >= 7 && d.slpHours <= 9) slp += 2; else if (d.slpHours >= 6) slp += 0.5; else if (d.slpHours < 6) slp -= 2;
  if (d.slpTimeToFall <= 15) slp += 1; else if (d.slpTimeToFall > 45) slp -= 1;
  const sleep = Math.round(Math.min(10, Math.max(0, slp)));
  let bio = 7;
  if (d.bioSystolicBP <= 120 && d.bioDiastolicBP <= 80) bio += 1; else if (d.bioSystolicBP > 140 || d.bioDiastolicBP > 90) bio -= 2;
  if (d.bioFastingGlucose < 100) bio += 0.5; else if (d.bioFastingGlucose > 126) bio -= 2;
  if (d.bioTotalCholesterol < 200) bio += 0.5; else if (d.bioTotalCholesterol > 240) bio -= 1;
  if (d.bioHDL >= 60) bio += 0.5; else if (d.bioHDL < 40) bio -= 1;
  const biomarkers = Math.round(Math.min(10, Math.max(0, bio)));
  let hab = d.habRoutineScore;
  if (d.habSmoking === 'never') hab += 2; else if (d.habSmoking === 'former') hab += 1; else if (d.habSmoking === 'current') hab -= 3;
  if (d.habAlcoholWeekly === 0) hab += 1; else if (d.habAlcoholWeekly > 7) hab -= 2;
  if (d.habScreenHours <= 2) hab += 1; else if (d.habScreenHours > 8) hab -= 2;
  const habits = Math.round(Math.min(10, Math.max(0, hab)));
  const social = Math.round(Math.min(10, Math.max(0, (d.socSupport + d.socJobSatisfaction + (10 - d.socIsolation)) / 3)));
  let prev = (d.prevExamsUpToDate + d.prevVaccination) / 2;
  if (d.prevLastCheckup === 'within-year') prev += 2; else if (d.prevLastCheckup === 'over-2-years') prev -= 2; else if (d.prevLastCheckup === 'never') prev -= 3;
  const prevention = Math.round(Math.min(10, Math.max(0, prev)));
  const total = mental + nutrition + physical + hydration + sleep + biomarkers + habits + social + prevention;
  const riskLevel = total >= 80 ? 'excellent' : total >= 60 ? 'good' : total >= 40 ? 'risk' : 'urgent';
  return { mental, nutrition, physical, hydration, sleep, biomarkers, habits, social, prevention, total, riskLevel };
}

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const TOTAL_STEPS = 10;

export default function HealthAssessment() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuthStore();
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<AssessmentData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/health-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const scores = useMemo(() => calcScores(data), [data]);

  const update = (key: keyof AssessmentData, value: number | string) => {
    setData(prev => ({ ...prev, [key]: value }));
    if (key === 'weight' && data.height > 0) {
      const h = data.height / 100;
      if (h > 0) setData(prev => ({ ...prev, nutBMI: Math.round((Number(value) / (h * h)) * 10) / 10 }));
    }
    if (key === 'height' && data.weight > 0) {
      const h = Number(value) / 100;
      if (h > 0) setData(prev => ({ ...prev, nutBMI: Math.round((data.weight / (h * h)) * 10) / 10 }));
    }
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/health-assessment', {
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

  const deleteAssessment = async (id: string) => {
    try {
      await fetch(`/api/health-assessment/${id}`, { method: 'DELETE' });
      setSavedAssessments(prev => prev.filter((a: Record<string, unknown>) => a.id !== id));
    } catch { /* silent */ }
  };

  // Slider component - defined outside render to avoid lint issues, uses closure over t

  const stepIcons = [Brain, Apple, Dumbbell, Droplets, Moon, Activity, Cigarette, Users, ShieldCheck, Trophy];
  const stepLabels = [
    t.assessment.stepMental, t.assessment.stepNutrition, t.assessment.stepPhysical,
    t.assessment.stepHydration, t.assessment.stepSleep, t.assessment.stepBio,
    t.assessment.stepHabits, t.assessment.stepSocial, t.assessment.stepPrevention,
    t.assessment.stepResults,
  ];

  // REPORT VIEW
  if (viewReport) {
    const a = viewReport as Record<string, unknown>;
    const areaScores = [
      { key: 'mentalScore', label: t.assessment.stepMental, icon: Brain, color: 'bg-purple-500' },
      { key: 'nutScore', label: t.assessment.stepNutrition, icon: Apple, color: 'bg-emerald-500' },
      { key: 'physScore', label: t.assessment.stepPhysical, icon: Dumbbell, color: 'bg-red-500' },
      { key: 'hydScore', label: t.assessment.stepHydration, icon: Droplets, color: 'bg-cyan-500' },
      { key: 'slpScore', label: t.assessment.stepSleep, icon: Moon, color: 'bg-indigo-500' },
      { key: 'bioScore', label: t.assessment.stepBio, icon: Activity, color: 'bg-rose-500' },
      { key: 'habScore', label: t.assessment.stepHabits, icon: Cigarette, color: 'bg-orange-500' },
      { key: 'socScore', label: t.assessment.stepSocial, icon: Users, color: 'bg-blue-500' },
      { key: 'prevScore', label: t.assessment.stepPrevention, icon: ShieldCheck, color: 'bg-teal-500' },
    ];
    const total = Number(a.totalScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const riskInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      excellent: { label: t.assessment.excellent, color: 'text-green-500', icon: <Trophy className="w-6 h-6" /> },
      good: { label: t.assessment.good, color: 'text-blue-500', icon: <CheckCircle2 className="w-6 h-6" /> },
      risk: { label: t.assessment.risk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
      urgent: { label: t.assessment.urgent, color: 'text-red-500', icon: <AlertCircle className="w-6 h-6" /> },
    };
    const ri = riskInfo[risk] || riskInfo.good;
    const weakest = areaScores.sort((x, y) => Number(a[x.key]) - Number(a[y.key])).slice(0, 3);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {t.assessment.backToList}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="w-4 h-4" /> {t.assessment.printReport}
          </Button>
        </div>

        {/* Professional Report Header */}
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 print:p-2">
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6 print:pb-3 print:mb-3">
              <div className="flex items-center justify-center gap-3">
                <Heart className="w-8 h-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">VitalMind</h1>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{t.assessment.reportTitle}</h2>
              <p className="text-sm text-muted-foreground">{t.assessment.reportSubtitle}</p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span>{t.assessment.patient}: {user?.name || '—'}</span>
                <span>{t.assessment.age}: {String(a.age) || '—'}</span>
                <span>{t.assessment.date}: {a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : '—'}</span>
              </div>
            </div>

            {/* Total Score */}
            <div className="text-center space-y-3 mb-8 print:mb-4">
              <div className="flex items-center justify-center gap-3">
                <span className={`text-5xl font-bold ${ri.color}`}>{total}</span>
                <span className="text-2xl text-muted-foreground">/90</span>
              </div>
              <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${ri.color}`}>
                {ri.icon} {ri.label}
              </div>
              <div className="max-w-md mx-auto bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'excellent' ? 'bg-green-500' : risk === 'good' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(total / 90) * 100}%` }} />
              </div>
            </div>

            {/* 9 Areas Scores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 print:mb-4">
              {areaScores.map(area => {
                const score = Number(a[area.key]) || 0;
                const pct = (score / 10) * 100;
                const Icon = area.icon;
                return (
                  <div key={area.key} className="p-4 rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{area.label}</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl font-bold text-foreground">{score}<span className="text-sm text-muted-foreground">/10</span></span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${score >= 8 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : score >= 5 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {score >= 8 ? t.assessment.excellent : score >= 5 ? t.assessment.good : t.assessment.risk}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`h-full rounded-full ${area.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clinical Notes */}
            <div className="border-t border-border pt-6 print:pt-3 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> {t.assessment.clinicalNotes}
              </h3>
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4">
                <h4 className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {t.assessment.areasOfConcern}
                </h4>
                <ul className="space-y-1">
                  {weakest.map(w => (
                    <li key={w.key} className="text-sm text-red-600 dark:text-red-300 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {w.label}: {String(a[w.key])}/10
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {t.assessment.recommendations}
                </h4>
                <ul className="space-y-1 text-sm text-blue-600 dark:text-blue-300">
                  {weakest.map(w => {
                    const score = Number(a[w.key]) || 0;
                    let rec = '';
                    if (w.key === 'mentalScore') rec = t.assessment.recMental;
                    else if (w.key === 'nutScore') rec = t.assessment.recNutrition;
                    else if (w.key === 'physScore') rec = t.assessment.recPhysical;
                    else if (w.key === 'hydScore') rec = t.assessment.recHydration;
                    else if (w.key === 'slpScore') rec = t.assessment.recSleep;
                    else if (w.key === 'bioScore') rec = t.assessment.recBio;
                    else if (w.key === 'habScore') rec = t.assessment.recHabits;
                    else if (w.key === 'socScore') rec = t.assessment.recSocial;
                    else if (w.key === 'prevScore') rec = t.assessment.recPrevention;
                    return score < 7 ? <li key={w.key} className="flex items-start gap-2"><Star className="w-3 h-3 mt-1 flex-shrink-0" />{rec}</li> : null;
                  })}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground italic text-center">{t.assessment.disclaimer}</p>
            </div>

            {/* Specialist Signature Area */}
            <div className="border-t border-border pt-6 mt-6 print:pt-3 print:mt-3 print:break-inside-avoid">
              <h4 className="font-medium text-foreground mb-4">{t.assessment.specialistSection}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{t.assessment.specialistName}</span></div>
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{t.assessment.specialistLicense}</span></div>
                </div>
                <div className="space-y-3">
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{t.assessment.specialistDate}</span></div>
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{t.assessment.specialistSignature}</span></div>
                </div>
              </div>
              <div className="mt-4 border-b border-border pb-1"><span className="text-xs text-muted-foreground">{t.assessment.specialistNotes}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP FORM
  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-wellness-lavender/20 flex items-center justify-center mx-auto">
          <Activity className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t.assessment.title}</h2>
        <p className="text-muted-foreground">{t.assessment.subtitle}</p>
      </div>

      {/* Previous assessments */}
      {savedAssessments.length > 0 && step === 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{t.assessment.previousAssessments}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <button onClick={() => setViewReport(a)} className="flex items-center gap-3 text-left flex-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.totalScore) >= 80 ? 'bg-green-500' : Number(a.totalScore) >= 60 ? 'bg-blue-500' : Number(a.totalScore) >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.totalScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{String(a.totalScore)}/90 — {String(a.riskLevel)}</p>
                    </div>
                  </button>
                  <button onClick={() => deleteAssessment(String(a.id))} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t.assessment.step} {step + 1}/{TOTAL_STEPS}</span>
          <span>{Math.round(((step + 1) / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      {/* Step icons */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {stepLabels.map((label, i) => {
          const Icon = stepIcons[i];
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button key={i} onClick={() => i <= step && setStep(i as Step)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* STEP 0: Mental Health */}
      {step === 0 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Brain className="w-5 h-5 text-purple-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepMental}</h3></div>
          <Slider label={t.assessment.mentalStress} value={data.mentalStress} onChange={v => update('mentalStress', v)} inverse icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          <Slider label={t.assessment.mentalMood} value={data.mentalMood} onChange={v => update('mentalMood', v)} icon={<Heart className="w-4 h-4 text-pink-400" />} />
          <Slider label={t.assessment.mentalEmotionReg} value={data.mentalEmotionReg} onChange={v => update('mentalEmotionReg', v)} icon={<Brain className="w-4 h-4 text-purple-400" />} />
          <Slider label={t.assessment.mentalSocialRel} value={data.mentalSocialRel} onChange={v => update('mentalSocialRel', v)} icon={<Users className="w-4 h-4 text-blue-400" />} />
          <Slider label={t.assessment.mentalPurpose} value={data.mentalPurpose} onChange={v => update('mentalPurpose', v)} icon={<Star className="w-4 h-4 text-amber-400" />} />
          <Slider label={t.assessment.mentalNegThoughts} value={data.mentalNegThoughts} onChange={v => update('mentalNegThoughts', v)} inverse icon={<AlertCircle className="w-4 h-4 text-red-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 1: Nutrition */}
      {step === 1 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Apple className="w-5 h-5 text-emerald-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepNutrition}</h3></div>
          <Slider label={t.assessment.nutDietQuality} value={data.nutDietQuality} onChange={v => update('nutDietQuality', v)} icon={<Apple className="w-4 h-4 text-emerald-400" />} />
          <Slider label={t.assessment.nutMacroBalance} value={data.nutMacroBalance} onChange={v => update('nutMacroBalance', v)} icon={<TrendingUp className="w-4 h-4 text-blue-400" />} />
          <Slider label={t.assessment.nutProcessedFreq} value={data.nutProcessedFreq} onChange={v => update('nutProcessedFreq', v)} inverse icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.nutNaturalPct}</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={data.nutNaturalPct} onChange={e => update('nutNaturalPct', Number(e.target.value))} className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
              <span className="text-sm font-bold w-12 text-right">{data.nutNaturalPct}%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.nutFruitVegServ}</Label>
              <Input type="number" min={0} max={20} value={data.nutFruitVegServ} onChange={e => update('nutFruitVegServ', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.weight} (kg)</Label>
              <Input type="number" value={data.weight || ''} onChange={e => update('weight', Number(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.height} (cm)</Label>
              <Input type="number" value={data.height || ''} onChange={e => update('height', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.nutBMI}</Label>
              <Input type="number" value={data.nutBMI || ''} readOnly className="bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.nutDeficiencies}</Label>
            <Input value={data.nutDeficiencies} onChange={e => update('nutDeficiencies', e.target.value)} placeholder={t.assessment.nutDeficienciesPh} />
          </div>
        </CardContent></Card>
      )}

      {/* STEP 2: Physical */}
      {step === 2 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Dumbbell className="w-5 h-5 text-red-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepPhysical}</h3></div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.physWeeklyMin}</Label>
            <Input type="number" value={data.physWeeklyMin || ''} onChange={e => update('physWeeklyMin', Number(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">{t.assessment.physWeeklyMinHint}</p>
          </div>
          <Slider label={t.assessment.physCardio} value={data.physCardio} onChange={v => update('physCardio', v)} icon={<Heart className="w-4 h-4 text-red-400" />} />
          <Slider label={t.assessment.physStrength} value={data.physStrength} onChange={v => update('physStrength', v)} icon={<Dumbbell className="w-4 h-4 text-orange-400" />} />
          <Slider label={t.assessment.physMobility} value={data.physMobility} onChange={v => update('physMobility', v)} icon={<Activity className="w-4 h-4 text-cyan-400" />} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.physDailySteps}</Label>
              <Input type="number" value={data.physDailySteps || ''} onChange={e => update('physDailySteps', Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">{t.assessment.physRestingHR}</Label>
              <Input type="number" value={data.physRestingHR || ''} onChange={e => update('physRestingHR', Number(e.target.value) || 0)} />
            </div>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 3: Hydration */}
      {step === 3 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Droplets className="w-5 h-5 text-cyan-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepHydration}</h3></div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.hydDailyLiters}</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={5} step={0.1} value={data.hydDailyLiters} onChange={e => update('hydDailyLiters', Number(e.target.value))} className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
              <span className="text-sm font-bold w-12 text-right">{data.hydDailyLiters}L</span>
            </div>
          </div>
          <Slider label={t.assessment.hydFrequency} value={data.hydFrequency} onChange={v => update('hydFrequency', v)} icon={<Droplets className="w-4 h-4 text-cyan-400" />} />
          <Slider label={t.assessment.hydDehydrationSigns} value={data.hydDehydrationSigns} onChange={v => update('hydDehydrationSigns', v)} min={0} max={7} inverse icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 4: Sleep */}
      {step === 4 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Moon className="w-5 h-5 text-indigo-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepSleep}</h3></div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.slpHours}</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={3} max={12} step={0.5} value={data.slpHours} onChange={e => update('slpHours', Number(e.target.value))} className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
              <span className="text-sm font-bold w-12 text-right">{data.slpHours}h</span>
            </div>
          </div>
          <Slider label={t.assessment.slpQuality} value={data.slpQuality} onChange={v => update('slpQuality', v)} icon={<Moon className="w-4 h-4 text-indigo-400" />} />
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.slpTimeToFall}</Label>
            <Input type="number" value={data.slpTimeToFall || ''} onChange={e => update('slpTimeToFall', Number(e.target.value) || 0)} />
            <p className="text-xs text-muted-foreground">{t.assessment.slpTimeToFallHint}</p>
          </div>
          <Slider label={t.assessment.slpEnergyWakeup} value={data.slpEnergyWakeup} onChange={v => update('slpEnergyWakeup', v)} icon={<Star className="w-4 h-4 text-amber-400" />} />
          <Slider label={t.assessment.slpCircadian} value={data.slpCircadian} onChange={v => update('slpCircadian', v)} icon={<Moon className="w-4 h-4 text-purple-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 5: Biomarkers */}
      {step === 5 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-rose-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepBio}</h3></div>
          <p className="text-xs text-muted-foreground">{t.assessment.bioHint}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioSystolicBP}</Label><Input type="number" value={data.bioSystolicBP || ''} onChange={e => update('bioSystolicBP', Number(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioDiastolicBP}</Label><Input type="number" value={data.bioDiastolicBP || ''} onChange={e => update('bioDiastolicBP', Number(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioFastingGlucose}</Label><Input type="number" value={data.bioFastingGlucose || ''} onChange={e => update('bioFastingGlucose', Number(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioTotalCholesterol}</Label><Input type="number" value={data.bioTotalCholesterol || ''} onChange={e => update('bioTotalCholesterol', Number(e.target.value) || 0)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioHDL}</Label><Input type="number" value={data.bioHDL || ''} onChange={e => update('bioHDL', Number(e.target.value) || 0)} /></div>
            <div className="space-y-2"><Label className="text-sm">{t.assessment.bioRestingHR}</Label><Input type="number" value={data.bioRestingHR || ''} onChange={e => update('bioRestingHR', Number(e.target.value) || 0)} /></div>
          </div>
        </CardContent></Card>
      )}

      {/* STEP 6: Habits */}
      {step === 6 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Cigarette className="w-5 h-5 text-orange-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepHabits}</h3></div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.habSmoking}</Label>
            <div className="flex gap-2">
              {(['never', 'former', 'current'] as const).map(opt => (
                <button key={opt} onClick={() => update('habSmoking', opt)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${data.habSmoking === opt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'}`}>
                  {t.assessment[`smoking_${opt}` as keyof typeof t.assessment] || opt}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.habAlcoholWeekly}</Label>
            <Input type="number" min={0} value={data.habAlcoholWeekly} onChange={e => update('habAlcoholWeekly', Number(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.habScreenHours}</Label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={16} step={0.5} value={data.habScreenHours} onChange={e => update('habScreenHours', Number(e.target.value))} className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
              <span className="text-sm font-bold w-12 text-right">{data.habScreenHours}h</span>
            </div>
          </div>
          <Slider label={t.assessment.habRoutineScore} value={data.habRoutineScore} onChange={v => update('habRoutineScore', v)} icon={<Star className="w-4 h-4 text-amber-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 7: Social */}
      {step === 7 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-blue-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepSocial}</h3></div>
          <Slider label={t.assessment.socSupport} value={data.socSupport} onChange={v => update('socSupport', v)} icon={<Users className="w-4 h-4 text-blue-400" />} />
          <Slider label={t.assessment.socJobSatisfaction} value={data.socJobSatisfaction} onChange={v => update('socJobSatisfaction', v)} icon={<Star className="w-4 h-4 text-amber-400" />} />
          <Slider label={t.assessment.socIsolation} value={data.socIsolation} onChange={v => update('socIsolation', v)} inverse icon={<AlertCircle className="w-4 h-4 text-red-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 8: Prevention */}
      {step === 8 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-teal-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepPrevention}</h3></div>
          <div className="space-y-2">
            <Label className="text-sm">{t.assessment.prevLastCheckup}</Label>
            <div className="flex flex-wrap gap-2">
              {(['within-year', '1-2-years', 'over-2-years', 'never'] as const).map(opt => (
                <button key={opt} onClick={() => update('prevLastCheckup', opt)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${data.prevLastCheckup === opt ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'}`}>
                  {t.assessment[`checkup_${opt.replace(/-/g, '_')}` as keyof typeof t.assessment] || opt}
                </button>
              ))}
            </div>
          </div>
          <Slider label={t.assessment.prevExamsUpToDate} value={data.prevExamsUpToDate} onChange={v => update('prevExamsUpToDate', v)} icon={<ShieldCheck className="w-4 h-4 text-teal-400" />} />
          <Slider label={t.assessment.prevVaccination} value={data.prevVaccination} onChange={v => update('prevVaccination', v)} icon={<ShieldCheck className="w-4 h-4 text-green-400" />} />
        </CardContent></Card>
      )}

      {/* STEP 9: Results Preview */}
      {step === 9 && (
        <Card><CardContent className="p-5 space-y-5">
          <div className="flex items-center gap-2 mb-2"><Trophy className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-foreground">{t.assessment.stepResults}</h3></div>
          <div className="text-center space-y-3 mb-6">
            <span className={`text-5xl font-bold ${scores.total >= 80 ? 'text-green-500' : scores.total >= 60 ? 'text-blue-500' : scores.total >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
              {scores.total}
            </span>
            <span className="text-2xl text-muted-foreground">/90</span>
            <p className={`text-lg font-semibold ${scores.total >= 80 ? 'text-green-500' : scores.total >= 60 ? 'text-blue-500' : scores.total >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
              {scores.total >= 80 ? t.assessment.excellent : scores.total >= 60 ? t.assessment.good : scores.total >= 40 ? t.assessment.risk : t.assessment.urgent}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t.assessment.stepMental, score: scores.mental, color: 'bg-purple-500' },
              { label: t.assessment.stepNutrition, score: scores.nutrition, color: 'bg-emerald-500' },
              { label: t.assessment.stepPhysical, score: scores.physical, color: 'bg-red-500' },
              { label: t.assessment.stepHydration, score: scores.hydration, color: 'bg-cyan-500' },
              { label: t.assessment.stepSleep, score: scores.sleep, color: 'bg-indigo-500' },
              { label: t.assessment.stepBio, score: scores.biomarkers, color: 'bg-rose-500' },
              { label: t.assessment.stepHabits, score: scores.habits, color: 'bg-orange-500' },
              { label: t.assessment.stepSocial, score: scores.social, color: 'bg-blue-500' },
              { label: t.assessment.stepPrevention, score: scores.prevention, color: 'bg-teal-500' },
            ].map((area, i) => (
              <div key={i} className="text-center p-3 rounded-xl bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">{area.label}</p>
                <p className="text-xl font-bold text-foreground">{area.score}</p>
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div className={`h-full rounded-full ${area.color}`} style={{ width: `${(area.score / 10) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-center">
            <p className="text-xs text-amber-700 dark:text-amber-300">{t.assessment.conclusionNote}</p>
          </div>
        </CardContent></Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(0, step - 1) as Step)} disabled={step === 0} className="gap-2">
          <ChevronLeft className="w-4 h-4" /> {t.assessment.prev}
        </Button>
        {step < 9 ? (
          <Button onClick={() => setStep(Math.min(9, step + 1) as Step)} className="gap-2">
            {t.assessment.next} <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={isSubmitting} className="gap-2">
            {isSubmitting ? t.assessment.saving : t.assessment.generateReport} <FileDown className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
