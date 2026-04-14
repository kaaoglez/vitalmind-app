'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Brain, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Printer, Heart, Star, Activity, ShieldAlert,
} from 'lucide-react';

// PHQ-9 questions type
const PHQ_QUESTIONS = 9;
const GAD_QUESTIONS = 7;

// Frequency options: 0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day
const FREQ_OPTIONS = [0, 1, 2, 3] as const;

type EvalStep = 'phq9' | 'gad7' | 'indicators' | 'results';

interface MentalEvalData {
  phq: number[];
  gad: number[];
  perceivedStress: number;
  emotionalRegulation: number;
  socialRelationships: number;
  senseOfPurpose: number;
  weeklySocialInt: number;
  negThoughtsFreq: number;
}

const defaultData: MentalEvalData = {
  phq: Array(PHQ_QUESTIONS).fill(0),
  gad: Array(GAD_QUESTIONS).fill(0),
  perceivedStress: 5,
  emotionalRegulation: 5,
  socialRelationships: 5,
  senseOfPurpose: 5,
  weeklySocialInt: 3,
  negThoughtsFreq: 5,
};

function getPhqSeverity(total: number): { key: string; color: string } {
  if (total <= 4) return { key: 'phqNone', color: 'text-green-500' };
  if (total <= 9) return { key: 'phqMild', color: 'text-blue-500' };
  if (total <= 14) return { key: 'phqModerate', color: 'text-yellow-500' };
  if (total <= 19) return { key: 'phqModSevere', color: 'text-orange-500' };
  return { key: 'phqSevere', color: 'text-red-500' };
}

function getGadSeverity(total: number): { key: string; color: string } {
  if (total <= 4) return { key: 'gadNone', color: 'text-green-500' };
  if (total <= 9) return { key: 'gadMild', color: 'text-blue-500' };
  if (total <= 14) return { key: 'gadModerate', color: 'text-yellow-500' };
  return { key: 'gadSevere', color: 'text-red-500' };
}

function calcMentalScore(d: MentalEvalData) {
  const phqTotal = d.phq.reduce((a, b) => a + b, 0);
  const gadTotal = d.gad.reduce((a, b) => a + b, 0);
  const phqContrib = Math.max(0, 3 - (phqTotal / 9));
  const gadContrib = Math.max(0, 2.5 - (gadTotal / 8.4));
  const subjectiveAvg = ((10 - d.perceivedStress) + d.emotionalRegulation + d.socialRelationships + d.senseOfPurpose + (10 - d.negThoughtsFreq)) / 5;
  const subjectiveContrib = (subjectiveAvg / 10) * 4.5;
  const raw = phqContrib + gadContrib + subjectiveContrib;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (phqTotal >= 20 || gadTotal >= 15) riskLevel = 'urgent';
  else if (phqTotal >= 15 || gadTotal >= 10 || score <= 3) riskLevel = 'risk';
  else if (phqTotal >= 10 || gadTotal >= 5 || score <= 5) riskLevel = 'mild';

  return { score, riskLevel, phqTotal, gadTotal };
}

