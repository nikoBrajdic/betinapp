"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Package, Plus, Search, Trash2, X } from "lucide-react"

import { PageShell } from "@/components/ui/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pill } from "@/components/ui/pill"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/empty-state"
import { ImageLightbox } from "@/components/image-lightbox"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { compressImage, extensionFor } from "@/lib/image-upload"
import { trackSave } from "@/lib/save-events"
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh"
import {
  INVENTORY_CATEGORIES,
  STOCKED_LEVELS,
  STOCK_LEVELS,
  type InventoryCategory,
  type InventoryYear,
  type StockLevel,
} from "@/lib/inventory"
import {
  addInventoryItem,
  addInventoryPhoto,
  deleteInventoryItem,
  deleteInventoryPhoto,
  updateInventoryItem,
} from "@/lib/actions/inventory"

/**
 * Level colours. `out` is the only one that shouts — it is the state that
 * costs money if you miss it.
 */
const LEVEL_STYLE: Record<StockLevel, string> = {
  full:    "bg-lime-50 text-lime-700 border-lime-200",
  half:    "bg-amber-50 text-amber-700 border-amber-200",
  low:     "bg-orange-50 text-orange-700 border-orange-200",
  out:     "bg-rose-50 text-rose-700 border-rose-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
}

/** Tap a level to advance it. Faster than a dropdown for the one-by-one sweep. */
const LEVEL_CYCLE: StockLevel[] = ["unknown", "full", "half", "low", "out"]

function nextLevel(level: StockLevel): StockLevel {
  const i = LEVEL_CYCLE.indexOf(level)
  return LEVEL_CYCLE[(i + 1) % LEVEL_CYCLE.length]
}

/**
 * Photograph the shelf at 1600px, and keep a 400px thumbnail for the grid.
 *
 * The diary's 1000x760 is sized for looking at a photo; this one has to be
 * *read* — "Basmati riža 1kg" off a label — so it needs the detail. The
 * thumbnail exists because a category can hold a dozen shelf shots and the
 * page should not pull a dozen full-size images to show a strip of squares.
 */
async function uploadShelfPhoto(file: File, year: number, category: string) {
  const supabase = createClient()
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const full = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.8 })
  const thumb = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.7 })

  const upload = async (blob: Blob, suffix: string) => {
    const path = `${year}/${category}/${stamp}${suffix}.${extensionFor(blob)}`
    const { data, error } = await supabase.storage.from("inventory-photos").upload(path, blob, {
      contentType: blob.type,
      cacheControl: "31536000",
    })
    if (error) throw error
    return supabase.storage.from("inventory-photos").getPublicUrl(data.path).data.publicUrl
  }

  return { url: await upload(full, ""), thumbUrl: await upload(thumb, "-thumb") }
}

