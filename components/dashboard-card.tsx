import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface DashboardCardProps {
  title: string
  icon: LucideIcon
  href: string
  /** The one number worth reading at a glance. Omit when there isn't one. */
  metric?: string
  /** Short qualifier under the metric. Kept to two lines. */
  detail: string
  className?: string
  color?: keyof typeof colorMap
}

const colorMap = {
  blue:    { bg: "bg-blue-50",    icon: "bg-blue-500",    text: "text-blue-600",    border: "border-blue-100",    hover: "hover:border-blue-300" },
  violet:  { bg: "bg-violet-50",  icon: "bg-violet-500",  text: "text-violet-600",  border: "border-violet-100",  hover: "hover:border-violet-300" },
  emerald: { bg: "bg-emerald-50", icon: "bg-emerald-600", text: "text-emerald-700", border: "border-emerald-100", hover: "hover:border-emerald-300" },
  amber:   { bg: "bg-amber-50",   icon: "bg-amber-600",   text: "text-amber-700",   border: "border-amber-100",   hover: "hover:border-amber-300" },
  rose:    { bg: "bg-rose-50",    icon: "bg-rose-500",    text: "text-rose-600",    border: "border-rose-100",    hover: "hover:border-rose-300" },
  cyan:    { bg: "bg-cyan-50",    icon: "bg-cyan-600",    text: "text-cyan-700",    border: "border-cyan-100",    hover: "hover:border-cyan-300" },
  indigo:  { bg: "bg-indigo-50",  icon: "bg-indigo-500",  text: "text-indigo-600",  border: "border-indigo-100",  hover: "hover:border-indigo-300" },
  orange:  { bg: "bg-orange-50",  icon: "bg-orange-600",  text: "text-orange-700",  border: "border-orange-100",  hover: "hover:border-orange-300" },
  teal:    { bg: "bg-teal-50",    icon: "bg-teal-600",    text: "text-teal-700",    border: "border-teal-100",    hover: "hover:border-teal-300" },
  lime:    { bg: "bg-lime-50",    icon: "bg-lime-700",    text: "text-lime-700",    border: "border-lime-100",    hover: "hover:border-lime-300" },
}

export function DashboardCard({
  title, icon: Icon, href, metric, detail, className, color = "blue",
}: DashboardCardProps) {
  const c = colorMap[color]

  return (
    <Link href={href} className="min-w-0">
      <div
        className={cn(
          // Padding is the whole game on a 2-up phone grid: at 375px each tile
          // is ~163px wide, so p-6 would leave ~115px for text.
          "group relative flex h-full flex-col rounded-2xl border p-3.5 transition-all duration-200 md:p-5",
          c.bg, c.border, c.hover,
          "hover:shadow-md hover:-translate-y-0.5",
          className,
        )}
      >
        <div className="mb-2.5 flex items-start justify-between md:mb-3">
          <div className={cn("rounded-lg p-2 md:rounded-xl md:p-2.5", c.icon)}>
            <Icon className="h-4 w-4 text-white md:h-5 md:w-5" />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        <h3 className="truncate text-sm font-semibold text-gray-800 md:text-base">{title}</h3>

        {metric && (
          <p className={cn("mt-0.5 text-2xl font-bold leading-tight tabular-nums md:text-3xl", c.text)}>
            {metric}
          </p>
        )}

        <p
          className={cn(
            "mt-0.5 line-clamp-2 text-xs leading-snug md:text-[13px]",
            metric ? "text-gray-500" : c.text,
          )}
        >
          {detail}
        </p>
      </div>
    </Link>
  )
}
