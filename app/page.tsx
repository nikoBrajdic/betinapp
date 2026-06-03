import { DashboardCard } from "@/components/dashboard-card"
import { FileText, CheckSquare, Calendar, Zap, Home, BookOpen } from "lucide-react"
import { getNotes } from "@/lib/actions/notes"
import { getTaskGroups } from "@/lib/actions/tasks"
import { getEvents } from "@/lib/actions/events"
import { getBills } from "@/lib/actions/bills"
import { getGuestStays } from "@/lib/actions/guest-stays"
import { getDiaryEntries } from "@/lib/actions/diary"
import { getUtilities } from "@/lib/actions/utilities"

export default async function DashboardPage() {
  const [notes, taskGroups, events, bills, guestStays, diaryEntries, utilities] = await Promise.all([
    getNotes().catch(() => []),
    getTaskGroups().catch(() => []),
    getEvents().catch(() => []),
    getBills().catch(() => []),
    getGuestStays().catch(() => []),
    getDiaryEntries().catch(() => []),
    getUtilities().catch(() => []),
  ])

  const today = new Date().toISOString().split("T")[0]
  const now = new Date()

  // Notes
  const noteCount = notes.length
  const tableNotes = notes.filter((n: any) => n.type === "table").length
  const textNotes = noteCount - tableNotes
  const notesSummary = noteCount === 0
    ? "No notes yet"
    : [textNotes > 0 && `${textNotes} note${textNotes !== 1 ? "s" : ""}`, tableNotes > 0 && `${tableNotes} table${tableNotes !== 1 ? "s" : ""}`].filter(Boolean).join(" · ")

  // Tasks
  const allTasks = taskGroups.flatMap((g: any) => g.tasks ?? [])
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter((t: any) => t.completed).length
  const pendingTasks = totalTasks - completedTasks
  const tasksSummary = totalTasks === 0
    ? "No tasks yet"
    : pendingTasks === 0
    ? `All ${totalTasks} tasks done ✓`
    : `${pendingTasks} pending · ${completedTasks}/${totalTasks} done`

  // Calendar
  const nextEvent = events.find((e: any) => e.start_date >= today)
  const calendarSummary = nextEvent
    ? `Next: ${nextEvent.title}${nextEvent.time ? ` at ${nextEvent.time}` : ""}`
    : "No upcoming events"

  // Utilities and bills
  const unpaidBills = bills.filter((b: any) => !b.paid)
  const unpaidTotal = unpaidBills.reduce((sum: number, b: any) => sum + Number(b.amount), 0)
  const readingUtilities = utilities.filter((u: any) => {
    const key = String(u.name).toLowerCase()
    return key.includes("water") || key.includes("voda") || key.includes("electric") || key.includes("struja")
  })
  const readingsLogged = readingUtilities.filter((u: any) => {
    if (!u.updated_at) return false
    const updated = new Date(u.updated_at)
    return updated.getFullYear() === now.getFullYear() && updated.getMonth() === now.getMonth()
  }).length
  const readingsSummary = readingUtilities.length === 0
    ? "No readings set up"
    : readingsLogged === readingUtilities.length
    ? `${now.toLocaleDateString("en-US", { month: "long" })} readings logged`
    : `${readingUtilities.length - readingsLogged} reading${readingUtilities.length - readingsLogged !== 1 ? "s" : ""} due`
  const billsSummary = unpaidBills.length === 0 ? "all bills paid" : `${unpaidBills.length} unpaid · €${unpaidTotal.toFixed(0)} due`
  const utilitySummary = `${readingsSummary} · ${billsSummary}`

  // Stays
  const currentStay = guestStays.find((s: any) => s.status === "current")
  const upcomingStays = guestStays.filter((s: any) => s.status === "upcoming")
  const staysSummary = currentStay
    ? `${currentStay.guest_name} is here now`
    : upcomingStays.length > 0
    ? `${upcomingStays.length} upcoming stay${upcomingStays.length !== 1 ? "s" : ""}`
    : "No upcoming stays"

  // Diary
  const diarySummary = diaryEntries.length === 0
    ? "No entries yet"
    : `${diaryEntries.length} entr${diaryEntries.length !== 1 ? "ies" : "y"} · Latest: ${diaryEntries[0].title}`

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <DashboardCard title="Notes"    icon={FileText}   href="/notes"        summary={notesSummary}   color="indigo" />
        <DashboardCard title="Tasks"    icon={CheckSquare}href="/tasks"        summary={tasksSummary}   color="violet" />
        <DashboardCard title="Calendar" icon={Calendar}   href="/calendar"     summary={calendarSummary}color="cyan"   />
        <DashboardCard title="Utilities"icon={Zap}        href="/utilities"    summary={utilitySummary} color="emerald"/>
        <DashboardCard title="Stays"    icon={Home}       href="/guest-stays"  summary={staysSummary}   color="rose"   />
        <DashboardCard title="Diary"    icon={BookOpen}   href="/diary"        summary={diarySummary}   color="orange" />
      </div>
    </div>
  )
}
