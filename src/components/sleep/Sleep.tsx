'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, setWellnessData, type WellnessData } from '@/lib/storage';
import { Moon, CheckCircle2, Circle, Clock, Thermometer, CloudMoon, BedDouble, Calculator, BookOpen, ClipboardCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import SleepEvaluation from './SleepEvaluation';

type SubTab = 'tools' | 'evaluation';

export default function Sleep() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('tools');
  const [data, setData] = useState<WellnessData>(() => getWellnessData());
  const [wakeTime, setWakeTime] = useState('07:00');
  const [showCalculator, setShowCalculator] = useState(false);

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'tools', icon: BookOpen, label: t.sleep.tabs.tools },
    { id: 'evaluation', icon: ClipboardCheck, label: t.sleep.tabs.evaluation },
  ];

  if (!data) return null;

  const toggleSleepAnswer = (index: number) => {
    const answers = [...data.sleepAnswers];
    answers[index] = !answers[index];
    const updated = { ...data, sleepAnswers: answers };
    setData(updated);
    setWellnessData(updated);
  };

  const calculateBedtimes = () => {
    const [h, m] = wakeTime.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(h, m, 0, 0);
    const results: { cycles: number; time: string; hours: string }[] = [];
    for (let c = 6; c >= 4; c--) {
      const bedTime = new Date(wakeDate.getTime() - c * 90 * 60000 - 15 * 60000);
      const hours = Math.floor((c * 90) / 60);
      const mins = (c * 90) % 60;
      results.push({
        cycles: c,
        time: bedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hours: `${hours}h ${mins > 0 ? mins + 'min' : ''}`,
      });
    }
    return results;
  };

  const sleepScore = data.sleepAnswers.length > 0
    ? Math.round((data.sleepAnswers.filter(a => !a).length / data.sleepAnswers.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Moon className="w-8 h-8 text-indigo-500" />
          {t.sleep.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.sleep.subtitle}</p>
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
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shadow-sm'
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
        {activeTab === 'tools' && (
          <SleepTools
            data={data}
            sleepScore={sleepScore}
            wakeTime={wakeTime}
            showCalculator={showCalculator}
            toggleSleepAnswer={toggleSleepAnswer}
            setWakeTime={setWakeTime}
            setShowCalculator={setShowCalculator}
            calculateBedtimes={calculateBedtimes}
          />
        )}
        {activeTab === 'evaluation' && <SleepEvaluation />}
      </div>
    </div>
  );
}

// ─── Tools Sub-component ─────────────────────────────────────────

function SleepTools({
  data, sleepScore, wakeTime, showCalculator,
  toggleSleepAnswer, setWakeTime, setShowCalculator, calculateBedtimes,
}: {
  data: WellnessData;
  sleepScore: number;
  wakeTime: string;
  showCalculator: boolean;
  toggleSleepAnswer: (index: number) => void;
  setWakeTime: (v: string) => void;
  setShowCalculator: (v: boolean) => void;
  calculateBedtimes: () => { cycles: number; time: string; hours: string }[];
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Sleep Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            {t.sleep.assessment}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.sleep.assessmentQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => toggleSleepAnswer(i)}
                className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all border border-transparent hover:border-border"
              >
                {data.sleepAnswers[i]
                  ? <CheckCircle2 className="w-5 h-5 text-wellness-rose mt-0.5 flex-shrink-0" />
                  : <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                }
                <span className="text-sm text-foreground">{q}</span>
              </button>
            ))}
            {data.sleepAnswers.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  Sleep Quality: {sleepScore}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sleep Hygiene Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BedDouble className="w-5 h-5 text-primary" />
            {t.sleep.hygiene}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.sleep.hygieneChecklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground">{item}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bedtime Routine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-wellness-lavender" />
            {t.sleep.bedtimeRoutine}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.sleep.routineSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl border border-border">
                <div className="w-12 h-12 rounded-xl bg-wellness-lavender/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-wellness-lavender">{step.time}</span>
                </div>
                <p className="text-sm text-foreground font-medium">{step.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Environment Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Thermometer className="w-5 h-5 text-wellness-emerald" />
            {t.sleep.environment}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.sleep.environmentTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <CloudMoon className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relaxation Techniques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Moon className="w-5 h-5 text-indigo-500" />
            {t.sleep.relaxation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.sleep.relaxationList.map((tech, i) => (
              <div key={i} className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-sm text-foreground">{tech}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sleep Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="w-5 h-5 text-wellness-amber" />
            {t.sleep.calculatorTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-muted-foreground">{t.sleep.wakeUpTime}:</label>
            <input
              type="time"
              value={wakeTime}
              onChange={e => setWakeTime(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
            />
          </div>
          <Button variant="outline" onClick={() => setShowCalculator(true)} className="mb-4">
            {t.sleep.calculate}
          </Button>
          {showCalculator && (
            <div className="space-y-3 fade-in">
              <p className="text-sm font-medium text-foreground">{t.sleep.idealBedtimes}:</p>
              {calculateBedtimes().map(result => (
                <div key={result.cycles} className="flex items-center justify-between p-3 rounded-xl border border-border">
                  <div>
                    <span className="text-lg font-bold text-indigo-500">{result.time}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{result.cycles} {t.sleep.sleepCycles}</p>
                    <p className="text-xs text-muted-foreground">{result.hours}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
