"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { BookOpen, Plus, Trash2, Image as ImageIcon, MoreHorizontal } from "lucide-react"
import { createDiaryEntry, deleteDiaryEntry, type DiaryEntry } from "@/lib/actions/diary"
import { trackSave } from "@/lib/save-events"

interface DiaryClientProps {
  entries: DiaryEntry[]
}

function getPreview(entry: DiaryEntry): string {
  const block = entry.content.find(b => b.type === "paragraph" || b.type === "heading")
  if (!block) return "Empty entry"
  return (block as any).text || "Empty entry"
}

function getThumbnails(entry: DiaryEntry): string[] {
  const urls: string[] = []
  for (const block of entry.content) {
    if (block.type === "image") {
      for (const img of (block as any).images ?? []) {
        if (img.url) urls.push(img.url)
        if (urls.length === 4) return urls
      }
    }
  }
  return urls
}

export function DiaryClient({ entries }: DiaryClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = () => setDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const entry = await trackSave(createDiaryEntry(newTitle.trim()))
      router.push(`/diary/${entry.id}`)
    } catch (e) { console.error(e); setCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try { await trackSave(deleteDiaryEntry(deleteId)); router.refresh() }
    catch (e) { console.error(e) }
  }

  const deleteEntry = entries.find(e => e.id === deleteId)

  return (
    <div className="p-8">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-400 text-base">No diary entries yet</p>
          <button onClick={() => setDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> New Entry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => {
            const thumbs = getThumbnails(entry)
            const totalImages = entry.content.flatMap((b: any) => b.type === "image" ? b.images ?? [] : []).length
            const blockCount = entry.content.length
            return (
              <Card
                key={entry.id}
                onClick={() => router.push(`/diary/${entry.id}`)}
                className="p-5 cursor-pointer transition-all group border-2 hover:border-amber-200 overflow-hidden shadow-none hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <h3 className="font-bold text-2xl text-gray-800">{entry.title}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 cursor-pointer text-gray-400 hover:text-gray-700 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteId(entry.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {thumbs.length > 0 ? (
                  <div className="flex gap-1.5 mb-3">
                    {thumbs.map((url, i) => (
                      <img key={i} src={url} alt=""
                        className="rounded-lg object-cover flex-1" style={{ height: 72, minWidth: 0 }} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{getPreview(entry)}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{new Date(entry.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  {totalImages > 0 && <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {totalImages}</span>}
                  {blockCount > 0 && <span>{blockCount} block{blockCount !== 1 ? "s" : ""}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* New entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setNewTitle("") } }}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader><DialogTitle>New Diary Entry</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="diary-title">Title (e.g. 2025)</Label>
            <Input id="diary-title" placeholder="2025" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="cursor-pointer">
              {creating ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        itemName={deleteEntry?.title}
      />
    </div>
  )
}
