'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import {
  User, Mail, Phone, Lock, Shield, Trash2, Save, Check, AlertCircle,
  Camera, Eye, EyeOff, ChevronRight, Globe, Moon, Sun, Calendar,
  LogOut, Key, Smartphone, BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Tab = 'profile' | 'security' | 'preferences' | 'danger';

interface AccountData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  language: string;
  darkMode: boolean;
  plan: string;
  googleId: string | null;
  createdAt: string;
}

export default function AccountSettings() {
  const { t, language, setLanguage } = useLanguage();
  const { user: authUser, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });

  // Security form state
  const [emailForm, setEmailForm] = useState({ newEmail: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Danger zone
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  // Fetch account data
  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/account');
      if (res.ok) {
        const data = await res.json();
        setAccountData(data.user);
        setProfileForm({ name: data.user.name, phone: data.user.phone || '' });
        setEmailForm(prev => ({ ...prev, newEmail: data.user.email }));
      }
    } catch {
      // offline fallback
      if (authUser) {
        setAccountData({
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          phone: null,
          avatar: authUser.avatar || null,
          language: authUser.language,
          darkMode: authUser.darkMode,
          plan: authUser.plan,
          googleId: null,
          createdAt: new Date().toISOString(),
        });
        setProfileForm({ name: authUser.name, phone: '' });
        setEmailForm(prev => ({ ...prev, newEmail: authUser.email }));
      }
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const updateAuthStore = (updatedUser: Partial<AccountData>) => {
    const store = useAuthStore.getState();
    if (store.user) {
      const newUser = { ...store.user, ...updatedUser };
      useAuthStore.setState({ user: newUser });
      localStorage.setItem('vitalmind-session', JSON.stringify(newUser));
    }
  };

  // --- Save Profile ---
  const handleSaveProfile = async () => {
    if (!profileForm.name.trim()) {
      showMessage('error', t.accountSettings.errors.nameRequired);
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateProfile', name: profileForm.name, phone: profileForm.phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccountData(prev => prev ? { ...prev, ...data.user } : null);
        updateAuthStore(data.user);
        showMessage('success', t.accountSettings.profile.saved);
      } else {
        showMessage('error', data.error || t.accountSettings.errors.saveFailed);
      }
    } catch {
      showMessage('error', t.accountSettings.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  // --- Change Email ---
  const handleChangeEmail = async () => {
    if (!emailForm.newEmail.trim() || !emailForm.password) {
      showMessage('error', t.accountSettings.errors.allFieldsRequired);
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changeEmail', newEmail: emailForm.newEmail, password: emailForm.password }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccountData(prev => prev ? { ...prev, ...data.user } : null);
        updateAuthStore(data.user);
        setEmailForm(prev => ({ ...prev, password: '' }));
        showMessage('success', t.accountSettings.security.emailChanged);
      } else {
        showMessage('error', data.error || t.accountSettings.errors.saveFailed);
      }
    } catch {
      showMessage('error', t.accountSettings.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  // --- Change Password ---
  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showMessage('error', t.accountSettings.errors.allFieldsRequired);
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showMessage('error', t.accountSettings.errors.passwordMin);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('error', t.accountSettings.errors.passwordsNoMatch);
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'changePassword', currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showMessage('success', t.accountSettings.security.passwordChanged);
      } else {
        showMessage('error', data.error || t.accountSettings.errors.saveFailed);
      }
    } catch {
      showMessage('error', t.accountSettings.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = async () => {
    if (accountData?.googleId && !deletePassword) {
      // Google users don't need password
    } else if (!accountData?.googleId && !deletePassword) {
      showMessage('error', t.accountSettings.errors.passwordRequired);
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/auth/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteAccount', password: deletePassword || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        await logout();
        localStorage.removeItem('vitalmind-session');
        window.location.href = '/';
      } else {
        showMessage('error', data.error || t.accountSettings.errors.saveFailed);
      }
    } catch {
      showMessage('error', t.accountSettings.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  // Password strength calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    const levels = [
      { level: 1, label: t.accountSettings.security.strengthWeak, color: 'bg-red-500' },
      { level: 2, label: t.accountSettings.security.strengthFair, color: 'bg-orange-500' },
      { level: 3, label: t.accountSettings.security.strengthGood, color: 'bg-yellow-500' },
      { level: 4, label: t.accountSettings.security.strengthStrong, color: 'bg-emerald-500' },
      { level: 5, label: t.accountSettings.security.strengthVeryStrong, color: 'bg-primary' },
    ];
    return levels[Math.min(score, 5) - 1] || levels[0];
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);
  const isGoogleAccount = !!accountData?.googleId;
  const memberSince = accountData?.createdAt
    ? new Date(accountData.createdAt).toLocaleDateString(language === 'es' ? 'es-ES' : language === 'pt' ? 'pt-BR' : language === 'fr' ? 'fr-FR' : language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'profile', icon: User, label: t.accountSettings.tabs.profile },
    { id: 'security', icon: Shield, label: t.accountSettings.tabs.security },
    { id: 'preferences', icon: Globe, label: t.accountSettings.tabs.preferences },
    { id: 'danger', icon: Trash2, label: t.accountSettings.tabs.danger },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with avatar and user info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-wellness-lavender/5 to-wellness-emerald/5 border border-border">
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-wellness-lavender flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            {accountData?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-card border-2 border-border flex items-center justify-center shadow-sm">
            {isGoogleAccount ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            ) : (
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground truncate">{accountData?.name}</h2>
          <p className="text-sm text-muted-foreground truncate">{accountData?.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              <BadgeCheck className="w-3 h-3 mr-1" />
              {accountData?.plan === 'premium' ? t.accountSettings.planPremium : t.accountSettings.planFree}
            </Badge>
            {memberSince && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {t.accountSettings.memberSince} {memberSince}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Message banner */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tabs + Content layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? tab.id === 'danger'
                        ? 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 shadow-sm'
                        : 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.id === 'danger' && !isActive && <span className="w-2 h-2 rounded-full bg-red-400 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Content */}
        <div className="flex-1 min-w-0">
          {/* ====== PROFILE TAB ====== */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {t.accountSettings.profile.title}
                  </CardTitle>
                  <CardDescription>{t.accountSettings.profile.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {t.accountSettings.profile.nameLabel}
                    </label>
                    <Input
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t.accountSettings.profile.namePlaceholder}
                      className="h-11"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {t.accountSettings.profile.emailLabel}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={accountData?.email || ''}
                        readOnly
                        className="h-11 bg-muted/30"
                      />
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {isGoogleAccount ? 'Google' : 'Email'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{t.accountSettings.profile.emailHint}</p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {t.accountSettings.profile.phoneLabel}
                    </label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder={t.accountSettings.profile.phonePlaceholder}
                      type="tel"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">{t.accountSettings.profile.phoneHint}</p>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving} className="min-w-[120px]">
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t.accountSettings.profile.save}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ====== SECURITY TAB ====== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Change Email */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    {t.accountSettings.security.changeEmailTitle}
                  </CardTitle>
                  <CardDescription>{t.accountSettings.security.changeEmailDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGoogleAccount ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      <p className="text-sm text-muted-foreground">{t.accountSettings.security.googleEmailHint}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t.accountSettings.security.newEmailLabel}</label>
                        <Input
                          type="email"
                          value={emailForm.newEmail}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                          placeholder="nuevo@email.com"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t.accountSettings.security.confirmPasswordLabel}</label>
                        <div className="relative">
                          <Input
                            type={showEmailPassword ? 'text' : 'password'}
                            value={emailForm.password}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="********"
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleChangeEmail} disabled={saving}>
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              {t.accountSettings.security.changeEmailBtn}
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Change Password */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-primary" />
                    {t.accountSettings.security.changePasswordTitle}
                  </CardTitle>
                  <CardDescription>{t.accountSettings.security.changePasswordDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGoogleAccount ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      <p className="text-sm text-muted-foreground">{t.accountSettings.security.googlePasswordHint}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t.accountSettings.security.currentPasswordLabel}</label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder="********"
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t.accountSettings.security.newPasswordLabel}</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            placeholder="********"
                            className="h-11 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {/* Password strength */}
                        {passwordForm.newPassword && (
                          <div className="space-y-1.5">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passwordStrength.level ? passwordStrength.color : 'bg-muted'}`} />
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{passwordStrength.label}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t.accountSettings.security.confirmNewPasswordLabel}</label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="********"
                          className="h-11"
                        />
                        {passwordForm.confirmPassword && (
                          <p className={`text-xs flex items-center gap-1 ${passwordForm.newPassword === passwordForm.confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {passwordForm.newPassword === passwordForm.confirmPassword ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {passwordForm.newPassword === passwordForm.confirmPassword ? t.accountSettings.security.passwordsMatch : t.accountSettings.errors.passwordsNoMatch}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={handleChangePassword} disabled={saving}>
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              {t.accountSettings.security.changePasswordBtn}
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ====== PREFERENCES TAB ====== */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    {t.accountSettings.preferences.title}
                  </CardTitle>
                  <CardDescription>{t.accountSettings.preferences.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Language */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.accountSettings.preferences.languageLabel}</p>
                        <p className="text-xs text-muted-foreground">{t.accountSettings.preferences.languageDesc}</p>
                      </div>
                    </div>
                    <select
                      value={language}
                      onChange={(e) => {
                        const lang = e.target.value as 'en' | 'es' | 'pt' | 'fr' | 'zh';
                        setLanguage(lang);
                        useAuthStore.getState().updateLanguage(lang);
                      }}
                      className="h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="en">English</option>
                      <option value="es">Espanol</option>
                      <option value="pt">Portugues</option>
                      <option value="fr">Francais</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        {accountData?.darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.accountSettings.preferences.darkModeLabel}</p>
                        <p className="text-xs text-muted-foreground">{t.accountSettings.preferences.darkModeDesc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newDarkMode = !accountData?.darkMode;
                        setAccountData(prev => prev ? { ...prev, darkMode: newDarkMode } : null);
                        useAuthStore.getState().updateDarkMode(newDarkMode);
                        if (newDarkMode) {
                          document.documentElement.classList.add('dark');
                        } else {
                          document.documentElement.classList.remove('dark');
                        }
                        localStorage.setItem('zenvida-dark-mode', String(newDarkMode));
                      }}
                      className={`relative w-12 h-7 rounded-full transition-colors ${accountData?.darkMode ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${accountData?.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ====== DANGER ZONE TAB ====== */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <Card className="border-red-200 dark:border-red-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Trash2 className="w-5 h-5" />
                    {t.accountSettings.danger.title}
                  </CardTitle>
                  <CardDescription>{t.accountSettings.danger.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showDeleteConfirm ? (
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">{t.accountSettings.danger.warning}</p>
                        <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">{t.accountSettings.danger.warningDesc}</p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        {t.accountSettings.danger.deleteBtn}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium">{t.accountSettings.danger.confirmText}</p>
                      {!isGoogleAccount && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-red-700 dark:text-red-300">{t.accountSettings.danger.enterPassword}</label>
                          <div className="relative">
                            <Input
                              type={showDeletePassword ? 'text' : 'password'}
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              placeholder="********"
                              className="h-11 pr-10 border-red-300 dark:border-red-800 focus:ring-red-500/20"
                            />
                            <button
                              type="button"
                              onClick={() => setShowDeletePassword(!showDeletePassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600"
                            >
                              {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 justify-end">
                        <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}>
                          {t.accountSettings.danger.cancelBtn}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDeleteAccount} disabled={saving}>
                          {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              {t.accountSettings.danger.confirmDeleteBtn}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
