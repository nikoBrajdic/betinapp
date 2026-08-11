import type { Language } from "@/lib/language"

// Flat key → string dictionaries, one per language. English is the source/fallback.
// Add keys section by section as pages are translated.
type Dict = Record<string, string>

const en: Dict = {
  // Sidebar navigation
  "nav.dashboard": "Dashboard",
  "nav.notes": "Notes",
  "nav.tasks": "Tasks",
  "nav.calendar": "Calendar",
  "nav.utilities": "Utilities",
  "nav.stays": "Stays",
  "nav.diary": "Diary",
  "nav.settings": "Settings",

  // Sidebar chrome
  "sidebar.onlineNow": "Online now",
  "sidebar.checkUpdates": "Check for updates",
  "sidebar.checking": "Checking...",
  "sidebar.signOut": "Sign out",
  "sidebar.expand": "Expand sidebar",
  "sidebar.collapse": "Collapse sidebar",
  "sidebar.openNav": "Expand navigation",
  "sidebar.closeNav": "Collapse navigation",

  // Roles
  "role.superadmin": "Super Admin",
  "role.admin": "Admin",
}

const hr: Dict = {
  // Sidebar navigation
  "nav.dashboard": "Nadzorna ploča",
  "nav.notes": "Bilješke",
  "nav.tasks": "Zadaci",
  "nav.calendar": "Kalendar",
  "nav.utilities": "Režije",
  "nav.stays": "Boravci",
  "nav.diary": "Dnevnik",
  "nav.settings": "Postavke",

  // Sidebar chrome
  "sidebar.onlineNow": "Trenutno online",
  "sidebar.checkUpdates": "Provjeri ažuriranja",
  "sidebar.checking": "Provjeravam...",
  "sidebar.signOut": "Odjava",
  "sidebar.expand": "Proširi izbornik",
  "sidebar.collapse": "Sažmi izbornik",
  "sidebar.openNav": "Otvori navigaciju",
  "sidebar.closeNav": "Zatvori navigaciju",

  // Roles
  "role.superadmin": "Superadmin",
  "role.admin": "Administrator",
}

export const translations: Record<Language, Dict> = { en, hr }
