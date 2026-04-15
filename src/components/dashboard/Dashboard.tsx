'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { useDbHealth } from '@/hooks/useDbHealth';
import { getWellnessData, getTodayStr, getStorage, type WellnessData } from '@/lib/storage';
import type { Section } from '../WellnessApp';
import {
  Brain, Droplets, Moon, Activity, Smile, Droplet, Dumbbell,
  Sparkles, ChevronRight, TrendingUp, Trophy, Zap, Flame, Apple,
  Database, AlertTriangle,
} from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  type: string;
  name: string;
  duration?: number;
  calories?: number;
  caloriesBurned?: number;
  date: string;
  points: number;
  createdAt: number;
}

interface AreaSummary {
  areaKey: string;
  count: number;
  latestScore: number | null;
  latestRisk: string | null;
  avgScore: number;
  latestDate: string | null;
}

interface DashboardProps {
  onNavigate: (section: Section) => void;
}

const AREA_CONFIG: { key: string; icon: string; navKey: string; section: Section }[] = [
  { key: 'mental', icon: '🧠', navKey: 'mentalHealth', section: 'mentalHealth' },
  { key: 'nutrition', icon: '🥗', navKey: 'nutrition', section: 'nutrition' },
  { key: 'physical', icon: '🏃', navKey: 'exercise', section: 'exercise' },
  { key: 'hydration', icon: '💧', navKey: 'hydration', section: 'hydration' },
  { key: 'sleep', icon: '😴', navKey: 'sleep', section: 'sleep' },
  { key: 'biomarkers', icon: '🩺', navKey: 'biomarkers', section: 'biomarkers' },
  { key: 'habits', icon: '🍺', navKey: 'habits', section: 'habits' },
  { key: 'social', icon: '👥', navKey: 'social', section: 'social' },
  { key: 'prevention', icon: '🛡️', navKey: 'prevention', section: 'prevention' },
];

function getScoreColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 7) return 'text-green-500';
  if (score >= 5) return 'text-blue-500';
  if (score >= 3) return 'text-yellow-500';
  return 'text-red-500';
}

