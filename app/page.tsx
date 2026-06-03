import { DashboardCard } from "@/components/dashboard-card"
import { FileText, CheckSquare, Calendar, Zap, DollarSign, Home } from "lucide-react"
import { getNotes } from "@/lib/actions/notes"
import { getTaskGroups } from "@/lib/actions/tasks"
import { getEvents } from "@/lib/actions/events"
import { getBills } from "@/lib/actions/bills"
import { getGuestStays } from "@/lib/actions/guest-stays"
import { formatDistanceToNow } from "date-fns"

export default async function DashboardPage() {
  const [notes, taskGroups, events, bills, guestStays] = await Promise.all([
    getNotes().catch(() => []),
    getTaskGroups().catch(() => []),
    getEvents().catch(() => []),
    getBills().catch(() => []),
    getGuestStays().catch(() => []),
  ])

  // Notes summary
  const noteCount = notes.length
  const lastNote = notes[0]
  const textNotes = notes.filter((n: any) => n.type !== "table").length
  const notesSummary = noteCount === 0
    ? "No notes yet"
    : `${textNotes} text • ${tableNotes.length} table${noteCount > 0 ? ` • Updated ${formatDistanceToNow(new Date(lastNote.updated_at), { addSuffix: true })}` : ""}`

  // Tasks summary
  const allTasks = taskGroups.flatMap((g: any) => g.tasks ?? [])
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter((t: any) => t.completed).length
  const tasksSummary = totalTasks === 0
    ? "No tasks yet"
    : `${completedTasks}/${totalTasks} completed`

  // Calendar summary
  const today = new Date().toISOString().split("T")[0]
  const nextEvent = events.find((e: any) => e.start_date >= today)
  const calendarSummary = nextEvent
    ? `Next: ${nextEvent.title}${nextEvent.time ? ` at ${nextEvent.time}` : ""}`
    : "No upcoming events"

  // Bills summary
  const unpaidBills = bills.filter((b: any) => !b.paid)
  const unpaidTotal = unpaidBills.reduce((sum: number, b: any) => sum + Number(b.amount), 0)
  const billsSummary = unpaidBills.length === 0
    ? "All bills paid"
    : `${unpaidBills.length} unpaid • €${unpaidTotal.toFixed(0)} total`

  // Notes table count for summary
  const tableNotes = notes.filter((n: any) => n.type === "table")

  // Guest stays summary
  const upcomingStays = guestStays.filter((s: any) => s.status === "upcoming" || s.from_date >= today)
  const guestSummary = upcomingStays.length === 0
    ? "No upcoming guests"
    : `${upcomingStays.length} upcoming stay${upcomingStays.length !== 1 ? "s" : ""}`

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
        <DashboardCard title="Notes" icon={FileText} href="/notes" summary={notesSummary} className="lg:col-span-2 lg:row-span-2" featured color="indigo" />
        <DashboardCard title="Tasks" icon={CheckSquare} href="/tasks" summary={tasksSummary} className="lg:row-span-2" color="violet" />
        <DashboardCard title="Calendar" icon={Calendar} href="/calendar" summary={calendarSummary} className="lg:row-span-2" color="cyan" />
        <DashboardCard title="Bills" icon={DollarSign} href="/bills" summary={billsSummary} color="amber" />
        <DashboardCard title="Utilities" icon={Zap} href="/utilities" summary="Track household utility usage" color="emerald" />
        <DashboardCard title="Guest Stays" icon={Home} href="/guest-stays" summary={guestSummary} color="rose" />
      </div>
    </div>
  )
}
