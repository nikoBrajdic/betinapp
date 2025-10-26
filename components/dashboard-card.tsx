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
}

export function DashboardCard({ title, icon: Icon, href, summary, className, featured }: DashboardCardProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "group relative p-6 bg-card border border-border rounded-lg shadow-sm",
          "hover:shadow-md hover:border-primary/50 transition-all duration-200",
          "cursor-pointer h-full flex flex-col",
          featured && "bg-gradient-to-br from-primary/5 to-primary/10",
          className,
        )}
      >
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2 bg-primary/10 rounded-lg", featured && "p-3")}>
            <Icon className={cn("h-6 w-6 text-primary", featured && "h-8 w-8")} />
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="flex-1">
          <h3
            className={cn(
              "font-semibold text-foreground mb-2 group-hover:text-primary transition-colors",
              featured ? "text-2xl" : "text-lg",
            )}
          >
            {title}
          </h3>

          <p className={cn("text-sm text-muted-foreground leading-relaxed", featured && "text-base")}>{summary}</p>
        </div>
      </div>
    </Link>
  )
}
