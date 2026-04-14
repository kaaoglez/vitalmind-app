'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  HeartPulse, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert,
} from 'lucide-react';

type EvalStep = 'vitals' | 'labs' | 'flags' | 'results';

interface BiomarkersEvalData {
  systolicBP: number;
  diastolicBP: number;
  restingHR: number;
  fastingGlucose: number;
  totalCholesterol: number;
  hdl: number;
  ldl: number;
  triglycerides: number;
  hemoglobin: number;
  creatinine: number;
  vitaminD: number;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasDyslipidemia: boolean;
}

const defaultData: BiomarkersEvalData = {
  systolicBP: 120,
  diastolicBP: 80,
  restingHR: 72,
  fastingGlucose: 90,
  totalCholesterol: 190,
  hdl: 55,
  ldl: 110,
  triglycerides: 120,
  hemoglobin: 14,
  creatinine: 1.0,
  vitaminD: 30,
  hasDiabetes: false,
  hasHypertension: false,
  hasDyslipidemia: false,
};

function calcScore(d: BiomarkersEvalData) {
  // BP score (0-2.5)
  let bpScore = 0;
  if (d.systolicBP < 120 && d.diastolicBP < 80) bpScore = 2.5;
  else if (d.systolicBP < 130 && d.diastolicBP < 85) bpScore = 2;
  else if (d.systolicBP < 140 && d.diastolicBP < 90) bpScore = 1;
  else bpScore = 0;

  // Glucose score (0-2)
  let glucoseScore = 0;
  if (d.fastingGlucose >= 70 && d.fastingGlucose <= 100) glucoseScore = 2;
  else if (d.fastingGlucose >= 101 && d.fastingGlucose <= 125) glucoseScore = 1.5;
  else glucoseScore = 0.5;

  // Lipids score (0-2.5)
  let lipidsScore = 0;
  const isLipidsOptimal = d.totalCholesterol < 200 && d.hdl > 50 && d.triglycerides < 150;
  const isLipidsPartial = d.totalCholesterol < 240 && d.hdl > 40 && d.triglycerides < 200;
  if (isLipidsOptimal) lipidsScore = 2.5;
  else if (isLipidsPartial) lipidsScore = 1.5;
  else lipidsScore = 0.5;

  // HR score (0-1.5)
  let hrScore = 0;
  if (d.restingHR >= 60 && d.restingHR <= 100) hrScore = 1.5;
  else if ((d.restingHR >= 50 && d.restingHR <= 59) || (d.restingHR >= 101 && d.restingHR <= 110)) hrScore = 1;
  else hrScore = 0.5;

  // Flags penalty
  let flagsPenalty = 0;
  if (d.hasDiabetes) flagsPenalty += 1;
  if (d.hasHypertension) flagsPenalty += 0.5;
  if (d.hasDyslipidemia) flagsPenalty += 0.5;

  const raw = bpScore + glucoseScore + lipidsScore + hrScore - flagsPenalty;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  // Risk level
  let riskLevel = 'good';
  if (d.systolicBP >= 180 || d.diastolicBP >= 120 || d.fastingGlucose >= 300) riskLevel = 'urgent';
  else if (score <= 4) riskLevel = 'risk';
  else if (score <= 6) riskLevel = 'mild';

  return { score, riskLevel, bpScore, glucoseScore, lipidsScore, hrScore, flagsPenalty };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-green-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-orange-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-600', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

export default function BiomarkersEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('vitals');
  const [data, setData] = useState<BiomarkersEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const et = t.biomarkersEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/biomarkers-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setField = <K extends keyof BiomarkersEvalData>(key: K, v: BiomarkersEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/biomarkers-assessment', {
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
    const score = Number(a.biomarkersScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const systolic = Number(a.systolicBP) || 120;
    const diastolic = Number(a.diastolicBP) || 80;
    const glucose = Number(a.fastingGlucose) || 90;
    const cholesterol = Number(a.totalCholesterol) || 190;
    const hdlVal = Number(a.hdl) || 55;
    const trig = Number(a.triglycerides) || 120;
    const hr = Number(a.restingHR) || 72;

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
                <HeartPulse className="w-8 h-8 text-red-500" />
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
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-green-500' : risk === 'mild' ? 'bg-orange-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.bloodPressure}</p>
                <p className={`text-2xl font-bold ${systolic < 120 && diastolic < 80 ? 'text-green-500' : systolic < 140 && diastolic < 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {systolic}/{diastolic}
                </p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.fastingGlucoseLabel}</p>
                <p className={`text-2xl font-bold ${glucose >= 70 && glucose <= 100 ? 'text-green-500' : glucose <= 125 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {glucose}
                </p>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.cholesterolLabel}</p>
                <p className={`text-2xl font-bold ${cholesterol < 200 ? 'text-green-500' : cholesterol < 240 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {cholesterol}
                </p>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.hdlLabel}</p>
                <p className={`text-2xl font-bold ${hdlVal > 50 ? 'text-green-500' : hdlVal > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {hdlVal}
                </p>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.triglyceridesLabel}</p>
                <p className={`text-2xl font-bold ${trig < 150 ? 'text-green-500' : trig < 200 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {trig}
                </p>
                <p className="text-xs text-muted-foreground">mg/dL</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.heartRateLabel}</p>
                <p className={`text-2xl font-bold ${hr >= 60 && hr <= 100 ? 'text-green-500' : hr >= 50 && hr <= 110 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {hr}
                </p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-red-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {(systolic >= 140 || diastolic >= 90) && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHighBP}
                  </li>
                )}
                {glucose > 125 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHighGlucose}
                  </li>
                )}
                {(cholesterol >= 240 || trig >= 200) && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHighCholesterol}
                  </li>
                )}
                {hdlVal < 40 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowHDL}
                  </li>
                )}
                {(hr < 50 || hr > 110) && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recAbnormalHR}
                  </li>
                )}
                {a.hasDiabetes && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recDiabetes}
                  </li>
                )}
                {a.hasHypertension && (
                  <li className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recHypertension}
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
      {savedAssessments.length > 0 && step === 'vitals' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.biomarkersScore) >= 7 ? 'bg-green-500' : Number(a.biomarkersScore) >= 5 ? 'bg-yellow-500' : Number(a.biomarkersScore) >= 3 ? 'bg-orange-500' : 'bg-red-500'}`}>
                      {String(a.biomarkersScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{String(a.systolicBP)}/{String(a.diastolicBP)} mmHg</p>
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
        {(['vitals', 'labs', 'flags', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['vitals', 'labs', 'flags', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepVitals, et.stepLabs, et.stepFlags, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30' : isDone ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* ─── Vitals Step ─────────────────────────────────────── */}
      {step === 'vitals' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-foreground">{et.vitalsTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.vitalsDesc}</p>

            {/* Systolic BP */}
            <div className="space-y-2">
              <Label className="text-sm">{et.systolicBP}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={80} max={200} step={1} value={data.systolicBP}
                  onChange={e => setField('systolicBP', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.systolicBP < 120 ? 'text-green-500' : data.systolicBP < 140 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.systolicBP}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>80</span><span>140</span><span>200</span>
              </div>
            </div>

            {/* Diastolic BP */}
            <div className="space-y-2">
              <Label className="text-sm">{et.diastolicBP}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={50} max={120} step={1} value={data.diastolicBP}
                  onChange={e => setField('diastolicBP', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.diastolicBP < 80 ? 'text-green-500' : data.diastolicBP < 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.diastolicBP}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50</span><span>80</span><span>120</span>
              </div>
            </div>

            {/* Resting Heart Rate */}
            <div className="space-y-2">
              <Label className="text-sm">{et.restingHR}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={40} max={120} step={1} value={data.restingHR}
                  onChange={e => setField('restingHR', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                <span className={`text-lg font-bold w-16 text-right ${data.restingHR >= 60 && data.restingHR <= 100 ? 'text-green-500' : data.restingHR >= 50 && data.restingHR <= 110 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.restingHR}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>40</span><span>80</span><span>120</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('labs')} className="gap-2 bg-red-500 hover:bg-red-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Labs Step ───────────────────────────────────────── */}
      {step === 'labs' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-foreground">{et.labsTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.labsDesc}</p>

              {/* Fasting Glucose */}
              <div className="space-y-2">
                <Label className="text-sm">{et.fastingGlucoseLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={60} max={300} step={1} value={data.fastingGlucose}
                    onChange={e => setField('fastingGlucose', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.fastingGlucose >= 70 && data.fastingGlucose <= 100 ? 'text-green-500' : data.fastingGlucose <= 125 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.fastingGlucose} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>60</span><span>100</span><span>200</span><span>300</span>
                </div>
              </div>

              {/* Total Cholesterol */}
              <div className="space-y-2">
                <Label className="text-sm">{et.cholesterolLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={100} max={350} step={1} value={data.totalCholesterol}
                    onChange={e => setField('totalCholesterol', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.totalCholesterol < 200 ? 'text-green-500' : data.totalCholesterol < 240 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.totalCholesterol} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>100</span><span>200</span><span>350</span>
                </div>
              </div>

              {/* HDL */}
              <div className="space-y-2">
                <Label className="text-sm">{et.hdlLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={20} max={100} step={1} value={data.hdl}
                    onChange={e => setField('hdl', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.hdl > 50 ? 'text-green-500' : data.hdl > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.hdl} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>20</span><span>50</span><span>100</span>
                </div>
              </div>

              {/* LDL */}
              <div className="space-y-2">
                <Label className="text-sm">{et.ldlLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={50} max={250} step={1} value={data.ldl}
                    onChange={e => setField('ldl', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.ldl < 100 ? 'text-green-500' : data.ldl < 160 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.ldl} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50</span><span>100</span><span>250</span>
                </div>
              </div>

              {/* Triglycerides */}
              <div className="space-y-2">
                <Label className="text-sm">{et.triglyceridesLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={50} max={400} step={1} value={data.triglycerides}
                    onChange={e => setField('triglycerides', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.triglycerides < 150 ? 'text-green-500' : data.triglycerides < 200 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.triglycerides} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>50</span><span>150</span><span>400</span>
                </div>
              </div>

              {/* Hemoglobin */}
              <div className="space-y-2">
                <Label className="text-sm">{et.hemoglobinLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={8} max={20} step={0.1} value={data.hemoglobin}
                    onChange={e => setField('hemoglobin', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.hemoglobin >= 12 && data.hemoglobin <= 17 ? 'text-green-500' : data.hemoglobin >= 10 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.hemoglobin.toFixed(1)} <span className="text-xs text-muted-foreground">g/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>8</span><span>14</span><span>20</span>
                </div>
              </div>

              {/* Creatinine */}
              <div className="space-y-2">
                <Label className="text-sm">{et.creatinineLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0.3} max={3.0} step={0.1} value={data.creatinine}
                    onChange={e => setField('creatinine', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.creatinine >= 0.6 && data.creatinine <= 1.2 ? 'text-green-500' : data.creatinine <= 1.5 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.creatinine.toFixed(1)} <span className="text-xs text-muted-foreground">mg/dL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.3</span><span>1.0</span><span>3.0</span>
                </div>
              </div>

              {/* Vitamin D */}
              <div className="space-y-2">
                <Label className="text-sm">{et.vitaminDLabel}</Label>
                <div className="flex items-center gap-3">
                  <input type="range" min={5} max={80} step={1} value={data.vitaminD}
                    onChange={e => setField('vitaminD', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500" />
                  <span className={`text-lg font-bold w-20 text-right ${data.vitaminD >= 30 && data.vitaminD <= 60 ? 'text-green-500' : data.vitaminD >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {data.vitaminD} <span className="text-xs text-muted-foreground">ng/mL</span>
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>5</span><span>30</span><span>80</span>
                </div>
              </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('vitals')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('flags')} className="gap-2 bg-red-500 hover:bg-red-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Flags Step ──────────────────────────────────────── */}
      {step === 'flags' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-foreground">{et.flagsTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.flagsDesc}</p>

            {/* Diabetes toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <Label className="text-sm">{et.hasDiabetes}</Label>
              <button onClick={() => setField('hasDiabetes', !data.hasDiabetes)}
                className={`w-12 h-6 rounded-full transition-colors ${data.hasDiabetes ? 'bg-red-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.hasDiabetes ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Hypertension toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <Label className="text-sm">{et.hasHypertension}</Label>
              <button onClick={() => setField('hasHypertension', !data.hasHypertension)}
                className={`w-12 h-6 rounded-full transition-colors ${data.hasHypertension ? 'bg-red-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.hasHypertension ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Dyslipidemia toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <Label className="text-sm">{et.hasDyslipidemia}</Label>
              <button onClick={() => setField('hasDyslipidemia', !data.hasDyslipidemia)}
                className={`w-12 h-6 rounded-full transition-colors ${data.hasDyslipidemia ? 'bg-red-500' : 'bg-muted'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${data.hasDyslipidemia ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {(data.hasDiabetes || data.hasHypertension || data.hasDyslipidemia) && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.flagsWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('labs')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-red-500 hover:bg-red-600">
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
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-green-500' : results.score >= 5 ? 'text-yellow-500' : results.score >= 3 ? 'text-orange-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* Key metrics grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.bloodPressure}</p>
                <p className={`text-2xl font-bold ${data.systolicBP < 120 && data.diastolicBP < 80 ? 'text-green-500' : data.systolicBP < 140 && data.diastolicBP < 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.systolicBP}/{data.diastolicBP}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.fastingGlucoseLabel}</p>
                <p className={`text-2xl font-bold ${data.fastingGlucose >= 70 && data.fastingGlucose <= 100 ? 'text-green-500' : data.fastingGlucose <= 125 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.fastingGlucose}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.cholesterolLabel}</p>
                <p className={`text-2xl font-bold ${data.totalCholesterol < 200 ? 'text-green-500' : data.totalCholesterol < 240 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.totalCholesterol}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.heartRateLabel}</p>
                <p className={`text-2xl font-bold ${data.restingHR >= 60 && data.restingHR <= 100 ? 'text-green-500' : data.restingHR >= 50 && data.restingHR <= 110 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {data.restingHR}
                </p>
              </div>
            </div>

            {(results.riskLevel === 'urgent' || results.riskLevel === 'risk') && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {et.urgentWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('flags')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-amber-500">Please log in to generate and save reports.</p>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}
                  className="gap-2 bg-red-500 hover:bg-red-600">
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
