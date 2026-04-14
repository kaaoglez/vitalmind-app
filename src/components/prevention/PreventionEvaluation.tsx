'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, Stethoscope, Syringe, Microscope,
} from 'lucide-react';

type EvalStep = 'checkups' | 'vaccines' | 'screening' | 'results';

type CheckupOption = 'within-year' | '1-2years' | '2-5years' | '5+years' | 'never';

interface PreventionEvalData {
  lastCheckup: CheckupOption;
  lastDentalCheckup: CheckupOption;
  lastEyeExam: CheckupOption;
  lastBloodWork: CheckupOption;
  vaccinationUpToDate: boolean;
  fluVaccine: boolean;
  covidVaccine: boolean;
  tetanusVaccine: boolean;
  cancerScreeningUpToDate: boolean;
  mammogramLast: CheckupOption | 'na';
  papSmearLast: CheckupOption | 'na';
  colonoscopyLast: CheckupOption | 'na';
  prostateScreening: CheckupOption | 'na';
  skinCheckLast: CheckupOption | 'na';
  age: number;
  gender: 'male' | 'female' | 'other' | 'na';
  sunProtection: number;
  safeDriving: number;
  homeSafety: number;
  healthLiteracy: number;
}

const defaultData: PreventionEvalData = {
  lastCheckup: 'within-year',
  lastDentalCheckup: 'within-year',
  lastEyeExam: 'within-year',
  lastBloodWork: 'within-year',
  vaccinationUpToDate: false,
  fluVaccine: false,
  covidVaccine: false,
  tetanusVaccine: false,
  cancerScreeningUpToDate: false,
  mammogramLast: 'na',
  papSmearLast: 'na',
  colonoscopyLast: 'na',
  prostateScreening: 'na',
  skinCheckLast: 'na',
  age: 30,
  gender: 'na',
  sunProtection: 5,
  safeDriving: 5,
  homeSafety: 5,
  healthLiteracy: 5,
};

const CHECKUP_OPTIONS: { value: CheckupOption; label: string }[] = [
  { value: 'within-year', label: 'withinYear' },
  { value: '1-2years', label: 'oneToTwoYears' },
  { value: '2-5years', label: 'twoToFiveYears' },
  { value: '5+years', label: 'fivePlusYears' },
  { value: 'never', label: 'never' },
];

type ScreeningOption = CheckupOption | '2+years' | 'na';

const SCREENING_OPTIONS: { value: ScreeningOption; label: string }[] = [
  { value: 'never', label: 'never' },
  { value: 'within-year', label: 'withinYear' },
  { value: '1-2years', label: 'oneToTwoYears' },
  { value: '2+years', label: 'twoPlusYears' },
  { value: 'na', label: 'notApplicable' },
];

function checkupScore(opt: CheckupOption): number {
  switch (opt) {
    case 'within-year': return 1;
    case '1-2years': return 0.7;
    case '2-5years': return 0.4;
    case '5+years': return 0.15;
    case 'never': return 0;
  }
}

