'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, AlertTriangle, Heart } from 'lucide-react';

export default function CrisisNumbers() {
  const { t } = useLanguage();

  const crisisLines = t.mentalHealth.therapy.crisisByCountry;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center mx-auto">
          <Phone className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t.crisisNumbers.title}
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t.crisisNumbers.subtitle}
        </p>
      </div>

      {/* Emergency banner */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-700 dark:text-red-400 font-medium">
          {t.crisisNumbers.emergency}
        </p>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-center max-w-xl mx-auto">
        {t.crisisNumbers.description}
      </p>

      {/* Crisis Lines Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {crisisLines.map((line, i) => (
          <Card key={i} className="hover:shadow-md transition-all duration-200 group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{line.country}</span>
                <Heart className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="font-semibold text-foreground text-sm mb-1">{line.name}</p>
              <a
                href={`tel:${line.number.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-lg hover:bg-red-500/20 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {line.number}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Supportive message */}
      <div className="bg-gradient-to-br from-wellness-lavender/10 to-primary/10 rounded-2xl p-6 text-center">
        <Heart className="w-8 h-8 text-wellness-lavender mx-auto mb-3" />
        <p className="text-foreground font-medium text-lg mb-2">
          {t.crisisNumbers.subtitle}
        </p>
        <p className="text-muted-foreground text-sm">
          {t.crisisNumbers.description}
        </p>
      </div>
    </div>
  );
}
