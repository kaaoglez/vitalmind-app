'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { syncFromServer } from '@/lib/storage';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './dashboard/Dashboard';
import MentalHealth from './mental-health/MentalHealth';
import Nutrition from './nutrition/Nutrition';
import Exercise from './exercise/Exercise';
import Hydration from './hydration/Hydration';
import Sleep from './sleep/Sleep';
import Challenges from './challenges/Challenges';
import Progress from './progress/Progress';
import CrisisNumbers from './crisis/CrisisNumbers';
import Profile from './profile/Profile';
import HealthAssessment from './health-assessment/HealthAssessment';
import UserProfile from './user-profile/UserProfile';
import Biomarkers from './biomarkers/Biomarkers';
import Habits from './habits/Habits';
import Social from './social/Social';
import Prevention from './prevention/Prevention';
import Reports from './reports/Reports';
import AccountSettings from './account-settings/AccountSettings';

export type Section = 'dashboard' | 'mentalHealth' | 'nutrition' | 'exercise' | 'hydration' | 'sleep' | 'biomarkers' | 'habits' | 'social' | 'prevention' | 'challenges' | 'progress' | 'crisisNumbers' | 'profile' | 'assessment' | 'reports' | 'userProfile' | 'accountSettings';

export default function WellnessApp() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useLanguage();
  const { isAuthenticated, user, updateDarkMode } = useAuthStore();

  // Derive dark mode: prefer user preference from auth store, fall back to localStorage
  const darkMode = user?.darkMode ?? (() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('zenvida-dark-mode') === 'true';
  })();

  // Keep DOM class in sync with darkMode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Sync data from server when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      syncFromServer().catch(() => {
        // Silent fail - local data is still available
      });
    }
  }, [isAuthenticated]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    localStorage.setItem('zenvida-dark-mode', String(next));
    // Sync preference to auth store
    updateDarkMode(next);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard onNavigate={setActiveSection} />;
      case 'mentalHealth': return <MentalHealth />;
      case 'nutrition': return <Nutrition />;
      case 'exercise': return <Exercise />;
      case 'hydration': return <Hydration />;
      case 'sleep': return <Sleep />;
      case 'biomarkers': return <Biomarkers />;
      case 'habits': return <Habits />;
      case 'social': return <Social />;
      case 'prevention': return <Prevention />;
      case 'challenges': return <Challenges />;
      case 'progress': return <Progress />;
      case 'assessment': return <HealthAssessment />;
      case 'reports': return <Reports />;
      case 'userProfile': return <UserProfile embedded />;
      case 'crisisNumbers': return <CrisisNumbers />;
      case 'profile': return <Profile />;
      case 'accountSettings': return <AccountSettings />;
      default: return <Dashboard onNavigate={setActiveSection} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={(section) => setActiveSection(section as Section)}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 pb-20 lg:pb-8">
          <div className="max-w-7xl mx-auto section-enter">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
}
