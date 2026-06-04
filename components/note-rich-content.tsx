"use client"

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

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {blocks.map(block => {
        if (block.type === "image") {
          const imgs = block.images ?? []
          if (imgs.length === 0) return null
          const grid = imgs.length === 1 ? "" : imgs.length === 2 ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"

          return (
            <div key={block.id} className={grid}>
              {imgs.slice(0, compact ? 1 : 3).map((img, index) => (
                <img
                  key={`${img.url}-${index}`}
                  src={img.url}
                  alt=""
                  className="w-full rounded-lg object-cover"
                  style={{ height: compact ? 120 : imgs.length === 1 ? 360 : imgs.length === 2 ? 280 : 220 }}
                />
              ))}
            </div>
          )
        }

        return (
          <p key={block.id} className={compact ? "line-clamp-3 text-sm text-muted-foreground" : "whitespace-pre-wrap text-base leading-relaxed text-gray-700"}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}
