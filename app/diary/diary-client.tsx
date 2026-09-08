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
import { PageShell } from "@/components/ui/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { Pill } from "@/components/ui/pill"
import { BookOpen, Plus, Trash2, Image as ImageIcon, MoreHorizontal } from "lucide-react"
import { createDiaryEntry, deleteDiaryEntry, type DiaryEntry } from "@/lib/actions/diary"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import { useT, useLanguage } from "@/lib/language"

interface DiaryClientProps {
  entries: DiaryEntry[]
}

function getPreview(entry: DiaryEntry, empty: string): string {
  const block = entry.content.find(b => b.type === "paragraph" || b.type === "heading")
  if (!block) return empty
  return (block as any).text || empty
}

// Croatian noun agreement for "block": 1 blok, 2–4 bloka, else blokova.
function blockWord(n: number, lang: "en" | "hr"): string {
  if (lang === "hr") {
    const m10 = n % 10, m100 = n % 100
    if (m10 === 1 && m100 !== 11) return "blok"
    if (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14)) return "bloka"
    return "blokova"
  }
  return n === 1 ? "block" : "blocks"
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
  const t = useT()
  const { lang } = useLanguage()
  const dateLocale = lang === "hr" ? "hr-HR" : "en-US"
  useRealtimeRefresh(["diary_entries"])

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
    <PageShell>
      {entries.length === 0 ? (
        <EmptyState
          message={t("diary.noEntries")}
          action={<><Plus /> {t("diary.newEntry")}</>}
          onAction={() => setDialogOpen(true)}
          accent="diary"
        />
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
                className="p-5 transition-all group border-2 hover:border-amber-200 overflow-hidden shadow-none hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <h3 className="font-bold text-2xl text-gray-800">{entry.title}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteId(entry.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("common.delete")}
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
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3">{getPreview(entry, t("diary.emptyEntry"))}</p>
                )}

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
                  <span className="mr-1">{new Date(entry.updated_at).toLocaleDateString(dateLocale, { month: "short", day: "numeric" })}</span>
                  {blockCount > 0 && (
                    <Pill label={`${blockCount} ${blockWord(blockCount, lang)}`} state="count" />
                  )}
                  {totalImages > 0 && (
                    <Pill label={totalImages} state="count" icon={<ImageIcon />} />
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* New entry dialog */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setNewTitle("") } }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>{t("diary.newEntryTitle")}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="diary-title">{t("diary.titleLabel")}</Label>
            <Input id="diary-title" placeholder="2025" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button accent="diary" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
              {creating ? t("diary.creating") : t("diary.create")}
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
    </PageShell>
  )
}
