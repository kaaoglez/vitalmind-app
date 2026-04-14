'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { HeartPulse, Activity, BookOpen, ClipboardCheck, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import BiomarkersEvaluation from './BiomarkersEvaluation';

type SubTab = 'tools' | 'evaluation';

export default function Biomarkers() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('tools');

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'tools', icon: BookOpen, label: t.biomarkers.tabs.tools },
    { id: 'evaluation', icon: ClipboardCheck, label: t.biomarkers.tabs.evaluation },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <HeartPulse className="w-8 h-8 text-red-500" />
          {t.biomarkers.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.biomarkers.subtitle}</p>
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
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 shadow-sm'
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
        {activeTab === 'tools' && <BiomarkersTools />}
        {activeTab === 'evaluation' && <BiomarkersEvaluation />}
      </div>
    </div>
  );
}

// ─── Tools Sub-component ─────────────────────────────────────────

function BiomarkersTools() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Blood Pressure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartPulse className="w-5 h-5 text-red-500" />
            {t.biomarkers.bloodPressureTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.biomarkers.bloodPressureDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t.biomarkers.normalRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.bpNormalRange}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t.biomarkers.hypertensionRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.bpHypertensionRange}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                {t.biomarkers.bpTip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Glucose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-red-500" />
            {t.biomarkers.glucoseTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.biomarkers.glucoseDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t.biomarkers.normalRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.glucoseNormalRange}</p>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-1">{t.biomarkers.prediabetes}</p>
                <p className="text-sm text-foreground">{t.biomarkers.glucosePrediabetesRange}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t.biomarkers.diabetes}</p>
                <p className="text-sm text-foreground">{t.biomarkers.glucoseDiabetesRange}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                {t.biomarkers.glucoseTip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cholesterol */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartPulse className="w-5 h-5 text-orange-500" />
            {t.biomarkers.cholesterolTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.biomarkers.cholesterolDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t.biomarkers.desirableRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.cholesterolDesirableRange}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t.biomarkers.highRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.cholesterolHighRange}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                {t.biomarkers.cholesterolTip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heart Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-red-400" />
            {t.biomarkers.heartRateTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.biomarkers.heartRateDesc}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1">{t.biomarkers.normalRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.hrNormalRange}</p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">{t.biomarkers.abnormalRange}</p>
                <p className="text-sm text-foreground">{t.biomarkers.hrAbnormalRange}</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-foreground flex items-start gap-2">
                <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                {t.biomarkers.hrTip}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            {t.biomarkers.disclaimerTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t.biomarkers.disclaimerText}</p>
        </CardContent>
      </Card>
    </div>
  );
}
