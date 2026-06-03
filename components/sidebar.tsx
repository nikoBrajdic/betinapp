"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  Zap,
  DollarSign,
  Home,
  Settings,
  LogOut,
  ChevronsLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/actions/auth"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Utilities", href: "/utilities", icon: Zap },
  { name: "Bills", href: "/bills", icon: DollarSign },
  { name: "Stays", href: "/guest-stays", icon: Home },
]

interface SidebarProps {
  user: {
    email?: string
    profile?: {
      full_name?: string
      role: string
    }
  }
}

function MiniCalendar() {
  const router = useRouter()
  const today = new Date()
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const year = current.getFullYear()
  const month = current.getMonth()
  const monthName = current.toLocaleString("default", { month: "long" })
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  return (
    <div className="mt-2 mb-4 px-2">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-white/80 text-xs font-medium">{monthName} {year}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="text-white/40 hover:text-white text-xs px-1 cursor-pointer">‹</button>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="text-white/40 hover:text-white text-xs px-1 cursor-pointer">›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-white/30 text-[10px] font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => (
          <button
            key={i}
            onClick={() => day && router.push("/calendar")}
            className={cn(
              "text-center text-[11px] py-1 rounded-md transition-colors cursor-pointer",
              !day && "invisible",
              day && isCurrentMonth && day === today.getDate()
                ? "bg-white text-[#1a1464] font-bold"
                : day
                ? "text-white/60 hover:bg-white/10 hover:text-white"
                : ""
            )}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "U"
  }

  const initials = getInitials(user.profile?.full_name, user.email)
  const displayName = user.profile?.full_name || user.email?.split("@")[0] || "User"
  const role = user.profile?.role === "superadmin" ? "Super Admin" : "Admin"

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        "flex items-center h-14 mb-4 gap-2",
        collapsed ? "justify-center px-0" : "px-3"
      )}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
        {!collapsed && (
          <span className="text-white font-bold text-xl tracking-wide select-none">
            Betinapp
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                isActive
                  ? "bg-white text-[#1a1464] shadow-sm"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {user.profile?.role === "superadmin" && (
          <>
            <div className="my-2 border-t border-white/10" />
            <Link
              href="/admin/manage"
              title={collapsed ? "Manage Admins" : undefined}
              className={cn(
                "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center px-0" : "px-3",
                pathname === "/admin/manage"
                  ? "bg-white text-[#1a1464] shadow-sm"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              )}
            >
              <Settings className="h-[18px] w-[18px] flex-shrink-0" />
              {!collapsed && <span>Manage Admins</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Mini calendar (only when expanded) */}
      {!collapsed && (
        <>
          <div className="mx-2 border-t border-white/10 mt-2" />
          <MiniCalendar />
        </>
      )}

      {/* User + sign out */}
      <div className="px-2 pb-2 pt-4 border-t border-white/10 mt-4">
        <div className={cn(
          "flex items-center gap-3 mb-1",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
              <p className="text-xs text-white/50 truncate leading-tight">{role}</p>
            </div>
          )}
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className={cn(
              "flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all",
              collapsed ? "justify-center px-0" : "px-3 mt-1"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
