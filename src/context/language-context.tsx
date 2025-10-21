'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import translations from '@/lib/translations';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedLanguage = localStorage.getItem('language') as Language | null;
      if (storedLanguage && ['es', 'en'].includes(storedLanguage)) {
        setLanguageState(storedLanguage);
      }
    } catch (error) {
      console.error("Failed to access localStorage", error);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('language', lang);
    } catch (error) {
      console.error("Failed to access localStorage", error);
    }
  };

  const t = useCallback((key: string, replacements: Record<string, string> = {}): string => {
    const keys = key.split('.');
    let
      text: any = translations[language];
    for (const k of keys) {
      if (text && typeof text === 'object' && k in text) {
        text = text[k];
      } else {
        return key;
      }
    }

    if (typeof text === 'string') {
        return Object.entries(replacements).reduce(
            (acc, [placeholder, value]) => acc.replace(`{${placeholder}}`, value),
            text
        );
    }

    return key;
  }, [language]);
  

  useEffect(() => {
    if (isMounted) {
      document.documentElement.lang = language;
    }
  }, [language, isMounted]);

  if (!isMounted) {
    return null; 
  }

  const value = { language, setLanguage, t };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
