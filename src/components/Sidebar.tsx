'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Section } from './WellnessApp';
import {
  Home,
  Brain,
  Apple,
  Dumbbell,
  Droplets,
  Moon,
  HeartPulse,
  Beer,
  Users,
  ShieldCheck,
  Target,
  BarChart3,
  Menu,
  X,
  Heart,
  Phone,
  UserCircle,
  Activity,
  Clipboard,
  ClipboardList,
} from 'lucide-react';

const navItems: { id: Section; icon: React.ElementType; labelKey: string }[] = [
  { id: 'dashboard', icon: Home, labelKey: 'dashboard' },
  { id: 'mentalHealth', icon: Brain, labelKey: 'mentalHealth' },
  { id: 'nutrition', icon: Apple, labelKey: 'nutrition' },
  { id: 'exercise', icon: Dumbbell, labelKey: 'exercise' },
  { id: 'hydration', icon: Droplets, labelKey: 'hydration' },
  { id: 'sleep', icon: Moon, labelKey: 'sleep' },
  { id: 'biomarkers', icon: HeartPulse, labelKey: 'biomarkers' },
  { id: 'habits', icon: Beer, labelKey: 'habits' },
  { id: 'social', icon: Users, labelKey: 'social' },
  { id: 'prevention', icon: ShieldCheck, labelKey: 'prevention' },
  { id: 'challenges', icon: Target, labelKey: 'challenges' },
  { id: 'progress', icon: BarChart3, labelKey: 'progress' },
  { id: 'assessment', icon: Activity, labelKey: 'assessment' },
  { id: 'reports', icon: ClipboardList, labelKey: 'reports' },
  { id: 'userProfile', icon: Clipboard, labelKey: 'userProfile' },
];

const bottomItems: { id: Section; icon: React.ElementType; labelKey: string }[] = [
  { id: 'crisisNumbers', icon: Phone, labelKey: 'crisisNumbers' },
  { id: 'profile', icon: UserCircle, labelKey: 'profile' },
];

interface SidebarProps {
  activeSection: Section;
  onNavigate: (section: Section) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ activeSection, onNavigate, isOpen, onToggle }: SidebarProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-card border-r border-border
          flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellness-teal to-wellness-emerald flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-white" />
            </div>
            {isOpen && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg text-foreground truncate">{t.appName}</h1>
                <p className="text-[10px] text-muted-foreground truncate">{t.appTagline}</p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="ml-auto p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground lg:hidden flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const label = t.nav[item.labelKey as keyof typeof t.nav];

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 text-sm font-medium
                  ${isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }
                `}
                title={!isOpen ? label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                {isOpen && <span className="truncate">{label}</span>}
                {isActive && isOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            );
          })}

          {/* Separator */}
          <div className="my-2 border-t border-border" />

          {/* Bottom items: Crisis + Profile */}
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const labelKey = item.labelKey as 'crisisNumbers' | 'profile';
            const label = t[labelKey]?.title || labelKey;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 1024) onToggle();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                  transition-all duration-200 text-sm font-medium
                  ${isActive
                    ? item.id === 'crisisNumbers'
                      ? 'bg-red-500/10 text-red-500 shadow-sm'
                      : 'bg-primary/10 text-primary shadow-sm'
                    : item.id === 'crisisNumbers'
                      ? 'text-red-400 hover:bg-red-500/10 hover:text-red-500'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }
                `}
                title={!isOpen ? label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? (item.id === 'crisisNumbers' ? 'text-red-500' : 'text-primary') : ''}`} />
                {isOpen && <span className="truncate">{label}</span>}
                {isActive && isOpen && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.id === 'crisisNumbers' ? 'bg-red-500' : 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse button for desktop */}
        <div className="hidden lg:block p-3 border-t border-border">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:bg-accent/10 hover:text-foreground transition-colors text-sm"
          >
            <Menu className="w-4 h-4" />
            {isOpen && <span>{t.common.collapse}</span>}
            {!isOpen && <span className="sr-only">{t.common.expand}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate max-w-[48px]">
                  {t.nav[item.labelKey as keyof typeof t.nav]}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
