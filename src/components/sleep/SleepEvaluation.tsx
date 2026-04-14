'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Moon, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, Clock, Sunrise, Sun, Battery, Zap,
} from 'lucide-react';

type EvalStep = 'psqi' | 'indicators' | 'circadian' | 'results';

interface SleepEvalData {
  // PSQI 7 components (each 0-3)
  psqiQuality: number;
  psqiLatency: number;
  psqiDuration: number;
  psqiEfficiency: number;
  psqiDisturbances: number;
  psqiMedication: number;
  psqiDysfunction: number;
  // Measurable indicators
  sleepHours: number;
  timeToFallAsleep: number;
  nightAwakenings: number;
  energyOnWakeup: number;
  sleepRegularity: number;
  screenBeforeBed: number;
  caffeineAfternoon: number;
  // Circadian
  chronotype: string;
  bedtimeConsistent: boolean;
  wakeTimeConsistent: boolean;
  weekendShift: number;
  circadianScore: number;
}

const defaultData: SleepEvalData = {
  psqiQuality: 0,
  psqiLatency: 0,
  psqiDuration: 0,
  psqiEfficiency: 0,
  psqiDisturbances: 0,
  psqiMedication: 0,
  psqiDysfunction: 0,
  sleepHours: 7,
  timeToFallAsleep: 15,
  nightAwakenings: 1,
  energyOnWakeup: 5,
  sleepRegularity: 5,
  screenBeforeBed: 5,
  caffeineAfternoon: 3,
  chronotype: 'intermediate',
  bedtimeConsistent: true,
  wakeTimeConsistent: true,
  weekendShift: 0,
  circadianScore: 5,
};

const PSQI_OPTIONS = [
  { value: 0, labelKey: 'psqi0' },
  { value: 1, labelKey: 'psqi1' },
  { value: 2, labelKey: 'psqi2' },
  { value: 3, labelKey: 'psqi3' },
];

const PSQI_QUESTIONS = [
  { key: 'psqiQuality', labelKey: 'psqiQQuality' },
  { key: 'psqiLatency', labelKey: 'psqiQLatency' },
  { key: 'psqiDuration', labelKey: 'psqiQDuration' },
  { key: 'psqiEfficiency', labelKey: 'psqiQEfficiency' },
  { key: 'psqiDisturbances', labelKey: 'psqiQDisturbances' },
  { key: 'psqiMedication', labelKey: 'psqiQMedication' },
  { key: 'psqiDysfunction', labelKey: 'psqiQDysfunction' },
];

