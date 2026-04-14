'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dumbbell, AlertTriangle, TrendingUp, CheckCircle2, ChevronLeft,
  Star, Activity, ShieldAlert, Flame, Heart, Footprints, Timer, User,
} from 'lucide-react';

type EvalStep = 'ipaq' | 'indicators' | 'results';

interface IPAQData {
  vigorousDays: number;
  vigorousMin: number;
  moderateDays: number;
  moderateMin: number;
  walkingDays: number;
  walkingMin: number;
  sittingMin: number;
}

interface IndicatorData {
  dailySteps: number;
  cardioEndurance: number;
  muscularStrength: number;
  mobility: number;
  exerciseVariety: number;
  recoveryQuality: number;
  weeklyActiveDays: number;
}

interface PhysicalEvalData {
  ipaq: IPAQData;
  indicators: IndicatorData;
}

const defaultData: PhysicalEvalData = {
  ipaq: {
    vigorousDays: 0, vigorousMin: 0,
    moderateDays: 0, moderateMin: 0,
    walkingDays: 0, walkingMin: 0,
    sittingMin: 480,
  },
  indicators: {
    dailySteps: 5000,
    cardioEndurance: 5,
    muscularStrength: 5,
    mobility: 5,
    exerciseVariety: 5,
    recoveryQuality: 5,
    weeklyActiveDays: 3,
  },
};

interface ProfileData {
  restingHR: number;
  profileComplete: boolean;
}

function computeIPAQ(ipaq: IPAQData) {
  const vigorousMET = Math.round(ipaq.vigorousDays * ipaq.vigorousMin * 8);
  const moderateMET = Math.round(ipaq.moderateDays * ipaq.moderateMin * 4);
  const walkingMET = Math.round(ipaq.walkingDays * ipaq.walkingMin * 3.3);
  const totalMET = vigorousMET + moderateMET + walkingMET;

  let ipaqCategory = 'low';
  if (
    (ipaq.vigorousDays >= 3 && ipaq.vigorousMin >= 20) ||
    vigorousMET >= 1500 ||
    totalMET >= 3000
  ) {
    ipaqCategory = 'high';
  } else if (
    (ipaq.vigorousDays >= 3 && ipaq.vigorousMin >= 20) ||
    (ipaq.moderateDays + ipaq.walkingDays >= 5 && (ipaq.moderateMin + ipaq.walkingMin) >= 30) ||
    totalMET >= 600
  ) {
    ipaqCategory = 'moderate';
  }

  return { vigorousMET, moderateMET, walkingMET, totalMET, ipaqCategory };
}

