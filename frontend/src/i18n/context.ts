import { createContext } from 'react'


export type AppLanguage = 'en' | 'ar'

export interface LanguageContextValue {
  language: AppLanguage
  dir: 'ltr' | 'rtl'
  isArabic: boolean
  locale: string
  setLanguage: (language: AppLanguage) => void
  toggleLanguage: () => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
