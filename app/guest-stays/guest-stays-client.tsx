"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Copy, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { PageShell } from "@/components/ui/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Pill } from "@/components/ui/pill"
import { cn } from "@/lib/utils"
import { GuestStayDialog } from "@/components/guest-stay-dialog"
import { createGuestStay, updateGuestStay, deleteGuestStay } from "@/lib/actions/guest-stays"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useRouter } from "next/navigation"

type StayType = "family" | "friend"
type Status = "upcoming" | "current" | "past"

interface Stay {
  id?: string
  guest_name: string
  room: string
  from_date: string
  to_date: string
  status: Status
  notes: string
  type: StayType
  event_id?: string
}

interface GuestStaysClientProps {
  guests: Stay[]
  familyMembers: { name: string; email: string }[]
}

function shortDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function nightCount(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
}

const statusConfig: Record<Status, { label: string; dot: string; accent: "brand" | "readings" | "neutral" }> = {
  upcoming: { label: "Upcoming", dot: "#3b82f6", accent: "brand" },
  current:  { label: "Current",  dot: "#10b981", accent: "readings" },
  past:     { label: "Past",     dot: "#9ca3af", accent: "neutral" },
}

const typeConfig: Record<StayType, { label: string; accent: "brand" | "tasks" }> = {
  family: { label: "👨‍👩‍👧 Family", accent: "brand" },
  friend: { label: "👫 Friend",  accent: "tasks" },
}

