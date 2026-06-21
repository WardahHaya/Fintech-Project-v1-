import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { LanguageContext, type AppLanguage, type LanguageContextValue } from './context'

const LANGUAGE_STORAGE_KEY = 'tiqmo-language'

function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored === 'ar' ? 'ar' : 'en'
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(readStoredLanguage)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      isArabic: language === 'ar',
      locale: language === 'ar' ? 'ar-SA' : 'en-GB',
      setLanguage,
      toggleLanguage: () => {
        setLanguage((current) => (current === 'ar' ? 'en' : 'ar'))
      },
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
