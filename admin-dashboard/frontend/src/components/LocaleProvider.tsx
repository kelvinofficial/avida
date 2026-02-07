'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';

type Locale = 'en' | 'es' | 'fr' | 'de';

type TranslationKeys = typeof en;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  availableLocales: { code: Locale; name: string; flag: string }[];
}

const translations: Record<Locale, TranslationKeys> = {
  en,
  es,
  fr,
  de,
};

const availableLocales = [
  { code: 'en' as Locale, name: 'English', flag: '🇺🇸' },
  { code: 'es' as Locale, name: 'Español', flag: '🇪🇸' },
  { code: 'fr' as Locale, name: 'Français', flag: '🇫🇷' },
  { code: 'de' as Locale, name: 'Deutsch', flag: '🇩🇪' },
];

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
  availableLocales,
});

export const useLocale = () => useContext(LocaleContext);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedLocale = localStorage.getItem('admin-locale') as Locale;
    if (savedLocale && ['en', 'es', 'fr', 'de'].includes(savedLocale)) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('admin-locale', newLocale);
  }, []);

  const t = useCallback((key: string): string => {
    const keys = key.split('.');
    let value: any = translations[locale];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        let fallback: any = translations['en'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return key; // Return key if not found in fallback
          }
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  }, [locale]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <LocaleContext.Provider value={{ locale: 'en', setLocale, t, availableLocales }}>
        {children}
      </LocaleContext.Provider>
    );
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </LocaleContext.Provider>
  );
}
