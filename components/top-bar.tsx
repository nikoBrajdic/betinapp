"use client"

import { usePathname } from "next/navigation"
import { ChevronsRight, Plus } from "lucide-react"

const pageConfig: Record<string, { title: string; subtitle?: string; action?: string }> = {
  "/":             { title: "Dashboard", subtitle: "Making life at the coast easier, since 2026" },
  "/notes":        { title: "Notes",        subtitle: "Keep track of important information and reminders", action: "New Note" },
  "/tasks":        { title: "Tasks",        subtitle: "Household checklist — anyone can pitch in",        action: "New Task" },
  "/calendar":     { title: "Calendar",     subtitle: "Click on any date to view or add events",          action: "New Event" },
  "/utilities":    { title: "Utilities",    subtitle: "Readings and household bills" },
  "/bills":        { title: "Utilities",    subtitle: "Readings and household bills" },
  "/guest-stays":  { title: "Stays",  subtitle: "Family and friends coming to visit",  action: "New Stay" },
  "/diary":        { title: "Diary",  subtitle: "Household updates and memories",       action: "New Entry" },
  "/admin/manage": { title: "Manage Users", subtitle: "Manage users, invites and access control" },
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

  const handleMobileSidebarToggle = () => {
    window.dispatchEvent(new CustomEvent("sidebar:toggle-mobile"))
  }

  return (
    <div className="flex items-center justify-between px-1 md:px-2 py-1 flex-shrink-0 min-h-[44px] md:min-h-[48px]">
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMobileSidebarToggle}
            className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
            title="Open navigation"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
          <h2 className="text-white font-bold text-xl md:text-2xl leading-tight">{config.title}</h2>
        </div>
        {config.subtitle && (
          <p className="hidden sm:block text-white/55 text-xs md:text-sm leading-tight mt-0.5">{config.subtitle}</p>
        )}
      </div>

      {config.action && (
        <button
          onClick={handleAction}
          className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 bg-white text-[#1a1464] text-xs md:text-sm font-semibold rounded-lg md:rounded-xl hover:bg-white/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {config.action}
        </button>
      )}
    </div>
  )
}