export function GuestStaysClient({ guests, familyMembers }: GuestStaysClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"cards" | "table">("cards")
  const [statusFilter, setStatusFilter] = useState<Status | null>(null)
  const [editingStay, setEditingStay] = useState<Stay | null>(null)
  const [deleteStay, setDeleteStay] = useState<Stay | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const router = useRouter()
  useRealtimeRefresh(["guest_stays"])

  useEffect(() => {
    const handler = () => { setEditingStay(null); setIsDialogOpen(true) }
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const handleSave = async (data: Parameters<typeof createGuestStay>[0]) => {
    try {
      if (editingStay?.id) {
        await trackSave(updateGuestStay(editingStay.id, data))
      } else {
        await trackSave(createGuestStay(data))
      }
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleDuplicate = (stay: Stay) => {
    setEditingStay({ ...stay, id: undefined, guest_name: "" })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try { await trackSave(deleteGuestStay(id)); router.refresh() }
    catch (e) { console.error(e) }
  }

  const stayYears = [...new Set(guests.map(g => new Date(g.from_date + "T12:00:00").getFullYear()))].sort((a, b) => b - a)
  const activeYear = selectedYear ?? stayYears[0] ?? new Date().getFullYear()
  const staysInYear = [...guests]
    .filter(g => new Date(g.from_date + "T12:00:00").getFullYear() === activeYear)
    .sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())

  // By late season the list is mostly past stays, so let the status narrow it.
  const statusCounts = staysInYear.reduce<Record<Status, number>>(
    (acc, stay) => ({ ...acc, [stay.status]: (acc[stay.status] ?? 0) + 1 }),
    { upcoming: 0, current: 0, past: 0 },
  )

  const filteredStays = statusFilter
    ? staysInYear.filter(stay => stay.status === statusFilter)
    : staysInYear

  return (
    <PageShell>
      {guests.length === 0 ? (
        <EmptyState
          message="No stays yet"
          action={<><Plus /> New Stay</>}
          onAction={() => setIsDialogOpen(true)}
          accent="stays"
        />
      ) : (
        <>
          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <Pill
              label="All"
              meta={staysInYear.length}
              state={statusFilter === null ? "on" : "off"}
              accent="stays"
              onClick={() => setStatusFilter(null)}
            />
            {(["upcoming", "current", "past"] as Status[]).map(status => (
              <Pill
                key={status}
                label={statusConfig[status].label}
                meta={statusCounts[status]}
                dot={statusFilter === status ? undefined : statusConfig[status].dot}
                state={statusFilter === status ? "on" : "off"}
                accent="stays"
                onClick={() => setStatusFilter(current => (current === status ? null : status))}
              />
            ))}
          </div>

          <div className="md:hidden mb-2">
            <Segmented value={mobileView} onValueChange={v => setMobileView(v as "cards" | "table")} accent="stays">
              <SegmentedItem value="cards">Cards</SegmentedItem>
              <SegmentedItem value="table">Table</SegmentedItem>
            </Segmented>
          </div>
          {mobileView === "cards" && (
            <div className="md:hidden space-y-2 mb-2">
              {filteredStays.map(stay => {
                const t = typeConfig[stay.type] ?? typeConfig.friend
                const n = nightCount(stay.from_date, stay.to_date)
                return (
                  <Card
                    key={`${stay.id}-mobile`}
                    onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}
                    className="shadow-none border px-3 py-2 gap-2 cursor-pointer transition-colors hover:border-rose-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{stay.guest_name}</p>
                        <div className="mt-1">
                          <Pill
                            label={statusConfig[stay.status].label}
                            dot={statusConfig[stay.status].dot}
                            accent={statusConfig[stay.status].accent}
                          />
                        </div>
                        {stay.room && <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{stay.room}</p>}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-700">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(stay)}>
                            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteStay(stay)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {stay.notes && (
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 leading-snug whitespace-normal break-words">
                          {stay.notes}
                        </p>
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 leading-tight">
                      <Pill label={t.label} accent={t.accent} />
                      <span>{n}n</span>
                      <span className="text-gray-300">•</span>
                      <span>{shortDate(stay.from_date)} {"->"} {shortDate(stay.to_date)}</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
          <div className={cn("md:hidden mb-2", mobileView === "table" ? "block" : "hidden")}>
            <div className="overflow-x-auto">
              <Card className="shadow-none border overflow-hidden min-w-[760px]">
                {/* Year tabs */}
                {stayYears.length > 1 && (
                  <div className="flex items-center gap-1 px-4 pt-3 pb-0">
                    {stayYears.map(year => (
                      <button
                        key={`mobile-${year}`}
                        onClick={() => setSelectedYear(year)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                          activeYear === year
                            ? "bg-rose-500 text-white"
                            : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</div>
                  <div className="w-40 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Guest</div>
                  <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Type</div>
                  <div className="w-48 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Dates</div>
                  <div className="w-14 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Nights</div>
                  <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</div>
                  <div className="w-7 flex-shrink-0" />
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredStays.map(stay => {
                    const t = typeConfig[stay.type] ?? typeConfig.friend
                    const n = nightCount(stay.from_date, stay.to_date)

                    return (
                      <div
                        key={`table-mobile-${stay.id}`}
                        title={stay.notes || undefined}
                        aria-label={stay.notes ? `Notes: ${stay.notes}` : undefined}
                        onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}
                        className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors cursor-pointer"
                      >
                        <div className="w-28 flex-shrink-0">
                          <Pill
                            label={statusConfig[stay.status].label}
                            dot={statusConfig[stay.status].dot}
                            accent={statusConfig[stay.status].accent}
                          />
                        </div>
                        <div className="w-40 flex-shrink-0 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{stay.guest_name}</p>
                          {stay.room && <p className="text-xs text-gray-400 truncate">{stay.room}</p>}
                        </div>
                        <div className="w-24 flex-shrink-0">
                          <Pill label={t.label} accent={t.accent} />
                        </div>
                        <div className="w-48 flex-shrink-0 text-sm text-gray-600">
                          {shortDate(stay.from_date)} {"->"} {shortDate(stay.to_date)}
                        </div>
                        <div className="w-14 flex-shrink-0">
                          <span className="font-semibold text-gray-900">{n}</span>
                          <span className="text-gray-400 ml-0.5 text-xs">n</span>
                        </div>
                        <div className="flex-1 text-sm text-gray-400 truncate min-w-0">{stay.notes}</div>
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="subtle" size="icon-xs">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(stay)}>
                                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteStay(stay)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        <Card className="hidden md:block shadow-none border overflow-hidden">
          {/* Year tabs */}
          {stayYears.length > 1 && (
            <div className="flex items-center gap-1 px-4 pt-3 pb-0">
              {stayYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                    activeYear === year
                      ? "bg-rose-500 text-white"
                      : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="w-28 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</div>
            <div className="w-40 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Guest</div>
            <div className="w-24 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Type</div>
            <div className="w-48 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Dates</div>
            <div className="w-14 flex-shrink-0 text-xs font-medium text-gray-400 uppercase tracking-wide">Nights</div>
            <div className="flex-1 text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</div>
            <div className="w-7 flex-shrink-0" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filteredStays.map(stay => {
              const t = typeConfig[stay.type] ?? typeConfig.friend
              const n = nightCount(stay.from_date, stay.to_date)

              return (
                <div
                  key={stay.id}
                  title={stay.notes || undefined}
                  aria-label={stay.notes ? `Notes: ${stay.notes}` : undefined}
                  onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors cursor-pointer"
                >
                  {/* Status */}
                  <div className="w-28 flex-shrink-0">
                    <Pill
                      label={statusConfig[stay.status].label}
                      dot={statusConfig[stay.status].dot}
                      accent={statusConfig[stay.status].accent}
                    />
                  </div>

                  {/* Guest name + room */}
                  <div className="w-40 flex-shrink-0 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{stay.guest_name}</p>
                    {stay.room && <p className="text-xs text-gray-400 truncate">{stay.room}</p>}
                  </div>

                  {/* Type */}
                  <div className="w-24 flex-shrink-0">
                    <Pill label={t.label} accent={t.accent} />
                  </div>

                  {/* Dates */}
                  <div className="w-48 flex-shrink-0 text-sm text-gray-600">
                    {shortDate(stay.from_date)} → {shortDate(stay.to_date)}
                  </div>

                  {/* Nights */}
                  <div className="w-14 flex-shrink-0">
                    <span className="font-semibold text-gray-900">{n}</span>
                    <span className="text-gray-400 ml-0.5 text-xs">n</span>
                  </div>

                  {/* Notes */}
                  <div className="flex-1 text-sm text-gray-400 truncate min-w-0">
                    {stay.notes}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="subtle" size="icon-xs">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(stay)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteStay(stay)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        </>
      )}

      <GuestStayDialog
        open={isDialogOpen}
        onOpenChange={open => { if (!open) { setIsDialogOpen(false); setEditingStay(null) } }}
        stay={editingStay}
        familyMembers={familyMembers}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={!!deleteStay}
        onOpenChange={open => { if (!open) setDeleteStay(null) }}
        onConfirm={() => deleteStay?.id && handleDelete(deleteStay.id)}
        itemName={deleteStay?.guest_name}
      />
    </PageShell>
  )
}
