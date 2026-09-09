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
  Zap,
  Home,
  BookOpen,
  Snowflake,
  Package,
  Settings,
  LogOut,
  RefreshCw,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { signOut } from "@/lib/actions/auth"
import { useT } from "@/lib/language"

const navigation = [
  { name: "Dashboard", tKey: "nav.dashboard", href: "/", icon: LayoutDashboard },
  { name: "Notes", tKey: "nav.notes", href: "/notes", icon: FileText },
  { name: "Tasks", tKey: "nav.tasks", href: "/tasks", icon: CheckSquare },
  { name: "Utilities", tKey: "nav.utilities", href: "/utilities", icon: Zap },
  { name: "Stays", tKey: "nav.stays", href: "/guest-stays", icon: Home },
  { name: "Diary", tKey: "nav.diary", href: "/diary", icon: BookOpen },
  { name: "Inventory", tKey: "nav.inventory", href: "/inventory", icon: Package },
  { name: "End of Season", tKey: "nav.season", href: "/season", icon: Snowflake },
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
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="text-white/40 hover:text-white text-xs px-1">‹</button>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="text-white/40 hover:text-white text-xs px-1">›</button>
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
            onClick={() => day && router.push("/guest-stays?view=calendar")}
            className={cn(
              "text-center text-[11px] py-1 rounded-md transition-colors",
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
  const t = useT()
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
  const role = user.profile?.role === "superadmin" ? t("role.superadmin") : t("role.admin")

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
        {/* Scrim — dims the page under the drawer and closes on tap. */}
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden={!mobileOpen}
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
            "motion-reduce:transition-none",
            mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
        />

        <aside
          className={cn(
            // Slides over the page rather than pushing it: the panel is fixed
            // and translates, so the content underneath never moves.
            "fixed left-0 top-0 z-50 h-dvh w-[86vw] max-w-[320px] flex flex-col",
            "bg-[#1a1464] border-r border-white/15 shadow-2xl",
            "transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform",
            "motion-reduce:transition-none",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center h-12 px-1.5 flex-shrink-0">
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title={t("sidebar.closeNav")}
            >
              <X className="h-5 w-5" />
            </button>
            <span className="ml-2 text-white font-bold text-lg tracking-wide">Betinapp</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              <nav className="px-2 py-1 flex flex-col gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors px-3",
                        isActive
                          ? "bg-white text-[#1a1464] shadow-sm"
                          : "text-white/75 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      <span>{t(item.tKey)}</span>
                    </Link>
                  )
                })}
                <Link
                  href="/admin/manage"
                  className={cn(
                    "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-colors px-3",
                    pathname === "/admin/manage"
                      ? "bg-white text-[#1a1464] shadow-sm"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Settings className="h-[18px] w-[18px] flex-shrink-0" />
                  <span>{t("nav.settings")}</span>
                </Link>
              </nav>

              <div className="mx-2 border-t border-white/10 mt-2" />
              <MiniCalendar />

              <div className="px-3 pb-3">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium">{t("sidebar.onlineNow")}</p>
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
                    className="flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors px-3 mt-1"
                  >
                    <RefreshCw className={cn("h-4 w-4 flex-shrink-0", checkingUpdates && "animate-spin")} />
                    <span>{checkingUpdates ? t("sidebar.checking") : t("sidebar.checkUpdates")}</span>
                  </button>
                )}
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 w-full py-2 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-white/10 transition-colors px-3 mt-1"
                  >
                    <LogOut className="h-4 w-4 flex-shrink-0" />
                    <span>{t("sidebar.signOut")}</span>
                  </button>
                </form>
              </div>
          </div>
        </aside>
      </div>

      <aside
        className={cn(
          // Width is the only thing that animates; labels cross-fade in place,
          // so nothing reflows or jumps mid-transition.
          "hidden md:flex flex-col flex-shrink-0 overflow-hidden",
          "transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          collapsed ? "w-[60px]" : "w-[220px]"
        )}
      >
      {/* Logo + toggle */}
      <div className="flex items-center h-14 mb-4 gap-2 px-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          title={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <span
          className={cn(
            "text-white font-bold text-xl tracking-wide select-none whitespace-nowrap",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
          )}
        >
          Betinapp
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? t(item.tKey) : undefined}
              className={cn(
                "flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium whitespace-nowrap overflow-hidden",
                "transition-colors duration-150",
                isActive
                  ? "bg-white text-[#1a1464] shadow-sm"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span
                className={cn(
                  "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
                )}
              >
                {t(item.tKey)}
              </span>
            </Link>
          )
        })}

        <div className="my-2 border-t border-white/10" />
        <Link
          href="/admin/manage"
          title={collapsed ? t("nav.settings") : undefined}
          className={cn(
            "flex items-center gap-3 py-2.5 px-3 rounded-xl text-sm font-medium whitespace-nowrap overflow-hidden",
            "transition-colors duration-150",
            pathname === "/admin/manage"
              ? "bg-white text-[#1a1464] shadow-sm"
              : "text-white/65 hover:text-white hover:bg-white/10"
          )}
        >
          <Settings className="h-[18px] w-[18px] flex-shrink-0" />
          <span
            className={cn(
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
            )}
          >
            {t("nav.settings")}
          </span>
        </Link>
      </nav>

      {/* Mini calendar — collapses rather than disappearing, so the footer
          below it slides instead of snapping. */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "motion-reduce:transition-none",
          collapsed ? "max-h-0 opacity-0" : "max-h-72 opacity-100 delay-75"
        )}
        aria-hidden={collapsed}
      >
        <div className="mx-2 border-t border-white/10 mt-2" />
        <MiniCalendar />
      </div>

      {/* Online now */}
      {others.length > 0 && (
        <div className="px-3 pb-3 overflow-hidden">
          <p
            className={cn(
              "text-[10px] text-white/30 uppercase tracking-widest mb-2 font-medium whitespace-nowrap",
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
            )}
          >
            {t("sidebar.onlineNow")}
          </p>
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
        <div className="flex items-center gap-3 mb-1 px-1 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ minWidth: 32 }}>
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover rounded-full" referrerPolicy="no-referrer" />
              : <span className="text-xs font-semibold text-white">{initials}</span>
            }
          </div>
          <div
            className={cn(
              "flex-1 min-w-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
            )}
          >
            <p className="text-sm font-medium text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-white/50 truncate leading-tight">{role}</p>
          </div>
        </div>
        {hasElectronUpdater && (
          <button
            type="button"
            onClick={handleCheckUpdates}
            title={t("sidebar.checkUpdates")}
            className={"flex items-center gap-3 w-full py-2 px-3 mt-1 rounded-xl text-xs font-medium whitespace-nowrap overflow-hidden text-white/50 hover:text-white hover:bg-white/10 transition-colors"}
          >
            <RefreshCw className={cn("h-4 w-4 flex-shrink-0", checkingUpdates && "animate-spin")} />
            <span className={cn(
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
            )}>
              {checkingUpdates ? t("sidebar.checking") : t("sidebar.checkUpdates")}
            </span>
          </button>
        )}
        <form action={signOut}>
          <button
            type="submit"
            title={t("sidebar.signOut")}
            className={"flex items-center gap-3 w-full py-2 px-3 mt-1 rounded-xl text-xs font-medium whitespace-nowrap overflow-hidden text-white/50 hover:text-white hover:bg-white/10 transition-colors"}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={cn(
              "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
              collapsed ? "opacity-0 -translate-x-1" : "opacity-100 translate-x-0 delay-100"
            )}>{t("sidebar.signOut")}</span>
          </button>
        </form>
      </div>
      </aside>
    </>
  )
}
