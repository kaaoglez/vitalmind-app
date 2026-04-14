'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getWellnessData, setWellnessData, type WellnessData } from '@/lib/storage';
import {
  Brain, Wind, Heart, BookOpen, ChevronRight, Play, Square,
  RotateCcw, AlertTriangle, Lightbulb, Smile, Meh, Frown,
  ThumbsUp, ThumbsDown, Sparkles, CheckCircle2, Circle,
  Flower2, Shield, ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import MentalEvaluation from './MentalEvaluation';

type SubTab = 'meditation' | 'stress' | 'emotional' | 'therapy' | 'evaluation';

export default function MentalHealth() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('meditation');

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'meditation', icon: Wind, label: t.mentalHealth.tabs.meditation },
    { id: 'stress', icon: Shield, label: t.mentalHealth.tabs.stress },
    { id: 'emotional', icon: Heart, label: t.mentalHealth.tabs.emotional },
    { id: 'therapy', icon: BookOpen, label: t.mentalHealth.tabs.therapy },
    { id: 'evaluation', icon: ClipboardCheck, label: t.mentalHealth.tabs.evaluation },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Brain className="w-8 h-8 text-wellness-lavender" />
          {t.mentalHealth.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.mentalHealth.subtitle}</p>
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
                  ? 'bg-wellness-lavender/15 text-wellness-lavender border border-wellness-lavender/30 shadow-sm'
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
        {activeTab === 'meditation' && <MeditationSection />}
        {activeTab === 'stress' && <StressSection />}
        {activeTab === 'emotional' && <EmotionalSection />}
        {activeTab === 'therapy' && <TherapySection />}
        {activeTab === 'evaluation' && <MentalEvaluation />}
      </div>
    </div>
  );
}

