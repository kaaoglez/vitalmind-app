'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Users, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, UserCheck, Briefcase, Heart,
} from 'lucide-react';

type EvalStep = 'support' | 'work' | 'loneliness' | 'results';

interface SocialEvalData {
  emotionalSupport: number;
  instrumentalSupport: number;
  informationalSupport: number;
  socialIntegration: number;
  supportNetworkSize: number;
  jobSatisfaction: number;
  workLifeBalance: number;
  workStress: number;
  commuteTime: number;
  financialSecurity: number;
  lonelinessFrequency: number;
  isolationLevel: number;
  relationshipQuality: number;
  communityInvolvement: number;
  digitalOverload: number;
  overallSatisfaction: number;
  purposeInLife: number;
}

const defaultData: SocialEvalData = {
  emotionalSupport: 5,
  instrumentalSupport: 5,
  informationalSupport: 5,
  socialIntegration: 5,
  supportNetworkSize: 5,
  jobSatisfaction: 5,
  workLifeBalance: 5,
  workStress: 5,
  commuteTime: 30,
  financialSecurity: 5,
  lonelinessFrequency: 5,
  isolationLevel: 5,
  relationshipQuality: 5,
  communityInvolvement: 5,
  digitalOverload: 5,
  overallSatisfaction: 5,
  purposeInLife: 5,
};

function calcScore(d: SocialEvalData) {
  // Support (0-3): avg(emotional+instrumental+informational+socialIntegration)/10 * 3
  const supportAvg = (d.emotionalSupport + d.instrumentalSupport + d.informationalSupport + d.socialIntegration) / 4;
  const supportScore = (supportAvg / 10) * 3;

  // Work (0-2): avg(jobSat+workLife+(10-workStress)+financial)/4/10 * 2
  const workAvg = (d.jobSatisfaction + d.workLifeBalance + (10 - d.workStress) + d.financialSecurity) / 4;
  const workScore = (workAvg / 10) * 2;

  // Loneliness (0-2.5): avg((10-lonely)+(10-isolation)+relationship)/3/10 * 2.5
  const lonelinessAvg = ((10 - d.lonelinessFrequency) + (10 - d.isolationLevel) + d.relationshipQuality) / 3;
  const lonelinessScore = (lonelinessAvg / 10) * 2.5;

  // Community (0-1): community/10
  const communityScore = d.communityInvolvement / 10;

  // Purpose (0-1): avg(satisfaction+purpose)/2/10
  const purposeAvg = (d.overallSatisfaction + d.purposeInLife) / 2;
  const purposeScore = (purposeAvg / 10) * 1;

  // Digital penalty: -0.5 if digitalOverload>=7
  const digitalPenalty = d.digitalOverload >= 7 ? -0.5 : 0;

  const raw = supportScore + workScore + lonelinessScore + communityScore + purposeScore + digitalPenalty;
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;

  let riskLevel = 'good';
  if (d.lonelinessFrequency >= 9 && d.isolationLevel >= 8) riskLevel = 'urgent';
  else if (score <= 3) riskLevel = 'risk';
  else if (score <= 6) riskLevel = 'mild';

  return {
    score,
    riskLevel,
    supportScore: Math.round(supportScore * 100) / 100,
    workScore: Math.round(workScore * 100) / 100,
    lonelinessScore: Math.round(lonelinessScore * 100) / 100,
    communityScore: Math.round(communityScore * 100) / 100,
    purposeScore: Math.round(purposeScore * 100) / 100,
  };
}

function getRiskInfo(risk: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: et.riskGood, color: 'text-violet-500', icon: <CheckCircle2 className="w-6 h-6" /> },
    mild: { label: et.riskMild, color: 'text-blue-500', icon: <Activity className="w-6 h-6" /> },
    risk: { label: et.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-6 h-6" /> },
    urgent: { label: et.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-6 h-6" /> },
  };
  return map[risk] || map.good;
}

