"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"

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

export type NoteImage = { url: string; caption?: string }
export type NoteBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "image"; images: NoteImage[] }

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

export function emptyNoteBlocks(): NoteBlock[] {
  return [{ id: genId(), type: "paragraph", text: "" }]
}

export function parseNoteBlocks(content: string): NoteBlock[] {
  if (!content.trim()) return emptyNoteBlocks()

  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed) && parsed.every(block => block?.type)) {
      return parsed.map(block => ({
        ...block,
        id: block.id ?? genId(),
        images: block.type === "image" ? block.images ?? [] : undefined,
      })) as NoteBlock[]
    }
  } catch {
    // Existing plain notes stay as readable paragraphs.
  }

  return content
    .split(/\n{2,}/)
    .map(text => ({ id: genId(), type: "paragraph" as const, text }))
}

export function stringifyNoteBlocks(blocks: NoteBlock[]) {
  return JSON.stringify(blocks.filter(block => {
    if (block.type === "paragraph") return block.text.trim()
    return block.images.length > 0
  }))
}

export function noteHasContent(blocks: NoteBlock[]) {
  return blocks.some(block => block.type === "paragraph" ? block.text.trim() : block.images.length > 0)
}

export function notePreviewText(content: string) {
  const blocks = parseNoteBlocks(content)
  const text = blocks.find(block => block.type === "paragraph" && block.text.trim())
  const imageCount = blocks.reduce((sum, block) => sum + (block.type === "image" ? block.images.length : 0), 0)
  if (text?.type === "paragraph") return text.text
  if (imageCount > 0) return `${imageCount} image${imageCount !== 1 ? "s" : ""}`
  return ""
}

export function noteCoverImage(content: string) {
  for (const block of parseNoteBlocks(content)) {
    if (block.type === "image" && block.images[0]?.url) return block.images[0].url
  }
  return null
}

export function NoteBlocksView({ content, compact = false }: { content: string; compact?: boolean }) {
  const blocks = parseNoteBlocks(content)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  return (
    <>
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {blocks.map(block => {
          if (block.type === "image") {
            const imgs = block.images ?? []
            if (imgs.length === 0) return null
            const grid = imgs.length === 1 ? "" : imgs.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"

            return (
              <div key={block.id} className={grid} style={{ maxWidth: compact ? undefined : 640 }}>
                {imgs.slice(0, compact ? 1 : 3).map((img, index) => (
                  <img
                    key={`${img.url}-${index}`}
                    src={img.url}
                    alt=""
                    className="w-full rounded-lg object-cover cursor-zoom-in"
                    style={{ height: compact ? 120 : imgs.length === 1 ? 380 : imgs.length === 2 ? 300 : 220 }}
                    onClick={() => !compact && setLightboxUrl(img.url)}
                  />
                ))}
              </div>
            )
          }

          return (
            <p key={block.id} className={compact ? "line-clamp-3 text-sm text-muted-foreground" : "max-w-[640px] whitespace-pre-wrap text-base leading-relaxed text-gray-700"}>
              {block.text}
            </p>
          )
        })}
      </div>
    </>
  )
}
