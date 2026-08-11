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

  // Common
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.edit": "Edit",

  // Diary — list
  "diary.emptyEntry": "Empty entry",
  "diary.noEntries": "No diary entries yet",
  "diary.newEntry": "New Entry",
  "diary.newEntryTitle": "New Diary Entry",
  "diary.titleLabel": "Title (e.g. 2025)",
  "diary.creating": "Creating…",
  "diary.create": "Create",

  // Diary — editor
  "diary.allEntries": "All entries",
  "diary.done": "Done",
  "diary.saving": "Saving…",
  "diary.saved": "Saved",
  "diary.titlePlaceholder": "Title…",
  "diary.headingPlaceholder": "Heading…",
  "diary.writeSomething": "Write something…",
  "diary.uploading": "Uploading…",
  "diary.dropOrClick": "Drop image or click to upload",
  "diary.dropToDiary": "Drop image to add to diary",
  "diary.toText": "To text",
  "diary.toHeading": "To heading",
  "diary.bold": "Bold",
  "diary.addImageBelow": "Add image below",
  "diary.addImageRowBelow": "Add image row below",
  "diary.addPhotoToRow": "Add photo to row",
  "diary.deleteBlock": "Delete block",
  "diary.deleteImageBlock": "Delete image block",
  "diary.replaceImage": "Replace image",
  "diary.deleteImage": "Delete image",
  "diary.add": "Add",
  "diary.text": "Text",
  "diary.heading": "Heading",
  "diary.image": "Image",
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

  // Common
  "common.cancel": "Odustani",
  "common.delete": "Obriši",
  "common.edit": "Uredi",

  // Diary — list
  "diary.emptyEntry": "Prazan unos",
  "diary.noEntries": "Još nema unosa u dnevnik",
  "diary.newEntry": "Novi unos",
  "diary.newEntryTitle": "Novi unos u dnevnik",
  "diary.titleLabel": "Naslov (npr. 2025)",
  "diary.creating": "Stvaram…",
  "diary.create": "Stvori",

  // Diary — editor
  "diary.allEntries": "Svi unosi",
  "diary.done": "Gotovo",
  "diary.saving": "Spremanje…",
  "diary.saved": "Spremljeno",
  "diary.titlePlaceholder": "Naslov…",
  "diary.headingPlaceholder": "Naslov…",
  "diary.writeSomething": "Napiši nešto…",
  "diary.uploading": "Učitavanje…",
  "diary.dropOrClick": "Ispusti sliku ili klikni za učitavanje",
  "diary.dropToDiary": "Ispusti sliku za dodavanje u dnevnik",
  "diary.toText": "U tekst",
  "diary.toHeading": "U naslov",
  "diary.bold": "Podebljano",
  "diary.addImageBelow": "Dodaj sliku ispod",
  "diary.addImageRowBelow": "Dodaj red slika ispod",
  "diary.addPhotoToRow": "Dodaj fotografiju u red",
  "diary.deleteBlock": "Obriši blok",
  "diary.deleteImageBlock": "Obriši blok slika",
  "diary.replaceImage": "Zamijeni sliku",
  "diary.deleteImage": "Obriši sliku",
  "diary.add": "Dodaj",
  "diary.text": "Tekst",
  "diary.heading": "Naslov",
  "diary.image": "Slika",
}

export const translations: Record<Language, Dict> = { en, hr }