function calcScore(d: PreventionEvalData) {
  // Checkup (0-3): within-year for all=3, partial=1.5-2, gaps=0-1
  const checkupTotal = checkupScore(d.lastCheckup) + checkupScore(d.lastDentalCheckup) + checkupScore(d.lastEyeExam) + checkupScore(d.lastBloodWork);
  const checkupScoreVal = Math.min(3, checkupTotal * 0.75);

  // Vaccination (0-2.5): upToDate+flu+covid+tetanus each 0.625
  let vaccScore = 0;
  if (d.vaccinationUpToDate) vaccScore += 0.625;
  if (d.fluVaccine) vaccScore += 0.625;
  if (d.covidVaccine) vaccScore += 0.625;
  if (d.tetanusVaccine) vaccScore += 0.625;

  // Cancer screening (0-2): upToDate=2, partial=1, gaps=0
  let cancerScore = 0;
  if (d.cancerScreeningUpToDate) {
    cancerScore = 2;
  } else {
    // Check individual screenings
    const screenings = [d.mammogramLast, d.papSmearLast, d.colonoscopyLast, d.prostateScreening, d.skinCheckLast];
    const applicableScreenings = screenings.filter(s => s !== 'na');
    const recentScreenings = applicableScreenings.filter(s => s === 'within-year' || s === '1-2years');
    if (applicableScreenings.length > 0) {
      const ratio = recentScreenings.length / applicableScreenings.length;
      cancerScore = ratio >= 0.7 ? 1.5 : ratio >= 0.4 ? 1 : 0.5;
    }
  }

  // Behaviors (0-1.5): avg(sun+driving+home+literacy)/4/10*1.5
  const behaviorAvg = (d.sunProtection + d.safeDriving + d.homeSafety + d.healthLiteracy) / 4;
  const behaviorScore = (behaviorAvg / 10) * 1.5;

  const raw = checkupScoreVal + vaccScore + cancerScore + behaviorScore;
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;

  let riskLevel = 'good';
  if (d.lastCheckup === 'never') riskLevel = 'urgent';
  else if (score <= 3) riskLevel = 'risk';
  else if (score <= 6) riskLevel = 'mild';

  return {
    score,
    riskLevel,
    checkupScoreVal: Math.round(checkupScoreVal * 100) / 100,
    vaccScore: Math.round(vaccScore * 100) / 100,
    cancerScore: Math.round(cancerScore * 100) / 100,
    behaviorScore: Math.round(behaviorScore * 100) / 100,
  };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-emerald-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

export default function PreventionEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('checkups');
  const [data, setData] = useState<PreventionEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const et = t.preventionEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/prevention-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(err => {
  console.warn('Failed to load saved assessments:', err);
});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setField = <K extends keyof PreventionEvalData>(key: K, v: PreventionEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/prevention-assessment', {
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
    const score = Number(a.preventionScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const lastCheckup = String(a.lastCheckup) || 'within-year';
    const vaccinationUpToDate = Boolean(a.vaccinationUpToDate);
    const cancerScreeningUpToDate = Boolean(a.cancerScreeningUpToDate);
    const healthLiteracy = Number(a.healthLiteracy) || 5;

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
                <ShieldCheck className="w-8 h-8 text-emerald-500" />
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
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-emerald-500' : risk === 'mild' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.lastCheckup}</p>
                <p className={`text-sm font-bold ${lastCheckup === 'within-year' ? 'text-emerald-500' : lastCheckup === 'never' ? 'text-red-500' : 'text-yellow-500'}`}>{et[lastCheckup === 'within-year' ? 'withinYear' : lastCheckup === 'never' ? 'never' : 'oneToTwoYears'] || lastCheckup}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.vaccinationLabel}</p>
                <p className={`text-lg font-bold ${vaccinationUpToDate ? 'text-emerald-500' : 'text-red-500'}`}>{vaccinationUpToDate ? '✓' : '✗'}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.cancerScreeningLabel}</p>
                <p className={`text-lg font-bold ${cancerScreeningUpToDate ? 'text-emerald-500' : 'text-red-500'}`}>{cancerScreeningUpToDate ? '✓' : '✗'}</p>
              </div>
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {lastCheckup === 'never' && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recNoCheckup}
                  </li>
                )}
                {!vaccinationUpToDate && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recVaccines}
                  </li>
                )}
                {!cancerScreeningUpToDate && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recCancerScreening}
                  </li>
                )}
                {healthLiteracy <= 4 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHealthLiteracy}
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
      {savedAssessments.length > 0 && step === 'checkups' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.preventionScore) >= 7 ? 'bg-emerald-500' : Number(a.preventionScore) >= 5 ? 'bg-blue-500' : Number(a.preventionScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.preventionScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{et.scoreLabel}: {String(a.preventionScore)}/10</p>
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
        {(['checkups', 'vaccines', 'screening', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['checkups', 'vaccines', 'screening', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepCheckups, et.stepVaccines, et.stepScreening, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : isDone ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* ─── Checkups Step ──────────────────────────────────────── */}
      {step === 'checkups' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-foreground">{et.checkupsTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.checkupsDesc}</p>

            {/* Last Checkup */}
            <div className="space-y-2">
              <Label className="text-sm">{et.lastCheckup}</Label>
              <select value={data.lastCheckup} onChange={e => setField('lastCheckup', e.target.value as CheckupOption)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {CHECKUP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                ))}
              </select>
            </div>

            {/* Last Dental Checkup */}
            <div className="space-y-2">
              <Label className="text-sm">{et.lastDentalCheckup}</Label>
              <select value={data.lastDentalCheckup} onChange={e => setField('lastDentalCheckup', e.target.value as CheckupOption)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {CHECKUP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                ))}
              </select>
            </div>

            {/* Last Eye Exam */}
            <div className="space-y-2">
              <Label className="text-sm">{et.lastEyeExam}</Label>
              <select value={data.lastEyeExam} onChange={e => setField('lastEyeExam', e.target.value as CheckupOption)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {CHECKUP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                ))}
              </select>
            </div>

            {/* Last Blood Work */}
            <div className="space-y-2">
              <Label className="text-sm">{et.lastBloodWork}</Label>
              <select value={data.lastBloodWork} onChange={e => setField('lastBloodWork', e.target.value as CheckupOption)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                {CHECKUP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('vaccines')} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Vaccines Step ──────────────────────────────────────── */}
      {step === 'vaccines' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Syringe className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-foreground">{et.vaccinesTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.vaccinesDesc}</p>

            {/* Vaccination up to date toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-sm">{et.vaccinationUpToDate}</Label>
              <button onClick={() => setField('vaccinationUpToDate', !data.vaccinationUpToDate)}
                className={`w-12 h-6 rounded-full transition-colors ${data.vaccinationUpToDate ? 'bg-emerald-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.vaccinationUpToDate ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Flu Vaccine */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-sm">{et.fluVaccine}</Label>
              <button onClick={() => setField('fluVaccine', !data.fluVaccine)}
                className={`w-12 h-6 rounded-full transition-colors ${data.fluVaccine ? 'bg-emerald-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.fluVaccine ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* COVID Vaccine */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-sm">{et.covidVaccine}</Label>
              <button onClick={() => setField('covidVaccine', !data.covidVaccine)}
                className={`w-12 h-6 rounded-full transition-colors ${data.covidVaccine ? 'bg-emerald-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.covidVaccine ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Tetanus Vaccine */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-sm">{et.tetanusVaccine}</Label>
              <button onClick={() => setField('tetanusVaccine', !data.tetanusVaccine)}
                className={`w-12 h-6 rounded-full transition-colors ${data.tetanusVaccine ? 'bg-emerald-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.tetanusVaccine ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('checkups')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('screening')} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Screening Step ──────────────────────────────────────── */}
      {step === 'screening' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Microscope className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-foreground">{et.screeningTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.screeningDesc}</p>

            {/* Cancer screening up to date toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Label className="text-sm">{et.cancerScreeningUpToDate}</Label>
              <button onClick={() => setField('cancerScreeningUpToDate', !data.cancerScreeningUpToDate)}
                className={`w-12 h-6 rounded-full transition-colors ${data.cancerScreeningUpToDate ? 'bg-emerald-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.cancerScreeningUpToDate ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label className="text-sm">{et.age}</Label>
              <input type="number" min={1} max={120} value={data.age}
                onChange={e => setField('age', Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm" />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label className="text-sm">{et.gender}</Label>
              <select value={data.gender} onChange={e => setField('gender', e.target.value as PreventionEvalData['gender'])}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                <option value="male">{et.genderMale}</option>
                <option value="female">{et.genderFemale}</option>
                <option value="other">{et.genderOther}</option>
                <option value="na">{et.genderNA}</option>
              </select>
            </div>

            {/* Individual screenings */}
            {!data.cancerScreeningUpToDate && (
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground">{et.individualScreenings}</p>

                {/* Mammogram */}
                <div className="space-y-2">
                  <Label className="text-sm">{et.mammogramLast}</Label>
                  <select value={data.mammogramLast} onChange={e => setField('mammogramLast', e.target.value as CheckupOption | 'na')}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                    {SCREENING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                    ))}
                  </select>
                </div>

                {/* Pap Smear */}
                <div className="space-y-2">
                  <Label className="text-sm">{et.papSmearLast}</Label>
                  <select value={data.papSmearLast} onChange={e => setField('papSmearLast', e.target.value as CheckupOption | 'na')}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                    {SCREENING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                    ))}
                  </select>
                </div>

                {/* Colonoscopy */}
                <div className="space-y-2">
                  <Label className="text-sm">{et.colonoscopyLast}</Label>
                  <select value={data.colonoscopyLast} onChange={e => setField('colonoscopyLast', e.target.value as CheckupOption | 'na')}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                    {SCREENING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                    ))}
                  </select>
                </div>

                {/* Prostate Screening */}
                <div className="space-y-2">
                  <Label className="text-sm">{et.prostateScreening}</Label>
                  <select value={data.prostateScreening} onChange={e => setField('prostateScreening', e.target.value as CheckupOption | 'na')}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                    {SCREENING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                    ))}
                  </select>
                </div>

                {/* Skin Check */}
                <div className="space-y-2">
                  <Label className="text-sm">{et.skinCheckLast}</Label>
                  <select value={data.skinCheckLast} onChange={e => setField('skinCheckLast', e.target.value as CheckupOption | 'na')}
                    className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm">
                    {SCREENING_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{et[opt.label as keyof typeof et]}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Behavioral indicators */}
            <div className="space-y-4 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">{et.behaviorSection}</p>

              {/* Sun Protection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{et.sunProtection}</Label>
                  <span className={`text-sm font-bold ${data.sunProtection >= 7 ? 'text-green-500' : data.sunProtection >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.sunProtection}</span>
                </div>
                <input type="range" min={1} max={10} value={data.sunProtection}
                  onChange={e => setField('sunProtection', Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>

              {/* Safe Driving */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{et.safeDriving}</Label>
                  <span className={`text-sm font-bold ${data.safeDriving >= 7 ? 'text-green-500' : data.safeDriving >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.safeDriving}</span>
                </div>
                <input type="range" min={1} max={10} value={data.safeDriving}
                  onChange={e => setField('safeDriving', Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>

              {/* Home Safety */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{et.homeSafety}</Label>
                  <span className={`text-sm font-bold ${data.homeSafety >= 7 ? 'text-green-500' : data.homeSafety >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.homeSafety}</span>
                </div>
                <input type="range" min={1} max={10} value={data.homeSafety}
                  onChange={e => setField('homeSafety', Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>

              {/* Health Literacy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{et.healthLiteracy}</Label>
                  <span className={`text-sm font-bold ${data.healthLiteracy >= 7 ? 'text-green-500' : data.healthLiteracy >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.healthLiteracy}</span>
                </div>
                <input type="range" min={1} max={10} value={data.healthLiteracy}
                  onChange={e => setField('healthLiteracy', Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('vaccines')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
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
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-emerald-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.checkupsLabel}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{results.checkupScoreVal.toFixed(1)}/3</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.vaccinationLabel}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{results.vaccScore.toFixed(1)}/2.5</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.cancerScreeningLabel}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{results.cancerScore.toFixed(1)}/2</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.behaviorLabel}</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{results.behaviorScore.toFixed(1)}/1.5</p>
              </div>
            </div>

            {data.lastCheckup === 'never' && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {et.noCheckupWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('screening')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-amber-500">Please log in to generate and save reports.</p>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}
                  className="gap-2 bg-emerald-500 hover:bg-emerald-600">
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