export default function SocialEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('support');
  const [data, setData] = useState<SocialEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const et = t.socialEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/social-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
  }, [isAuthenticated]);

  const results = useMemo(() => calcScore(data), [data]);

  const setField = <K extends keyof SocialEvalData>(key: K, v: SocialEvalData[K]) =>
    setData(prev => ({ ...prev, [key]: v }));

  const submit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/social-assessment', {
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
    const score = Number(a.socialScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const emotionalSupport = Number(a.emotionalSupport) || 5;
    const jobSatisfaction = Number(a.jobSatisfaction) || 5;
    const lonelinessFrequency = Number(a.lonelinessFrequency) || 5;
    const communityInvolvement = Number(a.communityInvolvement) || 5;
    const overallSatisfaction = Number(a.overallSatisfaction) || 5;

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
                <Users className="w-8 h-8 text-violet-500" />
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
                <div className={`h-full rounded-full transition-all duration-700 ${risk === 'good' ? 'bg-violet-500' : risk === 'mild' ? 'bg-blue-500' : risk === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.emotionalSupport}</p>
                <p className={`text-2xl font-bold ${emotionalSupport >= 7 ? 'text-violet-500' : emotionalSupport >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{emotionalSupport}/10</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.jobSatisfaction}</p>
                <p className={`text-2xl font-bold ${jobSatisfaction >= 7 ? 'text-violet-500' : jobSatisfaction >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{jobSatisfaction}/10</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.lonelinessFrequency}</p>
                <p className={`text-2xl font-bold ${lonelinessFrequency <= 3 ? 'text-violet-500' : lonelinessFrequency <= 6 ? 'text-yellow-500' : 'text-red-500'}`}>{lonelinessFrequency}/10</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.communityInvolvement}</p>
                <p className={`text-2xl font-bold ${communityInvolvement >= 7 ? 'text-violet-500' : communityInvolvement >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{communityInvolvement}/10</p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.overallSatisfaction}</p>
                <p className={`text-2xl font-bold ${overallSatisfaction >= 7 ? 'text-violet-500' : overallSatisfaction >= 4 ? 'text-blue-500' : 'text-red-500'}`}>{overallSatisfaction}/10</p>
              </div>
            </div>

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-500" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {lonelinessFrequency >= 7 && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLoneliness}
                  </li>
                )}
                {emotionalSupport <= 3 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowSupport}
                  </li>
                )}
                {jobSatisfaction <= 3 && (
                  <li className="flex items-start gap-2 text-orange-600 dark:text-orange-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recWorkDissatisfaction}
                  </li>
                )}
                {communityInvolvement <= 3 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowCommunity}
                  </li>
                )}
                {Number(a.digitalOverload) >= 7 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recDigitalOverload}
                  </li>
                )}
                {overallSatisfaction <= 4 && (
                  <li className="flex items-start gap-2 text-violet-600 dark:text-violet-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowSatisfaction}
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
      {savedAssessments.length > 0 && step === 'support' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.socialScore) >= 7 ? 'bg-violet-500' : Number(a.socialScore) >= 5 ? 'bg-blue-500' : Number(a.socialScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.socialScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">{et.scoreLabel}: {String(a.socialScore)}/10</p>
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
        {(['support', 'work', 'loneliness', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['support', 'work', 'loneliness', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepSupport, et.stepWork, et.stepLoneliness, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30' : isDone ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* ─── Support Step ───────────────────────────────────────── */}
      {step === 'support' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold text-foreground">{et.supportTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.supportDesc}</p>

            {/* Emotional Support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.emotionalSupport}</Label>
                <span className={`text-sm font-bold ${data.emotionalSupport >= 7 ? 'text-green-500' : data.emotionalSupport >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.emotionalSupport}</span>
              </div>
              <input type="range" min={1} max={10} value={data.emotionalSupport}
                onChange={e => setField('emotionalSupport', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Instrumental Support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.instrumentalSupport}</Label>
                <span className={`text-sm font-bold ${data.instrumentalSupport >= 7 ? 'text-green-500' : data.instrumentalSupport >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.instrumentalSupport}</span>
              </div>
              <input type="range" min={1} max={10} value={data.instrumentalSupport}
                onChange={e => setField('instrumentalSupport', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Informational Support */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.informationalSupport}</Label>
                <span className={`text-sm font-bold ${data.informationalSupport >= 7 ? 'text-green-500' : data.informationalSupport >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.informationalSupport}</span>
              </div>
              <input type="range" min={1} max={10} value={data.informationalSupport}
                onChange={e => setField('informationalSupport', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Social Integration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.socialIntegration}</Label>
                <span className={`text-sm font-bold ${data.socialIntegration >= 7 ? 'text-green-500' : data.socialIntegration >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.socialIntegration}</span>
              </div>
              <input type="range" min={1} max={10} value={data.socialIntegration}
                onChange={e => setField('socialIntegration', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Support Network Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.supportNetworkSize}</Label>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{data.supportNetworkSize}</span>
              </div>
              <input type="range" min={0} max={15} value={data.supportNetworkSize}
                onChange={e => setField('supportNetworkSize', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span><span>7</span><span>15</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('work')} className="gap-2 bg-violet-500 hover:bg-violet-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Work Step ──────────────────────────────────────────── */}
      {step === 'work' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold text-foreground">{et.workTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.workDesc}</p>

            {/* Job Satisfaction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.jobSatisfaction}</Label>
                <span className={`text-sm font-bold ${data.jobSatisfaction >= 7 ? 'text-green-500' : data.jobSatisfaction >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.jobSatisfaction}</span>
              </div>
              <input type="range" min={1} max={10} value={data.jobSatisfaction}
                onChange={e => setField('jobSatisfaction', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Work-Life Balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.workLifeBalance}</Label>
                <span className={`text-sm font-bold ${data.workLifeBalance >= 7 ? 'text-green-500' : data.workLifeBalance >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.workLifeBalance}</span>
              </div>
              <input type="range" min={1} max={10} value={data.workLifeBalance}
                onChange={e => setField('workLifeBalance', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Work Stress (inverse - higher = more stress) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.workStress}</Label>
                <span className={`text-sm font-bold ${data.workStress <= 3 ? 'text-green-500' : data.workStress <= 6 ? 'text-yellow-500' : 'text-red-500'}`}>{data.workStress}</span>
              </div>
              <input type="range" min={1} max={10} value={data.workStress}
                onChange={e => setField('workStress', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
              <p className="text-[10px] text-muted-foreground">{et.workStressInverse}</p>
            </div>

            {/* Commute Time */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.commuteTime}</Label>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{data.commuteTime} min</span>
              </div>
              <input type="range" min={0} max={120} step={5} value={data.commuteTime}
                onChange={e => setField('commuteTime', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0 min</span><span>60 min</span><span>120 min</span>
              </div>
            </div>

            {/* Financial Security */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.financialSecurity}</Label>
                <span className={`text-sm font-bold ${data.financialSecurity >= 7 ? 'text-green-500' : data.financialSecurity >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.financialSecurity}</span>
              </div>
              <input type="range" min={1} max={10} value={data.financialSecurity}
                onChange={e => setField('financialSecurity', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('support')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('loneliness')} className="gap-2 bg-violet-500 hover:bg-violet-600">
                {et.next} <ChevronLeft className="w-4 h-4 rotate-180" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Loneliness Step ────────────────────────────────────── */}
      {step === 'loneliness' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold text-foreground">{et.lonelinessTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.lonelinessDesc}</p>

            {/* Loneliness Frequency (inverse - higher = more loneliness) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.lonelinessFrequency}</Label>
                <span className={`text-sm font-bold ${data.lonelinessFrequency <= 3 ? 'text-green-500' : data.lonelinessFrequency <= 6 ? 'text-yellow-500' : 'text-red-500'}`}>{data.lonelinessFrequency}</span>
              </div>
              <input type="range" min={1} max={10} value={data.lonelinessFrequency}
                onChange={e => setField('lonelinessFrequency', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Isolation Level (inverse) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.isolationLevel}</Label>
                <span className={`text-sm font-bold ${data.isolationLevel <= 3 ? 'text-green-500' : data.isolationLevel <= 6 ? 'text-yellow-500' : 'text-red-500'}`}>{data.isolationLevel}</span>
              </div>
              <input type="range" min={1} max={10} value={data.isolationLevel}
                onChange={e => setField('isolationLevel', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Relationship Quality */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.relationshipQuality}</Label>
                <span className={`text-sm font-bold ${data.relationshipQuality >= 7 ? 'text-green-500' : data.relationshipQuality >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.relationshipQuality}</span>
              </div>
              <input type="range" min={1} max={10} value={data.relationshipQuality}
                onChange={e => setField('relationshipQuality', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Community Involvement */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.communityInvolvement}</Label>
                <span className={`text-sm font-bold ${data.communityInvolvement >= 7 ? 'text-green-500' : data.communityInvolvement >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.communityInvolvement}</span>
              </div>
              <input type="range" min={1} max={10} value={data.communityInvolvement}
                onChange={e => setField('communityInvolvement', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Digital Overload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.digitalOverload}</Label>
                <span className={`text-sm font-bold ${data.digitalOverload <= 3 ? 'text-green-500' : data.digitalOverload <= 6 ? 'text-yellow-500' : 'text-red-500'}`}>{data.digitalOverload}</span>
              </div>
              <input type="range" min={1} max={10} value={data.digitalOverload}
                onChange={e => setField('digitalOverload', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Overall Satisfaction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.overallSatisfaction}</Label>
                <span className={`text-sm font-bold ${data.overallSatisfaction >= 7 ? 'text-green-500' : data.overallSatisfaction >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.overallSatisfaction}</span>
              </div>
              <input type="range" min={1} max={10} value={data.overallSatisfaction}
                onChange={e => setField('overallSatisfaction', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            {/* Purpose in Life */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{et.purposeInLife}</Label>
                <span className={`text-sm font-bold ${data.purposeInLife >= 7 ? 'text-green-500' : data.purposeInLife >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{data.purposeInLife}</span>
              </div>
              <input type="range" min={1} max={10} value={data.purposeInLife}
                onChange={e => setField('purposeInLife', Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-500" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('work')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-violet-500 hover:bg-violet-600">
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
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-violet-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* Score breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.supportLabel}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{results.supportScore.toFixed(1)}/3</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.workLabel}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{results.workScore.toFixed(1)}/2</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.lonelinessLabel}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{results.lonelinessScore.toFixed(1)}/2.5</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.communityLabel}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{results.communityScore.toFixed(1)}/1</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center col-span-2">
                <p className="text-xs text-muted-foreground mb-1">{et.purposeLabel}</p>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{results.purposeScore.toFixed(1)}/1</p>
              </div>
            </div>

            {data.digitalOverload >= 7 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.digitalOverloadWarning}
                </p>
              </div>
            )}

            {(data.lonelinessFrequency >= 9 && data.isolationLevel >= 8) && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {et.lonelinessUrgentWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('loneliness')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              {!isAuthenticated ? (
                <p className="text-sm text-amber-500">Please log in to generate and save reports.</p>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}
                  className="gap-2 bg-violet-500 hover:bg-violet-600">
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
