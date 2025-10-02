'use client'

import { createContext, useContext, useState } from 'react'

type Locale = 'tr' | 'en'

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

// Basit çeviri sistemi
const translations = {
  tr: {
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Hoş geldiniz',
    'dashboard.documents': 'Belgeler',
    'dashboard.widgets': 'Widget\'lar',
    'documents.upload': 'Dosya Yükle',
    'documents.title': 'Belgeler',
    'widgets.title': 'Widget\'lar',
    'auth.login': 'Giriş Yap',
    'auth.logout': 'Çıkış Yap',
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.delete': 'Sil',
    'common.edit': 'Düzenle',
  },
  en: {
    'dashboard.title': 'Dashboard',
    'dashboard.welcome': 'Welcome',
    'dashboard.documents': 'Documents',
    'dashboard.widgets': 'Widgets',
    'documents.upload': 'Upload File',
    'documents.title': 'Documents',
    'widgets.title': 'Widgets',
    'auth.login': 'Login',
    'auth.logout': 'Logout',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('tr')

  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations[typeof locale]] || key
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}