/* ==================== MEDITATION ==================== */
function MeditationSection() {
  const { t } = useLanguage();
  const [selectedPattern, setSelectedPattern] = useState<'478' | 'box' | 'calm'>('478');
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathScale, setBreathScale] = useState(0.6);
  const [breathCycle, setBreathCycle] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cycleRef = useRef(0);

  const patterns: Record<string, { inhale: number; hold: number; exhale: number }> = {
    '478': { inhale: 4000, hold: 7000, exhale: 8000 },
    box: { inhale: 4000, hold: 4000, exhale: 4000 },
    calm: { inhale: 5000, hold: 2000, exhale: 7000 },
  };

  const stopBreathing = useCallback(() => {
    setIsBreathing(false);
    setBreathPhase('inhale');
    setBreathScale(0.6);
    setBreathCycle(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const runBreathCycleRef = useRef<() => void>();

  const runBreathCycle = useCallback(() => {
    const p = patterns[selectedPattern];
    setBreathPhase('inhale');
    setBreathScale(1);
    timerRef.current = setTimeout(() => {
      setBreathPhase('hold');
      timerRef.current = setTimeout(() => {
        setBreathPhase('exhale');
        setBreathScale(0.6);
        timerRef.current = setTimeout(() => {
          setBreathCycle(prev => {
            const next = prev + 1;
            if (next < 4) {
              setTimeout(() => runBreathCycleRef.current?.(), 0);
            } else {
              stopBreathing();
            }
            return next;
          });
        }, p.exhale);
      }, p.hold);
    }, p.inhale);
  }, [selectedPattern, stopBreathing]);

  useEffect(() => {
    runBreathCycleRef.current = runBreathCycle;
  }, [runBreathCycle]);

  const startBreathing = useCallback(() => {
    setIsBreathing(true);
    setBreathCycle(0);
    runBreathCycleRef.current?.();
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const phaseText = breathPhase === 'inhale' ? t.mentalHealth.meditation.breathing.inhale
    : breathPhase === 'hold' ? t.mentalHealth.meditation.breathing.hold
    : t.mentalHealth.meditation.breathing.exhale;

  return (
    <div className="space-y-6">
      {/* Guided Meditations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flower2 className="w-5 h-5 text-primary" />
            {t.mentalHealth.meditation.guidedMeditations}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.mentalHealth.meditation.meditations.map((med, i) => (
              <div key={i} className="p-4 rounded-xl border border-border hover:shadow-md transition-all group cursor-pointer bg-gradient-to-br from-primary/5 to-wellness-lavender/5">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{med.name}</h4>
                  <Badge variant="secondary" className="text-xs">{med.duration} {t.mentalHealth.meditation.min}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{med.desc}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">{med.level}</Badge>
                  <button className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    {t.mentalHealth.meditation.startSession}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Breathing Exercise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wind className="w-5 h-5 text-wellness-lavender" />
            {t.mentalHealth.meditation.breathing.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.mentalHealth.meditation.breathing.selectPattern}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {(['478', 'box', 'calm'] as const).map(key => (
              <button
                key={key}
                onClick={() => { if (!isBreathing) setSelectedPattern(key); }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedPattern === key
                    ? 'border-wellness-lavender bg-wellness-lavender/10 shadow-sm'
                    : 'border-border hover:border-wellness-lavender/50'
                }`}
              >
                <p className="font-medium text-sm text-foreground">{t.mentalHealth.meditation.breathing.patterns[key].name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.mentalHealth.meditation.breathing.patterns[key].desc}</p>
              </button>
            ))}
          </div>

          {/* Animated Breathing Circle */}
          <div className="flex flex-col items-center py-8">
            <div
              className="w-40 h-40 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out"
              style={{
                transform: `scale(${breathScale})`,
                background: isBreathing
                  ? breathPhase === 'inhale' ? 'radial-gradient(circle, rgba(139,92,246,0.4), rgba(13,148,136,0.2))'
                    : breathPhase === 'hold' ? 'radial-gradient(circle, rgba(139,92,246,0.5), rgba(13,148,136,0.3))'
                    : 'radial-gradient(circle, rgba(139,92,246,0.2), rgba(13,148,136,0.1))'
                  : 'radial-gradient(circle, rgba(139,92,246,0.15), rgba(13,148,136,0.1))',
                boxShadow: isBreathing ? '0 0 40px rgba(139,92,246,0.3)' : 'none',
              }}
            >
              <div className="text-center">
                {isBreathing ? (
                  <>
                    <p className="text-lg font-bold text-wellness-lavender">{phaseText}</p>
                    <p className="text-xs text-muted-foreground mt-1">Ciclo {breathCycle + 1}/4</p>
                  </>
                ) : (
                  <Wind className="w-8 h-8 text-wellness-lavender/60" />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {!isBreathing ? (
                <Button onClick={startBreathing} className="bg-wellness-lavender hover:bg-wellness-lavender/90">
                  <Play className="w-4 h-4 mr-2" />
                  {t.mentalHealth.meditation.breathing.start}
                </Button>
              ) : (
                <Button onClick={stopBreathing} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  {t.mentalHealth.meditation.breathing.stop}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mindfulness Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-wellness-amber" />
            {t.mentalHealth.meditation.mindfulnessTips}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.mentalHealth.meditation.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5">
                <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Body Scan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-wellness-emerald" />
            {t.mentalHealth.meditation.bodyScanTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.mentalHealth.meditation.bodyScanSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors">
                <span className="w-6 h-6 rounded-full bg-wellness-emerald/10 text-wellness-emerald text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== STRESS ==================== */
function StressSection() {
  const { t } = useLanguage();
  const [data, setData] = useState<WellnessData>(() => getWellnessData());
  const [journalText, setJournalText] = useState('');
  const [saved, setSaved] = useState(false);

  const getStressLabel = (val: number) => {
    if (val <= 3) return t.mentalHealth.stress.low;
    if (val <= 5) return t.mentalHealth.stress.moderate;
    if (val <= 8) return t.mentalHealth.stress.high;
    return t.mentalHealth.stress.veryHigh;
  };

  const handleStressChange = (val: number[]) => {
    if (!data) return;
    const updated = { ...data, stressLevel: val[0] };
    setData(updated);
    setWellnessData(updated);
  };

  const handleSaveJournal = () => {
    if (!journalText.trim()) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setJournalText('');
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Stress Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-wellness-amber" />
            {t.mentalHealth.stress.assessment}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.mentalHealth.stress.assessmentDesc}</p>
          <div className="space-y-4">
            <Slider
              value={[data.stressLevel]}
              onValueChange={handleStressChange}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t.mentalHealth.stress.level}:</span>
              <Badge variant={data.stressLevel > 7 ? 'destructive' : data.stressLevel > 4 ? 'secondary' : 'default'}>
                {data.stressLevel}/10 — {getStressLabel(data.stressLevel)}
              </Badge>
            </div>
            <Progress value={(data.stressLevel / 10) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Coping Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-primary" />
            {t.mentalHealth.stress.copingStrategies}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.mentalHealth.stress.strategies.map((s, i) => (
              <div key={i} className="p-4 rounded-xl border border-border hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-foreground">{s.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progressive Muscle Relaxation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="w-5 h-5 text-wellness-emerald" />
            {t.mentalHealth.stress.muscleRelaxation}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.mentalHealth.stress.muscleSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/5 transition-colors">
                <span className="w-6 h-6 rounded-full bg-wellness-emerald/10 text-wellness-emerald text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Journal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-wellness-lavender" />
            {t.mentalHealth.stress.journaling}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {t.mentalHealth.stress.journalPrompts.map((prompt, i) => (
                <Badge key={i} variant="outline" className="cursor-pointer hover:bg-accent/10 text-xs">
                  {prompt}
                </Badge>
              ))}
            </div>
            <Textarea
              value={journalText}
              onChange={e => setJournalText(e.target.value)}
              placeholder={t.mentalHealth.stress.writeHere}
              className="min-h-[120px]"
            />
            <div className="flex items-center gap-3">
              <Button onClick={handleSaveJournal} disabled={!journalText.trim()}>
                {t.mentalHealth.stress.save}
              </Button>
              {saved && <span className="text-sm text-wellness-emerald font-medium"><CheckCircle2 className="w-4 h-4 inline mr-1" />Saved!</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Calm */}
      <Card className="border-wellness-rose/30 bg-wellness-rose/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-wellness-rose">
            <AlertTriangle className="w-5 h-5" />
            {t.mentalHealth.stress.emergencyCalm}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.mentalHealth.stress.emergencyTips.map((tip, i) => (
              <div key={i} className="p-3 rounded-xl bg-card border border-wellness-rose/20">
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== EMOTIONAL ==================== */
function EmotionalSection() {
  const { t } = useLanguage();
  const [data, setData] = useState<WellnessData>(() => getWellnessData());
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);

  const todaysAffirmation = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    return dayOfYear % t.mentalHealth.emotional.dailyAffirmations.length;
  }, [t]);

  const moodEmojis: { key: string; icon: React.ElementType; color: string }[] = [
    { key: 'great', icon: Smile, color: 'text-green-500' },
    { key: 'good', icon: ThumbsUp, color: 'text-emerald-500' },
    { key: 'okay', icon: Meh, color: 'text-yellow-500' },
    { key: 'low', icon: ThumbsDown, color: 'text-orange-500' },
    { key: 'bad', icon: Frown, color: 'text-red-500' },
  ];

  const handleMoodSelect = (moodKey: string) => {
    if (!data) return;
    const today = new Date().toISOString().split('T')[0];
    const newLog = { date: today, mood: moodKey, emotions: selectedEmotions };
    const existing = data.moodLogs.filter(l => l.date !== today);
    const updated = { ...data, moodLogs: [...existing, newLog] };
    setData(updated);
    setWellnessData(updated);
  };

  const toggleEmotion = (emo: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emo) ? prev.filter(e => e !== emo) : [...prev, emo]
    );
  };

  const toggleSelfCare = (item: string) => {
    if (!data) return;
    const updated = {
      ...data,
      selfCareChecked: data.selfCareChecked.includes(item)
        ? data.selfCareChecked.filter(i => i !== item)
        : [...data.selfCareChecked, item],
    };
    setData(updated);
    setWellnessData(updated);
  };

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Mood Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smile className="w-5 h-5 text-wellness-amber" />
            {t.mentalHealth.emotional.moodTracker}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t.mentalHealth.emotional.selectMood}</p>
          <div className="flex justify-center gap-4 mb-6">
            {moodEmojis.map(m => {
              const Icon = m.icon;
              const isSelected = data.moodLogs.length > 0 &&
                data.moodLogs[data.moodLogs.length - 1].mood === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => handleMoodSelect(m.key)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                    isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-accent/10'
                  }`}
                >
                  <Icon className={`w-8 h-8 ${m.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {t.mentalHealth.emotional.moods[m.key as keyof typeof t.mentalHealth.emotional.moods]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Emotion Wheel */}
          <h4 className="font-medium text-foreground mb-3">{t.mentalHealth.emotional.emotionWheel}</h4>
          <div className="flex flex-wrap gap-2">
            {t.mentalHealth.emotional.emotions.map(emo => (
              <button
                key={emo}
                onClick={() => toggleEmotion(emo)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedEmotions.includes(emo)
                    ? 'bg-wellness-lavender/20 text-wellness-lavender border border-wellness-lavender/40'
                    : 'bg-muted text-muted-foreground border border-transparent hover:border-border'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Affirmations */}
      <Card className="bg-gradient-to-br from-wellness-lavender/10 to-wellness-purple/10 border-wellness-lavender/20">
        <CardContent className="py-8">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-wellness-lavender mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-3">{t.mentalHealth.emotional.affirmations}</h3>
            <p className="text-lg text-foreground font-medium italic leading-relaxed">
              &ldquo;{t.mentalHealth.emotional.dailyAffirmations[todaysAffirmation]}&rdquo;
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cognitive Reframing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            {t.mentalHealth.emotional.reframingTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.mentalHealth.emotional.reframingSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-primary/5">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Self-Care Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-wellness-rose" />
            {t.mentalHealth.emotional.selfCare}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {t.mentalHealth.emotional.selfCareItems.map((item, i) => {
              const isChecked = data.selfCareChecked.includes(item);
              return (
                <button
                  key={i}
                  onClick={() => toggleSelfCare(item)}
                  className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isChecked ? 'bg-primary/10 border border-primary/30' : 'border border-border hover:bg-accent/5'
                  }`}
                >
                  {isChecked
                    ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    : <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  }
                  <span className={`text-sm ${isChecked ? 'text-primary font-medium' : 'text-foreground'}`}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <Progress value={(data.selfCareChecked.length / t.mentalHealth.emotional.selfCareItems.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {data.selfCareChecked.length}/{t.mentalHealth.emotional.selfCareItems.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==================== THERAPY ==================== */
function TherapySection() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* When to Seek Help */}
      <Card className="border-wellness-rose/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-wellness-rose">
            <AlertTriangle className="w-5 h-5" />
            {t.mentalHealth.therapy.whenToSeek}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.mentalHealth.therapy.seekHelpSigns.map((sign, i) => (
              <div key={i} className="flex items-start gap-3 p-2">
                <div className="w-2 h-2 rounded-full bg-wellness-rose mt-2 flex-shrink-0" />
                <p className="text-sm text-foreground">{sign}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Types of Therapy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-wellness-lavender" />
            {t.mentalHealth.therapy.typesOfTherapy}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {t.mentalHealth.therapy.therapyTypes.map((type, i) => (
              <div key={i} className="p-4 rounded-xl border border-border hover:shadow-sm transition-shadow">
                <h4 className="font-semibold text-foreground text-sm">{type.name}</h4>
                <p className="text-sm text-muted-foreground mt-1">{type.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crisis Numbers */}
      <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-600 dark:text-red-400">
            <Shield className="w-5 h-5" />
            {t.mentalHealth.therapy.crisisNumbers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.mentalHealth.therapy.crisisByCountry.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-card border border-border">
                <p className="font-medium text-sm text-foreground">{item.country}</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{item.number}</p>
                <p className="text-xs text-muted-foreground">{item.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Books */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            {t.mentalHealth.therapy.resources}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {t.mentalHealth.therapy.books.map((book, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                <div className="w-10 h-14 rounded-md bg-gradient-to-br from-primary/20 to-wellness-lavender/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">{book.title}</p>
                  <p className="text-xs text-muted-foreground">{book.author}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
