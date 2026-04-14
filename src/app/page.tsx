'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth/authStore';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import LandingPage from '@/components/landing/LandingPage';
import WellnessApp from '@/components/WellnessApp';
import AuthModals from '@/components/auth/AuthModals';

function AppContent() {
  const { isAuthenticated, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <>
      <AuthModals />
      {isAuthenticated ? <WellnessApp /> : <LandingPage />}
    </>
  );
}

export default function Home() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