function SliderInput({ label, value, onChange, min = 1, max = 10, inverse }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; inverse?: boolean;
}) {
  const displayValue = inverse ? max - value + min : value;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className={`text-sm font-bold ${displayValue >= 7 ? 'text-green-500' : displayValue >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>
          {value}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{inverse ? max : min}</span>
        <span>{inverse ? min : max}</span>
      </div>
    </div>
  );
}

export default function MentalEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('phq9');
  const [data, setData] = useState<MentalEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const et = t.mentalEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/mental-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const results = useMemo(() => calcMentalScore(data), [data]);

  const setPhq = (i: number, v: number) => setData(prev => {
    const phq = [...prev.phq]; phq[i] = v; return { ...prev, phq };
  });
  const setGad = (i: number, v: number) => setData(prev => {
    const gad = [...prev.gad]; gad[i] = v; return { ...prev, gad };
  });

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const body: Record<string, number | string> = {};
      data.phq.forEach((v, i) => { body[`phq${i + 1}`] = v; });
      data.gad.forEach((v, i) => { body[`gad${i + 1}`] = v; });
      body.perceivedStress = data.perceivedStress;
      body.emotionalRegulation = data.emotionalRegulation;
      body.socialRelationships = data.socialRelationships;
      body.senseOfPurpose = data.senseOfPurpose;
      body.weeklySocialInt = data.weeklySocialInt;
      body.negThoughtsFreq = data.negThoughtsFreq;

      const res = await fetch('/api/mental-assessment', {
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
    const phqTotal = Number(a.phqTotal) || 0;
    const gadTotal = Number(a.gadTotal) || 0;
    const phqSev = getPhqSeverity(phqTotal);
    const gadSev = getGadSeverity(gadTotal);
    const score = Number(a.mentalScore) || 0;
    const risk = String(a.riskLevel) || 'good';

    const riskInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      good: { label: et.riskGood, color: 'text-green-500', icon: <CheckCircle2 className="w-6 h-6" /> },
      mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
      risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
      urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
    };
    const ri = riskInfo[risk] || riskInfo.good;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {et.backToList}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="w-4 h-4" /> {et.printReport}
          </Button>
        </div>

        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-6 print:p-2">
            {/* Header */}
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6 print:pb-3 print:mb-3">
              <div className="flex items-center justify-center gap-3">
                <Brain className="w-8 h-8 text-wellness-lavender" />
                <h1 className="text-2xl font-bold text-foreground">VitalMind</h1>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{et.reportTitle}</h2>
              <p className="text-sm text-muted-foreground">{et.reportSubtitle}</p>
              <p className="text-xs text-muted-foreground">{a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : ''}</p>
            </div>

            {/* Area Score */}
            <div className="text-center space-y-3 mb-8 print:mb-4">
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

            {/* PHQ-9 Results */}
            <div className="p-4 rounded-xl border border-border mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Heart className="w-5 h-5 text-rose-500" /> PHQ-9
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground">{et.phqLabel}</span>
                <span className={`text-xl font-bold ${phqSev.color}`}>{phqTotal}/27</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div className={`h-full rounded-full bg-rose-500`} style={{ width: `${(phqTotal / 27) * 100}%` }} />
              </div>
              <p className={`text-sm font-medium ${phqSev.color}`}>
                {et[phqSev.key as keyof typeof et] || phqSev.key}
              </p>
              {phqTotal >= 15 && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> {et.phqWarning}
                  </p>
                </div>
              )}
            </div>

            {/* GAD-7 Results */}
            <div className="p-4 rounded-xl border border-border mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-amber-500" /> GAD-7
              </h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-foreground">{et.gadLabel}</span>
                <span className={`text-xl font-bold ${gadSev.color}`}>{gadTotal}/21</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div className={`h-full rounded-full bg-amber-500`} style={{ width: `${(gadTotal / 21) * 100}%` }} />
              </div>
              <p className={`text-sm font-medium ${gadSev.color}`}>
                {et[gadSev.key as keyof typeof et] || gadSev.key}
              </p>
              {gadTotal >= 10 && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                  <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {et.gadWarning}
                  </p>
                </div>
              )}
            </div>

            {/* Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 print:mb-3">
              {[
                { key: 'perceivedStress', label: et.indStress, inverse: true },
                { key: 'emotionalRegulation', label: et.indEmotionReg },
                { key: 'socialRelationships', label: et.indSocialRel },
                { key: 'senseOfPurpose', label: et.indPurpose },
                { key: 'negThoughtsFreq', label: et.indNegThoughts, inverse: true },
                { key: 'weeklySocialInt', label: et.indWeeklySocial },
              ].map(ind => {
                const val = Number(a[ind.key]) || 0;
                const displayVal = ind.inverse ? 10 - val + 1 : val;
                return (
                  <div key={ind.key} className="p-3 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ind.label}</p>
                    <p className={`text-xl font-bold ${displayVal >= 7 ? 'text-green-500' : displayVal >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}</p>
                  </div>
                );
              })}
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 print:pt-3 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {phqTotal >= 10 && (
                  <li className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recPhq}
                  </li>
                )}
                {gadTotal >= 5 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recGad}
                  </li>
                )}
                {Number(a.perceivedStress) >= 7 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recStress}
                  </li>
                )}
                {Number(a.negThoughtsFreq) >= 7 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recNegThoughts}
                  </li>
                )}
                {Number(a.socialRelationships) <= 4 && (
                  <li className="flex items-start gap-2 text-cyan-600 dark:text-cyan-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recSocial}
                  </li>
                )}
                <li className="flex items-start gap-2 text-muted-foreground">
                  <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recGeneral}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground italic text-center">{et.disclaimer}</p>
            </div>

            {/* Specialist Section */}
            <div className="border-t border-border pt-6 mt-6 print:pt-3 print:mt-3 print:break-inside-avoid">
              <h4 className="font-medium text-foreground mb-4">{et.specialistSection}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{et.specialistName}</span></div>
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{et.specialistLicense}</span></div>
                </div>
                <div className="space-y-3">
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{et.specialistDate}</span></div>
                  <div className="border-b border-border pb-1"><span className="text-xs text-muted-foreground">{et.specialistSignature}</span></div>
                </div>
              </div>
              <div className="mt-4 border-b border-border pb-1"><span className="text-xs text-muted-foreground">{et.specialistNotes}</span></div>
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
      {savedAssessments.length > 0 && step === 'phq9' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.mentalScore) >= 7 ? 'bg-green-500' : Number(a.mentalScore) >= 5 ? 'bg-blue-500' : Number(a.mentalScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.mentalScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">PHQ-9: {String(a.phqTotal)} | GAD-7: {String(a.gadTotal)}</p>
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
        {(['phq9', 'gad7', 'indicators', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['phq9', 'gad7', 'indicators', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepPhq9, et.stepGad7, et.stepIndicators, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-wellness-lavender/15 text-wellness-lavender border border-wellness-lavender/30' : isDone ? 'bg-wellness-lavender/10 text-wellness-lavender' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* PHQ-9 */}
      {step === 'phq9' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-foreground">PHQ-9</h3>
              <span className="text-xs text-muted-foreground ml-auto">{et.phqOverLast2Weeks}</span>
            </div>

            {Array.from({ length: PHQ_QUESTIONS }, (_, i) => {
              const qKey = `phqQ${i + 1}` as keyof typeof et;
              return (
                <div key={i} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{et[qKey]}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setPhq(i, opt)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${data.phq[i] === opt ? 'bg-wellness-lavender/20 text-wellness-lavender border border-wellness-lavender/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                        {et[`freq${opt}` as keyof typeof et]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">{et.phqSubtotal}: <span className={`font-bold ${data.phq.reduce((a, b) => a + b, 0) <= 9 ? 'text-green-500' : data.phq.reduce((a, b) => a + b, 0) <= 14 ? 'text-yellow-500' : 'text-red-500'}`}>{data.phq.reduce((a, b) => a + b, 0)}/27</span></p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('gad7')} className="gap-2 bg-wellness-lavender hover:bg-wellness-lavender/90">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* GAD-7 */}
      {step === 'gad7' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground">GAD-7</h3>
              <span className="text-xs text-muted-foreground ml-auto">{et.gadOverLast2Weeks}</span>
            </div>

            {Array.from({ length: GAD_QUESTIONS }, (_, i) => {
              const qKey = `gadQ${i + 1}` as keyof typeof et;
              return (
                <div key={i} className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{et[qKey]}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {FREQ_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => setGad(i, opt)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${data.gad[i] === opt ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40' : 'bg-muted text-muted-foreground border border-transparent hover:border-border'}`}>
                        {et[`freq${opt}` as keyof typeof et]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="text-center pt-2 border-t border-border">
              <p className="text-sm text-muted-foreground">{et.gadSubtotal}: <span className={`font-bold ${data.gad.reduce((a, b) => a + b, 0) <= 9 ? 'text-green-500' : data.gad.reduce((a, b) => a + b, 0) <= 14 ? 'text-yellow-500' : 'text-red-500'}`}>{data.gad.reduce((a, b) => a + b, 0)}/21</span></p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('phq9')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('indicators')} className="gap-2 bg-wellness-lavender hover:bg-wellness-lavender/90">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indicators */}
      {step === 'indicators' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5 text-wellness-lavender" />
              <h3 className="font-semibold text-foreground">{et.indicatorsTitle}</h3>
            </div>

            <SliderInput label={et.indStress} value={data.perceivedStress} onChange={v => setData(p => ({ ...p, perceivedStress: v }))} inverse />
            <SliderInput label={et.indEmotionReg} value={data.emotionalRegulation} onChange={v => setData(p => ({ ...p, emotionalRegulation: v }))} />
            <SliderInput label={et.indSocialRel} value={data.socialRelationships} onChange={v => setData(p => ({ ...p, socialRelationships: v }))} />
            <SliderInput label={et.indPurpose} value={data.senseOfPurpose} onChange={v => setData(p => ({ ...p, senseOfPurpose: v }))} />
            <SliderInput label={et.indNegThoughts} value={data.negThoughtsFreq} onChange={v => setData(p => ({ ...p, negThoughtsFreq: v }))} inverse />

            <div className="space-y-2">
              <Label className="text-sm">{et.indWeeklySocial}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={7} value={data.weeklySocialInt} onChange={e => setData(p => ({ ...p, weeklySocialInt: Number(e.target.value) }))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                <span className="text-sm font-bold w-16 text-right">{data.weeklySocialInt} {et.days}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('gad7')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-wellness-lavender hover:bg-wellness-lavender/90">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Preview */}
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
                <p className="text-xs text-muted-foreground mb-1">PHQ-9</p>
                <p className={`text-2xl font-bold ${results.phqTotal <= 9 ? 'text-green-500' : results.phqTotal <= 14 ? 'text-yellow-500' : 'text-red-500'}`}>{results.phqTotal}/27</p>
                <p className="text-xs text-muted-foreground">{getPhqSeverity(results.phqTotal).key.replace('phq', '')}</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">GAD-7</p>
                <p className={`text-2xl font-bold ${results.gadTotal <= 9 ? 'text-green-500' : results.gadTotal <= 14 ? 'text-yellow-500' : 'text-red-500'}`}>{results.gadTotal}/21</p>
                <p className="text-xs text-muted-foreground">{getGadSeverity(results.gadTotal).key.replace('gad', '')}</p>
              </div>
            </div>

            {results.phqTotal >= 15 && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {et.phqWarning}
                </p>
              </div>
            )}
            {results.gadTotal >= 10 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.gadWarning}
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
                  className="gap-2 bg-wellness-lavender hover:bg-wellness-lavender/90">
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
