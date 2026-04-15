'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { useDbHealth } from '@/hooks/useDbHealth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, ChevronLeft, CheckCircle2, AlertTriangle, Activity,
  ShieldAlert, Filter, TrendingUp, Calendar, Printer, ClipboardList,
  Database, RefreshCw,
} from 'lucide-react';

interface AssessmentEntry {
  id: string;
  area: string;
  areaKey: string;
  score: number;
  riskLevel: string;
  createdAt: string;
  rawData: Record<string, unknown>;
}

interface AreaSummary {
  areaKey: string;
  count: number;
  latestScore: number | null;
  latestRisk: string | null;
  avgScore: number;
  latestDate: string | null;
}

const AREA_COLORS: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  mental: { bg: 'bg-lavender-500/10', text: 'text-purple-500', border: 'border-purple-500/30', icon: '🧠' },
  nutrition: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', icon: '🥗' },
  physical: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', icon: '🏃' },
  hydration: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30', icon: '💧' },
  sleep: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/30', icon: '😴' },
  biomarkers: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/30', icon: '🩺' },
  habits: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30', icon: '🍺' },
  social: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30', icon: '👥' },
  prevention: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/30', icon: '🛡️' },
  comprehensive: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', icon: '📋' },
};

function getRiskInfo(risk: string, rt: Record<string, string>) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    good: { label: rt.riskGood, color: 'text-green-500', icon: <CheckCircle2 className="w-5 h-5" /> },
    mild: { label: rt.riskMild, color: 'text-blue-500', icon: <Activity className="w-5 h-5" /> },
    risk: { label: rt.riskAtRisk, color: 'text-yellow-500', icon: <AlertTriangle className="w-5 h-5" /> },
    urgent: { label: rt.riskUrgent, color: 'text-red-500', icon: <ShieldAlert className="w-5 h-5" /> },
  };
  return map[risk] || map.good;
}

