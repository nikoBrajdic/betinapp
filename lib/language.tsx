"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { translations } from "@/lib/translations"

export type Language = "en" | "hr"

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hr: "Hrvatski",
}

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue>({ lang: "en", setLang: () => {} })

const STORAGE_KEY = "betinapp-lang"

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "hr"
}

function persist(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
    // Cookie too, so the preference is readable server-side once strings get translated.
    document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`
  } catch {
    // Storage can be unavailable (private mode); the in-memory value still works for the session.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to English on the server; the saved preference is applied on mount to avoid a hydration mismatch.
  const [lang, setLangState] = useState<Language>("en")

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (isLanguage(saved)) setLangState(saved)
    } catch {
      // ignore
    }
  }, [])

  const setLang = (next: Language) => {
    setLangState(next)
    persist(next)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

// Translate a key for the current language, falling back to English, then the key itself.
export function useT() {
  const { lang } = useLanguage()
  return (key: string) => translations[lang][key] ?? translations.en[key] ?? key
}
