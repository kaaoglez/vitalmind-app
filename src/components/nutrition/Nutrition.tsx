'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Apple, ChefHat, Leaf, Lightbulb, AlertCircle, CheckCircle2, Clock, Flame, ClipboardCheck, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import NutritionEvaluation from './NutritionEvaluation';

type SubTab = 'education' | 'recipes' | 'evaluation';

export default function Nutrition() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('education');
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'education', icon: BookOpen, label: t.nutrition.tabs.education },
    { id: 'recipes', icon: ChefHat, label: t.nutrition.tabs.recipes },
    { id: 'evaluation', icon: ClipboardCheck, label: t.nutrition.tabs.evaluation },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Apple className="w-8 h-8 text-wellness-emerald" />
          {t.nutrition.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.nutrition.subtitle}</p>
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
                  ? 'bg-wellness-emerald/15 text-wellness-emerald border border-wellness-emerald/30 shadow-sm'
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
        {activeTab === 'education' && <NutritionEducation expandedRecipe={expandedRecipe} setExpandedRecipe={setExpandedRecipe} />}
        {activeTab === 'recipes' && <NutritionRecipes expandedRecipe={expandedRecipe} setExpandedRecipe={setExpandedRecipe} />}
        {activeTab === 'evaluation' && <NutritionEvaluation />}
      </div>
    </div>
  );
}

function NutritionEducation({ expandedRecipe, setExpandedRecipe }: { expandedRecipe: number | null; setExpandedRecipe: (v: number | null) => void }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Balanced Plate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Leaf className="w-5 h-5 text-wellness-emerald" />
            {t.nutrition.balancedPlate}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
                <circle cx="100" cy="100" r="85" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="2"
                  strokeDasharray="267 267" strokeDashoffset="0" transform="rotate(-90 100 100)" />
                <circle cx="100" cy="100" r="65" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="2"
                  strokeDasharray="102 102" strokeDashoffset="0" transform="rotate(-90 100 100)" />
                <circle cx="100" cy="100" r="45" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="2"
                  strokeDasharray="70 70" strokeDashoffset="0" transform="rotate(-90 100 100)" />
              </svg>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10">
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-foreground">{t.nutrition.plateGuide.vegetables}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-wellness-lavender/10">
                <div className="w-4 h-4 rounded-full bg-wellness-lavender" />
                <span className="text-sm font-medium text-foreground">{t.nutrition.plateGuide.proteins}</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-sm font-medium text-foreground">{t.nutrition.plateGuide.grains}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Superfoods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparkleIcon className="w-5 h-5 text-wellness-amber" />
            {t.nutrition.superfoods}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {t.nutrition.superfoodsList.map((food, i) => (
              <div key={i} className="p-3 rounded-xl border border-border text-center hover:shadow-sm transition-shadow">
                <p className="font-medium text-sm text-foreground">{food.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{food.benefit}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Myths vs Facts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-wellness-amber" />
            {t.nutrition.mythsVsFacts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {t.nutrition.myths.map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border">
                <div className="flex items-start gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-wellness-rose mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground line-through">{item.myth}</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-wellness-emerald mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground font-medium">{item.fact}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NutritionRecipes({ expandedRecipe, setExpandedRecipe }: { expandedRecipe: number | null; setExpandedRecipe: (v: number | null) => void }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ChefHat className="w-5 h-5 text-primary" />
            {t.nutrition.recipes}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {t.nutrition.recipeList.map((recipe, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer"
                onClick={() => setExpandedRecipe(expandedRecipe === i ? null : i)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{recipe.name}</h4>
                  <Badge variant="secondary" className="text-xs">{recipe.difficulty}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.time}</span>
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{recipe.calories}</span>
                </div>
                {expandedRecipe === i && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Ingredients:</p>
                      <p className="text-sm text-muted-foreground">{recipe.ingredients}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground mb-1">Steps:</p>
                      <p className="text-sm text-muted-foreground">{recipe.steps}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    </svg>
  );
}
