"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Users, MapPin, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { cn } from "@/lib/utils"
import { GuestStayDialog } from "@/components/guest-stay-dialog"
import { createGuestStay, updateGuestStay, deleteGuestStay } from "@/lib/actions/guest-stays"
import { useRouter } from "next/navigation"

type StayType = "family" | "friend"
type Status = "upcoming" | "current" | "past"

interface Stay {
  id: string
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
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function nights(from: string, to: string) {
  const diff = new Date(to).getTime() - new Date(from).getTime()
  const n = Math.round(diff / 86400000)
  return n === 1 ? "1 night" : `${n} nights`
}

const statusConfig: Record<Status, { label: string; dot: string; badge: string }> = {
  upcoming: { label: "Upcoming", dot: "bg-blue-400",   badge: "bg-blue-50 text-blue-700" },
  current:  { label: "Here now", dot: "bg-green-400",  badge: "bg-green-50 text-green-700" },
  past:     { label: "Past",     dot: "bg-gray-300",   badge: "bg-gray-50 text-gray-500" },
}

const typeConfig: Record<StayType, { label: string; badge: string }> = {
  family: { label: "👨‍👩‍👧 Family", badge: "bg-blue-100 text-blue-700" },
  friend: { label: "👫 Friend",  badge: "bg-violet-100 text-violet-700" },
}

export function GuestStaysClient({ guests }: GuestStaysClientProps) {
  const [search] = useState("")
  const [filter] = useState<"all" | Status>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStay, setEditingStay] = useState<Stay | null>(null)
  const [deleteStay, setDeleteStay] = useState<Stay | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = () => { setEditingStay(null); setIsDialogOpen(true) }
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const handleSave = async (data: Parameters<typeof createGuestStay>[0]) => {
    try {
      if (editingStay) {
        await updateGuestStay(editingStay.id, data)
      } else {
        await createGuestStay(data)
      }
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleDelete = async (id: string) => {
    try { await deleteGuestStay(id); router.refresh() }
    catch (e) { console.error(e) }
  }

  const upcoming = guests.filter(g => g.status === "upcoming").length
  const current  = guests.filter(g => g.status === "current").length
  const past     = guests.filter(g => g.status === "past").length

  const filtered = guests.filter(g => {
    const matchSearch = g.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      (g.room && g.room.toLowerCase().includes(search.toLowerCase()))
    const matchFilter = filter === "all" || g.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="p-8">
      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-400 text-base">No stays yet</p>
          <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> New Stay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(stay => {
            const s = statusConfig[stay.status] ?? statusConfig.past
            const t = typeConfig[stay.type] ?? typeConfig.friend
            return (
              <Card
                key={stay.id}
                className={cn(
                  "p-5 border-2 group shadow-none transition-all hover:shadow-md hover:-translate-y-0.5",
                  stay.status === "current" ? "border-green-200 bg-green-50/30" :
                  stay.status === "upcoming" ? "border-blue-100" : "border-gray-100 opacity-75"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5", s.dot)} />
                    <h3 className="font-semibold text-gray-800">{stay.guest_name}</h3>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteStay(stay)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex gap-2 mb-3 flex-wrap">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", t.badge)}>{t.label}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", s.badge)}>{s.label}</span>
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <div>{formatDate(stay.from_date)} → {formatDate(stay.to_date)}</div>
                  <div className="text-xs text-gray-400">{nights(stay.from_date, stay.to_date)}</div>
                  {stay.room && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {stay.room}
                    </div>
                  )}
                  {stay.notes && (
                    <div className="text-xs text-gray-400 line-clamp-2 mt-1">{stay.notes}</div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <GuestStayDialog
        open={isDialogOpen}
        onOpenChange={open => { if (!open) { setIsDialogOpen(false); setEditingStay(null) } }}
        stay={editingStay}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={!!deleteStay}
        onOpenChange={open => { if (!open) setDeleteStay(null) }}
        onConfirm={() => deleteStay && handleDelete(deleteStay.id)}
        itemName={deleteStay?.guest_name}
      />
    </div>
  )
}
