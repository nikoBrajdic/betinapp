"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePresence } from "@/hooks/use-presence"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  Zap,
  Home,
  BookOpen,
  Settings,
  LogOut,
  RefreshCw,
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
  { name: "Stays", href: "/guest-stays", icon: Home },
  { name: "Diary", href: "/diary", icon: BookOpen },
]

interface SidebarProps {
  user: {
    email?: string
    avatarUrl?: string
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
  const monthName = current.toLocaleString("en-US", { month: "long" })
  // Monday-based weekday index (0 = Mon … 6 = Sun)
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
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
        {["M","T","W","T","F","S","S"].map((d, i) => (
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [hasElectronUpdater, setHasElectronUpdater] = useState(false)
  const [checkingUpdates, setCheckingUpdates] = useState(false)

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    if (email) return email.slice(0, 2).toUpperCase()
    return "U"
  }

  const initials = getInitials(user.profile?.full_name, user.email)
  const displayName = user.profile?.full_name || user.email?.split("@")[0] || "User"
  const role = user.profile?.role === "superadmin" ? "Super Admin" : "Admin"

  const online = usePresence({ name: displayName, email: user.email ?? "", initials, avatarUrl: user.avatarUrl })
  const others = online.filter(u => u.email !== user.email)

  useEffect(() => {
    const updaterAvailable = typeof window !== "undefined" && Boolean((window as any).electronAPI?.checkForUpdates)
    setHasElectronUpdater(updaterAvailable)
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    document.body.classList.toggle("mobile-sidebar-open", mobileOpen)
    return () => {
      document.body.classList.remove("mobile-sidebar-open")
    }
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    const handler = () => setMobileOpen(open => !open)
    window.addEventListener("sidebar:toggle-mobile", handler)
    return () => window.removeEventListener("sidebar:toggle-mobile", handler)
  }, [])

  const handleCheckUpdates = async () => {
    if (!hasElectronUpdater || checkingUpdates) return
    setCheckingUpdates(true)
    try {
      await (window as any).electronAPI.checkForUpdates()
    } catch (error) {
      console.error("Failed to check for updates:", error)
    } finally {
      setCheckingUpdates(false)
    }
  }

  return (
    <>
      <div className="md:hidden">
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-dvh transition-all duration-300 ease-out bg-[#1a1464] overflow-hidden",
            mobileOpen ? "w-screen border-r border-white/15" : "w-0 border-r-0"
          )}
        >
          <div className="flex items-center h-12 px-1.5">
            <button
              onClick={() => setMobileOpen(open => !open)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title={mobileOpen ? "Collapse navigation" : "Expand navigation"}
            >
              <ChevronsLeft className="h-4 w-4 transition-transform" />
            </button>
            {mobileOpen && <span className="ml-2 text-white font-bold text-lg tracking-wide">Betinapp</span>}
          </div>

          {mobileOpen && (
            <>
              <nav className="px-2 py-1 flex flex-col gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all px-3",
                        isActive
                          ? "bg-white text-[#1a1464] shadow-sm"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                {user.profile?.role === "superadmin" && (
                  <Link
                    href="/admin/manage"
                    className={cn(
                      "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all px-3",
                      pathname === "/admin/manage"
                        ? "bg-white text-[#1a1464] shadow-sm"
                        : "text-white/75 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Settings className="h-[18px] w-[18px] flex-shrink-0" />
                    <span>Manage Users</span>
                  </Link>
                )}
              </nav>

              <div className="mx-2 border-t border-white/10 mt-2" />
              <MiniCalendar />

              <div className="px-3 pb-3">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium">Online now</p>
                <div className="flex flex-wrap gap-1.5">
                  {others.map(u => (
                    <div key={u.email} title={u.name} className="relative h-7 w-7 flex-shrink-0">
                      <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          : <span className="text-[10px] font-semibold text-white">{u.initials}</span>
                        }
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1a1464]" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-2 pb-2 pt-3 border-t border-white/10 mt-auto">
                <div className="flex items-center gap-3 mb-1 px-3">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ minWidth: 32 }}>
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      : <span className="text-xs font-semibold text-white">{initials}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
                    <p className="text-xs text-white/50 truncate leading-tight">{role}</p>
                  </div>
                </div>
                {hasElectronUpdater && (
                  <button
                    type="button"
                    onClick={handleCheckUpdates}
                    className="flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all px-3 mt-1"
                  >
                    <RefreshCw className={cn("h-4 w-4 flex-shrink-0", checkingUpdates && "animate-spin")} />
                    <span>{checkingUpdates ? "Checking..." : "Check for updates"}</span>
                  </button>
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all px-3 mt-1"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span>Sign out</span>
                  </button>
                </form>
              </div>
            </>
          )}
        </aside>
        <div className="h-0" />
      </div>

      <aside
        className={cn(
          "hidden md:flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out",
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
              {!collapsed && <span>Manage Users</span>}
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

      {/* Online now */}
      {others.length > 0 && (
        <div className={cn("px-3 pb-3", collapsed && "px-2 flex justify-center")}>
          {!collapsed && (
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium">Online now</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {others.map(u => (
              <div
                key={u.email}
                title={u.name}
                className="relative h-7 w-7 flex-shrink-0"
              >
                <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    : <span className="text-[10px] font-semibold text-white">{u.initials}</span>
                  }
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#1a1464]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User + sign out */}
      <div className="px-2 pb-2 pt-4 border-t border-white/10 mt-4">
        <div className={cn(
          "flex items-center gap-3 mb-1",
          collapsed && "justify-center"
        )}>
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ minWidth: 32 }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
              : <span className="text-xs font-semibold text-white">{initials}</span>
            }
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
              <p className="text-xs text-white/50 truncate leading-tight">{role}</p>
            </div>
          )}
        </div>
        {hasElectronUpdater && (
          <button
            type="button"
            onClick={handleCheckUpdates}
            title="Check for updates"
            className={cn(
              "flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-all",
              collapsed ? "justify-center px-0" : "px-3 mt-1"
            )}
          >
            <RefreshCw className={cn("h-4 w-4 flex-shrink-0", checkingUpdates && "animate-spin")} />
            {!collapsed && <span>{checkingUpdates ? "Checking..." : "Check for updates"}</span>}
          </button>
        )}
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
    </>
  )
}
