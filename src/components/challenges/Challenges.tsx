'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, setWellnessData, type WellnessData } from '@/lib/storage';
import { Target, Flame, Trophy, Dumbbell, Brain, Users, Apple, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function Challenges() {
  const { t } = useLanguage();
  const [data, setData] = useState<WellnessData>(() => getWellnessData());

  if (!data) return null;

  const toggleChallenge = (name: string) => {
    const completed = data.completedChallenges.includes(name)
      ? data.completedChallenges.filter(c => c !== name)
      : [...data.completedChallenges, name];
    setData({ ...data, completedChallenges: completed });
    setWellnessData({ ...data, completedChallenges: completed });
  };

  const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    physical: { icon: Dumbbell, color: 'text-wellness-emerald', bg: 'bg-wellness-emerald/10' },
    mental: { icon: Brain, color: 'text-wellness-lavender', bg: 'bg-wellness-lavender/10' },
    social: { icon: Users, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    nutritional: { icon: Apple, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  };

  // 30-day challenge calendar
  const today = new Date().getDate();
  const challengeDays = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    completed: i < today && i < data.completedChallenges.length + 1,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Target className="w-8 h-8 text-wellness-amber" />
          {t.challenges.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.challenges.subtitle}</p>
      </div>

      {/* 30-Day Challenge */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="w-5 h-5 text-wellness-rose" />
            {t.challenges.dayChallenge}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">{data.completedChallenges.length}</p>
              <p className="text-xs text-muted-foreground">{t.challenges.completed}</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-wellness-amber">{data.challengeStreak}</p>
              <p className="text-xs text-muted-foreground">{t.challenges.streak} {t.challenges.days}</p>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-1.5">
            {challengeDays.map(d => (
              <div
                key={d.day}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  d.completed
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : d.day === today
                      ? 'bg-wellness-amber/20 text-wellness-amber border border-wellness-amber/30'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {d.day}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mini Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            {t.challenges.miniChallenges}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.challenges.miniChallengesList.map((challenge, i) => {
              const config = typeConfig[challenge.type] || typeConfig.physical;
              const Icon = config.icon;
              const isCompleted = data.completedChallenges.includes(challenge.name);

              return (
                <button
                  key={i}
                  onClick={() => toggleChallenge(challenge.name)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    isCompleted ? 'bg-primary/5 border-primary/30' : 'border-border hover:bg-accent/5'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? 'text-primary line-through' : 'text-foreground'}`}>
                      {challenge.name}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {challenge.type === 'physical' ? t.challenges.physical
                        : challenge.type === 'mental' ? t.challenges.mental
                        : challenge.type === 'social' ? t.challenges.social
                        : t.challenges.nutritional}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">+{challenge.points} pts</Badge>
                    {isCompleted
                      ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    }
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-wellness-amber" />
            {t.challenges.badges}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {t.challenges.badgesList.map((badge, i) => {
              const earned = i === 0 ? data.completedChallenges.length > 0
                : i === 1 ? data.challengeStreak >= 7
                : i === 2 ? data.challengeStreak >= 30
                : i === 3 ? data.completedChallenges.filter(c =>
                    t.challenges.miniChallengesList.some(ch => ch.name === c && ch.type === 'mental')
                  ).length >= 10
                : false;

              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    earned ? 'bg-wellness-amber/10 border-wellness-amber/30' : 'bg-muted/50 border-border opacity-60'
                  }`}
                >
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <p className="font-medium text-sm text-foreground">{badge.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{badge.desc}</p>
                  {earned && <Badge className="mt-2 text-xs">{t.challenges.completed}</Badge>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
