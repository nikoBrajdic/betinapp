"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useNavigate, usePrefetch } from "@/lib/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageShell } from "@/components/ui/page-shell"
import { EmptyState } from "@/components/ui/empty-state"
import { Segmented, SegmentedIconItem } from "@/components/ui/segmented"
import { FileTypePill } from "@/components/ui/file-type-pill"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Grid3X3, List, MoreHorizontal, Plus, Search, Trash2, Upload } from "lucide-react"
import { createNote, deleteNote, type Note } from "@/lib/actions/notes"
import {
  createNoteDocument,
  deleteNoteDocument,
  updateNoteDocumentVersion,
  type NoteDocument,
  type DocumentTextKind,
} from "@/lib/actions/note-documents"
import { createClient } from "@/lib/supabase/client"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import type { Block } from "@/lib/actions/diary"

interface NotesClientProps {
  notes: Note[]
  documents: NoteDocument[]
}

const ACCEPTED_TYPES =
  ".txt,.md,.markdown,.xml,.json,.csv,.yml,.yaml,.ini,.conf,.log,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.odt,.ods"

const plainExtensions = new Set(["txt", "md", "markdown", "xml", "json", "csv", "yml", "yaml", "ini", "conf", "log"])

/** One list, two kinds of thing. */
type Entry =
  | { kind: "note"; id: string; title: string; updatedAt: string; note: Note }
  | { kind: "doc"; id: string; title: string; updatedAt: string; doc: NoteDocument }

function extOf(filename: string) {
  const parts = filename.split(".")
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
}

function inferTextKind(ext: string): DocumentTextKind {
  return plainExtensions.has(ext) ? "plain" : "rich"
}

function humanSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** i
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function longDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function getPreview(note: Note): string {
  const block = note.content.find((b: Block) => b.type === "paragraph" || b.type === "heading")
  if (!block) return "Empty note"
  return (block as any).text || "Empty note"
}

function getThumbnails(note: Note): string[] {
  const urls: string[] = []
  for (const block of note.content) {
    if (block.type === "image") {
      for (const img of (block as any).images ?? []) {
        if (img.url) urls.push(img.url)
        if (urls.length === 4) return urls
      }
    }
  }
  return urls
}

