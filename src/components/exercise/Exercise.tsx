'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, setWellnessData, getWeekStr, type WellnessData } from '@/lib/storage';
import { Dumbbell, Timer, Brain, Footprints, StretchHorizontal, Activity, ClipboardCheck, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

import PhysicalActivityEvaluation from './PhysicalActivityEvaluation';

type SubTab = 'workouts' | 'evaluation';

export default function Exercise() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('workouts');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [data, setData] = useState<WellnessData>(() => getWellnessData());

  const addMinutes = (mins: number) => {
    if (!data) return;
    const currentWeek = getWeekStr();
    const minutes = data.exerciseWeek === currentWeek ? data.exerciseMinutes + mins : mins;
    const updated = { ...data, exerciseMinutes: minutes, exerciseWeek: currentWeek };
    setData(updated);
    setWellnessData(updated);
  };

  if (!data) return null;

  const currentWeek = getWeekStr();
  const weekMinutes = data.exerciseWeek === currentWeek ? data.exerciseMinutes : 0;
  const goalPercent = Math.min(100, (weekMinutes / 150) * 100);

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'workouts', icon: BookOpen, label: t.exercise.tabs.workouts },
    { id: 'evaluation', icon: ClipboardCheck, label: t.exercise.tabs.evaluation },
  ];

  const categories = [
    { id: 'all', label: t.exercise.categories },
    { id: 'cardio', label: t.exercise.cat.cardio },
    { id: 'strength', label: t.exercise.cat.strength },
    { id: 'flexibility', label: t.exercise.cat.flexibility },
    { id: 'yoga', label: t.exercise.cat.yoga },
  ];

  const filteredWorkouts = activeCategory === 'all'
    ? t.exercise.workouts
    : t.exercise.workouts.filter(w => w.cat === activeCategory);

  const catIcons: Record<string, React.ElementType> = {
    cardio: Activity,
    strength: Dumbbell,
    flexibility: StretchHorizontal,
    yoga: Brain,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Dumbbell className="w-8 h-8 text-primary" />
          {t.exercise.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.exercise.subtitle}</p>
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
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
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
        {activeTab === 'workouts' && (
          <ExerciseWorkouts
            weekMinutes={weekMinutes}
            goalPercent={goalPercent}
            addMinutes={addMinutes}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            filteredWorkouts={filteredWorkouts}
            catIcons={catIcons}
          />
        )}
        {activeTab === 'evaluation' && <PhysicalActivityEvaluation />}
      </div>
    </div>
  );
}

// ─── Workouts Sub-component ────────────────────────────────────────

function ExerciseWorkouts({
  weekMinutes, goalPercent, addMinutes,
  categories, activeCategory, setActiveCategory,
  filteredWorkouts, catIcons,
}: {
  weekMinutes: number;
  goalPercent: number;
  addMinutes: (m: number) => void;
  categories: { id: string; label: string }[];
  activeCategory: string;
  setActiveCategory: (v: string) => void;
  filteredWorkouts: { cat: string; name: string; desc: string; difficulty: string; duration: string }[];
  catIcons: Record<string, React.ElementType>;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Weekly Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Timer className="w-5 h-5 text-primary" />
            {t.exercise.weeklyGoal}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.exercise.minutesGoal}</span>
              <span className="font-bold text-foreground">{weekMinutes}/150 min</span>
            </div>
            <Progress value={goalPercent} className="h-3" />
            <div className="flex flex-wrap gap-2">
              {[10, 15, 20, 30].map(mins => (
                <Button key={mins} variant="outline" size="sm" onClick={() => addMinutes(mins)}>
                  +{mins} min
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-card text-muted-foreground border border-border hover:bg-accent/10'
            }`}
          >
            {typeof cat.label === 'string' ? cat.label : t.exercise.categories}
          </button>
        ))}
      </div>

      {/* Workout Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredWorkouts.map((workout, i) => {
          const Icon = catIcons[workout.cat] || Activity;
          return (
            <div key={i} className="p-4 rounded-xl border border-border hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">{workout.name}</h4>
                </div>
                <Badge variant="secondary" className="text-xs">{workout.difficulty}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{workout.desc}</p>
              <Badge variant="outline" className="text-xs">{workout.duration}</Badge>
            </div>
          );
        })}
      </div>

      {/* Desk Stretches */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <StretchHorizontal className="w-5 h-5 text-wellness-emerald" />
            {t.exercise.deskStretches}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.exercise.deskStretchesList.map((stretch, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <span className="w-6 h-6 rounded-full bg-wellness-emerald/10 text-wellness-emerald text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{stretch}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mental Benefits */}
      <Card className="bg-gradient-to-br from-primary/5 to-wellness-lavender/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-wellness-lavender" />
            {t.exercise.mentalBenefits}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.exercise.mentalBenefitsList.map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <div className="w-2 h-2 rounded-full bg-wellness-lavender mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Walking Challenge */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-wellness-emerald/10 flex items-center justify-center flex-shrink-0">
              <Footprints className="w-7 h-7 text-wellness-emerald" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t.exercise.walkingChallenge}</p>
              <p className="text-sm text-muted-foreground">{t.exercise.walkingGoal}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
