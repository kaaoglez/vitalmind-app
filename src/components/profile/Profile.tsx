'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getStorage, setStorage } from '@/lib/storage';
import {
  ChefHat, Music, Dumbbell, Plus, Pencil, Trash2, ExternalLink,
  Clock, Apple, ListOrdered, Link as LinkIcon, Tag, FileText, X,
  Flame, Trophy, Star, Zap, TrendingUp, Award, Activity
} from 'lucide-react';
import HealthAssessment from '@/components/health-assessment/HealthAssessment';

// Types for user custom content
interface CustomRecipe {
  id: string;
  name: string;
  ingredients: string;
  steps: string;
  time: number;
  calories: number;
  createdAt: number;
}

interface CustomMusic {
  id: string;
  title: string;
  url: string;
  category: string;
  createdAt: number;
}

interface CustomExercise {
  id: string;
  name: string;
  duration: number;
  type: string;
  notes: string;
  caloriesBurned: number;
  createdAt: number;
}

// Activity log entry - when user logs doing an activity
interface ActivityLog {
  id: string;
  type: 'exercise' | 'nutrition' | 'relaxation';
  name: string;
  duration?: number;
  calories?: number;
  caloriesBurned?: number;
  date: string; // YYYY-MM-DD
  points: number;
  createdAt: number;
}

type ProfileTab = 'recipes' | 'music' | 'exercises' | 'score' | 'assessment';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Scoring rules
function calculateExercisePoints(type: string, duration: number): number {
  const pointsPerMin: Record<string, number> = {
    'Cardio': 2, 'Fuerza': 2.5, 'Força': 2.5, 'Strength': 2.5, 'Force': 2.5, '力量': 2.5, '有氧': 2,
    'Flexibility': 1.5, 'Flexibilidad': 1.5, 'Flexibilité': 1.5, '柔韧': 1.5,
    'Yoga': 2, '瑜伽': 2,
    'Stretching': 1, 'Estiramiento': 1, 'Étirement': 1, 'Alongamento': 1, '拉伸': 1,
  };
  const rate = pointsPerMin[type] || 1.5;
  return Math.round(duration * rate);
}

function calculateNutritionPoints(calories: number): number {
  // Base points for logging a meal, bonus for mindful eating
  if (calories <= 0) return 5;
  if (calories <= 300) return 15;
  if (calories <= 500) return 12;
  if (calories <= 700) return 10;
  return 8;
}

function calculateRelaxationPoints(): number {
  return 5;
}