function calcScore(d: SleepEvalData) {
  const psqiTotal = d.psqiQuality + d.psqiLatency + d.psqiDuration +
    d.psqiEfficiency + d.psqiDisturbances + d.psqiMedication + d.psqiDysfunction;

  let psqiCategory = 'good';
  if (psqiTotal <= 4) psqiCategory = 'good';
  else if (psqiTotal <= 7) psqiCategory = 'mild';
  else if (psqiTotal <= 14) psqiCategory = 'poor';
  else psqiCategory = 'severe';

  // 1. PSQI component (0-4)
  let psqiPoints = 0;
  if (psqiTotal <= 4) psqiPoints = 4;
  else if (psqiTotal <= 7) psqiPoints = 3;
  else if (psqiTotal <= 10) psqiPoints = 2;
  else if (psqiTotal <= 14) psqiPoints = 1;

  // 2. Duration (0-2)
  let durationPoints = 0;
  if (d.sleepHours >= 7 && d.sleepHours <= 9) durationPoints = 2;
  else if ((d.sleepHours >= 6 && d.sleepHours < 7) || (d.sleepHours > 9 && d.sleepHours <= 10)) durationPoints = 1.5;
  else if (d.sleepHours >= 5 && d.sleepHours < 6) durationPoints = 1;
  else durationPoints = 0.5;

  // 3. Latency (0-1.5)
  let latencyPoints = 0;
  if (d.timeToFallAsleep <= 15) latencyPoints = 1.5;
  else if (d.timeToFallAsleep <= 30) latencyPoints = 1;
  else if (d.timeToFallAsleep <= 60) latencyPoints = 0.5;

  // 4. Habit quality (0-1.5)
  const habitAvg = (d.sleepRegularity + (10 - d.screenBeforeBed) + (10 - d.caffeineAfternoon)) / 3;
  const habitPoints = (habitAvg / 10) * 1.5;

  // 5. Night awakenings penalty (0 to -1)
  const awakeningPenalty = d.nightAwakenings >= 4 ? 1 : d.nightAwakenings >= 3 ? 0.5 : 0;

  // 6. Energy on wakeup (0-1)
  const energyPoints = (d.energyOnWakeup / 10) * 1;

  // 7. Circadian (0-0.5)
  const circadianPoints = (d.circadianScore / 10) * 0.5;

  const raw = psqiPoints + durationPoints + latencyPoints + habitPoints - awakeningPenalty + energyPoints + circadianPoints;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (psqiTotal >= 15 || d.sleepHours < 4 || (d.sleepHours < 5 && d.nightAwakenings >= 4)) riskLevel = 'urgent';
  else if (psqiTotal >= 10 || d.sleepHours < 5 || score <= 4) riskLevel = 'risk';
  else if (psqiTotal >= 6 || d.sleepHours < 6 || score <= 6) riskLevel = 'mild';

  return { score, riskLevel, psqiTotal, psqiCategory };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-indigo-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

function getPsqiCategoryLabel(cat: string, et: Record<string, string>) {
  const map: Record<string, string> = {
    good: et.psqiCatGood,
    mild: et.psqiCatMild,
    poor: et.psqiCatPoor,
    severe: et.psqiCatSevere,
  };
  return map[cat] || cat;
}

function getPsqiCategoryColor(cat: string) {
  const map: Record<string, string> = {
    good: 'text-green-500',
    mild: 'text-blue-500',
    poor: 'text-yellow-500',
    severe: 'text-red-500',
  };
  return map[cat] || 'text-muted-foreground';
}

export default function SleepEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('psqi');
  const [data, setData] = useState<SleepEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const et = t.sleepEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/sleep-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setField = <K extends keyof SleepEvalData>(key: K, v: SleepEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sleep-assessment', {
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

  const steps: { id: EvalStep; label: string }[] = [
    { id: 'psqi', label: et.stepPsqi },
    { id: 'indicators', label: et.stepIndicators },
    { id: 'circadian', label: et.stepCircadian },
    { id: 'results', label: et.stepResults },
  ];

  // ─── REPORT VIEW ────────────────────────────────────────────────
  if (viewReport) {
    const a = viewReport;
    const score = Number(a.sleepScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const psqiT = Number(a.psqiTotal) || 0;
    const psqiCat = String(a.psqiCategory) || 'good';
    const sHours = Number(a.sleepHours) || 7;
    const tFall = Number(a.timeToFallAsleep) || 15;
    const nAwake = Number(a.nightAwakenings) || 1;
    const energy = Number(a.energyOnWakeup) || 5;

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
                <Moon className="w-8 h-8 text-indigo-500" />
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
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-indigo-500' : risk === 'mild' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* PSQI Section */}
            <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 mb-6">
              <h3 className="font-semibold text-foreground mb-2">{et.psqiLabel}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PSQI {et.psqiTotalLabel}:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-bold ${getPsqiCategoryColor(psqiCat)}`}>{psqiT}/21</span>
                  <span className={`text-sm font-medium ${getPsqiCategoryColor(psqiCat)}`}>({getPsqiCategoryLabel(psqiCat, et)})</span>
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.sleepHoursLabel}</p>
                <p className={`text-2xl font-bold ${sHours >= 7 && sHours <= 9 ? 'text-indigo-500' : sHours >= 6 ? 'text-blue-500' : 'text-red-500'}`}>{sHours.toFixed(1)}h</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.timeToFallAsleepLabel}</p>
                <p className={`text-2xl font-bold ${tFall <= 15 ? 'text-indigo-500' : tFall <= 30 ? 'text-blue-500' : 'text-red-500'}`}>{tFall}min</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.nightAwakeningsLabel}</p>
                <p className={`text-2xl font-bold ${nAwake <= 1 ? 'text-indigo-500' : nAwake <= 2 ? 'text-blue-500' : 'text-red-500'}`}>{nAwake}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.energyOnWakeupLabel}</p>
                <p className={`text-2xl font-bold ${energy >= 7 ? 'text-indigo-500' : energy >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{energy}/10</p>
              </div>
            </div>

            {/* Chronotype info */}
            <div className="p-4 rounded-xl border border-border mb-6">
              <div className="flex items-center gap-3">
                {String(a.chronotype) === 'morning' ? <Sunrise className="w-5 h-5 text-amber-500" /> :
                 String(a.chronotype) === 'evening' ? <Moon className="w-5 h-5 text-indigo-400" /> :
                 <Clock className="w-5 h-5 text-blue-500" />}
                <div>
                  <p className="text-sm font-medium text-foreground">{et.chronotypeLabel}: {et[`chrono${String(a.chronotype).charAt(0).toUpperCase() + String(a.chronotype).slice(1)}` as keyof typeof et] || String(a.chronotype)}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.bedtimeConsistent && a.wakeTimeConsistent ? et.circadianConsistent : et.circadianIrregular}
                    {Number(a.weekendShift) > 60 ? ` - ${et.socialJetlag}: ${a.weekendShift}min` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {psqiT >= 8 && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recPoorQuality}
                  </li>
                )}
                {sHours < 6 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recShortSleep}
                  </li>
                )}
                {sHours > 9 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLongSleep}
                  </li>
                )}
                {tFall > 30 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLatency}
                  </li>
                )}
                {nAwake >= 3 && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recAwakenings}
                  </li>
                )}
                {Number(a.screenBeforeBed) >= 7 && (
                  <li className="flex items-start gap-2 text-indigo-600 dark:text-indigo-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recScreen}
                  </li>
                )}
                {Number(a.caffeineAfternoon) >= 6 && (
                  <li className="flex items-start gap-2 text-cyan-600 dark:text-cyan-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recCaffeine}
                  </li>
                )}
                {Number(a.sleepRegularity) <= 4 && (
                  <li className="flex items-start gap-2 text-teal-600 dark:text-teal-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recRegularity}
                  </li>
                )}
                {Number(a.circadianScore) <= 4 && (
                  <li className="flex items-start gap-2 text-violet-600 dark:text-violet-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recCircadian}
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
      {savedAssessments.length > 0 && step === 'psqi' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.sleepScore) >= 7 ? 'bg-indigo-500' : Number(a.sleepScore) >= 5 ? 'bg-blue-500' : Number(a.sleepScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.sleepScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{Number(a.sleepHours).toFixed(1)}h - PSQI: {String(a.psqiTotal)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step indicator */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {steps.map((s, i) => {
          const isActive = step === s.id;
          const stepIdx = steps.findIndex(st => st.id === step);
          const isDone = i < stepIdx;
          return (
            <button key={s.id} onClick={() => isDone && setStep(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' : isDone ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-muted text-muted-foreground'}`}>
              {s.label}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* ─── PSQI Step ───────────────────────────────────────── */}
      {step === 'psqi' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-foreground">{et.psqiTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.psqiDesc}</p>

            <div className="space-y-5">
              {PSQI_QUESTIONS.map((q) => (
                <div key={q.key} className="space-y-2">
                  <Label className="text-sm font-medium">{et[q.labelKey as keyof typeof et]}</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PSQI_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setField(q.key as keyof SleepEvalData, opt.value)}
                        className={`p-2.5 rounded-xl text-xs font-medium transition-all ${data[q.key as keyof SleepEvalData] === opt.value ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'}`}>
                        {et[opt.labelKey as keyof typeof et]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* PSQI subtotal */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{et.psqiSubtotal}:</span>
                <span className={`text-lg font-bold ${results.psqiTotal <= 4 ? 'text-green-500' : results.psqiTotal <= 7 ? 'text-blue-500' : results.psqiTotal <= 14 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {results.psqiTotal}/21 ({getPsqiCategoryLabel(results.psqiCategory, et)})
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('indicators')} className="gap-2 bg-indigo-500 hover:bg-indigo-600">
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
              <Activity className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-foreground">{et.indicatorsTitle}</h3>
            </div>

            {/* Sleep hours */}
            <div className="space-y-2">
              <Label className="text-sm">{et.sleepHoursLabel}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={3} max={12} step={0.5} value={data.sleepHours}
                  onChange={e => setField('sleepHours', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <span className={`text-lg font-bold w-14 text-right ${data.sleepHours >= 7 && data.sleepHours <= 9 ? 'text-indigo-500' : data.sleepHours >= 6 ? 'text-blue-500' : 'text-red-500'}`}>{data.sleepHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>3h</span><span>7-9h (ideal)</span><span>12h</span>
              </div>
            </div>

            {/* Time to fall asleep */}
            <div className="space-y-2">
              <Label className="text-sm">{et.timeToFallAsleepLabel}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={120} step={5} value={data.timeToFallAsleep}
                  onChange={e => setField('timeToFallAsleep', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.timeToFallAsleep <= 15 ? 'text-indigo-500' : data.timeToFallAsleep <= 30 ? 'text-blue-500' : 'text-red-500'}`}>{data.timeToFallAsleep}min</span>
              </div>
            </div>

            {/* Night awakenings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.nightAwakeningsLabel}</Label>
                <span className={`text-sm font-bold ${data.nightAwakenings <= 1 ? 'text-green-500' : data.nightAwakenings <= 2 ? 'text-yellow-500' : 'text-red-500'}`}>{data.nightAwakenings}</span>
              </div>
              <input type="range" min={0} max={8} value={data.nightAwakenings}
                onChange={e => setField('nightAwakenings', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            {/* Energy on wakeup */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.energyOnWakeupLabel}</Label>
                <span className={`text-sm font-bold ${data.energyOnWakeup >= 7 ? 'text-indigo-500' : data.energyOnWakeup >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{data.energyOnWakeup}/10</span>
              </div>
              <input type="range" min={1} max={10} value={data.energyOnWakeup}
                onChange={e => setField('energyOnWakeup', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            {/* Sleep regularity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.sleepRegularityLabel}</Label>
                <span className="text-sm font-bold">{data.sleepRegularity}/10</span>
              </div>
              <input type="range" min={1} max={10} value={data.sleepRegularity}
                onChange={e => setField('sleepRegularity', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            {/* Screen before bed (inverse) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.screenBeforeBedLabel}</Label>
                <span className={`text-sm font-bold ${data.screenBeforeBed <= 3 ? 'text-green-500' : data.screenBeforeBed <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>{data.screenBeforeBed}/10</span>
              </div>
              <input type="range" min={1} max={10} value={data.screenBeforeBed}
                onChange={e => setField('screenBeforeBed', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            {/* Caffeine afternoon (inverse) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.caffeineAfternoonLabel}</Label>
                <span className={`text-sm font-bold ${data.caffeineAfternoon <= 3 ? 'text-green-500' : data.caffeineAfternoon <= 5 ? 'text-yellow-500' : 'text-red-500'}`}>{data.caffeineAfternoon}/10</span>
              </div>
              <input type="range" min={1} max={10} value={data.caffeineAfternoon}
                onChange={e => setField('caffeineAfternoon', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('psqi')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('circadian')} className="gap-2 bg-indigo-500 hover:bg-indigo-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Circadian Step ───────────────────────────────────── */}
      {step === 'circadian' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-foreground">{et.circadianTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.circadianDesc}</p>

            {/* Chronotype */}
            <div className="space-y-2">
              <Label className="text-sm">{et.chronotypeLabel}</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'morning', icon: <Sunrise className="w-4 h-4" />, labelKey: 'chronoMorning' },
                  { key: 'intermediate', icon: <Sun className="w-4 h-4" />, labelKey: 'chronoIntermediate' },
                  { key: 'evening', icon: <Moon className="w-4 h-4" />, labelKey: 'chronoEvening' },
                ]).map(ct => (
                  <button key={ct.key} onClick={() => setField('chronotype', ct.key)}
                    className={`flex items-center justify-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all ${data.chronotype === ct.key ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted'}`}>
                    {ct.icon} {et[ct.labelKey as keyof typeof et]}
                  </button>
                ))}
              </div>
            </div>

            {/* Consistency toggles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <Label className="text-sm">{et.bedtimeConsistentLabel}</Label>
                </div>
                <button onClick={() => setField('bedtimeConsistent', !data.bedtimeConsistent)}
                  className={`w-12 h-6 rounded-full transition-colors ${data.bedtimeConsistent ? 'bg-indigo-500' : 'bg-muted'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.bedtimeConsistent ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                <div className="flex items-center gap-2">
                  <Sunrise className="w-4 h-4 text-indigo-500" />
                  <Label className="text-sm">{et.wakeTimeConsistentLabel}</Label>
                </div>
                <button onClick={() => setField('wakeTimeConsistent', !data.wakeTimeConsistent)}
                  className={`w-12 h-6 rounded-full transition-colors ${data.wakeTimeConsistent ? 'bg-indigo-500' : 'bg-muted'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.wakeTimeConsistent ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Weekend shift */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.weekendShiftLabel}</Label>
                <span className={`text-sm font-bold ${data.weekendShift <= 30 ? 'text-green-500' : data.weekendShift <= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{data.weekendShift}min</span>
              </div>
              <input type="range" min={0} max={180} step={15} value={data.weekendShift}
                onChange={e => setField('weekendShift', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <p className="text-[10px] text-muted-foreground">{et.weekendShiftDesc}</p>
            </div>

            {/* Circadian score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.circadianScoreLabel}</Label>
                <span className={`text-sm font-bold ${data.circadianScore >= 7 ? 'text-indigo-500' : data.circadianScore >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{data.circadianScore}/10</span>
              </div>
              <input type="range" min={1} max={10} value={data.circadianScore}
                onChange={e => setField('circadianScore', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('indicators')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-indigo-500 hover:bg-indigo-600">
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
              <Star className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-foreground">{et.stepResults}</h3>
            </div>

            <div className="text-center space-y-3 mb-6">
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-indigo-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.psqiLabel}</p>
                <p className={`text-2xl font-bold ${results.psqiTotal <= 4 ? 'text-green-500' : results.psqiTotal <= 7 ? 'text-blue-500' : 'text-red-500'}`}>{results.psqiTotal}/21</p>
                <p className="text-[10px] text-muted-foreground">{getPsqiCategoryLabel(results.psqiCategory, et)}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.sleepHoursLabel}</p>
                <p className={`text-2xl font-bold ${data.sleepHours >= 7 && data.sleepHours <= 9 ? 'text-indigo-500' : 'text-blue-500'}`}>{data.sleepHours.toFixed(1)}h</p>
              </div>
            </div>

            {(results.psqiTotal >= 10 || data.sleepHours < 5) && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.sleepWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('circadian')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-amber-500">Please log in to generate and save reports.</p>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}
                  className="gap-2 bg-indigo-500 hover:bg-indigo-600">
                  {isSubmitting ? et.saving : et.generateReport}
                </Button>
              )}
            </div>
            {submitError && <p className="text-sm text-red-500 mt-2">{submitError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
