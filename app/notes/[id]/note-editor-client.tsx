"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Type, ImageIcon,
  Trash2, Loader2, GripVertical, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createNote, deleteNote, updateNote, type Note } from "@/lib/actions/notes"
import type { Block, ImageItem } from "@/lib/actions/diary"
import { trackSave } from "@/lib/save-events"
import { createClient } from "@/lib/supabase/client"
import { ImageLightbox } from "@/components/image-lightbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

function genId() { return Math.random().toString(36).slice(2, 9) }

async function compressImage(file: File, maxWidth = 1000, maxHeight = 760, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg", quality
      )
    }
    img.onerror = reject
    img.src = url
  })
}

async function uploadImage(file: File, noteId: string): Promise<string> {
  const supabase = createClient()
  const compressed = await compressImage(file)
  const path = `${noteId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`
  const { data, error } = await supabase.storage.from("notes-images").upload(path, compressed, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from("notes-images").getPublicUrl(data.path)
  return publicUrl
}

function AutoTextarea({
  value, onChange, onKeyDown, placeholder, className, autoFocus, focusPosition,
}: {
  value: string; onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string; className?: string; autoFocus?: boolean; focusPosition?: number | null
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px" }
  }, [value])
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus()
      const pos = focusPosition ?? 0
      ref.current.setSelectionRange(pos, pos)
    }
  }, [autoFocus, focusPosition])
  return (
    <textarea
      ref={ref} value={value} rows={1} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
      className={cn("w-full resize-none overflow-hidden bg-transparent outline-none border-none leading-relaxed", className)}
    />
  )
}

function ImageBlock({
  block, noteId, onChange, onDelete, onOpenLightbox, globalOffset,
}: {
  block: Extract<Block, { type: "image" }>
  noteId: string
  onChange: (b: Block) => void
  onDelete: () => void
  onOpenLightbox: (index: number) => void
  globalOffset: number
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addImages = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"))
    const slots = 3 - block.images.length
    if (slots <= 0 || arr.length === 0) return
    setUploading(true)
    try {
      const urls = await Promise.all(arr.slice(0, slots).map(f => uploadImage(f, noteId)))
      const newImages: ImageItem[] = urls.map(url => ({ url, caption: "" }))
      onChange({ ...block, images: [...block.images, ...newImages] })
    } catch (e) { console.error("Upload failed:", e) }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files.length) addImages(e.dataTransfer.files)
  }

  const removeImage = (i: number) => {
    const next = block.images.filter((_, idx) => idx !== i)
    if (next.length === 0) onDelete()
    else onChange({ ...block, images: next })
  }

  const replaceImage = async (i: number, file?: File) => {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const url = await uploadImage(file, noteId)
      onChange({
        ...block,
        images: block.images.map((img, idx) => idx === i ? { ...img, url } : img),
      })
    } catch (e) { console.error("Replace image failed:", e) }
    setUploading(false)
  }

  const updateCaption = (i: number, caption: string) => {
    onChange({ ...block, images: block.images.map((img, idx) => idx === i ? { ...img, caption } : img) })
  }

  const colClass = block.images.length === 1 ? "" : block.images.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"

  return (
    <div className="py-2">
      {block.images.length > 0 && (
        <div className="mb-2" style={{ maxWidth: 500 }}>
          <div className={colClass}>
            {block.images.map((img, i) => (
              <div key={i} className="group/img relative">
                <img
                  src={img.url} alt=""
                  onClick={() => onOpenLightbox(globalOffset + i)}
                  className="rounded-lg object-cover w-full cursor-zoom-in"
                  style={{
                    maxWidth: block.images.length === 1 ? 500 : "100%",
                    height: block.images.length === 1 ? 380 : block.images.length === 2 ? 320 : 240,
                    objectFit: "cover"
                  }}
                />
                <div
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => document.getElementById(`note-img-replace-${block.id}-${i}`)?.click()}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-indigo-600 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeImage(i)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  id={`note-img-replace-${block.id}-${i}`}
                  type="file" accept="image/*" className="hidden"
                  onChange={e => { replaceImage(i, e.target.files?.[0]); e.target.value = "" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {block.images.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm transition-colors cursor-pointer py-2.5",
            dragOver ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500",
          )}
          style={{ maxWidth: 500 }}
        >
          {uploading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            : <><ImageIcon className="h-4 w-4" /> Drop image or click to upload</>
          }
        </div>
      )}
      {uploading && block.images.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-indigo-500 mt-1">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
        </div>
      )}
      <input ref={fileRef} id={`note-img-add-${block.id}`} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files && addImages(e.target.files)} />
    </div>
  )
}

