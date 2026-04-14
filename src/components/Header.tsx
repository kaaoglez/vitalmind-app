'use client';

import React from 'react';
import { useLanguage, Language } from '@/lib/i18n/LanguageContext';
import { useAuthStore } from '@/lib/auth/authStore';
import { Moon, Sun, Menu, Globe, LogOut, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ darkMode, onToggleDarkMode, onToggleSidebar }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, updateLanguage } = useAuthStore();
  const [langOpen, setLangOpen] = React.useState(false);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  const userInitials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-accent/10 text-sm text-muted-foreground transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
            <span className="sm:hidden">{currentLang.flag}</span>
          </button>

          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      updateLanguage(lang.code);
                      setLangOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                      language === lang.code
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-accent/10'
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

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg hover:bg-accent/10 text-muted-foreground transition-colors"
          title={darkMode ? t.header.lightMode : t.header.darkMode}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* User Profile Dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent/10 transition-colors ml-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-wellness-lavender flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{userInitials}</span>
                </div>
                <span className="hidden md:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>{t.common.profile}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                onClick={() => logout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{t.common.logout}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
