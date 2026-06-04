"use client"

import { usePathname } from "next/navigation"
import { Plus } from "lucide-react"

const pageConfig: Record<string, { title: string; subtitle?: string; action?: string }> = {
  "/":             { title: "Dashboard", subtitle: "Making life at the coast easier, since 2026" },
  "/notes":        { title: "Notes",        subtitle: "Keep track of important information and reminders", action: "New Note" },
  "/tasks":        { title: "Tasks",        subtitle: "Household checklist — anyone can pitch in",        action: "New Task" },
  "/calendar":     { title: "Calendar",     subtitle: "Click on any date to view or add events",          action: "New Event" },
  "/utilities":    { title: "Utilities",    subtitle: "Readings and household bills" },
  "/bills":        { title: "Utilities",    subtitle: "Readings and household bills" },
  "/guest-stays":  { title: "Stays",  subtitle: "Family and friends coming to visit",  action: "New Stay" },
  "/diary":        { title: "Diary",  subtitle: "Household updates and memories",       action: "New Entry" },
  "/admin/manage": { title: "Admin Management", subtitle: "Manage users, invites and access control" },
}

export function TopBar() {
  const pathname = usePathname()

  const config =
    pageConfig[pathname] ??
    Object.entries(pageConfig).find(([key]) => pathname.startsWith(key) && key !== "/")?.[1] ??
    { title: "Betinapp" }

  const handleAction = () => {
    window.dispatchEvent(new CustomEvent("topbar:new"))
  }

  return (
    <div className="flex items-center justify-between px-2 py-1 flex-shrink-0 min-h-[48px]">
      <div>
        <h2 className="text-white font-bold text-2xl leading-tight">{config.title}</h2>
        {config.subtitle && (
          <p className="text-white/55 text-sm leading-tight mt-0.5">{config.subtitle}</p>
        )}
      </div>

      {config.action && (
        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#1a1464] text-sm font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {config.action}
        </button>
      )}
    </div>
  )
}