export default function Reports() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [assessments, setAssessments] = useState<AssessmentEntry[]>([]);
  const [areaSummary, setAreaSummary] = useState<AreaSummary[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [viewReport, setViewReport] = useState<AssessmentEntry | null>(null);
  const [loading, setLoading] = useState(() => !isAuthenticated ? false : true);
  const [total, setTotal] = useState(0);

  const rt = t.reports;
  const dbHealth = useDbHealth();

  const loadAssessments = React.useCallback(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetch('/api/assessments')
      .then(r => r.json())
      .then(d => {
        if (d.assessments) setAssessments(d.assessments);
        if (d.areaSummary) setAreaSummary(d.areaSummary);
        if (d.total) setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssessments();
  }, [loadAssessments]);

  const filtered = selectedArea === 'all'
    ? assessments
    : assessments.filter(a => a.areaKey === selectedArea);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // ─── DATABASE DISCONNECTED BANNER ────────────────────
  const DbBanner = () => {
    if (dbHealth.checked && !dbHealth.ok) {
      return (
        <Card className="border-red-500/30 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">Database Not Connected</h3>
                <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">
                  {dbHealth.error || 'The database is unreachable. Reports cannot be saved or loaded.'}
                </p>
                <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/30 text-xs text-red-600 dark:text-red-300 space-y-1">
                  <p className="font-medium">To fix this, run in your terminal:</p>
                  <code className="block bg-black/10 dark:bg-white/10 px-2 py-1 rounded font-mono">npx prisma generate</code>
                  <code className="block bg-black/10 dark:bg-white/10 px-2 py-1 rounded font-mono">npx prisma db push</code>
                  <p className="mt-1">And make sure <code>.env</code> has <code>NEON_DATABASE_URL</code> set.</p>
                </div>
                <Button variant="outline" size="sm" onClick={dbHealth.recheck}
                  className="mt-2 gap-1.5 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
                  <RefreshCw className="w-3 h-3" /> Retry Connection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (dbHealth.checked && dbHealth.ok) {
      return (
        <div className="flex items-center gap-2 text-xs text-green-500">
          <Database className="w-3.5 h-3.5" />
          <span>DB Connected</span>
        </div>
      );
    }
    return null;
  };

  // ─── NOT AUTHENTICATED ───────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <FileText className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-foreground">{rt.loginRequired}</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">{rt.loginDesc}</p>
      </div>
    );
  }

  // ─── SINGLE REPORT VIEW ──────────────────────────────
  if (viewReport) {
    const a = viewReport.rawData;
    const ri = getRiskInfo(viewReport.riskLevel, rt);
    const colors = AREA_COLORS[viewReport.areaKey] || AREA_COLORS.comprehensive;
    const areaKey = viewReport.areaKey;

    // Build indicators based on area
    const getIndicators = () => {
      switch (areaKey) {
        case 'mental':
          return [
            { label: rt.phqScore || 'PHQ-9', value: a.phqScore },
            { label: rt.gadScore || 'GAD-7', value: a.gadScore },
            { label: rt.emotionReg || 'Emotional Regulation', value: a.emotionRegulation },
            { label: rt.socialRel || 'Social Relationships', value: a.socialRelationships },
            { label: rt.purpose || 'Purpose in Life', value: a.purposeInLife },
          ];
        case 'nutrition':
          return [
            { label: rt.dietQuality || 'Diet Quality', value: a.dietQuality },
            { label: rt.macroBalance || 'Macro Balance', value: a.macroBalance },
            { label: rt.fruitVeg || 'Fruit & Veg Servings', value: a.fruitVegServ },
            { label: rt.naturalPct || 'Natural Food %', value: a.naturalFoodPct ? `${a.naturalFoodPct}%` : null },
            { label: 'BMI', value: a.bmi ? Number(a.bmi).toFixed(1) : null },
          ];
        case 'physical':
          return [
            { label: rt.weeklyMin || 'Weekly Minutes', value: a.weeklyMinutes },
            { label: rt.cardioDays || 'Cardio Days/Week', value: a.cardioDays },
            { label: rt.strengthDays || 'Strength Days/Week', value: a.strengthDays },
            { label: rt.dailySteps || 'Daily Steps', value: a.dailySteps },
            { label: rt.restingHR || 'Resting HR', value: a.restingHR },
          ];
        case 'hydration':
          return [
            { label: rt.dailyLiters || 'Daily Liters', value: a.dailyLiters ? `${Number(a.dailyLiters).toFixed(1)}L` : null },
            { label: rt.urineColor || 'Urine Color', value: a.urineColor ? `${a.urineColor}/8` : null },
            { label: rt.intakeFreq || 'Intake Frequency', value: a.intakeFrequency },
            { label: rt.dehydrSigns || 'Dehydration Signs', value: a.dehydrationSigns },
          ];
        case 'sleep':
          return [
            { label: rt.sleepHours || 'Sleep Hours', value: a.sleepHours ? `${Number(a.sleepHours).toFixed(1)}h` : null },
            { label: rt.sleepQuality || 'Sleep Quality', value: a.sleepQuality },
            { label: rt.timeToFall || 'Time to Fall Asleep', value: a.timeToFallAsleep ? `${a.timeToFallAsleep} min` : null },
            { label: rt.circadian || 'Circadian Rhythm', value: a.circadianRegularity },
          ];
        case 'biomarkers':
          return [
            { label: 'Systolic BP', value: a.systolicBP ? `${a.systolicBP} mmHg` : null },
            { label: 'Diastolic BP', value: a.diastolicBP ? `${a.diastolicBP} mmHg` : null },
            { label: rt.fastingGlucose || 'Fasting Glucose', value: a.fastingGlucose ? `${a.fastingGlucose} mg/dL` : null },
            { label: rt.totalCholesterol || 'Total Cholesterol', value: a.totalCholesterol ? `${a.totalCholesterol} mg/dL` : null },
            { label: 'HDL', value: a.hdlCholesterol ? `${a.hdlCholesterol} mg/dL` : null },
          ];
        case 'habits':
          return [
            { label: rt.alcoholFreq || 'Alcohol Frequency', value: a.alcoholFrequency },
            { label: rt.smoking || 'Smoking', value: a.smokingStatus },
            { label: rt.screenTime || 'Screen Time', value: a.totalScreenTime ? `${a.totalScreenTime}h/day` : null },
            { label: rt.routineReg || 'Routine Regularity', value: a.routineRegularity },
          ];
        case 'social':
          return [
            { label: rt.emotSupport || 'Emotional Support', value: a.emotionalSupport },
            { label: rt.jobSatisf || 'Job Satisfaction', value: a.jobSatisfaction },
            { label: rt.loneliness || 'Loneliness', value: a.lonelinessFrequency },
            { label: rt.community || 'Community Involvement', value: a.communityInvolvement },
          ];
        case 'prevention':
          return [
            { label: rt.lastCheckup || 'Last Checkup', value: a.lastGeneralCheckup },
            { label: rt.vaccinesUpToDate || 'Vaccines Up to Date', value: a.vaccinationUpToDate ? '✓' : '✗' },
            { label: rt.cancerScreen || 'Cancer Screening', value: a.cancerScreeningUpToDate ? '✓' : '✗' },
            { label: rt.sunProtect || 'Sun Protection', value: a.sunProtection },
          ];
        default:
          return [];
      }
    };

    const indicators = getIndicators().filter(i => i.value !== null && i.value !== undefined && i.value !== '');

    // BMI overweight calculation
    const bmiVal = Number(a.bmi) || 0;
    const heightCm = Number(a.height) || 0;
    const weightKg = Number(a.weight) || 0;
    const heightM = heightCm / 100;
    let kgOver = 0;
    if (bmiVal >= 25 && heightM > 0 && weightKg > 0) {
      kgOver = weightKg - (25 * heightM * heightM);
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setViewReport(null)} className="gap-2">
            <ChevronLeft className="w-4 h-4" /> {rt.backToList}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="w-4 h-4" /> {rt.printReport}
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {/* Header */}
            <div className="text-center space-y-3 border-b border-border pb-6 mb-6">
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">{colors.icon}</span>
                <h1 className="text-2xl font-bold text-foreground">VitalMind</h1>
              </div>
              <h2 className="text-xl font-semibold text-foreground">{viewReport.area}</h2>
              <p className="text-sm text-muted-foreground">{rt.reportTitle}</p>
              <p className="text-xs text-muted-foreground">{formatDate(viewReport.createdAt)}</p>
            </div>

            {/* Score */}
            <div className="text-center space-y-3 mb-8">
              <div className="flex items-center justify-center gap-3">
                <span className={`text-5xl font-bold ${ri.color}`}>{viewReport.score}</span>
                <span className="text-2xl text-muted-foreground">/10</span>
              </div>
              <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${ri.color}`}>
                {ri.icon} {ri.label}
              </div>
              <div className="max-w-md mx-auto bg-muted rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${viewReport.riskLevel === 'good' ? 'bg-green-500' : viewReport.riskLevel === 'mild' ? 'bg-blue-500' : viewReport.riskLevel === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${(viewReport.score / 10) * 100}%` }} />
              </div>
            </div>

            {/* Indicators */}
            {indicators.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {indicators.map((ind, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border text-center">
                    <p className="text-xs text-muted-foreground mb-1">{ind.label}</p>
                    <p className="text-lg font-bold text-foreground">{String(ind.value)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* BMI overweight info */}
            {bmiVal >= 25 && kgOver > 0 && (
              <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 text-center mb-6">
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  BMI: {bmiVal.toFixed(1)} — +{kgOver.toFixed(1)} kg {rt.overHealthyRange || 'over healthy range'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {rt.healthyWeightRange || 'Healthy weight for your height'}: {(25 * heightM * heightM).toFixed(1)} kg
                </p>
              </div>
            )}

            {/* Clinical Notes */}
            <div className="border-t border-border pt-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> {rt.clinicalNotes || 'Clinical Notes'}
              </h3>
              <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{rt.assessmentDate}:</span> {formatDate(viewReport.createdAt)}
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{rt.areaLabel}:</span> {viewReport.area}
                </p>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{rt.scoreLabel}:</span> {viewReport.score}/10 — {ri.label}
                </p>
              </div>
              {viewReport.riskLevel !== 'good' && (
                <div className={`p-3 rounded-lg ${viewReport.riskLevel === 'urgent' ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50' : viewReport.riskLevel === 'risk' ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50' : 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50'}`}>
                  <p className={`text-sm flex items-center gap-2 ${viewReport.riskLevel === 'urgent' ? 'text-red-600 dark:text-red-400' : viewReport.riskLevel === 'risk' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    <AlertTriangle className="w-4 h-4" /> {rt.followUpRecommended || 'Follow-up with a healthcare professional is recommended.'}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground italic text-center">{rt.disclaimer || 'This report is for informational purposes only. Always consult a healthcare professional.'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── MAIN REPORTS LIST ───────────────────────────────
  return (
    <div className="space-y-6">
      {/* DB Status Banner */}
      <DbBanner />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{rt.title}</h1>
          <p className="text-sm text-muted-foreground">{rt.subtitle}</p>
        </div>
      </div>

      {/* Area Summary Cards */}
      {areaSummary.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {areaSummary.map(area => {
            const colors = AREA_COLORS[area.areaKey] || AREA_COLORS.comprehensive;
            const isActive = selectedArea === area.areaKey;
            return (
              <button key={area.areaKey} onClick={() => setSelectedArea(isActive ? 'all' : area.areaKey)}
                className={`p-2 rounded-xl border text-center transition-all ${isActive ? `${colors.bg} ${colors.border} ring-1 ring-current` : 'border-border hover:border-muted-foreground/30'}`}>
                <span className="text-lg">{colors.icon}</span>
                <p className={`text-xs font-bold mt-1 ${area.latestScore !== null ? colors.text : 'text-muted-foreground'}`}>
                  {area.latestScore !== null ? `${area.latestScore}/10` : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{area.areaKey}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button onClick={() => setSelectedArea('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedArea === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
            {rt.all} ({total})
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} {rt.results}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">{rt.noReports}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{rt.noReportsDesc}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(entry => {
            const colors = AREA_COLORS[entry.areaKey] || AREA_COLORS.comprehensive;
            const ri = getRiskInfo(entry.riskLevel, rt);
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Area Icon */}
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-xl">{colors.icon}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground truncate">{entry.area}</h3>
                        <div className={`flex items-center gap-1 text-xs font-medium ${ri.color}`}>
                          {React.cloneElement(ri.icon as React.ReactElement, { className: 'w-3 h-3' })} {ri.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-lg font-bold ${ri.color}`}>{entry.score}/10</span>
                        <div className="flex-1 max-w-32 bg-muted rounded-full h-2 overflow-hidden">
                          <div className={`h-full rounded-full ${entry.riskLevel === 'good' ? 'bg-green-500' : entry.riskLevel === 'mild' ? 'bg-blue-500' : entry.riskLevel === 'risk' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${(entry.score / 10) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* View button */}
                    <Button variant="outline" size="sm" onClick={() => setViewReport(entry)} className="gap-1.5 flex-shrink-0">
                      <FileText className="w-3.5 h-3.5" /> {rt.viewReport}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