function BlockRow({
  block, focused, focusPosition, onFocus, onChange, onDelete, onEnter, onBackspaceStart, onBackspaceEmpty,
  onDragStart, onDragEnter, onDragEnd, isDragOver, noteId, onAddImageAfter, onOpenLightbox, globalOffset,
}: {
  block: Block; focused: boolean; focusPosition?: number | null; onFocus: () => void
  onChange: (b: Block) => void; onDelete: () => void
  onEnter: (before: string, after: string) => void; onBackspaceStart: () => void; onBackspaceEmpty: () => void
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void
  isDragOver: boolean; noteId: string; onAddImageAfter: () => void
  onOpenLightbox: (index: number) => void; globalOffset: number
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const text = (block as any).text ?? ""
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const start = e.currentTarget.selectionStart ?? text.length
      const end = e.currentTarget.selectionEnd ?? start
      onEnter(text.slice(0, start), text.slice(end))
    }
    if (e.key === "Backspace") {
      const start = e.currentTarget.selectionStart ?? 0
      const end = e.currentTarget.selectionEnd ?? start
      if (start === 0 && end === 0) {
        e.preventDefault()
        if (text === "") onBackspaceEmpty()
        else onBackspaceStart()
      }
    }
  }

  return (
    <div
      className={cn(
        "group/block relative flex items-start gap-1 rounded-lg transition-colors",
        isDragOver && "before:absolute before:-top-1 before:left-6 before:right-1 before:h-0.5 before:rounded-full before:bg-indigo-400"
      )}
      onDragOver={e => e.preventDefault()}
      onDragEnter={onDragEnter}
    >
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex-shrink-0 mt-1.5 cursor-grab opacity-0 group-hover/block:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-gray-300" />
      </div>

      <div className="flex-1 min-w-0">
        {block.type === "paragraph" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder="Write something…"
            autoFocus={focused} focusPosition={focusPosition}
            className="text-base text-gray-700 py-0.5"
          />
        )}
        {block.type === "image" && (
          <ImageBlock block={block} noteId={noteId}
            onChange={onChange} onDelete={onDelete}
            onOpenLightbox={onOpenLightbox} globalOffset={globalOffset} />
        )}
      </div>

      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity mt-0.5">
        {block.type !== "image" ? (
          <button
            onClick={onAddImageAfter}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
            title="Add image below"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={block.images.length >= 3
              ? onAddImageAfter
              : () => (document.getElementById(`note-img-add-${block.id}`) as HTMLElement)?.click()
            }
            className="rounded-lg p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
            title={block.images.length >= 3 ? "Add image row below" : "Add photo to row"}
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          title="Delete block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function NoteEditorClient({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title)
  const [blocks, setBlocks] = useState<Block[]>(note.content ?? [])
  const [savedTitle, setSavedTitle] = useState(note.title)
  const [savedBlocks, setSavedBlocks] = useState<Block[]>(note.content ?? [])
  const [isEditing, setIsEditing] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusPosition, setFocusPosition] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [newNoteWarningOpen, setNewNoteWarningOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const allImageUrls = blocks.flatMap(b => b.type === "image" ? b.images.map(img => img.url) : [])
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [dragOverBlock, setDragOverBlock] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const latestTitleRef = useRef(title)
  const latestBlocksRef = useRef(blocks)
  const router = useRouter()

  useEffect(() => {
    latestTitleRef.current = title
    latestBlocksRef.current = blocks
  }, [title, blocks])

  const scheduleSave = useCallback((t: string, b: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        await trackSave(updateNote(note.id, { title: t, content: b }))
        setSavedTitle(t)
        setSavedBlocks(b)
        setSavedAt(new Date())
      }
      catch (e) { console.error(e) }
      setSaving(false)
    }, 1200)
  }, [note.id])

  const setBlocksAndSave = (next: Block[]) => { setBlocks(next); scheduleSave(title, next) }
  const setTitleAndSave = (t: string) => { setTitle(t); scheduleSave(t, blocks) }

  const hasUnsavedChanges = useCallback(() => {
    return (
      latestTitleRef.current !== savedTitle ||
      JSON.stringify(latestBlocksRef.current) !== JSON.stringify(savedBlocks)
    )
  }, [savedBlocks, savedTitle])

  const persistNow = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const currentTitle = latestTitleRef.current
    const currentBlocks = latestBlocksRef.current
    setSaving(true)
    await trackSave(updateNote(note.id, { title: currentTitle, content: currentBlocks }))
    setSavedTitle(currentTitle)
    setSavedBlocks(currentBlocks)
    setSavedAt(new Date())
    setSaving(false)
  }, [note.id])

  const startNewNote = useCallback(async () => {
    const created = await trackSave(createNote("Untitled"))
    router.push(`/notes/${created.id}`)
  }, [router])

  useEffect(() => {
    const handleTopbarNew = () => setNewNoteWarningOpen(true)
    window.addEventListener("topbar:new", handleTopbarNew)
    return () => window.removeEventListener("topbar:new", handleTopbarNew)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const addBlock = (type: "heading" | "paragraph" | "image", afterId?: string) => {
    const newBlock: Block =
      type === "image" ? { id: genId(), type: "image", images: [] }
      : { id: genId(), type: "paragraph", text: "", bold: false }
    let next: Block[]
    if (afterId) {
      const idx = blocks.findIndex(b => b.id === afterId)
      next = [...blocks.slice(0, idx + 1), newBlock, ...blocks.slice(idx + 1)]
    } else {
      next = [...blocks, newBlock]
    }
    setBlocksAndSave(next)
    setFocusedId(newBlock.id)
    setFocusPosition(0)
  }

  const deleteBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    const next = blocks.filter(b => b.id !== id)
    setBlocksAndSave(next)
    setFocusedId(next[Math.max(0, idx - 1)]?.id ?? null)
    setFocusPosition(null)
  }

  const updateBlock = (id: string, updated: Block) => {
    setBlocksAndSave(blocks.map(b => b.id === id ? updated : b))
  }

  const splitTextBlock = (id: string, before: string, after: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    const block = blocks[idx]
    if (!block || block.type !== "paragraph") return
    const newBlock: Block = { id: genId(), type: "paragraph", text: after, bold: false }
    const next = [
      ...blocks.slice(0, idx),
      { ...block, text: before },
      newBlock,
      ...blocks.slice(idx + 1),
    ]
    setBlocksAndSave(next)
    setFocusedId(newBlock.id)
    setFocusPosition(0)
  }

  const mergeWithPreviousBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    if (idx <= 0) return
    const block = blocks[idx]
    const prev = blocks[idx - 1]
    if (!block || !prev) return
    if (block.type !== "paragraph" || prev.type !== "paragraph") return
    const prevText = prev.text
    const next = [
      ...blocks.slice(0, idx - 1),
      { ...prev, text: prevText + block.text } as Block,
      ...blocks.slice(idx + 1),
    ]
    setBlocksAndSave(next)
    setFocusedId(prev.id)
    setFocusPosition(prevText.length)
  }

  const handleGlobalDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setGlobalDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (!files.length) return
    const newBlock: Block = { id: genId(), type: "image", images: [] }
    const newBlocks = [...blocks, newBlock]
    setBlocks(newBlocks)
    setFocusedId(newBlock.id)
    try {
      const urls = await Promise.all(files.slice(0, 3).map(f => uploadImage(f, note.id)))
      const withImages = newBlocks.map(b =>
        b.id === newBlock.id ? { ...b, images: urls.map(url => ({ url, caption: "" })) } as Block : b
      )
      setBlocksAndSave(withImages)
    } catch (e) { console.error(e) }
  }

  const handleBlockDragStart = (idx: number) => { dragIdx.current = idx }
  const handleBlockDragEnter = (idx: number) => { dragOverIdx.current = idx; setDragOverBlock(idx) }
  const handleBlockDragEnd = () => {
    if (dragIdx.current !== null && dragOverIdx.current !== null && dragIdx.current !== dragOverIdx.current) {
      const next = [...blocks]
      const [moved] = next.splice(dragIdx.current, 1)
      next.splice(dragOverIdx.current, 0, moved)
      setBlocksAndSave(next)
    }
    dragIdx.current = null; dragOverIdx.current = null; setDragOverBlock(null)
  }

  if (!isEditing) {
    const viewAllImages = blocks.flatMap(b => b.type === "image" ? b.images.map((img: any) => img.url) : [])
    let viewImageOffset = 0

    return (
      <div className="max-w-3xl mx-auto px-8 py-6 pb-24 min-h-full">
        <div className="mb-6">
          <button onClick={() => router.push("/notes")}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors mb-4">
            <ChevronLeft className="h-4 w-4" /> All notes
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 hover:text-red-700 cursor-pointer transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {blocks.map(block => {
            if (block.type === "paragraph") return (
              <p key={block.id} className="text-base text-gray-700 leading-relaxed">{block.text}</p>
            )
            if (block.type === "image") {
              const imgs = block.images ?? []
              if (imgs.length === 0) return null
              const colClass = imgs.length === 1 ? "" : imgs.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"
              const offset = viewImageOffset
              viewImageOffset += imgs.length
              return (
                <div key={block.id} className={colClass} style={{ maxWidth: 500 }}>
                  {imgs.map((img: any, i: number) => (
                    <img key={i} src={img.url} alt=""
                      className="rounded-lg object-cover w-full cursor-zoom-in"
                      style={{ height: imgs.length === 1 ? 380 : imgs.length === 2 ? 320 : 240 }}
                      onClick={() => setLightboxIndex(offset + i)}
                    />
                  ))}
                </div>
              )
            }
            return null
          })}
        </div>

        {lightboxIndex !== null && (
          <ImageLightbox
            urls={viewAllImages}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}

        <Dialog open={newNoteWarningOpen} onOpenChange={setNewNoteWarningOpen}>
          <DialogContent className="sm:max-w-[430px]">
            <DialogHeader>
              <DialogTitle>Leave this note and create a new one?</DialogTitle>
              <DialogDescription>
                Unsaved edits will be lost. You can save first, discard, or cancel and keep editing this note.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewNoteWarningOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (saveTimer.current) {
                    clearTimeout(saveTimer.current)
                    saveTimer.current = null
                  }
                  setNewNoteWarningOpen(false)
                  await startNewNote()
                }}
              >
                Discard
              </Button>
              <Button
                onClick={async () => {
                  if (hasUnsavedChanges()) await persistNow()
                  setNewNoteWarningOpen(false)
                  await startNewNote()
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogHeader>
              <DialogTitle>Delete "{title}"?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  setDeleteOpen(false)
                  await trackSave(deleteNote(note.id))
                  router.push("/notes")
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div
      className="max-w-3xl mx-auto px-8 py-6 pb-24 min-h-full"
      onDragOver={e => { e.preventDefault(); if (Array.from(e.dataTransfer.items).some(i => i.type.startsWith("image/"))) setGlobalDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGlobalDragOver(false) }}
      onDrop={handleGlobalDrop}
    >
      {globalDragOver && (
        <div className="fixed inset-0 z-50 bg-indigo-50/80 border-4 border-dashed border-indigo-400 flex items-center justify-center pointer-events-none">
          <p className="text-indigo-600 text-xl font-semibold">Drop image to add to note</p>
        </div>
      )}

      <div className="mb-6">
        <button onClick={() => router.push("/notes")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors mb-4">
          <ChevronLeft className="h-4 w-4" /> All notes
        </button>
        <div className="flex items-center justify-between">
          <AutoTextarea
            value={title} onChange={setTitleAndSave}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault()
                if (blocks.length === 0) addBlock("paragraph")
                else { setFocusedId(blocks[0].id); setFocusPosition(0) }
              }
            }}
            placeholder="Title…"
            className="text-4xl font-bold text-gray-900 tracking-tight flex-1"
          />
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            <span className="text-xs text-gray-400">
              {saving ? "Saving…" : savedAt ? `Saved ${savedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-sm font-medium text-red-600 hover:text-red-700 cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-sm font-medium text-white cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        {blocks.map((block, idx) => {
          const globalOffset = blocks.slice(0, idx).reduce((sum, b) => sum + (b.type === "image" ? b.images.length : 0), 0)
          return (
            <BlockRow
              key={block.id}
              block={block}
              focused={focusedId === block.id}
              focusPosition={focusedId === block.id ? focusPosition : null}
              onFocus={() => { setFocusedId(block.id); setFocusPosition(null) }}
              onChange={updated => updateBlock(block.id, updated)}
              onDelete={() => deleteBlock(block.id)}
              onEnter={(before, after) => splitTextBlock(block.id, before, after)}
              onBackspaceStart={() => mergeWithPreviousBlock(block.id)}
              onBackspaceEmpty={() => deleteBlock(block.id)}
              onDragStart={() => handleBlockDragStart(idx)}
              onDragEnter={() => handleBlockDragEnter(idx)}
              onDragEnd={handleBlockDragEnd}
              isDragOver={dragOverBlock === idx && dragIdx.current !== idx}
              noteId={note.id}
              onAddImageAfter={() => addBlock("image", block.id)}
              onOpenLightbox={setLightboxIndex}
              globalOffset={globalOffset}
            />
          )
        })}
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          urls={allImageUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <div className="flex items-center gap-2 mt-6 pl-5">
        <span className="text-xs text-gray-300 mr-1">Add</span>
        <button
          onClick={() => addBlock("paragraph", blocks[blocks.length - 1]?.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
        >
          <Type className="h-3.5 w-3.5" /> Text
        </button>
        <button
          onClick={() => addBlock("image", blocks[blocks.length - 1]?.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
        >
          <ImageIcon className="h-3.5 w-3.5" /> Image
        </button>
      </div>

      <Dialog open={newNoteWarningOpen} onOpenChange={setNewNoteWarningOpen}>
        <DialogContent className="sm:max-w-[430px]">
          <DialogHeader>
            <DialogTitle>Leave this note and create a new one?</DialogTitle>
            <DialogDescription>
              Unsaved edits will be lost. You can save first, discard, or cancel and keep editing this note.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewNoteWarningOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (saveTimer.current) {
                  clearTimeout(saveTimer.current)
                  saveTimer.current = null
                }
                setNewNoteWarningOpen(false)
                await startNewNote()
              }}
            >
              Discard
            </Button>
            <Button
              onClick={async () => {
                if (hasUnsavedChanges()) await persistNow()
                setNewNoteWarningOpen(false)
                await startNewNote()
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete "{title}"?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setDeleteOpen(false)
                await trackSave(deleteNote(note.id))
                router.push("/notes")
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
