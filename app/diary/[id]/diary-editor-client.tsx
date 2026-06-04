"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Bold, Heading2, Type, ImageIcon,
  Trash2, Loader2, GripVertical, Plus, X, Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateDiaryEntry, type DiaryEntry, type Block, type ImageItem } from "@/lib/actions/diary"
import { createClient } from "@/lib/supabase/client"

// ── Utilities ─────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9) }

/** Compress + resize image client-side before uploading */
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

async function uploadImage(file: File, entryId: string): Promise<string> {
  const supabase = createClient()
  const compressed = await compressImage(file)
  const path = `${entryId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}.jpg`
  const { data, error } = await supabase.storage.from("diary-images").upload(path, compressed, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from("diary-images").getPublicUrl(data.path)
  return publicUrl
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────
function AutoTextarea({
  value, onChange, onKeyDown, placeholder, className, autoFocus,
}: {
  value: string; onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string; className?: string; autoFocus?: boolean
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (ref.current) { ref.current.style.height = "auto"; ref.current.style.height = ref.current.scrollHeight + "px" }
  }, [value])
  useEffect(() => { if (autoFocus) ref.current?.focus() }, [autoFocus])
  return (
    <textarea
      ref={ref} value={value} rows={1} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
      className={cn("w-full resize-none overflow-hidden bg-transparent outline-none border-none leading-relaxed", className)}
    />
  )
}

// ── Image block ───────────────────────────────────────────────────────────────
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <img
        src={url} alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/30 hover:bg-black/50 rounded-full p-2 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function ImageBlock({
  block, entryId, onChange, onDelete,
}: {
  block: Extract<Block, { type: "image" }>
  entryId: string
  onChange: (b: Block) => void
  onDelete: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const addImages = async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"))
    const slots = 3 - block.images.length
    if (slots <= 0 || arr.length === 0) return
    setUploading(true)
    try {
      const urls = await Promise.all(arr.slice(0, slots).map(f => uploadImage(f, entryId)))
      const newImages: ImageItem[] = urls.map(url => ({ url, caption: "" }))
      onChange({ ...block, images: [...block.images, ...newImages] })
    } catch (e) { console.error("Upload failed:", e) }
    setUploading(false)
  }

  const handleDrop = (e: DragEvent) => {
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
      const url = await uploadImage(file, entryId)
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
                  onClick={() => setLightboxUrl(img.url)}
                  className="rounded-lg object-cover w-full cursor-zoom-in"
                  style={{
                    maxWidth: block.images.length === 1 ? 500 : "100%",
                    height: block.images.length === 1 ? 380 : block.images.length === 2 ? 320 : 240,
                    objectFit: "cover"
                  }}
                />
                {block.images.length > 1 && (
                  <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white shadow-sm">
                    {i + 1}/{block.images.length}
                  </div>
                )}
                <div
                  className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => document.getElementById(`img-replace-${block.id}-${i}`)?.click()}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-amber-600 cursor-pointer transition-colors"
                    title={`Replace image${block.images.length > 1 ? ` ${i + 1}/${block.images.length}` : ""}`}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeImage(i)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                    title={`Delete image${block.images.length > 1 ? ` ${i + 1}/${block.images.length}` : ""}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <input
                  id={`img-replace-${block.id}-${i}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    replaceImage(i, e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
              </div>
            ))}
          </div>
          {block.images.length < 3 && (
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex items-center gap-1.5 text-sm text-gray-400 hover:text-amber-600 cursor-pointer transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add photo to row
            </button>
          )}
        </div>
      )}

      {/* Upload zone — only shown when block has no images yet */}
      {block.images.length === 0 && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm transition-colors cursor-pointer py-2.5",
            dragOver ? "border-amber-400 bg-amber-50 text-amber-600" : "border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500",
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
        <div className="flex items-center gap-2 text-sm text-amber-500 mt-1">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
        </div>
      )}
      <input ref={fileRef} id={`img-add-${block.id}`} type="file" accept="image/*" multiple className="hidden"
        onChange={e => e.target.files && addImages(e.target.files)} />

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  )
}

