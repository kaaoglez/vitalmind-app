'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Brain, Apple, Dumbbell, Droplets, Moon, Target, BarChart3,
  Globe, Menu, X, ChevronRight, Star, Shield, Zap, Users, CheckCircle2,
  Sparkles, ArrowRight, Play, Lock, Smartphone, Monitor, Phone, AlertTriangle, LogIn,
  FlaskConical, MessageCircleQuestion, Activity, ClipboardCheck, Lightbulb, Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();
  const { setShowAuthModal, updateLanguage } = useAuthStore();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Rotating quotes for the dynamic quotes section
  const quoteCategories = ['quotes', 'tips', 'affirmations'] as const;
  const [activeQuoteCategory, setActiveQuoteCategory] = useState<typeof quoteCategories[number]>('quotes');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex(prev => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const langs = [
    { code: 'en' as const, flag: '🇺🇸', label: 'English' },
    { code: 'es' as const, flag: '🇪🇸', label: 'Español' },
    { code: 'pt' as const, flag: '🇧🇷', label: 'Português' },
    { code: 'fr' as const, flag: '🇫🇷', label: 'Français' },
    { code: 'zh' as const, flag: '🇨🇳', label: '中文' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ===== NAVBAR ===== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-card/80 backdrop-blur-xl shadow-sm border-b border-border' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wellness-teal to-wellness-emerald flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-foreground">VitalMind</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.landing.nav.features}</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.landing.nav.howItWorks}</a>
              <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.landing.nav.pricing}</a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t.landing.nav.faq}</a>
              <button
                onClick={() => setShowCrisisModal(true)}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                {t.landing.nav.crisisNumbers}
              </button>
            </div>

            {/* Right section: Language + Auth + Hamburger — always visible */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Language Selector — always visible, click-to-open */}
              <div className="relative">
                <button
                  onClick={() => { setLangOpen(!langOpen); setMobileMenu(false); }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">{langs.find(l => l.code === language)?.flag} {language.toUpperCase()}</span>
                  <span className="sm:hidden">{langs.find(l => l.code === language)?.flag}</span>
                </button>

                {/* Language dropdown — works on both mobile and desktop */}
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                      {langs.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => { setLanguage(lang.code); updateLanguage(lang.code); setLangOpen(false); }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${
                            language === lang.code ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-accent/10'
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.label}</span>
                          {language === lang.code && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Auth buttons — always visible, compact on mobile */}
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setShowAuthModal('login')}>
                {t.landing.nav.login}
              </Button>
              <button
                className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                onClick={() => setShowAuthModal('login')}
                title={t.landing.nav.login}
              >
                <LogIn className="w-4 h-4" />
              </button>
              <Button size="sm" onClick={() => setShowAuthModal('register')}>
                <span className="sm:hidden text-xs">{t.landing.nav.getStarted}</span>
                <span className="hidden sm:inline">{t.landing.nav.getStarted}</span>
              </Button>

              {/* Hamburger — mobile only, for nav links */}
              <button className="md:hidden p-2 rounded-lg hover:bg-accent/10 transition-colors" onClick={() => { setMobileMenu(!mobileMenu); setLangOpen(false); }}>
                {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu — navigation links only (language & auth are in the navbar) */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border"
            >
              <div className="px-4 py-3 space-y-1">
                <a href="#features" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors">{t.landing.nav.features}</a>
                <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors">{t.landing.nav.howItWorks}</a>
                <a href="#pricing" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors">{t.landing.nav.pricing}</a>
                <a href="#faq" onClick={() => setMobileMenu(false)} className="block px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors">{t.landing.nav.faq}</a>
                <button
                  onClick={() => { setShowCrisisModal(true); setMobileMenu(false); }}
                  className="flex items-center gap-1.5 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium hover:bg-red-500/5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {t.landing.nav.crisisNumbers}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ===== CRISIS NUMBERS MODAL ===== */}
      <AnimatePresence>
        {showCrisisModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCrisisModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{t.crisisNumbers.title}</h2>
                  </div>
                  <button onClick={() => setShowCrisisModal(false)} className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Emergency banner */}
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3 flex items-start gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400 font-medium">{t.crisisNumbers.emergency}</p>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{t.crisisNumbers.description}</p>

                {/* Crisis Lines Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(t.mentalHealth.therapy.crisisByCountry as Array<{country: string; name: string; number: string}>).map((line, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border hover:border-red-300 dark:hover:border-red-800 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{line.country}</span>
                        <span className="text-sm font-medium text-foreground">{line.name}</span>
                      </div>
                      <a
                        href={`tel:${line.number.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {line.number}
                      </a>
                    </div>
                  ))}
                </div>

                {/* Supportive footer */}
                <div className="mt-5 text-center bg-gradient-to-br from-wellness-lavender/10 to-primary/10 rounded-xl p-4">
                  <Heart className="w-6 h-6 text-wellness-lavender mx-auto mb-2" />
                  <p className="text-sm text-foreground font-medium">{t.crisisNumbers.subtitle}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-wellness-lavender/5 to-wellness-emerald/5" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-wellness-lavender/10 rounded-full blur-3xl" />

        {/* Floating icons */}
        <motion.div className="absolute top-32 left-[15%] text-primary/20" animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity }}>
          <Brain className="w-10 h-10" />
        </motion.div>
        <motion.div className="absolute top-48 right-[20%] text-wellness-lavender/20" animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}>
          <Heart className="w-8 h-8" />
        </motion.div>
        <motion.div className="absolute bottom-40 left-[20%] text-cyan-500/20" animate={{ y: [0, -10, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}>
          <Droplets className="w-9 h-9" />
        </motion.div>
        <motion.div className="absolute bottom-32 right-[15%] text-wellness-emerald/20" animate={{ y: [0, -14, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}>
          <Apple className="w-8 h-8" />
        </motion.div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-wellness-amber" />
                {t.landing.hero.badge}
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground leading-tight">
              {t.landing.hero.title1}{' '}
              <span className="bg-gradient-to-r from-primary to-wellness-lavender bg-clip-text text-transparent">
                {t.landing.hero.titleAccent}
              </span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t.landing.hero.subtitle}
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" onClick={() => setShowAuthModal('register')}>
                {t.landing.hero.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <a href="#features">
                  <Play className="w-4 h-4 mr-2" />
                  {t.landing.hero.ctaSecondary}
                </a>
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div variants={fadeInUp} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-wellness-amber text-wellness-amber" />)}
                <span className="ml-1">4.9/5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {t.landing.hero.users}
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                {t.landing.hero.secure}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.features.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.landing.features.subtitle}
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.landing.features.items.map((feature, i) => {
              const icons = [Brain, Apple, Dumbbell, Droplets, Moon, Activity, ClipboardCheck, Shield, Globe];
              const colors = [
                'from-wellness-lavender/20 to-wellness-purple/20 text-wellness-lavender',
                'from-emerald-500/20 to-green-500/20 text-emerald-500',
                'from-primary/20 to-wellness-teal/20 text-primary',
                'from-cyan-500/20 to-blue-500/20 text-cyan-500',
                'from-indigo-500/20 to-purple-500/20 text-indigo-500',
                'from-red-500/20 to-rose-500/20 text-red-500',
                'from-wellness-amber/20 to-orange-500/20 text-wellness-amber',
                'from-wellness-emerald/20 to-teal-500/20 text-wellness-emerald',
                'from-rose-500/20 to-pink-500/20 text-rose-500',
              ];
              const Icon = icons[i] || Brain;
              const isPrimary = i === 0;
              return (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className={`h-full hover:shadow-lg transition-all duration-300 group ${isPrimary ? 'border-wellness-lavender/30 ring-1 ring-wellness-lavender/20' : ''}`}>
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[i]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                      {isPrimary && <Badge className="mt-3 text-xs" variant="secondary">{t.landing.features.primary}</Badge>}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== MENTAL HEALTH FOCUS ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-wellness-lavender/5 via-primary/5 to-wellness-emerald/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.mentalFocus.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.landing.mentalFocus.subtitle}
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.landing.mentalFocus.items.map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-wellness-lavender/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-wellness-lavender" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-12 text-center">
            <blockquote className="text-xl sm:text-2xl font-medium text-foreground italic">
              &ldquo;{t.landing.mentalFocus.quote}&rdquo;
            </blockquote>
          </motion.div>
        </div>
      </section>

      {/* ===== SCIENTIFIC ASSESSMENTS ===== */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-primary/5 via-wellness-teal/5 to-wellness-emerald/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2 mb-4">
              <FlaskConical className="w-6 h-6 text-primary" />
              <Badge variant="secondary" className="text-sm">{t.landing.scientificAssessments.title}</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.scientificAssessments.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.landing.scientificAssessments.subtitle}
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(t.landing.scientificAssessments.items as Array<{name: string; fullName: string; desc: string}>).map((item, i) => {
              const assessmentIcons = [Brain, Heart, Activity, Moon, Apple, Shield];
              const assessmentColors = [
                'from-wellness-lavender/20 to-wellness-purple/20 text-wellness-lavender',
                'from-rose-500/20 to-red-500/20 text-rose-500',
                'from-primary/20 to-wellness-teal/20 text-primary',
                'from-indigo-500/20 to-purple-500/20 text-indigo-500',
                'from-emerald-500/20 to-green-500/20 text-emerald-500',
                'from-wellness-amber/20 to-orange-500/20 text-wellness-amber',
              ];
              const AIcon = assessmentIcons[i] || FlaskConical;
              return (
                <motion.div key={i} variants={fadeInUp}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${assessmentColors[i]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <AIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-lg">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">{item.fullName}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== DYNAMIC QUOTES ===== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2 mb-4">
              <MessageCircleQuestion className="w-6 h-6 text-wellness-amber" />
              <Badge variant="secondary" className="text-sm">{t.landing.dynamicQuotes.title}</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.dynamicQuotes.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.landing.dynamicQuotes.subtitle}
            </motion.p>
          </motion.div>

          {/* Category tabs */}
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex items-center justify-center gap-3 mb-10">
            {quoteCategories.map(cat => {
              const catIcons = { quotes: MessageCircleQuestion, tips: Lightbulb, affirmations: Sun };
              const CatIcon = catIcons[cat];
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveQuoteCategory(cat); setCurrentQuoteIndex(0); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeQuoteCategory === cat
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <CatIcon className="w-4 h-4" />
                  {t.landing.dynamicQuotes.categories[cat]}
                </button>
              );
            })}
          </motion.div>

          {/* Rotating quote card */}
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Card className="max-w-2xl mx-auto overflow-hidden">
              <CardContent className="p-8 sm:p-10 text-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuoteIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex justify-center mb-4">
                      {activeQuoteCategory === 'quotes' && <MessageCircleQuestion className="w-8 h-8 text-primary" />}
                      {activeQuoteCategory === 'tips' && <Lightbulb className="w-8 h-8 text-wellness-amber" />}
                      {activeQuoteCategory === 'affirmations' && <Sun className="w-8 h-8 text-wellness-lavender" />}
                    </div>
                    <p className="text-lg sm:text-xl font-medium text-foreground leading-relaxed">
                      {activeQuoteCategory === 'quotes' && (t.dashboard.quotes as string[])[currentQuoteIndex % (t.dashboard.quotes as string[]).length]}
                      {activeQuoteCategory === 'tips' && (t.dashboard.tips as string[])[currentQuoteIndex % (t.dashboard.tips as string[]).length]}
                      {activeQuoteCategory === 'affirmations' && (t.mentalHealth.emotional.dailyAffirmations as string[])[currentQuoteIndex % (t.mentalHealth.emotional.dailyAffirmations as string[]).length]}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          <motion.p variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-6 text-center text-sm text-muted-foreground">
            {t.landing.dynamicQuotes.description}
          </motion.p>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.howItWorks.title}
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.landing.howItWorks.steps.map((step, i) => {
              const icons = [Zap, Target, BarChart3];
              const Icon = icons[i];
              return (
                <motion.div key={i} variants={fadeInUp} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-wellness-lavender/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.testimonials.title}
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.landing.testimonials.items.map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-wellness-amber text-wellness-amber" />)}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-4 italic">&ldquo;{item.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-wellness-lavender/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{item.name[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.pricing.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground">
              {t.landing.pricing.subtitle}
            </motion.p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground">{t.landing.pricing.free.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">$0</span>
                    <span className="text-muted-foreground">/{t.landing.pricing.forever}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{t.landing.pricing.free.desc}</p>
                  <ul className="mt-6 space-y-3">
                    {t.landing.pricing.free.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-8" variant="outline" onClick={() => setShowAuthModal('register')}>
                    {t.landing.pricing.free.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Premium */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full border-primary ring-2 ring-primary/20 relative">
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t.landing.pricing.popular}</Badge>
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-foreground">{t.landing.pricing.premium.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">$9.99</span>
                    <span className="text-muted-foreground">/{t.landing.pricing.month}</span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{t.landing.pricing.premium.desc}</p>
                  <ul className="mt-6 space-y-3">
                    {t.landing.pricing.premium.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full mt-8" onClick={() => setShowAuthModal('register')}>
                    {t.landing.pricing.premium.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 sm:py-28 bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-12">
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.faq.title}
            </motion.h2>
          </motion.div>

          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Accordion type="single" collapsible className="w-full">
              {t.landing.faq.items.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold text-foreground">
              {t.landing.cta.title}
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              {t.landing.cta.subtitle}
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8">
              <Button size="lg" className="text-base px-10 h-13" onClick={() => setShowAuthModal('register')}>
                {t.landing.cta.button}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> {t.landing.cta.secure}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {t.landing.cta.private}</span>
              <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> {t.landing.cta.noCard}</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border py-12 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wellness-teal to-wellness-emerald flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg text-foreground">VitalMind</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm">{t.landing.footer.tagline}</p>
              <p className="text-xs text-muted-foreground mt-4 max-w-md">{t.footer.disclaimer}</p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">{t.landing.footer.product}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">{t.landing.nav.features}</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">{t.landing.nav.pricing}</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">{t.landing.nav.faq}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">{t.landing.footer.legal}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">{t.landing.footer.privacy}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t.landing.footer.terms}</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">{t.landing.footer.contact}</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} VitalMind. {t.landing.footer.rights}
          </div>
        </div>
      </footer>
    </div>
  );
}
