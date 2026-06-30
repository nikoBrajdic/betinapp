"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Copy, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
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

const statusDot: Record<Status, string> = {
  upcoming: "bg-blue-400",
  current:  "bg-green-400",
  past:     "bg-gray-300",
}

const statusRow: Record<Status, string> = {
  upcoming: "",
  current:  "bg-green-50/40",
  past:     "opacity-60",
}

const typeConfig: Record<StayType, { label: string; badge: string }> = {
  family: { label: "👨‍👩‍👧 Family", badge: "bg-blue-100 text-blue-700" },
  friend: { label: "👫 Friend",  badge: "bg-violet-100 text-violet-700" },
}

export function GuestStaysClient({ guests, familyMembers }: GuestStaysClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
  const filteredStays = [...guests]
    .filter(g => new Date(g.from_date + "T12:00:00").getFullYear() === activeYear)
    .sort((a, b) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())

  return (
    <div className="p-6">
      {guests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-400 text-base">No stays yet</p>
          <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> New Stay
          </button>
        </div>
      ) : (
        <Card className="shadow-none border-2 overflow-hidden">
          {/* Year tabs */}
          {stayYears.length > 1 && (
            <div className="flex items-center gap-1 px-4 pt-3 pb-0">
              {stayYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer",
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
            <div className="w-3 flex-shrink-0" />
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
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors",
                    statusRow[stay.status]
                  )}
                >
                  {/* Status dot */}
                  <div className="w-3 flex-shrink-0 flex items-center justify-center">
                    <div className={cn("w-2 h-2 rounded-full", statusDot[stay.status])} />
                  </div>

                  {/* Guest name + room */}
                  <div className="w-40 flex-shrink-0 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{stay.guest_name}</p>
                    {stay.room && <p className="text-xs text-gray-400 truncate">{stay.room}</p>}
                  </div>

                  {/* Type */}
                  <div className="w-24 flex-shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", t.badge)}>{t.label}</span>
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
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditingStay(stay); setIsDialogOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleDuplicate(stay)}>
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteStay(stay)}>
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
    </div>
  )
}
