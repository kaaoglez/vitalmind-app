'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  User, Ruler, Weight, Cigarette, Wine, Heart,
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Activity, Droplets,
} from 'lucide-react';

interface ProfileData {
  age: number;
  gender: string;
  weight: number;
  height: number;
  smoking: string;
  alcoholFreq: string;
  systolicBP: number | null;
  diastolicBP: number | null;
  fastingGlucose: number | null;
  totalCholesterol: number | null;
  hdl: number | null;
  restingHR: number | null;
}

const defaultProfile: ProfileData = {
  age: 0,
  gender: '',
  weight: 0,
  height: 0,
  smoking: 'never',
  alcoholFreq: 'never',
  systolicBP: null,
  diastolicBP: null,
  fastingGlucose: null,
  totalCholesterol: null,
  hdl: null,
  restingHR: null,
};

type OnboardingStep = 'welcome' | 'basic' | 'habits' | 'clinical' | 'complete';

interface UserProfileProps {
  onComplete?: () => void;
  embedded?: boolean; // If true, renders inside a section; if false, renders as modal/overlay
}

export default function UserProfile({ onComplete, embedded = false }: UserProfileProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [data, setData] = useState<ProfileData>(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [existingProfile, setExistingProfile] = useState<Record<string, unknown> | null>(null);
  const pt = t.userProfile;

  // Calculate BMI with useMemo (no setState in effect)
  const bmi = useMemo(() => {
    if (data.weight > 0 && data.height > 0) {
      const heightM = data.height / 100;
      return Math.round((data.weight / (heightM * heightM)) * 10) / 10;
    }
    return 0;
  }, [data.weight, data.height]);

  // Load existing profile
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/user-profile')
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setExistingProfile(d.profile);
          const p = d.profile;
          setData({
            age: Number(p.age) || 0,
            gender: String(p.gender || ''),
            weight: Number(p.weight) || 0,
            height: Number(p.height) || 0,
            smoking: String(p.smoking || 'never'),
            alcoholFreq: String(p.alcoholFreq || 'never'),
            systolicBP: p.systolicBP != null ? Number(p.systolicBP) : null,
            diastolicBP: p.diastolicBP != null ? Number(p.diastolicBP) : null,
            fastingGlucose: p.fastingGlucose != null ? Number(p.fastingGlucose) : null,
            totalCholesterol: p.totalCholesterol != null ? Number(p.totalCholesterol) : null,
            hdl: p.hdl != null ? Number(p.hdl) : null,
            restingHR: p.restingHR != null ? Number(p.restingHR) : null,
          });

          // If profile is complete, go to complete view
          if (p.onboardingDone) {
            setStep('complete');
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const steps: OnboardingStep[] = ['welcome', 'basic', 'habits', 'clinical', 'complete'];
  const currentStepIndex = steps.indexOf(step);
  const progressPct = (currentStepIndex / (steps.length - 1)) * 100;

  const isBasicValid = data.age > 0 && data.gender !== '' && data.weight > 0 && data.height > 0;
  const isHabitsValid = data.smoking !== '' && data.alcoholFreq !== '';

  const save = async () => {
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        smoking: data.smoking,
        alcoholFreq: data.alcoholFreq,
      };
      if (data.systolicBP != null) body.systolicBP = data.systolicBP;
      if (data.diastolicBP != null) body.diastolicBP = data.diastolicBP;
      if (data.fastingGlucose != null) body.fastingGlucose = data.fastingGlucose;
      if (data.totalCholesterol != null) body.totalCholesterol = data.totalCholesterol;
      if (data.hdl != null) body.hdl = data.hdl;
      if (data.restingHR != null) body.restingHR = data.restingHR;

      const res = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const result = await res.json();
        setExistingProfile(result.profile);
        setStep('complete');
        onComplete?.();
      }
    } catch {
      // Silent
    }
    setIsSaving(false);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi === 0) return { label: '', color: '' };
    if (bmi < 18.5) return { label: pt.bmiUnderweight, color: 'text-blue-500' };
    if (bmi < 25) return { label: pt.bmiNormal, color: 'text-green-500' };
    if (bmi < 30) return { label: pt.bmiOverweight, color: 'text-yellow-500' };
    return { label: pt.bmiObese, color: 'text-red-500' };
  };

  const bmiCategory = getBMICategory(bmi);

  // ==================== COMPLETE VIEW ====================
  if (step === 'complete' && existingProfile) {
    return (
      <div className={embedded ? 'space-y-6' : 'space-y-6'}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">{pt.profileComplete}</h2>
              <p className="text-sm text-muted-foreground">{pt.profileCompleteDesc}</p>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">{pt.age}</p>
                <p className="text-lg font-bold text-foreground">{data.age}</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">{pt.gender}</p>
                <p className="text-lg font-bold text-foreground">
                  {data.gender === 'male' ? pt.male : data.gender === 'female' ? pt.female : data.gender === 'other' ? pt.other : pt.preferNotToSay}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">{pt.weight}</p>
                <p className="text-lg font-bold text-foreground">{data.weight} kg</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">{pt.height}</p>
                <p className="text-lg font-bold text-foreground">{data.height} cm</p>
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">BMI</p>
                <p className={`text-lg font-bold ${bmiCategory.color}`}>{bmi || '—'}</p>
                {bmiCategory.label && <p className={`text-xs ${bmiCategory.color}`}>{bmiCategory.label}</p>}
                {bmi >= 25 && data.height > 0 && (() => {
                  const heightM = data.height / 100;
                  const healthyWeight = 25 * heightM * heightM;
                  const kgOver = data.weight - healthyWeight;
                  return kgOver > 0 ? <p className={`text-xs font-semibold ${bmiCategory.color}`}>+{kgOver.toFixed(1)} kg</p> : null;
                })()}
              </div>
              <div className="p-3 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground">{pt.smoking}</p>
                <p className="text-sm font-bold text-foreground">
                  {data.smoking === 'never' ? pt.smokeNever : data.smoking === 'former' ? pt.smokeFormer : pt.smokeCurrent}
                </p>
              </div>
            </div>

            {/* Clinical data if available */}
            {(data.systolicBP || data.fastingGlucose || data.totalCholesterol) && (
              <div className="mt-4">
                <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> {pt.clinicalData}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {data.systolicBP && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.systolicBP}</p>
                      <p className="text-lg font-bold text-foreground">{data.systolicBP}</p>
                    </div>
                  )}
                  {data.diastolicBP && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.diastolicBP}</p>
                      <p className="text-lg font-bold text-foreground">{data.diastolicBP}</p>
                    </div>
                  )}
                  {data.fastingGlucose && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.fastingGlucose}</p>
                      <p className="text-lg font-bold text-foreground">{data.fastingGlucose}</p>
                    </div>
                  )}
                  {data.totalCholesterol && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.totalCholesterol}</p>
                      <p className="text-lg font-bold text-foreground">{data.totalCholesterol}</p>
                    </div>
                  )}
                  {data.hdl && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.hdl}</p>
                      <p className="text-lg font-bold text-foreground">{data.hdl}</p>
                    </div>
                  )}
                  {data.restingHR && (
                    <div className="p-3 rounded-xl border border-border text-center">
                      <p className="text-xs text-muted-foreground">{pt.restingHR}</p>
                      <p className="text-lg font-bold text-foreground">{data.restingHR}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setStep('basic')} className="gap-2">
                {pt.editProfile}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== ONBOARDING WIZARD ====================
  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      {/* Progress bar */}
      {step !== 'welcome' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{pt.step} {currentStepIndex} / {steps.length - 1}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {/* WELCOME STEP */}
      {step === 'welcome' && (
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-wellness-teal to-wellness-emerald flex items-center justify-center mx-auto">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{pt.welcomeTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">{pt.welcomeDesc}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
              <div className="p-3 rounded-xl bg-primary/5 border border-border">
                <Ruler className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">{pt.basicInfo}</p>
              </div>
              <div className="p-3 rounded-xl bg-wellness-amber/10 border border-border">
                <Cigarette className="w-5 h-5 text-wellness-amber mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">{pt.habitsInfo}</p>
              </div>
              <div className="p-3 rounded-xl bg-wellness-lavender/10 border border-border">
                <Activity className="w-5 h-5 text-wellness-lavender mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">{pt.clinicalInfo}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" /> {pt.timeNote}
            </p>
            <Button onClick={() => setStep('basic')} className="bg-wellness-teal hover:bg-wellness-teal/90 gap-2 px-8">
              {pt.startOnboarding} <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* BASIC INFO STEP */}
      {step === 'basic' && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">{pt.basicInfoTitle}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{pt.age} *</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={data.age || ''}
                  onChange={e => setData(p => ({ ...p, age: Number(e.target.value) }))}
                  placeholder={pt.agePlaceholder}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{pt.gender} *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setData(p => ({ ...p, gender: g }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        data.gender === g
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      {g === 'male' ? pt.male : pt.female}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['other', 'preferNotToSay'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => setData(p => ({ ...p, gender: g }))}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        data.gender === g
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      {g === 'other' ? pt.other : pt.preferNotToSay}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{pt.weight} (kg) *</Label>
                <Input
                  type="number"
                  min={20}
                  max={300}
                  step={0.1}
                  value={data.weight || ''}
                  onChange={e => setData(p => ({ ...p, weight: Number(e.target.value) }))}
                  placeholder="70"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{pt.height} (cm) *</Label>
                <Input
                  type="number"
                  min={50}
                  max={250}
                  value={data.height || ''}
                  onChange={e => setData(p => ({ ...p, height: Number(e.target.value) }))}
                  placeholder="170"
                />
              </div>
            </div>

            {/* BMI Preview */}
            {bmi > 0 && (
              <div className="p-4 rounded-xl border border-border bg-primary/5 text-center space-y-1">
                <p className="text-xs text-muted-foreground">BMI</p>
                <p className={`text-2xl font-bold ${bmiCategory.color}`}>{bmi}</p>
                {bmiCategory.label && <p className={`text-sm font-medium ${bmiCategory.color}`}>{bmiCategory.label}</p>}
                {bmi >= 25 && data.height > 0 && (() => {
                  const heightM = data.height / 100;
                  const healthyWeight = 25 * heightM * heightM;
                  const kgOver = data.weight - healthyWeight;
                  return kgOver > 0 ? <p className={`text-xs font-semibold ${bmiCategory.color}`}>+{kgOver.toFixed(1)} kg over healthy range</p> : null;
                })()}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('welcome')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {pt.prev}
              </Button>
              <Button
                onClick={() => setStep('habits')}
                disabled={!isBasicValid}
                className="gap-2 bg-wellness-teal hover:bg-wellness-teal/90"
              >
                {pt.next} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* HABITS STEP */}
      {step === 'habits' && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Cigarette className="w-5 h-5 text-wellness-amber" />
              <h3 className="font-semibold text-foreground">{pt.habitsInfoTitle}</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Cigarette className="w-4 h-4" /> {pt.smoking} *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'never', label: pt.smokeNever },
                    { key: 'former', label: pt.smokeFormer },
                    { key: 'current', label: pt.smokeCurrent },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setData(p => ({ ...p, smoking: opt.key }))}
                      className={`px-3 py-3 rounded-xl text-xs font-medium transition-colors ${
                        data.smoking === opt.key
                          ? 'bg-wellness-amber/15 text-wellness-amber border border-wellness-amber/30'
                          : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Wine className="w-4 h-4" /> {pt.alcoholFreq} *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'never', label: pt.alcNever },
                    { key: 'occasional', label: pt.alcOccasional },
                    { key: 'weekly', label: pt.alcWeekly },
                    { key: 'daily', label: pt.alcDaily },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setData(p => ({ ...p, alcoholFreq: opt.key }))}
                      className={`px-3 py-3 rounded-xl text-xs font-medium transition-colors ${
                        data.alcoholFreq === opt.key
                          ? 'bg-wellness-amber/15 text-wellness-amber border border-wellness-amber/30'
                          : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('basic')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {pt.prev}
              </Button>
              <Button
                onClick={() => setStep('clinical')}
                disabled={!isHabitsValid}
                className="gap-2 bg-wellness-teal hover:bg-wellness-teal/90"
              >
                {pt.next} <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CLINICAL DATA STEP (Optional - Capa 3) */}
      {step === 'clinical' && (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-wellness-lavender" />
              <h3 className="font-semibold text-foreground">{pt.clinicalInfoTitle}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{pt.clinicalInfoDesc}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">{pt.systolicBP} (mmHg)</Label>
                <Input
                  type="number"
                  min={60}
                  max={250}
                  value={data.systolicBP ?? ''}
                  onChange={e => setData(p => ({ ...p, systolicBP: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="120"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{pt.diastolicBP} (mmHg)</Label>
                <Input
                  type="number"
                  min={40}
                  max={150}
                  value={data.diastolicBP ?? ''}
                  onChange={e => setData(p => ({ ...p, diastolicBP: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{pt.fastingGlucose} (mg/dL)</Label>
                <Input
                  type="number"
                  min={40}
                  max={500}
                  value={data.fastingGlucose ?? ''}
                  onChange={e => setData(p => ({ ...p, fastingGlucose: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="90"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{pt.totalCholesterol} (mg/dL)</Label>
                <Input
                  type="number"
                  min={50}
                  max={500}
                  value={data.totalCholesterol ?? ''}
                  onChange={e => setData(p => ({ ...p, totalCholesterol: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{pt.hdl} (mg/dL)</Label>
                <Input
                  type="number"
                  min={20}
                  max={100}
                  value={data.hdl ?? ''}
                  onChange={e => setData(p => ({ ...p, hdl: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">{pt.restingHR} (bpm)</Label>
                <Input
                  type="number"
                  min={30}
                  max={200}
                  value={data.restingHR ?? ''}
                  onChange={e => setData(p => ({ ...p, restingHR: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="70"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{pt.clinicalDisclaimer}</p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep('habits')} className="gap-2">
                <ChevronLeft className="w-4 h-4" /> {pt.prev}
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={save} disabled={isSaving}>
                  {pt.skipClinical}
                </Button>
                <Button
                  onClick={save}
                  disabled={isSaving}
                  className="gap-2 bg-wellness-teal hover:bg-wellness-teal/90"
                >
                  {isSaving ? pt.saving : pt.saveAndFinish} <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