function getBarColor(score: number | null): string {
  if (score === null) return 'bg-muted';
  if (score >= 7) return 'bg-green-500';
  if (score >= 5) return 'bg-blue-500';
  if (score >= 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const dbHealth = useDbHealth(60000);
  const [data, setData] = useState<WellnessData>(() => getWellnessData());
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(() => getStorage<ActivityLogEntry[]>('profile-activity-log', []));
  const [profileScore, setProfileScore] = useState<{ totalPoints: number; todayPoints: number; level: string; levelName: string } | null>(null);
  const [areaSummary, setAreaSummary] = useState<AreaSummary[]>([]);

  // Load profile score from server
  useEffect(() => {
    const loadScore = async () => {
      try {
        const res = await fetch('/api/profile/score');
        if (res.ok) {
          const data = await res.json();
          setProfileScore(data);
        }
      } catch { /* silent */ }
    };
    loadScore();
  }, []);

  // Load assessment area summary from server
  const loadAreaSummary = useCallback(() => {
    if (!isAuthenticated) return;
    fetch('/api/assessments')
      .then(r => r.json())
      .then(d => {
        if (d.areaSummary) setAreaSummary(d.areaSummary);
      })
      .catch(() => { /* silent */ });
  }, [isAuthenticated]);

  useEffect(() => {
    loadAreaSummary();
  }, [loadAreaSummary]);

  const today = getTodayStr();
  const todayLog = useMemo(() => activityLog.filter(l => l.date === today), [activityLog, today]);
  const totalPoints = profileScore?.totalPoints ?? activityLog.reduce((sum, l) => sum + l.points, 0);
  const todayPoints = profileScore?.todayPoints ?? todayLog.reduce((sum, l) => sum + l.points, 0);
  const levelInfo = useMemo(() => {
    if (totalPoints < 50) return { name: t.profile.levelBeginner, icon: '\uD83C\uDF31', color: 'text-green-500' };
    if (totalPoints < 150) return { name: t.profile.levelActive, icon: '\u26A1', color: 'text-yellow-500' };
    if (totalPoints < 400) return { name: t.profile.levelFit, icon: '\uD83D\uDD25', color: 'text-orange-500' };
    if (totalPoints < 800) return { name: t.profile.levelWarrior, icon: '\uD83D\uDCAA', color: 'text-red-500' };
    return { name: t.profile.levelChampion, icon: '\uD83C\uDFC6', color: 'text-primary' };
  }, [totalPoints, t]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.greeting.morning;
    if (hour < 18) return t.dashboard.greeting.afternoon;
    return t.dashboard.greeting.evening;
  }, [t]);

  // Dynamic quotes/tips from DB, fallback to hardcoded translations
  const [dbTip, setDbTip] = useState<string | null>(null);
  const [dbQuote, setDbQuote] = useState<{ text: string; author: string | null } | null>(null);

  useEffect(() => {
    const lang = typeof window !== 'undefined' ? localStorage.getItem('zenvida-language') || 'es' : 'es';
    // Fetch daily tip
    fetch(`/api/quotes?category=tip&language=${lang}&random=true&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.quotes?.[0]?.text) setDbTip(d.quotes[0].text); })
      .catch(() => {});
    // Fetch motivational quote
    fetch(`/api/quotes?category=motivational&language=${lang}&random=true&limit=1`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.quotes?.[0]) setDbQuote({ text: d.quotes[0].text, author: d.quotes[0].author }); })
      .catch(() => {});
  }, [t]);

  const tipIndex = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % t.dashboard.tips.length;
  }, [t]);

  const quoteIndex = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % t.dashboard.quotes.length;
  }, [t]);

  if (!data) return null;

  const isToday = data.waterDate === getTodayStr();
  const waterCount = isToday ? data.waterGlasses : 0;
  const wellnessScore = Math.min(100, Math.round(
    (waterCount / 8) * 25 +
    (data.moodLogs.length > 0 ? 25 : 10) +
    (data.sleepAnswers.length > 0 ? 25 : 10) +
    (data.completedChallenges.length > 0 ? 25 : 10)
  ));

  const weekData = [
    { day: t.progress.daysOfWeek[0], value: 65 },
    { day: t.progress.daysOfWeek[1], value: 72 },
    { day: t.progress.daysOfWeek[2], value: 58 },
    { day: t.progress.daysOfWeek[3], value: 80 },
    { day: t.progress.daysOfWeek[4], value: 75 },
    { day: t.progress.daysOfWeek[5], value: 90 },
    { day: t.progress.daysOfWeek[6], value: wellnessScore },
  ];

  return (
    <div className="space-y-6">
      {/* Database Warning Banner */}
      {dbHealth.checked && !dbHealth.ok && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <Database className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Database Not Connected</p>
            <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1">
              {dbHealth.error || 'Reports and assessments cannot be saved. Run: npx prisma generate && npx prisma db push'}
            </p>
          </div>
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto" />
        </div>
      )}

      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting} 👋
          </h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.welcomeBack}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(languageToLocale(t), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Wellness Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wellness Score */}
        <div className="bg-gradient-to-br from-primary/10 to-wellness-lavender/10 rounded-2xl p-6 border border-primary/20 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">{t.dashboard.wellnessScore}</h3>
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8"
                strokeDasharray={`${(wellnessScore / 100) * 314} 314`}
                strokeLinecap="round"
                className="text-primary transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">{wellnessScore}%</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {wellnessScore >= 75 ? t.dashboard.good : wellnessScore >= 50 ? t.dashboard.fair : t.dashboard.needsWork}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {[
            { icon: Smile, label: t.dashboard.mood, value: data.moodLogs.length > 0 ? data.moodLogs[data.moodLogs.length - 1].mood : '—', color: 'text-wellness-lavender', bg: 'bg-wellness-lavender/10' },
            { icon: Moon, label: t.dashboard.sleep, value: data.sleepAnswers.length > 0 ? `${data.sleepAnswers.filter(a => !a).length}/5` : '—', color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: Droplets, label: t.dashboard.hydration, value: `${waterCount}/8`, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
            { icon: Activity, label: t.dashboard.activity, value: `${data.completedChallenges.length} ${t.challenges.completed.toLowerCase()}`, color: 'text-wellness-emerald', bg: 'bg-wellness-emerald/10' },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-2xl p-4 border border-border hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-lg font-bold text-foreground mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Tip + Quote */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-wellness-amber" />
            <h3 className="font-semibold text-foreground">{t.dashboard.dailyTip}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{dbTip || t.dashboard.tips[tipIndex]}</p>
        </div>
        <div className="bg-gradient-to-br from-wellness-lavender/10 to-wellness-purple/10 rounded-2xl p-5 border border-wellness-lavender/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-wellness-lavender" />
            <h3 className="font-semibold text-foreground">{t.dashboard.motivationalQuote}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            &ldquo;{dbQuote?.text || t.dashboard.quotes[quoteIndex]}&rdquo;
            {dbQuote?.author && <span className="block text-xs mt-1 not-italic text-muted-foreground/70">— {dbQuote.author}</span>}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">{t.dashboard.quickActions}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { icon: Smile, label: t.dashboard.logMood, section: 'mentalHealth' as Section, color: 'from-wellness-lavender/20 to-wellness-purple/20' },
            { icon: Brain, label: t.dashboard.startMeditation, section: 'mentalHealth' as Section, color: 'from-primary/20 to-wellness-emerald/20' },
            { icon: Droplet, label: t.dashboard.trackWater, section: 'hydration' as Section, color: 'from-cyan-500/20 to-blue-500/20' },
            { icon: Trophy, label: t.profile.logActivity, section: 'profile' as Section, color: 'from-amber-500/20 to-orange-500/20' },
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate(action.section)}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-4 border border-border hover:shadow-md transition-all flex items-center justify-between group`}
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-5 h-5 text-foreground" />
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* Health Assessment Scores */}
      {isAuthenticated && (
        <div>
          <h3 className="font-semibold text-foreground mb-3">{t.dashboard.wellnessScore}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {AREA_CONFIG.map(area => {
              const summary = areaSummary.find(s => s.areaKey === area.key);
              const score = summary?.latestScore ?? null;
              const scoreColor = getScoreColor(score);
              const barColor = getBarColor(score);
              const barWidth = score !== null ? (score / 10) * 100 : 0;
              return (
                <button
                  key={area.key}
                  onClick={() => onNavigate(area.section)}
                  className="bg-card rounded-2xl p-4 border border-border hover:shadow-md transition-all flex flex-col items-center gap-2 group"
                >
                  <span className="text-2xl">{area.icon}</span>
                  <p className="text-xs text-muted-foreground font-medium text-center leading-tight">{(t.nav as Record<string, string>)[area.navKey]}</p>
                  <p className={`text-lg font-bold ${scoreColor}`}>
                    {score !== null ? `${score}/10` : '—'}
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Score Card */}
      {totalPoints > 0 && (
        <div
          className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 border border-amber-500/20 cursor-pointer hover:shadow-md transition-all"
          onClick={() => onNavigate('profile')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-2xl">
                {levelInfo.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {levelInfo.name}
                </h3>
                <p className="text-sm text-muted-foreground">{t.profile.totalPoints}: {totalPoints} pts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-500">+{todayPoints}</p>
              <p className="text-xs text-muted-foreground">{t.profile.today}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">{t.dashboard.weeklyProgress}</h3>
          </div>
        </div>
        <div className="flex items-end gap-2 h-32">
          {weekData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-lg bg-primary/20 relative" style={{ height: `${d.value}%` }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-lg bg-primary transition-all duration-700"
                  style={{ height: '100%' }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function languageToLocale(t: ReturnType<typeof useLanguage>['t']): string {
  const lang = typeof window !== 'undefined' ? localStorage.getItem('zenvida-language') : 'es';
  const locales: Record<string, string> = { es: 'es-ES', en: 'en-US', pt: 'pt-BR', fr: 'fr-FR', zh: 'zh-CN' };
  return locales[lang || 'es'] || 'es-ES';
}