function calcScore(d: PhysicalEvalData, restingHR: number) {
  const ipaq = computeIPAQ(d.ipaq);

  // IPAQ contribution (0-4 points)
  let ipaqPoints = 0;
  if (ipaq.ipaqCategory === 'high') ipaqPoints = 4;
  else if (ipaq.ipaqCategory === 'moderate') ipaqPoints = 2.5;
  else ipaqPoints = Math.min(ipaq.totalMET / 600, 1) * 1.5;

  // Daily steps (0-1.5 points)
  const stepsPoints = Math.min(d.indicators.dailySteps / 10000, 1) * 1.5;

  // Subjective indicators (0-3 points)
  const subjAvg = (
    d.indicators.cardioEndurance +
    d.indicators.muscularStrength +
    d.indicators.mobility +
    d.indicators.exerciseVariety +
    d.indicators.recoveryQuality
  ) / 5;
  const subjPoints = (subjAvg / 10) * 3;

  // Weekly active days (0-1 point)
  const activeDaysPoints = Math.min(d.indicators.weeklyActiveDays / 5, 1) * 1;

  // Sedentary penalty
  const sitting = d.ipaq.sittingMin;
  const sittingPenalty = sitting > 600 ? -0.5 : sitting > 480 ? 0 : Math.min((480 - sitting) / 480, 1) * 0.5;

  const raw = ipaqPoints + stepsPoints + subjPoints + activeDaysPoints + sittingPenalty;
  const score = Math.round(Math.min(10, Math.max(0, raw)));

  let riskLevel = 'good';
  if (ipaq.ipaqCategory === 'low' && score <= 2) riskLevel = 'urgent';
  else if (ipaq.ipaqCategory === 'low' || score <= 4) riskLevel = 'risk';
  else if (score <= 6 || sitting > 540) riskLevel = 'mild';
  if (restingHR > 90 && riskLevel === 'mild') riskLevel = 'risk';
  if (restingHR > 100) riskLevel = 'risk';

  return { score, riskLevel, ipaq };
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

function getIpaqCategoryInfo(cat: string, et: Record<string, string>) {
  const map: Record<string, { label: string; color: string }> = {
    high: { label: et.ipaqHigh, color: 'text-green-500' },
    moderate: { label: et.ipaqModerate, color: 'text-blue-500' },
    low: { label: et.ipaqLow, color: 'text-red-500' },
  };
  return map[cat] || map.low;
}

export default function PhysicalActivityEvaluation() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<EvalStep>('ipaq');
  const [data, setData] = useState<PhysicalEvalData>(defaultData);
  const [savedAssessments, setSavedAssessments] = useState<Record<string, unknown>[]>([]);
  const [viewReport, setViewReport] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const et = t.exerciseEval;

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/physical-activity-assessment').then(r => r.json()).then(d => {
      if (d.assessments) setSavedAssessments(d.assessments);
    }).catch(() => {});
    fetch('/api/user-profile').then(r => r.json()).then(d => {
      if (d.profile) {
        setProfileData({
          restingHR: d.profile.restingHR || 0,
          profileComplete: d.profile.profileComplete || false,
        });
      }
    }).catch(() => {});
  }, [isAuthenticated]);

  const restingHR = profileData?.restingHR || 0;
  const results = useMemo(() => calcScore(data, restingHR), [data, restingHR]);

  const setIpaq = (key: keyof IPAQData, v: number) => setData(prev => ({
    ...prev, ipaq: { ...prev.ipaq, [key]: v },
  }));

  const setIndicator = (key: keyof IndicatorData, v: number) => setData(prev => ({
    ...prev, indicators: { ...prev.indicators, [key]: v },
  }));

  const submit = async () => {
    setIsSubmitting(true);
    try {
      const body: Record<string, number> = {};
      (Object.keys(data.ipaq) as (keyof IPAQData)[]).forEach(k => {
        body[`ipaq${k.charAt(0).toUpperCase()}${k.slice(1)}`] = data.ipaq[k];
      });
      (Object.keys(data.indicators) as (keyof IndicatorData)[]).forEach(k => {
        body[k] = data.indicators[k];
      });

      const res = await fetch('/api/physical-activity-assessment', {
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
      }
    } catch { /* silent */ }
    setIsSubmitting(false);
  };

  // ─── REPORT VIEW ────────────────────────────────────────────────
  if (viewReport) {
    const a = viewReport;
    const score = Number(a.physicalScore) || 0;
    const risk = String(a.riskLevel) || 'good';
    const ri = getRiskInfo(risk, et);
    const ipaqCat = String(a.ipaqCategory) || 'low';
    const ipaqInfo = getIpaqCategoryInfo(ipaqCat, et);
    const totalMET = Number(a.totalMET) || 0;

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
                <Dumbbell className="w-8 h-8 text-primary" />
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

            {/* IPAQ Results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.ipaqCategoryLabel}</p>
                <p className={`text-lg font-bold ${ipaqInfo.color}`}>{ipaqInfo.label}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.totalMET}</p>
                <p className="text-lg font-bold text-foreground">{totalMET}</p>
                <p className="text-[10px] text-muted-foreground">{et.metWeek}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.dailyStepsLabel}</p>
                <p className={`text-lg font-bold ${Number(a.dailySteps) >= 7000 ? 'text-green-500' : Number(a.dailySteps) >= 4000 ? 'text-yellow-500' : 'text-red-500'}`}>{String(a.dailySteps)}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.weeklyActiveDays}</p>
                <p className={`text-lg font-bold ${Number(a.weeklyActiveDays) >= 5 ? 'text-green-500' : Number(a.weeklyActiveDays) >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>{String(a.weeklyActiveDays)}/7</p>
              </div>
            </div>

            {/* MET Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { key: 'vigorousMET', label: et.vigorousMET, val: Number(a.vigorousMET) || 0, color: 'text-red-400' },
                { key: 'moderateMET', label: et.moderateMET, val: Number(a.moderateMET) || 0, color: 'text-yellow-500' },
                { key: 'walkingMET', label: et.walkingMET, val: Number(a.walkingMET) || 0, color: 'text-green-500' },
              ].map(m => (
                <div key={m.key} className="p-3 rounded-xl border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <p className={`text-lg font-bold ${m.color}`}>{m.val}</p>
                </div>
              ))}
            </div>

            {/* Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                { key: 'cardioEndurance', label: et.indCardio },
                { key: 'muscularStrength', label: et.indStrength },
                { key: 'mobility', label: et.indMobility },
                { key: 'exerciseVariety', label: et.indVariety },
                { key: 'recoveryQuality', label: et.indRecovery },
                { key: 'ipaqSittingMin', label: et.indSitting, unit: et.minDay, inverse: true },
              ].map(ind => {
                const val = Number(a[ind.key]) || 0;
                const displayVal = ind.inverse ? Math.max(0, 600 - val) / 60 : val;
                return (
                  <div key={ind.key} className="p-3 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ind.label}</p>
                    <p className={`text-xl font-bold ${displayVal >= 7 ? 'text-green-500' : displayVal >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}{ind.unit ? ` ${ind.unit}` : ''}</p>
                  </div>
                );
              })}
            </div>

            {/* Resting HR from profile */}
            {Number(a.restingHR) > 0 && (
              <div className="p-4 rounded-xl border border-border text-center mb-6">
                <p className="text-xs text-muted-foreground mb-1">{et.restingHRFromProfile}</p>
                <p className={`text-2xl font-bold ${Number(a.restingHR) < 60 ? 'text-green-500' : Number(a.restingHR) <= 80 ? 'text-green-500' : Number(a.restingHR) <= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {Number(a.restingHR)} bpm
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Number(a.restingHR) <= 60 ? et.hrAthlete : Number(a.restingHR) <= 80 ? et.hrNormal : Number(a.restingHR) <= 90 ? et.hrElevated : et.hrHigh}
                </p>
              </div>
            )}

            {/* Clinical Recommendations */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> {et.clinicalRec}
              </h3>
              <ul className="space-y-2 text-sm">
                {ipaqCat === 'low' && (
                  <li className="flex items-start gap-2 text-red-600 dark:text-red-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recLowActivity}
                  </li>
                )}
                {Number(a.dailySteps) < 5000 && (
                  <li className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recSteps}
                  </li>
                )}
                {Number(a.muscularStrength) <= 4 && (
                  <li className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recStrength}
                  </li>
                )}
                {Number(a.cardioEndurance) <= 4 && (
                  <li className="flex items-start gap-2 text-emerald-600 dark:text-emerald-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recCardio}
                  </li>
                )}
                {Number(a.ipaqSittingMin) > 480 && (
                  <li className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recSedentary}
                  </li>
                )}
                {Number(a.mobility) <= 4 && (
                  <li className="flex items-start gap-2 text-teal-600 dark:text-teal-400">
                    <Star className="w-3 h-3 mt-1 flex-shrink-0" /> {et.recMobility}
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
      {savedAssessments.length > 0 && step === 'ipaq' && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-foreground mb-3">{et.previousEvals}</h3>
            <div className="space-y-2">
              {savedAssessments.slice(0, 5).map((a: Record<string, unknown>, i) => (
                <button key={i} onClick={() => setViewReport(a)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${Number(a.physicalScore) >= 7 ? 'bg-green-500' : Number(a.physicalScore) >= 5 ? 'bg-blue-500' : Number(a.physicalScore) >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {String(a.physicalScore)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(a.createdAt as string).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">MET: {String(a.totalMET)}/week</p>
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
        {(['ipaq', 'indicators', 'results'] as const).map((s, i) => {
          const isActive = step === s;
          const stepIdx = ['ipaq', 'indicators', 'results'].indexOf(step);
          const isDone = i < stepIdx;
          const labels = [et.stepIpaq, et.stepIndicators, et.stepResults];
          return (
            <button key={s} onClick={() => isDone && setStep(s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${isActive ? 'bg-primary/15 text-primary border border-primary/30' : isDone ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {labels[i]}
              {isDone && <CheckCircle2 className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {/* Profile Resting HR Card */}
      {step === 'ipaq' && profileData && profileData.restingHR > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Heart className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{et.restingHRFromProfile}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xl font-bold ${profileData.restingHR < 60 ? 'text-green-500' : profileData.restingHR <= 80 ? 'text-green-500' : profileData.restingHR <= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {profileData.restingHR} bpm
                  </span>
                  <span className={`text-xs font-medium ${profileData.restingHR <= 80 ? 'text-green-500' : profileData.restingHR <= 90 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {profileData.restingHR <= 60 ? et.hrAthlete : profileData.restingHR <= 80 ? et.hrNormal : profileData.restingHR <= 90 ? et.hrElevated : et.hrHigh}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No profile warning */}
      {step === 'ipaq' && (!profileData || profileData.restingHR === 0) && isAuthenticated && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">{et.noProfileData}</p>
          </div>
        </div>
      )}

      {/* ─── IPAQ Step ────────────────────────────────────────── */}
      {step === 'ipaq' && (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">{et.ipaqTitle}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{et.ipaqDesc}</p>

            {/* Vigorous Activity */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-500" /> {et.vigorousSection}
              </p>
              <p className="text-xs text-muted-foreground">{et.vigorousDesc}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{et.daysPerWeek}</Label>
                  <input type="number" min={0} max={7} value={data.ipaq.vigorousDays}
                    onChange={e => setIpaq('vigorousDays', Math.min(7, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{et.minPerDay}</Label>
                  <input type="number" min={0} max={480} value={data.ipaq.vigorousMin}
                    onChange={e => setIpaq('vigorousMin', Math.min(480, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
              </div>
            </div>

            {/* Moderate Activity */}
            <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-yellow-500" /> {et.moderateSection}
              </p>
              <p className="text-xs text-muted-foreground">{et.moderateDesc}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{et.daysPerWeek}</Label>
                  <input type="number" min={0} max={7} value={data.ipaq.moderateDays}
                    onChange={e => setIpaq('moderateDays', Math.min(7, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{et.minPerDay}</Label>
                  <input type="number" min={0} max={480} value={data.ipaq.moderateMin}
                    onChange={e => setIpaq('moderateMin', Math.min(480, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
              </div>
            </div>

            {/* Walking */}
            <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Footprints className="w-4 h-4 text-green-500" /> {et.walkingSection}
              </p>
              <p className="text-xs text-muted-foreground">{et.walkingDesc}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">{et.daysPerWeek}</Label>
                  <input type="number" min={0} max={7} value={data.ipaq.walkingDays}
                    onChange={e => setIpaq('walkingDays', Math.min(7, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{et.minPerDay}</Label>
                  <input type="number" min={0} max={480} value={data.ipaq.walkingMin}
                    onChange={e => setIpaq('walkingMin', Math.min(480, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
                </div>
              </div>
            </div>

            {/* Sitting */}
            <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Timer className="w-4 h-4 text-muted-foreground" /> {et.sittingSection}
              </p>
              <p className="text-xs text-muted-foreground">{et.sittingDesc}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={960} step={15} value={data.ipaq.sittingMin}
                    onChange={e => setIpaq('sittingMin', Number(e.target.value))}
                    className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                  <span className="text-sm font-bold w-24 text-right">{data.ipaq.sittingMin} {et.minDay}</span>
                </div>
              </div>
            </div>

            {/* IPAQ Summary */}
            <div className="text-center pt-2 border-t border-border space-y-1">
              <p className="text-sm text-muted-foreground">{et.ipaqSummary}: <span className="font-bold">{results.ipaq.totalMET} MET-{et.metWeek}</span></p>
              <p className="text-xs text-muted-foreground">
                {et.ipaqCategoryLabel}: <span className={`font-semibold ${getIpaqCategoryInfo(results.ipaq.ipaqCategory, et).color}`}>{getIpaqCategoryInfo(results.ipaq.ipaqCategory, et).label}</span>
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('indicators')} className="gap-2 bg-primary hover:bg-primary/90">
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
              <Dumbbell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">{et.indicatorsTitle}</h3>
            </div>

            {[
              { key: 'cardioEndurance' as const, label: et.indCardio, min: 1, max: 10 },
              { key: 'muscularStrength' as const, label: et.indStrength, min: 1, max: 10 },
              { key: 'mobility' as const, label: et.indMobility, min: 1, max: 10 },
              { key: 'exerciseVariety' as const, label: et.indVariety, min: 1, max: 10 },
              { key: 'recoveryQuality' as const, label: et.indRecovery, min: 1, max: 10 },
            ].map(ind => {
              const val = data.indicators[ind.key];
              return (
                <div key={ind.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{ind.label}</Label>
                    <span className={`text-sm font-bold ${val >= 7 ? 'text-green-500' : val >= 4 ? 'text-yellow-500' : 'text-red-500'}`}>{val}</span>
                  </div>
                  <input type="range" min={ind.min} max={ind.max} value={val}
                    onChange={e => setIndicator(ind.key, Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{ind.min}</span><span>{ind.max}</span>
                  </div>
                </div>
              );
            })}

            {/* Daily Steps */}
            <div className="space-y-2">
              <Label className="text-sm">{et.indSteps}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={20000} step={500} value={data.indicators.dailySteps}
                  onChange={e => setIndicator('dailySteps', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                <span className="text-sm font-bold w-24 text-right">{data.indicators.dailySteps.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span><span>10,000</span><span>20,000</span>
              </div>
            </div>

            {/* Weekly Active Days */}
            <div className="space-y-2">
              <Label className="text-sm">{et.indActiveDays}</Label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={7} value={data.indicators.weeklyActiveDays}
                  onChange={e => setIndicator('weeklyActiveDays', Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                <span className="text-sm font-bold w-16 text-right">{data.indicators.weeklyActiveDays}/7</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('ipaq')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={() => setStep('results')} className="gap-2 bg-primary hover:bg-primary/90">
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
              <span className={`text-5xl font-bold ${results.score >= 7 ? 'text-green-500' : results.score >= 5 ? 'text-blue-500' : results.score >= 3 ? 'text-yellow-500' : 'text-red-500'}`}>
                {results.score}
              </span>
              <span className="text-2xl text-muted-foreground">/10</span>
            </div>

            {/* IPAQ Category + MET */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.ipaqCategoryLabel}</p>
                <p className={`text-2xl font-bold ${getIpaqCategoryInfo(results.ipaq.ipaqCategory, et).color}`}>
                  {getIpaqCategoryInfo(results.ipaq.ipaqCategory, et).label}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.totalMET}</p>
                <p className="text-2xl font-bold text-foreground">{results.ipaq.totalMET}</p>
              </div>
            </div>

            {/* Weekly summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.vigorousMET}</p>
                <p className="text-lg font-bold text-red-400">{results.ipaq.vigorousMET}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.moderateMET}</p>
                <p className="text-lg font-bold text-yellow-500">{results.ipaq.moderateMET}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1">{et.walkingMET}</p>
                <p className="text-lg font-bold text-green-500">{results.ipaq.walkingMET}</p>
              </div>
            </div>

            {/* OMS compliance */}
            {(results.ipaq.vigorousDays * results.ipaq.vigorousMin + results.ipaq.moderateDays * results.ipaq.moderateMin) < 150 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {et.omsWarning}
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('indicators')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {et.prev}
              </Button>
              <Button onClick={submit} disabled={isSubmitting}
                className="gap-2 bg-primary hover:bg-primary/90">
                {isSubmitting ? et.saving : et.generateReport}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
