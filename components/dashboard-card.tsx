import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"

interface DashboardCardProps {
  title: string
  icon: LucideIcon
  href: string
  summary: string
  className?: string
  featured?: boolean
  color?: "blue" | "violet" | "emerald" | "amber" | "rose" | "cyan" | "indigo" | "orange"
}

const colorMap = {
  blue:    { bg: "bg-blue-50",    icon: "bg-blue-500",    text: "text-blue-600",   border: "border-blue-100",  hover: "hover:border-blue-300" },
  violet:  { bg: "bg-violet-50",  icon: "bg-violet-500",  text: "text-violet-600", border: "border-violet-100",hover: "hover:border-violet-300" },
  emerald: { bg: "bg-emerald-50", icon: "bg-emerald-500", text: "text-emerald-600",border: "border-emerald-100",hover:"hover:border-emerald-300" },
  amber:   { bg: "bg-amber-50",   icon: "bg-amber-500",   text: "text-amber-600",  border: "border-amber-100", hover: "hover:border-amber-300" },
  rose:    { bg: "bg-rose-50",    icon: "bg-rose-500",    text: "text-rose-600",   border: "border-rose-100",  hover: "hover:border-rose-300" },
  cyan:    { bg: "bg-cyan-50",    icon: "bg-cyan-500",    text: "text-cyan-600",   border: "border-cyan-100",  hover: "hover:border-cyan-300" },
  indigo:  { bg: "bg-indigo-50",  icon: "bg-indigo-500",  text: "text-indigo-600", border: "border-indigo-100",hover: "hover:border-indigo-300" },
  orange:  { bg: "bg-orange-50",  icon: "bg-orange-500",  text: "text-orange-600", border: "border-orange-100",hover: "hover:border-orange-300" },
}

export function DashboardCard({ title, icon: Icon, href, summary, className, featured, color = "blue" }: DashboardCardProps) {
  const c = colorMap[color]

  return (
    <Link href={href} className="cursor-pointer">
      <div
        className={cn(
          "group relative p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer h-full flex flex-col",
          c.bg, c.border, c.hover,
          "hover:shadow-md hover:-translate-y-0.5",
          className,
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl", c.icon, featured && "p-3")}>
            <Icon className={cn("h-5 w-5 text-white", featured && "h-7 w-7")} />
          </div>
          <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex-1">
          <h3 className={cn("font-semibold text-gray-800 mb-1.5", featured ? "text-2xl" : "text-lg")}>
            {title}
          </h3>
          <p className={cn("text-sm leading-relaxed", c.text, featured && "text-base")}>
            {summary}
          </p>
        </div>
      </div>
    </Link>
  )
}