// ── Single block row ──────────────────────────────────────────────────────────
function BlockRow({
  block, focused, onFocus, onChange, onDelete, onEnter, onBackspaceEmpty,
  onDragStart, onDragEnter, onDragEnd, isDragOver, entryId, onAddImageAfter,
}: {
  block: Block; focused: boolean; onFocus: () => void
  onChange: (b: Block) => void; onDelete: () => void
  onEnter: () => void; onBackspaceEmpty: () => void
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void
  isDragOver: boolean; entryId: string; onAddImageAfter: () => void
}) {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const text = (block as any).text ?? ""
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEnter() }
    if (e.key === "Backspace" && text === "") { e.preventDefault(); onBackspaceEmpty() }
  }

  return (
    <div
      className={cn(
        "group/block relative flex items-start gap-1 rounded-lg transition-colors",
        isDragOver && "bg-amber-50 border border-dashed border-amber-300"
      )}
      onDragOver={e => e.preventDefault()}
      onDragEnter={onDragEnter}
    >
      {/* Drag handle */}
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex-shrink-0 mt-1.5 cursor-grab opacity-0 group-hover/block:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-gray-300" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {block.type === "heading" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder="Heading…"
            autoFocus={focused && block.text === ""}
            className="text-xl font-semibold text-gray-800 py-0.5"
          />
        )}
        {block.type === "paragraph" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder="Write something…"
            autoFocus={focused && block.text === ""}
            className={cn("text-base text-gray-700 py-0.5", block.bold && "font-semibold")}
          />
        )}
        {block.type === "image" && (
          <ImageBlock block={block} entryId={entryId}
            onChange={onChange} onDelete={onDelete} />
        )}
      </div>

      {/* Block actions */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity mt-0.5">
        {block.type !== "image" && (<>
          <button
            onClick={() => onChange(
              block.type === "heading"
                ? { ...block, type: "paragraph", bold: false } as Block
                : { ...block, type: "heading" } as Block
            )}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-200 cursor-pointer transition-colors"
            title={block.type === "heading" ? "To text" : "To heading"}
          >
            {block.type === "heading" ? <Type className="h-4 w-4" /> : <Heading2 className="h-4 w-4" />}
          </button>
          {block.type === "paragraph" && (
            <button
              onClick={() => onChange({ ...block, bold: !block.bold } as Block)}
              className={cn(
                "p-1.5 rounded-lg cursor-pointer transition-colors",
                block.bold
                  ? "text-gray-900 bg-gray-200"
                  : "text-gray-400 hover:text-gray-800 hover:bg-gray-200"
              )}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
          )}
        </>)}
        {block.type !== "image" && (
          <button
            onClick={onAddImageAfter}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
            title="Add image below"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
        )}
        {block.type !== "image" && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
            title="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export function DiaryEditorClient({ entry }: { entry: DiaryEntry }) {
  const [title, setTitle] = useState(entry.title)
  const [blocks, setBlocks] = useState<Block[]>(
    // Migrate old single-image blocks to new format
    (entry.content ?? []).map(b => {
      if (b.type === "image" && !(b as any).images) {
        return { ...b, images: [{ url: (b as any).url ?? "", caption: (b as any).caption ?? "" }] } as Block
      }
      return b
    })
  )
  const [isEditing, setIsEditing] = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [dragOverBlock, setDragOverBlock] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  const scheduleSave = useCallback((t: string, b: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try { await updateDiaryEntry(entry.id, { title: t, content: b }); setSavedAt(new Date()) }
      catch (e) { console.error(e) }
      setSaving(false)
    }, 1200)
  }, [entry.id])

  const setBlocksAndSave = (next: Block[]) => { setBlocks(next); scheduleSave(title, next) }
  const setTitleAndSave = (t: string) => { setTitle(t); scheduleSave(t, blocks) }

  const addBlock = (type: "heading" | "paragraph" | "image", afterId?: string) => {
    const newBlock: Block =
      type === "image" ? { id: genId(), type: "image", images: [] }
      : type === "heading" ? { id: genId(), type: "heading", text: "" }
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
  }

  const deleteBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id)
    const next = blocks.filter(b => b.id !== id)
    setBlocksAndSave(next)
    setFocusedId(next[Math.max(0, idx - 1)]?.id ?? null)
  }

  const updateBlock = (id: string, updated: Block) => {
    setBlocksAndSave(blocks.map(b => b.id === id ? updated : b))
  }

  // Global drag-and-drop for image files onto the editor
  const handleGlobalDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setGlobalDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (!files.length) return
    const newBlock: Block = { id: genId(), type: "image", images: [] }
    const newBlocks = [...blocks, newBlock]
    setBlocks(newBlocks)
    setFocusedId(newBlock.id)
    // Upload and update
    try {
      const urls = await Promise.all(files.slice(0, 3).map(f => uploadImage(f, entry.id)))
      const withImages = newBlocks.map(b =>
        b.id === newBlock.id ? { ...b, images: urls.map(url => ({ url, caption: "" })) } as Block : b
      )
      setBlocksAndSave(withImages)
    } catch (e) { console.error(e) }
  }

  // Block drag-to-reorder
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

  // ── Read-only view ────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-6 pb-24 min-h-full">
        <div className="mb-6">
          <button onClick={() => router.push("/diary")}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors mb-4">
            <ChevronLeft className="h-4 w-4" /> All entries
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{title}</h1>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer transition-colors flex-shrink-0 ml-4"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {blocks.map(block => {
            if (block.type === "heading") return (
              <h2 key={block.id} className="text-xl font-semibold text-gray-800 pt-2">{block.text}</h2>
            )
            if (block.type === "paragraph") return (
              <p key={block.id} className={block.bold ? "text-base font-semibold text-gray-800" : "text-base text-gray-700 leading-relaxed"}>
                {block.text}
              </p>
            )
            if (block.type === "image") {
              const imgs = block.images ?? []
              if (imgs.length === 0) return null
              const colClass = imgs.length === 1 ? "" : imgs.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"
              return (
                <div key={block.id} className={colClass} style={{ maxWidth: 500 }}>
                  {imgs.map((img: any, i: number) => (
                    <div key={i} className="relative group/img cursor-zoom-in" onClick={() => {
                      // reuse lightbox via a temp state trick — just render inline
                      const el = document.getElementById(`view-lb-${block.id}-${i}`) as HTMLDialogElement
                      el?.showModal()
                    }}>
                      <img src={img.url} alt="" className="rounded-lg object-cover w-full"
                        style={{ height: imgs.length === 1 ? 380 : imgs.length === 2 ? 320 : 240, objectFit: "cover" }} />
                      <dialog id={`view-lb-${block.id}-${i}`}
                        className="fixed inset-0 z-50 bg-transparent p-0 max-w-none max-h-none w-screen h-screen"
                        onClick={e => (e.target as HTMLDialogElement).close()}
                      >
                        <div className="w-full h-full bg-black/85 flex items-center justify-center p-4">
                          <img src={img.url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain" />
                        </div>
                      </dialog>
                    </div>
                  ))}
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  // ── Edit view ─────────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-3xl mx-auto px-8 py-6 pb-24 min-h-full"
      onDragOver={e => { e.preventDefault(); if (Array.from(e.dataTransfer.items).some(i => i.type.startsWith("image/"))) setGlobalDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGlobalDragOver(false) }}
      onDrop={handleGlobalDrop}
    >
      {/* Global drop overlay */}
      {globalDragOver && (
        <div className="fixed inset-0 z-50 bg-amber-50/80 border-4 border-dashed border-amber-400 flex items-center justify-center pointer-events-none">
          <p className="text-amber-600 text-xl font-semibold">Drop image to add to diary</p>
        </div>
      )}

      {/* Nav */}
      <div className="mb-6">
        <button onClick={() => router.push("/diary")}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 cursor-pointer transition-colors mb-4">
          <ChevronLeft className="h-4 w-4" /> All entries
        </button>
        <div className="flex items-center justify-between">
          {/* Title */}
          <AutoTextarea
            value={title} onChange={setTitleAndSave}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault()
                if (blocks.length === 0) addBlock("paragraph")
                else setFocusedId(blocks[0].id)
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
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-sm font-medium text-white cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-0.5">
        {blocks.map((block, idx) => (
          <BlockRow
            key={block.id}
            block={block}
            focused={focusedId === block.id}
            onFocus={() => setFocusedId(block.id)}
            onChange={updated => updateBlock(block.id, updated)}
            onDelete={() => deleteBlock(block.id)}
            onEnter={() => addBlock("paragraph", block.id)}
            onBackspaceEmpty={() => deleteBlock(block.id)}
            onDragStart={() => handleBlockDragStart(idx)}
            onDragEnter={() => handleBlockDragEnter(idx)}
            onDragEnd={handleBlockDragEnd}
            isDragOver={dragOverBlock === idx && dragIdx.current !== idx}
            entryId={entry.id}
            onAddImageAfter={() => addBlock("image", block.id)}
          />
        ))}
      </div>

      {/* Add block toolbar */}
      <div className="flex items-center gap-2 mt-6 pl-5">
        <span className="text-xs text-gray-300 mr-1">Add</span>
        {([
          { type: "paragraph" as const, icon: <Type className="h-3.5 w-3.5" />, label: "Text" },
          { type: "heading" as const, icon: <Heading2 className="h-3.5 w-3.5" />, label: "Heading" },
          { type: "image" as const, icon: <ImageIcon className="h-3.5 w-3.5" />, label: "Image" },
        ] as const).map(({ type, icon, label }) => (
          <button key={type}
            onClick={() => addBlock(type, blocks[blocks.length - 1]?.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
          >
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  )
}
