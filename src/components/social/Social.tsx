'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Users, BookOpen, ClipboardCheck, Heart, Briefcase, UserCheck, UsersRound, Globe, HandHeart, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import SocialEvaluation from './SocialEvaluation';

type SubTab = 'tools' | 'evaluation';

export default function Social() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SubTab>('tools');

  const tabs: { id: SubTab; icon: React.ElementType; label: string }[] = [
    { id: 'tools', icon: BookOpen, label: t.social.tabs.tools },
    { id: 'evaluation', icon: ClipboardCheck, label: t.social.tabs.evaluation },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-8 h-8 text-violet-500" />
          {t.social.title}
        </h1>
        <p className="text-muted-foreground mt-1">{t.social.subtitle}</p>
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
                  ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 shadow-sm'
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
        {activeTab === 'tools' && <SocialTools />}
        {activeTab === 'evaluation' && <SocialEvaluation />}
      </div>
    </div>
  );
}

// ─── Tools Sub-component ─────────────────────────────────────────

function SocialTools() {
  const { t } = useLanguage();

  const toolCards = [
    {
      icon: UserCheck,
      title: t.social.tools.supportNetworks,
      content: t.social.tools.supportNetworksDesc,
    },
    {
      icon: Briefcase,
      title: t.social.tools.workLifeBalance,
      content: t.social.tools.workLifeBalanceDesc,
    },
    {
      icon: Heart,
      title: t.social.tools.combatingLoneliness,
      content: t.social.tools.combatingLonelinessDesc,
    },
    {
      icon: UsersRound,
      title: t.social.tools.communityInvolvement,
      content: t.social.tools.communityInvolvementDesc,
    },
    {
      icon: Globe,
      title: t.social.tools.digitalWellness,
      content: t.social.tools.digitalWellnessDesc,
    },
    {
      icon: HandHeart,
      title: t.social.tools.purposeAndMeaning,
      content: t.social.tools.purposeAndMeaningDesc,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Social Wellness Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-violet-500" />
            {t.social.overview}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">{t.social.overviewDesc}</p>
        </CardContent>
      </Card>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {toolCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm mb-1">{card.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="w-5 h-5 text-violet-500" />
            {t.social.tips}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {t.social.tipsList.map((tip: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-violet-500/5">
                <span className="w-6 h-6 rounded-full bg-violet-500/10 text-violet-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
