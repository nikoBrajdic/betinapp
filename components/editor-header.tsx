"use client"

import * as React from "react"
import { useNavigate, usePrefetch } from "@/lib/navigation"
import { ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { accent as accentTokens, type Accent } from "@/lib/design"

/**
 * Sticky chrome for the full-page editors.
 *
 * The back affordance used to be an inline link at the top of the document, so
 * it disappeared the moment you scrolled. This bar pins to the top of the
 * scroll container instead, and reveals the document title once the real title
 * has scrolled out of view.
 */
export function EditorHeader({
  backHref,
  backLabel,
  title,
  status,
  accent = "brand",
  actions,
  className,
}: {
  backHref: string
  backLabel: string
  /** Shown in the bar only after the page is scrolled. */
  title?: string
  /** Save state — "Saving…", "Saved 14:02". */
  status?: React.ReactNode
  accent?: Accent
  actions?: React.ReactNode
  className?: string
}) {
  const { navigate } = useNavigate()
  usePrefetch([backHref])
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const [scrolled, setScrolled] = React.useState(false)

  // A zero-height sentinel above the header tells us when the bar has stuck.
  React.useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([observed]) => setScrolled(!observed.isIntersecting),
      { threshold: 1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinelRef} className="h-px -mb-px" aria-hidden />
      <div
        className={cn(
          "sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 transition-all duration-200",
          scrolled
            ? "bg-white/85 backdrop-blur-md border-b border-gray-200 shadow-[0_1px_12px_rgba(0,0,0,0.04)]"
            : "bg-white border-b border-transparent",
          className,
        )}
      >
        <div className="flex items-center gap-3 h-14 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className={cn(
              "inline-flex items-center gap-1.5 h-8 pl-2 pr-3 rounded-lg text-sm font-medium",
              "border border-gray-200 bg-white text-gray-600 transition-colors flex-shrink-0",
              "hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              accentTokens(accent).ring,
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>

          {/* Title fades in once the document heading is out of view. */}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 transition-opacity duration-200",
              scrolled && title ? "opacity-100" : "opacity-0",
            )}
          >
            {title}
          </span>

          <div className="flex items-center gap-2 flex-shrink-0">
            {status && <span className="text-xs text-gray-400 tabular-nums">{status}</span>}
            {actions}
          </div>
        </div>
      </div>
    </>
  )
}
