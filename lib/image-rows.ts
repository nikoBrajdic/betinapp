import type { Block, ImageItem } from "@/lib/actions/diary"

/** Images per row before the layout wraps. */
export const ROW_SIZE = 3

type ImageBlock = Extract<Block, { type: "image" }>

export function isImageBlock(block: Block): block is ImageBlock {
  return block.type === "image"
}

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

/**
 * Bring stored content onto the one-image-per-block model.
 *
 * Legacy entries packed up to three images into a single block, and that
 * grouping *was* the row. Splitting them and marking the first image of each
 * original block with `breakBefore` reproduces every existing layout exactly —
 * including deliberate back-to-back partial rows.
 */
export function normalizeBlocks(raw: Block[]): Block[] {
  const out: Block[] = []

  for (const block of raw ?? []) {
    if (block.type !== "image") {
      out.push(block)
      continue
    }

    // Older still: a single `url`/`caption` pair rather than an `images` array.
    const legacy = block as unknown as { url?: string; caption?: string }
    const images: ImageItem[] =
      (block as ImageBlock).images ??
      (legacy.url ? [{ url: legacy.url, caption: legacy.caption ?? "" }] : [])

    images.forEach((image, index) => {
      out.push({
        id: index === 0 ? block.id : genId(),
        type: "image",
        images: [image],
        // The original block boundary is the row boundary.
        ...(index === 0 ? { breakBefore: true } : {}),
      })
    })
  }

  return out
}

/**
 * Split a run of consecutive image blocks into rows, wrapping every
 * `ROW_SIZE` and honouring an explicit `breakBefore`.
 */
export function chunkIntoRows(run: ImageBlock[]): ImageBlock[][] {
  const rows: ImageBlock[][] = []

  for (const block of run) {
    const current = rows[rows.length - 1]
    if (!current || block.breakBefore || current.length >= ROW_SIZE) {
      rows.push([block])
    } else {
      current.push(block)
    }
  }

  return rows
}

/** A rendering item: either one non-image block, or one row of image blocks. */
export type LayoutItem =
  | { kind: "block"; block: Exclude<Block, ImageBlock> }
  | { kind: "row"; blocks: ImageBlock[] }

/** Walk the document, grouping runs of image blocks into rows. */
export function layoutBlocks(blocks: Block[]): LayoutItem[] {
  const items: LayoutItem[] = []
  let run: ImageBlock[] = []

  const flush = () => {
    for (const row of chunkIntoRows(run)) items.push({ kind: "row", blocks: row })
    run = []
  }

  for (const block of blocks) {
    if (isImageBlock(block)) {
      run.push(block)
    } else {
      flush()
      items.push({ kind: "block", block })
    }
  }
  flush()

  return items
}

/** New image blocks, appended so they flow into the trailing row. */
export function makeImageBlocks(urls: string[]): ImageBlock[] {
  return urls.map(url => ({
    id: genId(),
    type: "image" as const,
    images: [{ url, caption: "" }],
  }))
}

/** Height for an image sitting in a row of `n`. Bigger rows, shorter images. */
export function rowImageHeight(n: number): number {
  return n === 1 ? 380 : n === 2 ? 320 : 240
}
