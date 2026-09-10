"use client"

import { useEffect } from "react"
import { useNavigate } from "@/lib/navigation"

import { useT } from "@/lib/language"

import { PageShell } from "@/components/ui/page-shell"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { GuestStaysClient } from "./guest-stays-client"
import { CalendarClient } from "@/app/calendar/calendar-client"

export type StaysView = "stays" | "calendar"

/**
 * Stays and the calendar are two views of one thing.
 *
 * A guest stay already creates a linked calendar event, so the calendar was
 * mostly a second rendering of data this page owns — two sidebar entries for
 * one subject. They are tabs now.
 *
 * The shell owns the `PageShell` because the two views need different ones:
 * the calendar grid manages its own scrolling (`fill`), the stays list does
 * not. Leaving one in each client nested them and doubled the page padding.
 *
 * The view lives in the URL so a tab can be linked to — the dashboard card
 * deep-links straight to the calendar.
 */
export function StaysShell({
  view,
  guests,
  familyMembers,
  events,
}: {
  view: StaysView
  guests: React.ComponentProps<typeof GuestStaysClient>["guests"]
  familyMembers: React.ComponentProps<typeof GuestStaysClient>["familyMembers"]
  events: React.ComponentProps<typeof CalendarClient>["events"]
}) {
  const { navigate } = useNavigate()
  const t = useT()

  /**
   * The calendar tab's button opens a dialog that can create either a stay or
   * an event, so "New Stay" would be wrong. Relabelled through `topbar:action`,
   * the same mechanism Utilities uses for Readings vs Bills.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("topbar:action", { detail: view === "calendar" ? "New" : null }),
    )
  }, [view])

  return (
    <PageShell fill={view === "calendar"}>
      <div className="mb-4">
        <Segmented
          value={view}
          onValueChange={next =>
            navigate(next === "calendar" ? "/guest-stays?view=calendar" : "/guest-stays")
          }
          accent="stays"
        >
          <SegmentedItem value="stays">{t("nav.stays")}</SegmentedItem>
          <SegmentedItem value="calendar">{t("nav.calendar")}</SegmentedItem>
        </Segmented>
      </div>

      {/*
        Only the active view is mounted. Both register a `topbar:new` listener,
        and two of them would race over the same button.
      */}
      {view === "calendar" ? (
        <CalendarClient events={events} familyMembers={familyMembers} />
      ) : (
        <GuestStaysClient guests={guests} familyMembers={familyMembers} />
      )}
    </PageShell>
  )
}
