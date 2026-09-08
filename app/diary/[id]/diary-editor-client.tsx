"use client"

import { useState, useEffect, useRef, useCallback, DragEvent } from "react"
import { useRouter } from "next/navigation"
import {
  Bold, Heading2, Type, ImageIcon,
  Trash2, Loader2, GripVertical, CornerDownLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateDiaryEntry, type DiaryEntry, type Block, type ImageItem } from "@/lib/actions/diary"
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
import { useT, useLanguage } from "@/lib/language"
import { EditorHeader } from "@/components/editor-header"
import {
  SlashMenu,
  filterSlashCommands,
  slashCommands,
  type SlashCommand,
} from "@/components/editor-slash-menu"

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

// ── Image block ───────────────────────────────────────────────────────────────
// ── One image, rendered as a cell inside a row ────────────────────────────────
function ImageCell({
  block, row, position, entryId, onChange, onDelete, onToggleBreak,
  onOpenLightbox, lightboxIndex, onDragStart, onDragEnd, onDragOverCell, isDragOver,
}: {
  block: Extract<Block, { type: "image" }>
  /** How many images share this row — drives the rendered height. */
  row: number
  /** Index within the row; the first cell owns the row-break control. */
  position: number
  entryId: string
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
  const t = useT()
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const image = block.images[0]

  const replace = async (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return
    setUploading(true)
    try {
      const url = await uploadImage(file, entryId)
      onChange({ ...block, images: [{ ...image, url }] })
    } catch (error) { console.error("Replace image failed:", error) }
    setUploading(false)
  }

  return (
    <div
      className={cn(
        "group/img relative rounded-lg transition-shadow",
        isDragOver && "ring-2 ring-amber-400 ring-offset-2",
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
        title={t("diary.dragToReorder")}
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
                ? "text-amber-600 bg-amber-50"
                : "text-gray-400 hover:bg-gray-100 hover:text-amber-600",
            )}
            title={block.breakBefore ? t("diary.joinRow") : t("diary.startRow")}
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggleBreak}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-amber-600 transition-colors"
            title={t("diary.startRow")}
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => document.getElementById(`img-replace-${block.id}`)?.click()}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-amber-600 transition-colors"
          title={t("diary.replaceImage")}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title={t("diary.deleteImage")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {image?.caption && (
        <p className="mt-1 text-xs text-gray-400 line-clamp-2">{image.caption}</p>
      )}

      <input
        id={`img-replace-${block.id}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { replace(e.target.files?.[0]); e.target.value = "" }}
      />
    </div>
  )
}

// ── Single block row ──────────────────────────────────────────────────────────
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
  const t = useT()

  // `/` at the start of a text block opens the command palette; the query is
  // whatever follows it, and a space cancels (so "/ " is just typing).
  const text: string = (block as any).text ?? ""
  const slashQuery =
    (block.type === "paragraph" || block.type === "heading") &&
    text.startsWith("/") &&
    !text.slice(1).includes(" ")
      ? text.slice(1)
      : null

  const allCommands = slashCommands({
    text: t("diary.text"),
    heading: t("diary.heading"),
    image: t("diary.image"),
  })
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
        isDragOver && "before:absolute before:-top-1 before:left-6 before:right-1 before:h-0.5 before:rounded-full before:bg-amber-400"
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
      <div className="relative flex-1 min-w-0">
        {block.type === "heading" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder={t("diary.headingPlaceholder")}
            autoFocus={focused}
            focusPosition={focusPosition}
            className="text-xl font-semibold text-gray-800 py-0.5"
          />
        )}
        {block.type === "paragraph" && (
          <AutoTextarea
            value={block.text} onChange={text => onChange({ ...block, text })}
            onKeyDown={handleKey} placeholder={t("diary.writeSomething")}
            autoFocus={focused}
            focusPosition={focusPosition}
            className={cn("text-base text-gray-700 py-0.5", block.bold && "font-semibold")}
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

      {/* Block actions */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity mt-0.5">
        <>
          <button
            onClick={() => onChange(
              block.type === "heading"
                ? { ...block, type: "paragraph", bold: false } as Block
                : { ...block, type: "heading" } as Block
            )}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-200 transition-colors"
            title={block.type === "heading" ? t("diary.toText") : t("diary.toHeading")}
          >
            {block.type === "heading" ? <Type className="h-4 w-4" /> : <Heading2 className="h-4 w-4" />}
          </button>
          {block.type === "paragraph" && (
            <button
              onClick={() => onChange({ ...block, bold: !block.bold } as Block)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                block.bold
                  ? "text-gray-900 bg-gray-200"
                  : "text-gray-400 hover:text-gray-800 hover:bg-gray-200"
              )}
              title={t("diary.bold")}
            >
              <Bold className="h-4 w-4" />
            </button>
          )}
        </>
        <button
          onClick={onAddImageAfter}
          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
          title={t("diary.addImageBelow")}
        >
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title={t("diary.deleteBlock")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export function DiaryEditorClient({ entry }: { entry: DiaryEntry }) {
  const t = useT()
  const { lang } = useLanguage()
  const timeLocale = lang === "hr" ? "hr-HR" : "en-US"
  const [title, setTitle] = useState(entry.title)
  const [blocks, setBlocks] = useState<Block[]>(() => normalizeBlocks(entry.content ?? []))
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [focusPosition, setFocusPosition] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [globalDragOver, setGlobalDragOver] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Flat list of every image, in document order, for lightbox navigation.
  const imageBlocks = blocks.filter(isImageBlock)
  const allImageUrls = imageBlocks.map(b => b.images[0]?.url ?? "")
  const imageIndexById = new Map(imageBlocks.map((b, i) => [b.id, i]))
  const dragIdx = useRef<number | null>(null)
  const dragOverIdx = useRef<number | null>(null)
  const [dragOverBlock, setDragOverBlock] = useState<number | null>(null)
  const saveTimer = useRef<NodeJS.Timeout | null>(null)
  // Uploads are async, so handlers read the latest blocks from a ref rather
  // than a stale closure.
  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingInsertAfter = useRef<string | undefined>(undefined)
  const [uploadingImages, setUploadingImages] = useState(false)
  const imageDragId = useRef<string | null>(null)
  const [imageDropId, setImageDropId] = useState<string | null>(null)
  const router = useRouter()

  const scheduleSave = useCallback((t: string, b: Block[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try { await trackSave(updateDiaryEntry(entry.id, { title: t, content: b })); setSavedAt(new Date()) }
      catch (e) { console.error(e) }
      setSaving(false)
    }, 1200)
  }, [entry.id])

  const setBlocksAndSave = (next: Block[]) => { setBlocks(next); scheduleSave(title, next) }
  const setTitleAndSave = (t: string) => { setTitle(t); scheduleSave(t, blocks) }

  const addBlock = (type: "heading" | "paragraph", afterId?: string) => {
    const newBlock: Block =
      type === "heading" ? { id: genId(), type: "heading", text: "" }
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

  /** Turn the "/query" block into the chosen block type. */
  const applySlashCommand = (blockId: string, command: SlashCommand) => {
    const idx = blocks.findIndex(b => b.id === blockId)
    if (idx === -1) return
    const current = blocks[idx]

    // Clear the "/query" either way; an image block only exists once a file
    // has actually been chosen.
    const cleared: Block = { id: current.id, type: "paragraph", text: "", bold: false }
    const replacement: Block =
      command.id === "heading" ? { id: current.id, type: "heading", text: "" } : cleared

    setBlocksAndSave([...blocks.slice(0, idx), replacement, ...blocks.slice(idx + 1)])

    if (command.id === "image") {
      pickImages(current.id)
      setFocusedId(null)
      return
    }
    setFocusedId(replacement.id)
    setFocusPosition(0)
  }

  /**
   * Add images at `afterId` (or the end). They become one block each, so the
   * layout flows them into the trailing row and wraps at three on its own.
   */
  const insertImages = (urls: string[], afterId?: string) => {
    const current = blocksRef.current
    const additions = makeImageBlocks(urls)
    const at = afterId ? current.findIndex(b => b.id === afterId) : -1
    const next = at === -1
      ? [...current, ...additions]
      : [...current.slice(0, at + 1), ...additions, ...current.slice(at + 1)]
    setBlocksAndSave(next)
  }

  /** Open the picker; where the result lands is remembered in pendingInsertAfter. */
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
      const urls = await Promise.all(files.map(f => uploadImage(f, entry.id)))
      insertImages(urls, pendingInsertAfter.current)
    } catch (error) { console.error(error) }
    setUploadingImages(false)
    pendingInsertAfter.current = undefined
  }

  /** Move one image block to sit before another. */
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

  /** Clicking the empty space under the document appends a paragraph. */
  const appendParagraph = () => {
    const last = blocks[blocks.length - 1]
    if (last && (last.type === "paragraph" || last.type === "heading") && !(last as any).text) {
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
    if (!block || (block.type !== "paragraph" && block.type !== "heading")) return

    const newBlock: Block = { id: genId(), type: "paragraph", text: after, bold: false }
    const updatedCurrent: Block = block.type === "heading"
      ? { ...block, text: before }
      : { ...block, text: before }
    const next = [
      ...blocks.slice(0, idx),
      updatedCurrent,
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
    if ((block.type !== "paragraph" && block.type !== "heading") || (prev.type !== "paragraph" && prev.type !== "heading")) return

    const prevText = prev.text
    const nextPrev: Block = prev.type === "heading"
      ? { ...prev, text: prevText + block.text }
      : { ...prev, text: prevText + block.text }
    const next = [
      ...blocks.slice(0, idx - 1),
      nextPrev,
      ...blocks.slice(idx + 1),
    ]
    setBlocksAndSave(next)
    setFocusedId(prev.id)
    setFocusPosition(prevText.length)
  }

  // Global drag-and-drop for image files onto the editor
  const handleGlobalDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setGlobalDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (!files.length) return
    setUploadingImages(true)
    try {
      // No cap: every dropped file becomes a block and the rows wrap themselves.
      const urls = await Promise.all(files.map(f => uploadImage(f, entry.id)))
      insertImages(urls)
    } catch (error) { console.error(error) }
    setUploadingImages(false)
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

  // ── Editor ────────────────────────────────────────────────────────────────
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
          <Loader2 className="h-4 w-4 animate-spin" /> {t("diary.uploading")}
        </div>
      )}

      {/* Global drop overlay */}
      {globalDragOver && (
        <div className="fixed inset-0 z-50 bg-amber-50/80 border-4 border-dashed border-amber-400 flex items-center justify-center pointer-events-none">
          <p className="text-amber-600 text-xl font-semibold">{t("diary.dropToDiary")}</p>
        </div>
      )}

      <EditorHeader
        backHref="/diary"
        backLabel={t("diary.allEntries")}
        title={title}
        accent="diary"
        status={
          saving
            ? t("diary.saving")
            : savedAt
            ? `${t("diary.saved")} ${savedAt.toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })}`
            : ""
        }
      />

      <div className="max-w-3xl mx-auto pt-6">
        {/* Title */}
        <AutoTextarea
          value={title} onChange={setTitleAndSave}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault()
              if (blocks.length === 0) addBlock("paragraph")
              else { setFocusedId(blocks[0].id); setFocusPosition(0) }
            }
          }}
          placeholder={t("diary.titlePlaceholder")}
          className="text-4xl font-bold text-gray-900 tracking-tight mb-6"
        />

      {/* Blocks — runs of images collapse into rows that wrap at three. */}
      <div className="space-y-0.5">
        {layoutBlocks(blocks).map(item => {
          if (item.kind === "row") {
            return (
              <div
                key={item.blocks[0].id}
                className="py-2"
                style={{ maxWidth: 500 }}
              >
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
                      entryId={entry.id}
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
      <div
        onClick={appendParagraph}
        className="min-h-40 pl-5 pt-3 cursor-text"
      >
        {blocks.length === 0 && (
          <p className="text-base text-gray-300">{t("diary.writeSomething")}</p>
        )}
      </div>

      {/* Keyboard hint — the discoverability the old toolbar provided. */}
      <p className="pl-5 text-xs text-gray-300">
        {t("diary.slashHint")}
      </p>
      </div>
    </div>
  )
}
