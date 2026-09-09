"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Type, ImageIcon,
  Trash2, Loader2, GripVertical, CornerDownLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createNote, deleteNote, updateNote, type Note } from "@/lib/actions/notes"
import type { Block, ImageItem } from "@/lib/actions/diary"
import { trackSave } from "@/lib/save-events"
import { createClient } from "@/lib/supabase/client"
import { ImageLightbox } from "@/components/image-lightbox"
import {
  isImageBlock,
  layoutBlocks,
  makeImageBlocks,
  normalizeBlocks,
  rowImageHeight,
} from "@/lib/image-rows"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EditorHeader } from "@/components/editor-header"
import {
  SlashMenu,
  filterSlashCommands,
  slashCommands,
  type SlashCommand,
} from "@/components/editor-slash-menu"

import { compressImage, extensionFor, safeFileStem } from "@/lib/image-upload"

function genId() { return Math.random().toString(36).slice(2, 9) }


async function uploadImage(file: File, noteId: string): Promise<string> {
  const supabase = createClient()
  const compressed = await compressImage(file)
  const path = `${noteId}/${Date.now()}-${safeFileStem(file.name)}.${extensionFor(compressed)}`
  const { data, error } = await supabase.storage.from("notes-images").upload(path, compressed, {
    contentType: compressed.type,
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

// ── One image, rendered as a cell inside a row ────────────────────────────────
function ImageCell({
  block, row, position, noteId, onChange, onDelete, onToggleBreak,
  onOpenLightbox, lightboxIndex, onDragStart, onDragEnd, onDragOverCell, isDragOver,
}: {
  block: Extract<Block, { type: "image" }>
  /** How many images share this row — drives the rendered height. */
  row: number
  /** Index within the row; the first cell owns the row-break control. */
  position: number
  noteId: string
  onChange: (b: Block) => void
  onDelete: () => void
  onToggleBreak: () => void
  onOpenLightbox: (index: number) => void
  lightboxIndex: number
  onDragStart: () => void
  onDragEnd: () => void
  onDragOverCell: () => void
  isDragOver: boolean
}) {
    const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const image = block.images[0]

  const replace = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const url = await uploadImage(file, noteId)
      onChange({ ...block, images: [{ ...image, url }] })
    } catch (error) { console.error("Replace image failed:", error) }
    setUploading(false)
  }

  return (
    <div
      className={cn(
        "group/img relative rounded-lg transition-shadow",
        isDragOver && "ring-2 ring-indigo-400 ring-offset-2",
      )}
      onDragOver={e => { e.preventDefault(); onDragOverCell() }}
    >
      <img
        ref={imgRef}
        src={image?.url}
        alt={image?.caption || ""}
        onClick={() => onOpenLightbox(lightboxIndex)}
        className="rounded-lg object-cover w-full cursor-zoom-in"
        style={{ height: rowImageHeight(row), objectFit: "cover" }}
      />

      {/* Drag handle — dragging reorders, clicking anywhere else opens the
          lightbox, so the two gestures never compete. */}
      <button
        type="button"
        draggable
        onDragStart={e => {
          e.dataTransfer.effectAllowed = "move"
          // Drag the picture, not the little handle.
          if (imgRef.current) e.dataTransfer.setDragImage(imgRef.current, 40, 40)
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={e => e.stopPropagation()}
        title="Drag to reorder"
        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm opacity-0 transition-opacity group-hover/img:opacity-100 hover:text-gray-700 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}
      >
        {position === 0 ? (
          <button
            onClick={onToggleBreak}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              block.breakBefore
                ? "text-indigo-600 bg-indigo-50"
                : "text-gray-400 hover:bg-gray-100 hover:text-indigo-600",
            )}
            title={block.breakBefore ? "Join the row above" : "Start a new row here"}
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggleBreak}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
            title="Start a new row here"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => document.getElementById(`note-img-replace-${block.id}`)?.click()}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
          title="Replace image"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete image"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {image?.caption && (
        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{image.caption}</p>
      )}

      <input
        id={`note-img-replace-${block.id}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { replace(e.target.files?.[0]); e.target.value = "" }}
      />
    </div>
  )
}

function BlockRow({
  block, focused, focusPosition, onFocus, onChange, onDelete, onEnter, onBackspaceStart, onBackspaceEmpty,
  onDragStart, onDragEnter, onDragEnd, isDragOver, onAddImageAfter,
  onSlashCommand,
}: {
  block: Exclude<Block, { type: "image" }>
  focused: boolean; focusPosition?: number | null; onFocus: () => void
  onChange: (b: Block) => void; onDelete: () => void
  onEnter: (before: string, after: string) => void; onBackspaceStart: () => void; onBackspaceEmpty: () => void
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void
  isDragOver: boolean; onAddImageAfter: () => void
  onSlashCommand: (blockId: string, command: SlashCommand) => void
}) {
  // `/` at the start of a text block opens the command palette.
  const text: string = (block as any).text ?? ""
  const slashQuery =
    block.type === "paragraph" && text.startsWith("/") && !text.slice(1).includes(" ")
      ? text.slice(1)
      : null

  // Notes support text and images only — no headings.
  const allCommands = slashCommands({ text: "Text", heading: "Heading", image: "Image" })
    .filter(command => command.id !== "heading")
  const matches = slashQuery === null ? [] : filterSlashCommands(allCommands, slashQuery)
  const menuOpen = focused && matches.length > 0
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    setActiveIndex(0)
  }, [slashQuery])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (menuOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex(i => (i + 1) % matches.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex(i => (i - 1 + matches.length) % matches.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        onSlashCommand(block.id, matches[activeIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        onChange({ ...block, text: "" } as Block)
        return
      }
    }

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

      <div className="relative flex-1 min-w-0">
        {block.type === "paragraph" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder="Write something…"
            autoFocus={focused} focusPosition={focusPosition}
            className="text-base text-gray-700 py-0.5"
          />
        )}
        {menuOpen && (
          <SlashMenu
            commands={matches}
            activeIndex={activeIndex}
            onHover={setActiveIndex}
            onSelect={command => onSlashCommand(block.id, command)}
          />
        )}
      </div>

      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity mt-0.5">
        <button
          onClick={onAddImageAfter}
          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="Add image below"
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
  const [blocks, setBlocks] = useState<Block[]>(() => normalizeBlocks(note.content ?? []))
  const [savedTitle, setSavedTitle] = useState(note.title)
  const [savedBlocks, setSavedBlocks] = useState<Block[]>(note.content ?? [])
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusPosition, setFocusPosition] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [newNoteWarningOpen, setNewNoteWarningOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const imageBlocks = blocks.filter(isImageBlock)
  const allImageUrls = imageBlocks.map(b => b.images[0]?.url ?? "")
  const imageIndexById = new Map(imageBlocks.map((b, i) => [b.id, i]))
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [dragOverBlock, setDragOverBlock] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingInsertAfter = useRef<string | undefined>(undefined)
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageDragId = useRef<string | null>(null)
  const [imageDropId, setImageDropId] = useState<string | null>(null)
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

  const addBlock = (type: "heading" | "paragraph", afterId?: string) => {
    const newBlock: Block = { id: genId(), type: "paragraph", text: "", bold: false }
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

  /** Turn the "/query" block into the chosen block type. */
  const applySlashCommand = (blockId: string, command: SlashCommand) => {
    const idx = blocks.findIndex(b => b.id === blockId)
    if (idx === -1) return
    const current = blocks[idx]

    const replacement: Block = { id: current.id, type: "paragraph", text: "", bold: false }
    setBlocksAndSave([...blocks.slice(0, idx), replacement, ...blocks.slice(idx + 1)])

    if (command.id === "image") {
      pickImages(current.id)
      setFocusedId(null)
      return
    }
    setFocusedId(replacement.id)
    setFocusPosition(0)
  }

  /** Clicking the empty space under the document appends a paragraph. */
  const appendParagraph = () => {
    const last = blocks[blocks.length - 1]
    if (last && last.type === "paragraph" && !last.text) {
      setFocusedId(last.id)
      setFocusPosition(0)
      return
    }
    addBlock("paragraph", last?.id)
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

  /** Images become one block each; rows wrap at three on their own. */
  const insertImages = (urls: string[], afterId?: string) => {
    const current = blocksRef.current
    const additions = makeImageBlocks(urls)
    const at = afterId ? current.findIndex(b => b.id === afterId) : -1
    setBlocksAndSave(
      at === -1
        ? [...current, ...additions]
        : [...current.slice(0, at + 1), ...additions, ...current.slice(at + 1)],
    )
  }

  const pickImages = (afterId?: string) => {
    pendingInsertAfter.current = afterId
    imageInputRef.current?.click()
  }

  const handleImagesChosen = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter(f => f.type.startsWith("image/"))
    if (imageInputRef.current) imageInputRef.current.value = ""
    if (!files.length) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, note.id)))
      insertImages(urls, pendingInsertAfter.current)
    } catch (error) { console.error(error) }
    setUploadingImages(false)
    pendingInsertAfter.current = undefined
  }

  const moveImageBlock = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const current = blocksRef.current
    const from = current.findIndex(b => b.id === fromId)
    const to = current.findIndex(b => b.id === toId)
    if (from === -1 || to === -1) return
    const next = [...current]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setBlocksAndSave(next)
  }

  const toggleRowBreak = (id: string) => {
    setBlocksAndSave(
      blocksRef.current.map(b =>
        b.id === id && isImageBlock(b) ? { ...b, breakBefore: !b.breakBefore } : b,
      ),
    )
  }

  const handleGlobalDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setGlobalDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (!files.length) return
    setUploadingImages(true)
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, note.id)))
      insertImages(urls)
    } catch (error) { console.error(error) }
    setUploadingImages(false)
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

  return (
    <div
      className="px-4 md:px-6 pb-24 min-h-full"
      onDragOver={e => { e.preventDefault(); if (Array.from(e.dataTransfer.items).some(i => i.type.startsWith("image/"))) setGlobalDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setGlobalDragOver(false) }}
      onDrop={handleGlobalDrop}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleImagesChosen(e.target.files)}
      />

      {uploadingImages && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
        </div>
      )}

      {globalDragOver && (
        <div className="fixed inset-0 z-50 bg-indigo-50/80 border-4 border-dashed border-indigo-400 flex items-center justify-center pointer-events-none">
          <p className="text-indigo-600 text-xl font-semibold">Drop image to add to note</p>
        </div>
      )}

      <EditorHeader
        backHref="/notes"
        backLabel="All notes"
        title={title}
        accent="notes"
        status={
          saving
            ? "Saving…"
            : savedAt
            ? `Saved ${savedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
        actions={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteOpen(true)}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Delete note"
          >
            <Trash2 />
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto pt-6">
        <AutoTextarea
          value={title} onChange={setTitleAndSave}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault()
              if (blocks.length === 0) addBlock("paragraph")
              else { setFocusedId(blocks[0].id); setFocusPosition(0) }
            }
          }}
          placeholder="Title…"
          className="text-4xl font-bold text-gray-900 tracking-tight mb-6"
        />

      <div className="space-y-0.5">
        {layoutBlocks(blocks).map(item => {
          if (item.kind === "row") {
            return (
              <div key={item.blocks[0].id} className="py-2" style={{ maxWidth: 500 }}>
                <div
                  className={cn(
                    "grid gap-2",
                    item.blocks.length === 1 ? "grid-cols-1"
                    : item.blocks.length === 2 ? "grid-cols-2"
                    : "grid-cols-3",
                  )}
                >
                  {item.blocks.map((imageBlock, position) => (
                    <ImageCell
                      key={imageBlock.id}
                      block={imageBlock}
                      row={item.blocks.length}
                      position={position}
                      noteId={note.id}
                      onChange={updated => updateBlock(imageBlock.id, updated)}
                      onDelete={() => deleteBlock(imageBlock.id)}
                      onToggleBreak={() => toggleRowBreak(imageBlock.id)}
                      onOpenLightbox={setLightboxIndex}
                      lightboxIndex={imageIndexById.get(imageBlock.id) ?? 0}
                      onDragStart={() => { imageDragId.current = imageBlock.id }}
                      onDragEnd={() => {
                        if (imageDragId.current && imageDropId) {
                          moveImageBlock(imageDragId.current, imageDropId)
                        }
                        imageDragId.current = null
                        setImageDropId(null)
                      }}
                      onDragOverCell={() => setImageDropId(imageBlock.id)}
                      isDragOver={imageDropId === imageBlock.id && imageDragId.current !== imageBlock.id}
                    />
                  ))}
                </div>
              </div>
            )
          }

          const block = item.block
          const idx = blocks.findIndex(b => b.id === block.id)
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
              onAddImageAfter={() => pickImages(block.id)}
              onSlashCommand={applySlashCommand}
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

      {/* Click anywhere below the last block to keep writing. */}
      <div onClick={appendParagraph} className="min-h-40 pl-5 pt-3 cursor-text">
        {blocks.length === 0 && <p className="text-base text-gray-300">Write something…</p>}
      </div>

      <p className="pl-5 text-xs text-gray-300">Type / for text and images</p>
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