export function NotesClient({ notes, documents }: NotesClientProps) {
  const router = useRouter()
  const { navigate, prefetch } = useNavigate()
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null)
  const [wrongTypeText, setWrongTypeText] = useState("")

  const addInputRef = useRef<HTMLInputElement | null>(null)
  const updateInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const supabase = useMemo(() => createClient(), [])

  useRealtimeRefresh(["notes", "note_documents"])

  useEffect(() => {
    const handler = () => setDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const entries = useMemo<Entry[]>(() => {
    const merged: Entry[] = [
      ...notes.map(note => ({
        kind: "note" as const,
        id: note.id,
        title: note.title,
        updatedAt: note.updated_at,
        note,
      })),
      ...documents.map(doc => ({
        kind: "doc" as const,
        id: doc.id,
        title: doc.name,
        updatedAt: doc.updated_at,
        doc,
      })),
    ]

    const query = search.trim().toLowerCase()
    const filtered = query
      ? merged.filter(entry =>
          entry.title.toLowerCase().includes(query) ||
          (entry.kind === "doc" &&
            (entry.doc.file_type.toLowerCase().includes(query) ||
              entry.doc.added_by_name.toLowerCase().includes(query))),
        )
      : merged

    return filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [notes, documents, search])

  const uploadToStorage = async (file: File) => {
    const extension = extOf(file.name)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${Date.now()}-${safeName}`
    const { error } = await supabase.storage
      .from("notes-documents")
      .upload(path, file, { upsert: false, contentType: file.type || undefined })
    if (error) throw error
    return { path, extension }
  }

  const handleCreateNote = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const note = await trackSave(createNote(newTitle.trim()))
      navigate(`/notes/${note.id}`)
    } catch (error) {
      console.error(error)
      setCreating(false)
    }
  }

  const handleUpload = async (file?: File) => {
    if (!file) return
    try {
      const { path, extension } = await uploadToStorage(file)
      await trackSave(
        createNoteDocument({
          name: file.name.replace(/\.[^/.]+$/, ""),
          fileType: extension || "unknown",
          textKind: inferTextKind(extension),
          sizeBytes: file.size,
          storagePath: path,
        }),
      )
      setDialogOpen(false)
      setNewTitle("")
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      if (addInputRef.current) addInputRef.current.value = ""
    }
  }

  const handleUpdateVersion = async (doc: NoteDocument, file?: File) => {
    if (!file) return
    const nextExt = extOf(file.name)
    if (nextExt !== doc.file_type) {
      setWrongTypeText(`Expected .${doc.file_type} but got .${nextExt || "unknown"}.`)
      const input = updateInputRefs.current[doc.id]
      if (input) input.value = ""
      return
    }
    try {
      const { path } = await uploadToStorage(file)
      await trackSave(updateNoteDocumentVersion(doc.id, { sizeBytes: file.size, storagePath: path }))
      router.refresh()
    } catch (error) {
      console.error(error)
    } finally {
      const input = updateInputRefs.current[doc.id]
      if (input) input.value = ""
    }
  }

  usePrefetch(entries.filter(e => e.kind === "note").map(e => `/notes/${e.id}`))

  const openEntry = (entry: Entry) => {
    if (entry.kind === "note") {
      navigate(`/notes/${entry.id}`)
      return
    }
    const { data } = supabase.storage.from("notes-documents").getPublicUrl(entry.doc.storage_path)
    if (data.publicUrl) window.open(data.publicUrl, "_blank", "noopener,noreferrer")
  }

  const handleDelete = async () => {
    if (!deleteEntry) return
    try {
      await trackSave(
        deleteEntry.kind === "note" ? deleteNote(deleteEntry.id) : deleteNoteDocument(deleteEntry.id),
      )
      setDeleteEntry(null)
      router.refresh()
    } catch (error) {
      console.error(error)
    }
  }

  const isEmpty = notes.length === 0 && documents.length === 0

  const entryMenu = (entry: Entry) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button
          variant="subtle"
          size="icon-xs"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 flex-shrink-0"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
        {entry.kind === "doc" && (
          <DropdownMenuItem onClick={() => updateInputRefs.current[entry.id]?.click()}>
            <Upload className="h-3.5 w-3.5 mr-2" /> Update version
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteEntry(entry)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const versionInput = (entry: Entry) =>
    entry.kind === "doc" ? (
      <input
        ref={el => {
          updateInputRefs.current[entry.id] = el
        }}
        className="hidden"
        type="file"
        accept={ACCEPTED_TYPES}
        onClick={e => e.stopPropagation()}
        onChange={e => handleUpdateVersion(entry.doc, e.target.files?.[0])}
      />
    ) : null

  return (
    <PageShell>
      <input
        ref={addInputRef}
        className="hidden"
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={e => handleUpload(e.target.files?.[0])}
      />

      {isEmpty ? (
        <EmptyState
          message="No notes or documents yet"
          action={
            <>
              <Plus /> New Note
            </>
          }
          onAction={() => setDialogOpen(true)}
          accent="notes"
        />
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                className="pl-8"
                placeholder="Search notes and documents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Segmented value={view} onValueChange={v => setView(v as "grid" | "list")} accent="notes">
              <SegmentedIconItem value="grid" aria-label="Grid view">
                <Grid3X3 />
              </SegmentedIconItem>
              <SegmentedIconItem value="list" aria-label="List view">
                <List />
              </SegmentedIconItem>
            </Segmented>
          </div>

          {entries.length === 0 ? (
            <EmptyState message="Nothing matches that search." />
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {entries.map(entry => {
                const thumbs = entry.kind === "note" ? getThumbnails(entry.note) : []
                return (
                  <Card
                    key={`${entry.kind}-${entry.id}`}
                    onClick={() => openEntry(entry)}
                    onPointerEnter={() => { if (entry.kind === "note") prefetch(`/notes/${entry.id}`) }}
                    className="p-5 gap-0 transition-all group border shadow-none hover:border-indigo-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <FileTypePill
                          fileType={entry.kind === "doc" ? entry.doc.file_type : "note"}
                          className="mb-2"
                        />
                        <h3 className="font-bold text-xl text-gray-800 leading-tight break-words">
                          {entry.title}
                        </h3>
                      </div>
                      {entryMenu(entry)}
                    </div>

                    {entry.kind === "note" ? (
                      thumbs.length > 0 ? (
                        <div className="flex gap-1.5 mb-3">
                          {thumbs.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="rounded-lg object-cover flex-1"
                              style={{ height: 72, minWidth: 0 }}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{getPreview(entry.note)}</p>
                      )
                    ) : (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {humanSize(entry.doc.size_bytes)} · added by {entry.doc.added_by_name}
                      </p>
                    )}

                    <div className="text-xs text-gray-400">{shortDate(entry.updatedAt)}</div>
                    {versionInput(entry)}
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="shadow-none border overflow-hidden py-0 gap-0">
              <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                <div className="w-24 flex-shrink-0">Type</div>
                <div className="flex-1 min-w-0">Name</div>
                <div className="w-24 flex-shrink-0 hidden sm:block">Size</div>
                <div className="w-32 flex-shrink-0 hidden md:block">Modified</div>
                <div className="w-40 flex-shrink-0 hidden lg:block">Added by</div>
                <div className="w-7 flex-shrink-0" />
              </div>
              <div className="divide-y divide-gray-100">
                {entries.map(entry => (
                  <div
                    key={`${entry.kind}-${entry.id}`}
                    onClick={() => openEntry(entry)}
                    onPointerEnter={() => { if (entry.kind === "note") prefetch(`/notes/${entry.id}`) }}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 group transition-colors"
                  >
                    <div className="w-24 flex-shrink-0">
                      <FileTypePill
                        fileType={entry.kind === "doc" ? entry.doc.file_type : "note"}
                        variant="soft"
                      />
                    </div>
                    <div className="flex-1 min-w-0 font-medium text-gray-800 truncate" title={entry.title}>
                      {entry.title}
                    </div>
                    <div className="w-24 flex-shrink-0 hidden sm:block text-sm text-gray-500">
                      {entry.kind === "doc" ? humanSize(entry.doc.size_bytes) : "—"}
                    </div>
                    <div className="w-32 flex-shrink-0 hidden md:block text-sm text-gray-500">
                      {longDate(entry.updatedAt)}
                    </div>
                    <div className="w-40 flex-shrink-0 hidden lg:block text-sm text-gray-500 truncate">
                      {entry.kind === "doc" ? entry.doc.added_by_name : "—"}
                    </div>
                    {entryMenu(entry)}
                    {versionInput(entry)}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* New — note by default, document as the secondary path */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!open) {
            setDialogOpen(false)
            setNewTitle("")
          }
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>New note</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="note-title">Note title</Label>
            <Input
              id="note-title"
              placeholder="Untitled"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreateNote()}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            or
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <Button variant="outline" onClick={() => addInputRef.current?.click()}>
            <Upload /> Upload a document
          </Button>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button accent="notes" onClick={handleCreateNote} disabled={!newTitle.trim() || creating}>
              {creating ? "Creating…" : "Create note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(wrongTypeText)} onOpenChange={open => { if (!open) setWrongTypeText("") }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Type mismatch</DialogTitle>
            <DialogDescription>
              The new version must keep the same file type. {wrongTypeText}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setWrongTypeText("")}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteEntry)}
        onOpenChange={open => { if (!open) setDeleteEntry(null) }}
        onConfirm={handleDelete}
        itemName={deleteEntry?.title}
      />
    </PageShell>
  )
}
