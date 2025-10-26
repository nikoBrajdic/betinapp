import { DashboardCard } from "@/components/dashboard-card"
import { FileText, CheckSquare, Calendar, Zap, DollarSign, Table, Home } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your household.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
        {/* Large featured card - spans 2 columns and 2 rows */}
        <DashboardCard
          title="Notes"
          icon={FileText}
          href="/notes"
          summary="3 notes • Last updated 2 hours ago"
          className="lg:col-span-2 lg:row-span-2"
          featured
        />

        {/* Medium cards - span 1 column, 2 rows */}
        <DashboardCard
          title="Tasks"
          icon={CheckSquare}
          href="/tasks"
          summary="5 tasks due this week • 2 in progress"
          className="lg:row-span-2"
        />

        <DashboardCard
          title="Calendar"
          icon={Calendar}
          href="/calendar"
          summary="Next event: Family dinner at 6pm"
          className="lg:row-span-2"
        />

        {/* Small cards - standard size */}
        <DashboardCard title="Utilities" icon={Zap} href="/utilities" summary="Electricity: 70% • Water: 45%" />

        <DashboardCard title="Bills" icon={DollarSign} href="/bills" summary="2 bills due this month • $150 total" />

        {/* Wide card - spans 2 columns */}
        <DashboardCard
          title="Tables"
          icon={Table}
          href="/tables"
          summary="Household inventory and data"
          className="lg:col-span-2"
        />

        <DashboardCard
          title="Guest Stays"
          icon={Home}
          href="/guest-stays"
          summary="1 upcoming guest • Check-in Nov 15"
        />
      </div>
    </div>
  )
}
