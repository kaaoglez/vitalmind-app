'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Beer, Cigarette, Smartphone, Clock, BookOpen, ClipboardCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import HabitsEvaluation from './HabitsEvaluation';

type SubTab = 'tools' | 'evaluation';

export default function Habits() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('tools');

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'tools', icon: BookOpen, label: t.habits.tabs.tools },
    { id: 'evaluation', icon: ClipboardCheck, label: t.habits.tabs.evaluation },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Beer className="w-8 h-8 text-amber-500" />
          {t.habits.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.habits.subtitle}</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm'
                  : 'bg-card text-muted-foreground border border-border hover:bg-accent/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="section-enter">
        {activeTab === 'tools' && <HabitsTools />}
        {activeTab === 'evaluation' && <HabitsEvaluation />}
      </div>
    </div>
  );
}

// ─── Tools Sub-component ─────────────────────────────────────────

function HabitsTools() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Alcohol Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Beer className="w-5 h-5 text-amber-500" />
            {t.habits.alcoholTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.habits.alcoholDesc}</p>
            <div className="space-y-2">
              {t.habits.alcoholGuidelines.map((guideline: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{guideline}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Smoking Cessation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Cigarette className="w-5 h-5 text-amber-500" />
            {t.habits.smokingTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.habits.smokingDesc}</p>
            <div className="space-y-2">
              {t.habits.smokingTips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Screen Time Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="w-5 h-5 text-amber-500" />
            {t.habits.screenTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.habits.screenDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t.habits.recommendedLimit}</p>
                <p className="text-sm text-foreground">{t.habits.screenRecommended}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t.habits.excessiveUse}</p>
                <p className="text-sm text-foreground">{t.habits.screenExcessive}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                {t.habits.screenTip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routine Building */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-amber-500" />
            {t.habits.routineTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.habits.routineDesc}</p>
            <div className="space-y-2">
              {t.habits.routineTips.map((tip: string, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            {t.habits.disclaimerTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.habits.disclaimerText}</p>
        </CardContent>
      </Card>
    </div>
  );
}
