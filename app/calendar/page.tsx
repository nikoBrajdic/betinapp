import { redirect } from "next/navigation"

/** The calendar is a tab inside Stays now. Old links and bookmarks still work. */
export default function CalendarPage() {
  redirect("/guest-stays?view=calendar")
}