export default function Profile() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('score');

  // State for custom content
  const [recipes, setRecipes] = useState<CustomRecipe[]>(() => getStorage<CustomRecipe[]>('profile-recipes', []));
  const [music, setMusic] = useState<CustomMusic[]>(() => getStorage<CustomMusic[]>('profile-music', []));
  const [exercises, setExercises] = useState<CustomExercise[]>(() => getStorage<CustomExercise[]>('profile-exercises', []));
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(() => getStorage<ActivityLog[]>('profile-activity-log', []));

  // Load data from server on mount if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadFromServer = async () => {
      try {
        const [recipesRes, musicRes, exercisesRes, activitiesRes] = await Promise.all([
          fetch('/api/profile/recipes'),
          fetch('/api/profile/music'),
          fetch('/api/profile/exercises'),
          fetch('/api/profile/activities'),
        ]);
        if (recipesRes.ok) {
          const data = await recipesRes.json();
          if (data.recipes?.length > 0) { setRecipes(data.recipes); setStorage('profile-recipes', data.recipes); }
        }
        if (musicRes.ok) {
          const data = await musicRes.json();
          if (data.music?.length > 0) { setMusic(data.music); setStorage('profile-music', data.music); }
        }
        if (exercisesRes.ok) {
          const data = await exercisesRes.json();
          if (data.exercises?.length > 0) { setExercises(data.exercises); setStorage('profile-exercises', data.exercises); }
        }
        if (activitiesRes.ok) {
          const data = await activitiesRes.json();
          if (data.activities?.length > 0) { setActivityLog(data.activities); setStorage('profile-activity-log', data.activities); }
        }
      } catch { /* silent fail, use localStorage */ }
    };
    loadFromServer();
  }, [isAuthenticated]);

  // Dialog states
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [showMusicDialog, setShowMusicDialog] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [recipeForm, setRecipeForm] = useState({ name: '', ingredients: '', steps: '', time: 0, calories: 0 });
  const [musicForm, setMusicForm] = useState({ title: '', url: '', category: '' });
  const [exerciseForm, setExerciseForm] = useState({ name: '', duration: 0, type: '', notes: '', caloriesBurned: 0 });
  const [logForm, setLogForm] = useState({ type: 'exercise' as 'exercise' | 'nutrition' | 'relaxation', name: '', duration: 0, calories: 0, caloriesBurned: 0 });

  // Save handlers
  const saveRecipes = (data: CustomRecipe[]) => { setRecipes(data); setStorage('profile-recipes', data); };
  const saveMusic = (data: CustomMusic[]) => { setMusic(data); setStorage('profile-music', data); };
  const saveExercises = (data: CustomExercise[]) => { setExercises(data); setStorage('profile-exercises', data); };
  const saveActivityLog = (data: ActivityLog[]) => { setActivityLog(data); setStorage('profile-activity-log', data); };

  // Today's date string
  const today = new Date().toISOString().split('T')[0];

  // Score calculations
  const todayLog = useMemo(() => activityLog.filter(l => l.date === today), [activityLog, today]);
  const todayPoints = useMemo(() => todayLog.reduce((sum, l) => sum + l.points, 0), [todayLog]);
  const totalPoints = useMemo(() => activityLog.reduce((sum, l) => sum + l.points, 0), [activityLog]);
  const todayCaloriesConsumed = useMemo(() => todayLog.filter(l => l.type === 'nutrition').reduce((sum, l) => sum + (l.calories || 0), 0), [todayLog]);
  const todayCaloriesBurned = useMemo(() => todayLog.filter(l => l.type === 'exercise').reduce((sum, l) => sum + (l.caloriesBurned || 0), 0), [todayLog]);
  const todayExerciseMin = useMemo(() => todayLog.filter(l => l.type === 'exercise').reduce((sum, l) => sum + (l.duration || 0), 0), [todayLog]);

  // Weekly points
  const weeklyPoints = useMemo(() => {
    const points: { day: string; points: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayPoints = activityLog.filter(l => l.date === dateStr).reduce((sum, l) => sum + l.points, 0);
      points.push({ day: d.toLocaleDateString(undefined, { weekday: 'short' }), points: dayPoints });
    }
    return points;
  }, [activityLog]);

  // Log activity
  const logActivity = async () => {
    if (!logForm.name.trim()) return;
    let points = 0;
    if (logForm.type === 'exercise') {
      points = calculateExercisePoints(logForm.name, logForm.duration);
    } else if (logForm.type === 'nutrition') {
      points = calculateNutritionPoints(logForm.calories);
    } else {
      points = calculateRelaxationPoints();
    }
    const entry: ActivityLog = {
      id: generateId(),
      type: logForm.type,
      name: logForm.name,
      duration: logForm.type === 'exercise' ? logForm.duration : undefined,
      calories: logForm.type === 'nutrition' ? logForm.calories : undefined,
      caloriesBurned: logForm.type === 'exercise' ? logForm.caloriesBurned : undefined,
      date: today,
      points,
      createdAt: Date.now(),
    };
    saveActivityLog([...activityLog, entry]);
    // Sync to server
    try {
      const res = await fetch('/api/profile/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: logForm.type, name: logForm.name,
          duration: logForm.type === 'exercise' ? logForm.duration : 0,
          calories: logForm.type === 'nutrition' ? logForm.calories : 0,
          caloriesBurned: logForm.type === 'exercise' ? logForm.caloriesBurned : 0,
          date: today,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activity) {
          // Replace with server-generated entry (has real DB id)
          const serverEntry: ActivityLog = {
            id: data.activity.id,
            type: data.activity.type,
            name: data.activity.name,
            duration: data.activity.duration || undefined,
            calories: data.activity.calories || undefined,
            caloriesBurned: data.activity.caloriesBurned || undefined,
            date: data.activity.date,
            points: data.activity.points,
            createdAt: new Date(data.activity.createdAt).getTime(),
          };
          saveActivityLog([...activityLog.filter(l => l.id !== entry.id), serverEntry]);
        }
      }
    } catch { /* silent fail */ }
    setShowLogDialog(false);
    setLogForm({ type: 'exercise', name: '', duration: 0, calories: 0, caloriesBurned: 0 });
  };

  const deleteLogEntry = async (id: string) => {
    if (!confirm(t.profile.confirmDelete)) return;
    saveActivityLog(activityLog.filter(l => l.id !== id));
    try { await fetch(`/api/profile/activities/${id}`, { method: 'DELETE' }); } catch { /* silent */ }
  };

  // Recipe CRUD
  const openRecipeDialog = (recipe?: CustomRecipe) => {
    if (recipe) {
      setEditingId(recipe.id);
      setRecipeForm({ name: recipe.name, ingredients: recipe.ingredients, steps: recipe.steps, time: recipe.time, calories: recipe.calories });
    } else {
      setEditingId(null);
      setRecipeForm({ name: '', ingredients: '', steps: '', time: 0, calories: 0 });
    }
    setShowRecipeDialog(true);
  };

  const saveRecipe = async () => {
    if (!recipeForm.name.trim()) return;
    if (editingId) {
      saveRecipes(recipes.map(r => r.id === editingId ? { ...r, ...recipeForm } : r));
      try { await fetch(`/api/profile/recipes/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipeForm) }); } catch { /* silent */ }
    } else {
      const newRecipe = { id: generateId(), ...recipeForm, createdAt: Date.now() };
      saveRecipes([...recipes, newRecipe]);
      try {
        const res = await fetch('/api/profile/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipeForm) });
        if (res.ok) {
          const data = await res.json();
          if (data.recipe) {
            saveRecipes([...recipes.filter(r => r.id !== newRecipe.id), { ...data.recipe, createdAt: new Date(data.recipe.createdAt).getTime() }]);
          }
        }
      } catch { /* silent */ }
    }
    setShowRecipeDialog(false);
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm(t.profile.confirmDelete)) return;
    saveRecipes(recipes.filter(r => r.id !== id));
    try { await fetch(`/api/profile/recipes/${id}`, { method: 'DELETE' }); } catch { /* silent */ }
  };

  // Music CRUD
  const openMusicDialog = (item?: CustomMusic) => {
    if (item) {
      setEditingId(item.id);
      setMusicForm({ title: item.title, url: item.url, category: item.category });
    } else {
      setEditingId(null);
      setMusicForm({ title: '', url: '', category: t.profile.musicCategories[0] });
    }
    setShowMusicDialog(true);
  };

  const saveMusicItem = async () => {
    if (!musicForm.title.trim() || !musicForm.url.trim()) return;
    if (editingId) {
      saveMusic(music.map(m => m.id === editingId ? { ...m, ...musicForm } : m));
      try { await fetch(`/api/profile/music/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(musicForm) }); } catch { /* silent */ }
    } else {
      const newMusic = { id: generateId(), ...musicForm, createdAt: Date.now() };
      saveMusic([...music, newMusic]);
      try {
        const res = await fetch('/api/profile/music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(musicForm) });
        if (res.ok) {
          const data = await res.json();
          if (data.music) {
            saveMusic([...music.filter(m => m.id !== newMusic.id), { ...data.music, createdAt: new Date(data.music.createdAt).getTime() }]);
          }
        }
      } catch { /* silent */ }
    }
    setShowMusicDialog(false);
  };

  const deleteMusic = async (id: string) => {
    if (!confirm(t.profile.confirmDelete)) return;
    saveMusic(music.filter(m => m.id !== id));
    try { await fetch(`/api/profile/music/${id}`, { method: 'DELETE' }); } catch { /* silent */ }
  };

  // Exercise CRUD
  const openExerciseDialog = (item?: CustomExercise) => {
    if (item) {
      setEditingId(item.id);
      setExerciseForm({ name: item.name, duration: item.duration, type: item.type, notes: item.notes, caloriesBurned: item.caloriesBurned });
    } else {
      setEditingId(null);
      setExerciseForm({ name: '', duration: 0, type: t.profile.exerciseTypes[0], notes: '', caloriesBurned: 0 });
    }
    setShowExerciseDialog(true);
  };

  const saveExercise = async () => {
    if (!exerciseForm.name.trim()) return;
    if (editingId) {
      saveExercises(exercises.map(e => e.id === editingId ? { ...e, ...exerciseForm } : e));
      try { await fetch(`/api/profile/exercises/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exerciseForm) }); } catch { /* silent */ }
    } else {
      const newExercise = { id: generateId(), ...exerciseForm, createdAt: Date.now() };
      saveExercises([...exercises, newExercise]);
      try {
        const res = await fetch('/api/profile/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(exerciseForm) });
        if (res.ok) {
          const data = await res.json();
          if (data.exercise) {
            saveExercises([...exercises.filter(e => e.id !== newExercise.id), { ...data.exercise, createdAt: new Date(data.exercise.createdAt).getTime() }]);
          }
        }
      } catch { /* silent */ }
    }
    setShowExerciseDialog(false);
  };

  const deleteExercise = async (id: string) => {
    if (!confirm(t.profile.confirmDelete)) return;
    saveExercises(exercises.filter(e => e.id !== id));
    try { await fetch(`/api/profile/exercises/${id}`, { method: 'DELETE' }); } catch { /* silent */ }
  };

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'Meditation': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Meditación': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Meditação': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Méditation': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      '冥想': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Sleep': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Dormir': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Sono': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Sommeil': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      '睡眠': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'Focus': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Concentración': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Concentration': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      '专注': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Relaxation': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'Relajación': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'Relaxamento': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      '放松': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'Nature': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Naturaleza': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Natureza': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      '自然': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Instrumental': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      '器乐': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return colors[cat] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Cardio': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      '有氧': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      'Strength': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Fuerza': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Força': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Force': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      '力量': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Flexibility': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Flexibilidad': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Flexibilité': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      '柔韧': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'Yoga': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      '瑜伽': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      'Stretching': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Estiramiento': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Étirement': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      'Alongamento': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      '拉伸': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getPlatformIcon = (url: string) => {
    if (url.includes('spotify')) return '🎵';
    if (url.includes('youtube') || url.includes('youtu.be')) return '▶️';
    if (url.includes('apple.com') || url.includes('music.apple')) return '🍎';
    if (url.includes('soundcloud')) return '☁️';
    return '🎵';
  };

  const tabs: { id: ProfileTab; icon: React.ElementType; label: string }[] = [
    { id: 'score', icon: Trophy, label: t.profile.tabScore },
    { id: 'assessment', icon: Activity, label: t.profile.tabAssessment },
    { id: 'recipes', icon: ChefHat, label: t.profile.tabRecipes },
    { id: 'music', icon: Music, label: t.profile.tabMusic },
    { id: 'exercises', icon: Dumbbell, label: t.profile.tabExercises },
  ];

  // Level calculation
  const level = useMemo(() => {
    if (totalPoints < 50) return { name: t.profile.levelBeginner, icon: '🌱', color: 'text-green-500' };
    if (totalPoints < 150) return { name: t.profile.levelActive, icon: '⚡', color: 'text-yellow-500' };
    if (totalPoints < 400) return { name: t.profile.levelFit, icon: '🔥', color: 'text-orange-500' };
    if (totalPoints < 800) return { name: t.profile.levelWarrior, icon: '💪', color: 'text-red-500' };
    return { name: t.profile.levelChampion, icon: '🏆', color: 'text-primary' };
  }, [totalPoints, t]);

  const maxWeeklyPoints = Math.max(...weeklyPoints.map(d => d.points), 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-wellness-lavender/20 flex items-center justify-center mx-auto">
          <span className="text-3xl">{level.icon}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t.profile.title}</h2>
        <p className="text-muted-foreground">{t.profile.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-muted/50 p-1.5 rounded-xl overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SCORE TAB */}
      {activeTab === 'score' && (
        <div className="space-y-6">
          {/* Level + Points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-wellness-lavender/10 border-primary/20">
              <CardContent className="p-5 text-center">
                <span className="text-4xl">{level.icon}</span>
                <h3 className={`text-xl font-bold mt-2 ${level.color}`}>{level.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.profile.totalPoints}: {totalPoints}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-wellness-emerald/10 flex items-center justify-center">
                  <Flame className="w-6 h-6 text-wellness-emerald" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.profile.caloriesBurned}</p>
                  <p className="text-2xl font-bold text-foreground">{todayCaloriesBurned}</p>
                  <p className="text-xs text-muted-foreground">{t.profile.today}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Apple className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.profile.caloriesConsumed}</p>
                  <p className="text-2xl font-bold text-foreground">{todayCaloriesConsumed}</p>
                  <p className="text-xs text-muted-foreground">{t.profile.today}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Stats */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-5 h-5 text-wellness-amber" />
                  {t.profile.todayScore}
                </h3>
                <span className="text-2xl font-bold text-primary">{todayPoints} pts</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-xl bg-red-500/5">
                  <Dumbbell className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{todayExerciseMin}</p>
                  <p className="text-[10px] text-muted-foreground">{t.profile.minExercise}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-orange-500/5">
                  <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{todayCaloriesBurned}</p>
                  <p className="text-[10px] text-muted-foreground">{t.profile.calBurned}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-green-500/5">
                  <Apple className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-foreground">{todayCaloriesConsumed}</p>
                  <p className="text-[10px] text-muted-foreground">{t.profile.calConsumed}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Progress Bar Chart */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                {t.profile.weeklyProgress}
              </h3>
              <div className="flex items-end gap-2 h-32">
                {weeklyPoints.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{d.points}</span>
                    <div className="w-full rounded-t-lg bg-primary/20 relative" style={{ height: `${Math.max((d.points / maxWeeklyPoints) * 100, 4)}%` }}>
                      <div className="absolute bottom-0 w-full rounded-t-lg bg-primary transition-all duration-700" style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Log Activity Button */}
          <div className="flex justify-center">
            <Button size="lg" className="gap-2" onClick={() => {
              setLogForm({ type: 'exercise', name: '', duration: 0, calories: 0, caloriesBurned: 0 });
              setShowLogDialog(true);
            }}>
              <Zap className="w-5 h-5" />
              {t.profile.logActivity}
            </Button>
          </div>

          {/* Today's Activity Log */}
          {todayLog.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">{t.profile.todayLog}</h3>
              {todayLog.map(entry => (
                <Card key={entry.id} className="group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        entry.type === 'exercise' ? 'bg-red-500/10' : entry.type === 'nutrition' ? 'bg-green-500/10' : 'bg-purple-500/10'
                      }`}>
                        {entry.type === 'exercise' ? <Dumbbell className="w-5 h-5 text-red-500" /> :
                         entry.type === 'nutrition' ? <Apple className="w-5 h-5 text-green-500" /> :
                         <Music className="w-5 h-5 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{entry.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {entry.duration && <span>{entry.duration} min</span>}
                          {entry.calories && <span>{entry.calories} cal</span>}
                          {entry.caloriesBurned && <span>-{entry.caloriesBurned} cal</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">+{entry.points} pts</span>
                      <button onClick={() => deleteLogEntry(entry.id)} className="p-1 rounded-lg hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Scoring Guide */}
          <Card>
            <CardContent className="p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-wellness-amber" />
                {t.profile.scoringGuide}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/5">
                  <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-red-500" /> {t.profile.cardioPoints}</span>
                  <span className="font-medium text-foreground">2 pts/min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5">
                  <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-orange-500" /> {t.profile.strengthPoints}</span>
                  <span className="font-medium text-foreground">2.5 pts/min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5">
                  <span className="flex items-center gap-2"><Dumbbell className="w-4 h-4 text-purple-500" /> {t.profile.yogaPoints}</span>
                  <span className="font-medium text-foreground">2 pts/min</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/5">
                  <span className="flex items-center gap-2"><Apple className="w-4 h-4 text-green-500" /> {t.profile.nutritionPoints}</span>
                  <span className="font-medium text-foreground">8-15 pts</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5">
                  <span className="flex items-center gap-2"><Music className="w-4 h-4 text-purple-500" /> {t.profile.relaxationPoints}</span>
                  <span className="font-medium text-foreground">5 pts</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ASSESSMENT TAB */}
      {activeTab === 'assessment' && (
        <HealthAssessment />
      )}

      {/* Add button for non-score tabs */}
      {activeTab !== 'score' && activeTab !== 'assessment' && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (activeTab === 'recipes') openRecipeDialog();
              else if (activeTab === 'music') openMusicDialog();
              else openExerciseDialog();
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'recipes' ? t.profile.addRecipe : activeTab === 'music' ? t.profile.addMusic : t.profile.addExercise}
          </Button>
        </div>
      )}

      {/* RECIPES TAB */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          {recipes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ChefHat className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">{t.profile.noRecipes}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recipes.map(recipe => (
                <Card key={recipe.id} className="group hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
                          <Apple className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{recipe.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {recipe.time > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {recipe.time} min
                              </p>
                            )}
                            {recipe.calories > 0 && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Flame className="w-3 h-3" /> {recipe.calories} cal
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openRecipeDialog(recipe)} className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteRecipe(recipe.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {recipe.ingredients && (
                      <div className="mb-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <ListOrdered className="w-3 h-3" />
                          {t.profile.recipeIngredients}
                        </p>
                        <p className="text-sm text-foreground/80 line-clamp-2">{recipe.ingredients}</p>
                      </div>
                    )}
                    {recipe.steps && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {t.profile.recipeSteps}
                        </p>
                        <p className="text-sm text-foreground/80 line-clamp-3">{recipe.steps}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MUSIC TAB */}
      {activeTab === 'music' && (
        <div className="space-y-4">
          {music.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Music className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">{t.profile.noMusic}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {music.map(item => (
                <Card key={item.id} className="group hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-wellness-lavender/20 flex items-center justify-center text-xl">
                          {getPlatformIcon(item.url)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openMusicDialog(item)} className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMusic(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {item.url.includes('spotify') ? 'Spotify' : item.url.includes('youtube') || item.url.includes('youtu.be') ? 'YouTube' : t.profile.musicUrl}
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EXERCISES TAB */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          {exercises.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Dumbbell className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">{t.profile.noExercises}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exercises.map(item => (
                <Card key={item.id} className="group hover:shadow-md transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-wellness-teal/20 flex items-center justify-center">
                          <Dumbbell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                              {item.type}
                            </span>
                            {item.duration > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.duration} min
                              </span>
                            )}
                            {item.caloriesBurned > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Flame className="w-3 h-3" /> {item.caloriesBurned} cal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openExerciseDialog(item)} className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteExercise(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{item.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOG ACTIVITY DIALOG */}
      <Dialog open={showLogDialog} onOpenChange={() => setShowLogDialog(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.profile.logActivity}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.profile.activityType}</Label>
              <div className="flex gap-2">
                {(['exercise', 'nutrition', 'relaxation'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setLogForm({ ...logForm, type })}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      logForm.type === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'
                    }`}
                  >
                    {type === 'exercise' ? <Dumbbell className="w-4 h-4" /> : type === 'nutrition' ? <Apple className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                    {type === 'exercise' ? t.profile.exerciseType : type === 'nutrition' ? t.profile.nutritionType : t.profile.relaxationType}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.profile.activityName}</Label>
              <Input value={logForm.name} onChange={e => setLogForm({ ...logForm, name: e.target.value })} placeholder={
                logForm.type === 'exercise' ? t.profile.exerciseNamePh : logForm.type === 'nutrition' ? t.profile.nutritionNamePh : t.profile.relaxationNamePh
              } />
            </div>
            {logForm.type === 'exercise' && (
              <>
                <div className="space-y-2">
                  <Label>{t.profile.exerciseDuration}</Label>
                  <Input type="number" value={logForm.duration || ''} onChange={e => setLogForm({ ...logForm, duration: parseInt(e.target.value) || 0 })} placeholder="30" />
                </div>
                <div className="space-y-2">
                  <Label>{t.profile.caloriesBurned}</Label>
                  <Input type="number" value={logForm.caloriesBurned || ''} onChange={e => setLogForm({ ...logForm, caloriesBurned: parseInt(e.target.value) || 0 })} placeholder="250" />
                </div>
              </>
            )}
            {logForm.type === 'nutrition' && (
              <div className="space-y-2">
                <Label>{t.profile.recipeCalories}</Label>
                <Input type="number" value={logForm.calories || ''} onChange={e => setLogForm({ ...logForm, calories: parseInt(e.target.value) || 0 })} placeholder="450" />
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLogDialog(false)}>{t.profile.cancel}</Button>
              <Button onClick={logActivity}>{t.profile.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={showRecipeDialog} onOpenChange={() => setShowRecipeDialog(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t.profile.edit : t.profile.addRecipe}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.profile.recipeName}</Label>
              <Input value={recipeForm.name} onChange={e => setRecipeForm({ ...recipeForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t.profile.recipeIngredients}</Label>
              <Input value={recipeForm.ingredients} onChange={e => setRecipeForm({ ...recipeForm, ingredients: e.target.value })} placeholder="Tomato, garlic, olive oil..." />
            </div>
            <div className="space-y-2">
              <Label>{t.profile.recipeSteps}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={recipeForm.steps}
                onChange={e => setRecipeForm({ ...recipeForm, steps: e.target.value })}
                placeholder="1. Chop vegetables 2. Heat oil..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.profile.recipeTime}</Label>
                <Input type="number" value={recipeForm.time || ''} onChange={e => setRecipeForm({ ...recipeForm, time: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t.profile.recipeCalories}</Label>
                <Input type="number" value={recipeForm.calories || ''} onChange={e => setRecipeForm({ ...recipeForm, calories: parseInt(e.target.value) || 0 })} placeholder="450" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRecipeDialog(false)}>{t.profile.cancel}</Button>
              <Button onClick={saveRecipe}>{t.profile.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Music Dialog */}
      <Dialog open={showMusicDialog} onOpenChange={() => setShowMusicDialog(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t.profile.edit : t.profile.addMusic}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.profile.musicTitle}</Label>
              <Input value={musicForm.title} onChange={e => setMusicForm({ ...musicForm, title: e.target.value })} placeholder="Calm Ocean Waves" />
            </div>
            <div className="space-y-2">
              <Label>{t.profile.musicUrl}</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  value={musicForm.url}
                  onChange={e => setMusicForm({ ...musicForm, url: e.target.value })}
                  placeholder="https://open.spotify.com/track/..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.profile.musicCategory}</Label>
              <div className="flex flex-wrap gap-2">
                {t.profile.musicCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setMusicForm({ ...musicForm, category: cat })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      musicForm.category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowMusicDialog(false)}>{t.profile.cancel}</Button>
              <Button onClick={saveMusicItem}>{t.profile.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise Dialog */}
      <Dialog open={showExerciseDialog} onOpenChange={() => setShowExerciseDialog(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? t.profile.edit : t.profile.addExercise}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.profile.exerciseName}</Label>
              <Input value={exerciseForm.name} onChange={e => setExerciseForm({ ...exerciseForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.profile.exerciseDuration}</Label>
                <Input type="number" value={exerciseForm.duration || ''} onChange={e => setExerciseForm({ ...exerciseForm, duration: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{t.profile.caloriesBurned}</Label>
                <Input type="number" value={exerciseForm.caloriesBurned || ''} onChange={e => setExerciseForm({ ...exerciseForm, caloriesBurned: parseInt(e.target.value) || 0 })} placeholder="250" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.profile.exerciseType}</Label>
              <div className="flex flex-wrap gap-2">
                {t.profile.exerciseTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setExerciseForm({ ...exerciseForm, type })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      exerciseForm.type === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent/10'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.profile.exerciseNotes}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={exerciseForm.notes}
                onChange={e => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowExerciseDialog(false)}>{t.profile.cancel}</Button>
              <Button onClick={saveExercise}>{t.profile.save}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
