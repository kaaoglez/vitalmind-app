'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, setWellnessData, getTodayStr, type WellnessData } from '@/lib/storage';
import { Droplets, Plus, Minus, Info, AlertTriangle, ClipboardCheck, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

import HydrationEvaluation from './HydrationEvaluation';

type SubTab = 'tracker' | 'evaluation';

export default function Hydration() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('tracker');
  const [data, setData] = useState<WellnessData>(() => getWellnessData());

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'tracker', icon: BookOpen, label: t.hydration.tabs.tracker },
    { id: 'evaluation', icon: ClipboardCheck, label: t.hydration.tabs.evaluation },
  ];

  if (!data) return null;

  const isToday = data.waterDate === getTodayStr();
  const glasses = isToday ? data.waterGlasses : 0;
  const progress = Math.min(100, (glasses / 8) * 100);

  const addGlass = () => {
    const today = getTodayStr();
    const currentGlasses = data.waterDate === today ? data.waterGlasses : 0;
    const updated = { ...data, waterGlasses: currentGlasses + 1, waterDate: today };
    setData(updated);
    setWellnessData(updated);
  };

  const removeGlass = () => {
    if (glasses <= 0) return;
    const updated = { ...data, waterGlasses: glasses - 1 };
    setData(updated);
    setWellnessData(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Droplets className="w-8 h-8 text-cyan-500" />
          {t.hydration.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.hydration.subtitle}</p>
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
                  ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-sm'
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
        {activeTab === 'tracker' && (
          <HydrationTracker
            glasses={glasses}
            progress={progress}
            addGlass={addGlass}
            removeGlass={removeGlass}
          />
        )}
        {activeTab === 'evaluation' && <HydrationEvaluation />}
      </div>
    </div>
  );
}

// ─── Tracker Sub-component ─────────────────────────────────────────

function HydrationTracker({
  glasses, progress, addGlass, removeGlass,
}: {
  glasses: number;
  progress: number;
  addGlass: () => void;
  removeGlass: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Water Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplets className="w-5 h-5 text-cyan-500" />
            {t.hydration.progress}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            <div className="grid grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    i < glasses
                      ? 'bg-cyan-500/20 border-2 border-cyan-500 shadow-sm'
                      : 'bg-muted border-2 border-border'
                  }`}
                >
                  <Droplets className={`w-6 h-6 ${i < glasses ? 'text-cyan-500' : 'text-muted-foreground/40'}`} />
                </div>
              ))}
            </div>

            <div className="text-center mb-4">
              <span className="text-4xl font-bold text-foreground">{glasses}</span>
              <span className="text-lg text-muted-foreground"> / 8 {t.hydration.glasses}</span>
            </div>

            <Progress value={progress} className="h-3 w-full max-w-md mb-4" />

            <div className="flex gap-3">
              <Button onClick={removeGlass} variant="outline" size="lg" disabled={glasses <= 0}>
                <Minus className="w-5 h-5 mr-1" />
                {t.hydration.removeGlass}
              </Button>
              <Button onClick={addGlass} size="lg" className="bg-cyan-500 hover:bg-cyan-600" disabled={glasses >= 12}>
                <Plus className="w-5 h-5 mr-1" />
                {t.hydration.addGlass}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">{t.hydration.goalOfGlasses}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="w-5 h-5 text-primary" />
            {t.hydration.tips}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.hydration.tipsList.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-cyan-500/5">
                <span className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dehydration Signs */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            {t.hydration.dehydration}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {t.hydration.dehydrationSigns.map((sign, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-sm text-foreground">{sign}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
