'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, type WellnessData } from '@/lib/storage';
import { BarChart3, TrendingUp, Brain, Droplets, Moon, Dumbbell, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress as ProgressBar } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function Progress() {
  const { t } = useLanguage();
  const [data, setData] = useState<WellnessData>(() => getWellnessData());

  if (!data) return null;

  const moodLogs = data.moodLogs;
  const moodCounts: Record<string, number> = {};
  moodLogs.forEach(log => {
    moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
  });

  const moodColors: Record<string, string> = {
    great: 'bg-green-500', good: 'bg-emerald-500', okay: 'bg-yellow-500',
    low: 'bg-orange-500', bad: 'bg-red-500',
  };

  const categories = [
    { key: 'mood', icon: Brain, color: 'text-wellness-lavender', bg: 'bg-wellness-lavender/10', value: moodLogs.length > 0 ? 75 : 30 },
    { key: 'sleep', icon: Moon, color: 'text-indigo-500', bg: 'bg-indigo-500/10', value: data.sleepAnswers.filter(a => !a).length > 3 ? 80 : 40 },
    { key: 'hydration', icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-500/10', value: Math.min(100, (data.waterGlasses / 8) * 100) },
    { key: 'exercise', icon: Dumbbell, color: 'text-wellness-emerald', bg: 'bg-wellness-emerald/10', value: Math.min(100, (data.exerciseMinutes / 150) * 100) },
    { key: 'meditation', icon: Wind, color: 'text-wellness-purple', bg: 'bg-wellness-purple/10', value: data.selfCareChecked.length > 0 ? 60 : 20 },
  ];

  // Generate weekly heatmap data
  const heatmapData = Array.from({ length: 7 }, () =>
    Array.from({ length: 4 }, () => Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          {t.progress.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.progress.subtitle}</p>
      </div>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            {t.progress.overview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {categories.map(cat => {
              const Icon = cat.icon;
              const label = t.progress.categories[cat.key as keyof typeof t.progress.categories];
              return (
                <div key={cat.key} className="text-center">
                  <div className={`w-12 h-12 rounded-xl ${cat.bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-6 h-6 ${cat.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-lg font-bold text-foreground">{Math.round(cat.value)}%</p>
                  <ProgressBar value={cat.value} className="h-1.5 mt-1" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Habit Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.progress.habitHeatmap}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.progress.daysOfWeek.map((day, dayIndex) => (
              <div key={dayIndex} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">{day}</span>
                <div className="flex gap-1 flex-1">
                  {heatmapData[dayIndex].map((val, weekIndex) => (
                    <div
                      key={weekIndex}
                      className={`flex-1 h-6 rounded transition-all ${
                        val === 0 ? 'bg-muted' :
                        val === 1 ? 'bg-primary/20' :
                        val === 2 ? 'bg-primary/40' :
                        'bg-primary/70'
                      }`}
                      title={`${day}: Level ${val}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-xs text-muted-foreground">Less</span>
            {[0, 1, 2, 3].map(level => (
              <div key={level} className={`w-4 h-4 rounded ${
                level === 0 ? 'bg-muted' :
                level === 1 ? 'bg-primary/20' :
                level === 2 ? 'bg-primary/40' :
                'bg-primary/70'
              }`} />
            ))}
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </CardContent>
      </Card>

      {/* Mood History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.progress.moodHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {moodLogs.length > 0 ? (
            <div className="space-y-2">
              {moodLogs.slice(-7).map((log, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${moodColors[log.mood] || 'bg-gray-400'}`} />
                  <span className="text-sm text-foreground flex-1">{log.mood}</span>
                  <span className="text-xs text-muted-foreground">{log.date}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">{t.common.noData}</p>
          )}
        </CardContent>
      </Card>

      {/* Goal Completion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.progress.goalCompletion}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map(cat => {
              const label = t.progress.categories[cat.key as keyof typeof t.progress.categories];
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{label}</span>
                    <span className="text-sm font-medium text-foreground">{Math.round(cat.value)}%</span>
                  </div>
                  <ProgressBar value={cat.value} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-br from-primary/5 to-wellness-lavender/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">{t.progress.insights}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-sm text-foreground">
                {data.moodLogs.length > 3
                  ? `${t.progress.averageMood}: ${data.moodLogs[data.moodLogs.length - 1].mood}`
                  : `${t.progress.areasToImprove}: ${t.progress.categories.mood}, ${t.progress.categories.meditation}`
                }
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-sm text-foreground">
                {t.progress.bestDay}: {t.progress.daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-sm text-foreground">
                {t.progress.completionRate}: {categories.reduce((acc, c) => acc + c.value, 0) / categories.length}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
