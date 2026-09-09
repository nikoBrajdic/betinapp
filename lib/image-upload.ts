/**
 * Shared client-side image downscale + encode, used by every upload in the app
 * (notes, diary, season, inventory).
 *
 * Was copy-pasted into four files, each producing JPEG at 1000x760 and each
 * hardcoding a `.jpg` path — while season uploaded phone originals untouched.
 * One helper now, and it prefers WebP.
 *
 * WebP needs a fallback, not a feature test. `canvas.toBlob` is specified to
 * silently substitute **PNG** when it cannot encode the requested type, and a
 * PNG of a photo is bigger than the JPEG it replaced. So we encode, look at
 * what actually came back, and re-encode as JPEG if it isn't WebP. The caller
 * must take the extension and content type from the returned blob for the same
 * reason — the format is decided by the browser, not by us.
 */

export interface CompressOptions {
  /** Longest-edge boxes. The image is scaled to fit inside, never enlarged. */
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

/** Extension for a blob produced by `compressImage`. */
export function extensionFor(blob: Blob): string {
  if (blob.type === "image/webp") return "webp"
  if (blob.type === "image/png") return "png"
  return "jpg"
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error("Image encoding failed")),
      type,
      quality,
    )
  })
}

/**
 * Decode a file to a bitmap with EXIF rotation already applied.
 *
 * Phone photos arrive rotated by metadata. `createImageBitmap` with
 * `imageOrientation: "from-image"` bakes it in; the old `new Image()` path
 * relied on the browser doing it implicitly, which is true for `<img>` but not
 * guaranteed once you go through a canvas.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // Fall through — some browsers reject the options bag rather than ignore it.
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image decode failed")) }
    img.src = url
  })
}

/**
 * Downscale to fit the box and encode, preferring WebP.
 *
 * Returns the blob; read its `type` for the content type and pass it to
 * `extensionFor` for the path. Never assume JPEG.
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<Blob> {
  const { maxWidth = 1000, maxHeight = 760, quality = 0.82 } = options

  const source = await decode(file)
  const scale = Math.min(1, maxWidth / source.width, maxHeight / source.height)

  const canvas = document.createElement("canvas")
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas unavailable")
  ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height)
  if ("close" in source) source.close()

  const webp = await encode(canvas, "image/webp", quality)
  if (webp.type === "image/webp") return webp
  return encode(canvas, "image/jpeg", quality)
}

/** Strip a filename down to something safe to put in a storage path. */
export function safeFileStem(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40) || "image"
}