export function InventoryClient({
  inventory,
  years,
}: {
  inventory: InventoryYear
  years: number[]
}) {
  const router = useRouter()
  useRealtimeRefresh(["inventory_photos", "inventory_items"])

  const [query, setQuery] = useState("")
  const [stockedOnly, setStockedOnly] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<InventoryCategory | null>(null)
  const [newName, setNewName] = useState("")
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [choosingCategory, setChoosingCategory] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<InventoryCategory | null>(null)

  const allPhotoUrls = inventory.photos.map(p => p.url)

  /**
   * The primary action lives in the top bar (CONVENTIONS §9), but a photo has
   * to land in a category and there is no sensible default — so it asks. On a
   * phone that is two taps to a camera, which is the whole point.
   */
  useEffect(() => {
    const handler = () => setChoosingCategory(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const pickPhotos = (category: InventoryCategory) => {
    uploadTarget.current = category
    fileInputRef.current?.click()
  }

  const handleFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? [])
    const category = uploadTarget.current
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (!files.length || !category) return

    setUploadingCategory(category)
    try {
      for (const file of files) {
        const { url, thumbUrl } = await uploadShelfPhoto(file, inventory.year, category)
        await trackSave(addInventoryPhoto({ year: inventory.year, category, url, thumbUrl }))
      }
      router.refresh()
    } catch (error) {
      console.error("Failed to upload inventory photo:", error)
    }
    setUploadingCategory(null)
    uploadTarget.current = null
  }

  const handleAddItem = async (category: InventoryCategory) => {
    const name = newName.trim()
    if (!name) return
    setNewName("")
    try {
      await trackSave(addInventoryItem({ year: inventory.year, category, name }))
      router.refresh()
    } catch (error) {
      console.error("Failed to add inventory item:", error)
    }
  }

  const handleCycleLevel = async (id: string, level: StockLevel) => {
    try {
      await trackSave(updateInventoryItem(id, { level: nextLevel(level) }))
      router.refresh()
    } catch (error) {
      console.error("Failed to update level:", error)
    }
  }

  const needle = query.trim().toLowerCase()
  const isEmpty = !inventory.photos.length && !inventory.items.length

  return (
    <PageShell>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        {years.length > 1 && (
          <Segmented
            value={String(inventory.year)}
            onValueChange={value => router.push(`/inventory?year=${value}`)}
            accent="inventory"
            size="sm"
          >
            {years.map(year => (
              <SegmentedItem key={year} value={String(year)}>
                {year}
              </SegmentedItem>
            ))}
          </Segmented>
        )}

        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Traži…"
            className="pl-9"
          />
        </div>

        <Pill
          label="Imamo"
          state={stockedOnly ? "on" : "off"}
          accent="inventory"
          onClick={() => setStockedOnly(v => !v)}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<Package />}
          message="Još ništa nije popisano. Slikaj policu — imena možeš dodati kasnije."
          action="Slikaj policu"
          accent="inventory"
          onAction={() => setChoosingCategory(true)}
        />
      ) : (
      <div className="space-y-6">
        {INVENTORY_CATEGORIES.map(category => {
          const photos = inventory.photos.filter(p => p.category === category.key)
          const items = inventory.items
            .filter(i => i.category === category.key)
            .filter(i => (needle ? i.name.toLowerCase().includes(needle) : true))
            .filter(i => (stockedOnly ? STOCKED_LEVELS.includes(i.level) : true))

          // A search or filter that empties a category should hide it, not
          // leave a row of empty headings to scroll past.
          if ((needle || stockedOnly) && !items.length) return null

          const busy = uploadingCategory === category.key

          return (
            <section
              key={category.key}
              className="rounded-xl border bg-white overflow-hidden"
            >
              <header className="flex items-center justify-between gap-3 px-4 py-3 border-b">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-800">{category.label}</h2>
                  <p className="text-xs text-gray-400 truncate">{category.hint}</p>
                </div>
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => pickPhotos(category.key)}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  <span className="hidden sm:inline">Slikaj</span>
                </Button>
              </header>

              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative flex-shrink-0 group">
                      <img
                        src={photo.thumb_url ?? photo.url}
                        alt={photo.caption ?? category.label}
                        loading="lazy"
                        className="size-24 rounded-lg object-cover border cursor-pointer"
                        onClick={() =>
                          setLightbox(allPhotoUrls.indexOf(photo.url))
                        }
                      />
                      <button
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={async () => {
                          await trackSave(deleteInventoryPhoto(photo.id))
                          router.refresh()
                        }}
                        title="Obriši sliku"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="divide-y">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 min-w-0 truncate text-sm text-gray-800">
                      {item.name}
                    </span>
                    {item.location && (
                      <span className="text-xs text-gray-400 truncate hidden sm:block">
                        {item.location}
                      </span>
                    )}
                    <button
                      onClick={() => handleCycleLevel(item.id, item.level)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium flex-shrink-0",
                        LEVEL_STYLE[item.level],
                      )}
                    >
                      {STOCK_LEVELS.find(l => l.key === item.level)?.short}
                    </button>
                    <Button
                      variant="subtle"
                      size="icon-xs"
                      onClick={async () => {
                        await trackSave(deleteInventoryItem(item.id))
                        router.refresh()
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}

                {addingTo === category.key ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Input
                      autoFocus
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleAddItem(category.key)
                        if (e.key === "Escape") { setAddingTo(null); setNewName("") }
                      }}
                      onBlur={() => { if (!newName.trim()) setAddingTo(null) }}
                      placeholder="Npr. riža, ulje, šampon…"
                      className="h-8"
                    />
                    <Button
                      accent="inventory"
                      size="sm"
                      onClick={() => handleAddItem(category.key)}
                    >
                      Dodaj
                    </Button>
                  </div>
                ) : (
                  !needle && !stockedOnly && (
                    <button
                      onClick={() => setAddingTo(category.key)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <Plus className="size-4" />
                      Dodaj stavku
                    </button>
                  )
                )}
              </div>
            </section>
          )
        })}
      </div>
      )}

      {choosingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4"
          onClick={() => setChoosingCategory(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border bg-white p-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-3 text-sm font-semibold text-gray-800">Što slikaš?</h2>
            <div className="grid grid-cols-2 gap-2">
              {INVENTORY_CATEGORIES.map(category => (
                <Button
                  key={category.key}
                  variant="subtle"
                  className="justify-start"
                  onClick={() => { setChoosingCategory(false); pickPhotos(category.key) }}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightbox !== null && lightbox >= 0 && (
        <ImageLightbox
          urls={allPhotoUrls}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
        />
      )}
    </PageShell>
  )
}
