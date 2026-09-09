"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type {
  InventoryCategory,
  InventoryItem,
  InventoryPhoto,
  InventoryYear,
  StockLevel,
} from "@/lib/inventory"

/** Season year for a date — the inventory year runs with the season, not the calendar. */
export async function currentInventoryYear(): Promise<number> {
  return new Date().getFullYear()
}

export async function getInventoryYears(): Promise<number[]> {
  const supabase = await createClient()
  const [photos, items] = await Promise.all([
    supabase.from("inventory_photos").select("year"),
    supabase.from("inventory_items").select("year"),
  ])
  const years = new Set<number>([
    ...(photos.data ?? []).map(r => r.year as number),
    ...(items.data ?? []).map(r => r.year as number),
  ])
  years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}

export async function getInventory(year: number): Promise<InventoryYear> {
  const supabase = await createClient()

  const [photos, items] = await Promise.all([
    supabase
      .from("inventory_photos")
      .select("*")
      .eq("year", year)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("*")
      .eq("year", year)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ])

  if (photos.error) throw photos.error
  if (items.error) throw items.error

  return {
    year,
    photos: (photos.data ?? []) as InventoryPhoto[],
    items: (items.data ?? []) as InventoryItem[],
  }
}

export async function addInventoryPhoto(input: {
  year: number
  category: InventoryCategory
  url: string
  thumbUrl: string | null
  caption?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from("inventory_photos").insert({
    year: input.year,
    category: input.category,
    url: input.url,
    thumb_url: input.thumbUrl,
    caption: input.caption ?? null,
    created_by: user?.id ?? null,
  })
  if (error) throw error
  revalidatePath("/inventory")
}

export async function updateInventoryPhoto(id: string, patch: { caption?: string | null }) {
  const supabase = await createClient()
  const { error } = await supabase.from("inventory_photos").update(patch).eq("id", id)
  if (error) throw error
  revalidatePath("/inventory")
}

export async function deleteInventoryPhoto(id: string) {
  const supabase = await createClient()

  const { data: photo } = await supabase
    .from("inventory_photos")
    .select("url, thumb_url")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("inventory_photos").delete().eq("id", id)
  if (error) throw error

  // Best effort — a leftover file is harmless, a failed delete is not.
  if (photo) {
    const paths = [photo.url, photo.thumb_url]
      .filter(Boolean)
      .map(url => (url as string).split("/inventory-photos/")[1])
      .filter(Boolean) as string[]
    if (paths.length) await supabase.storage.from("inventory-photos").remove(paths)
  }

  revalidatePath("/inventory")
}

export async function addInventoryItem(input: {
  year: number
  category: InventoryCategory
  name: string
  level?: StockLevel
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      year: input.year,
      category: input.category,
      name: input.name,
      level: input.level ?? "unknown",
    })
    .select()
    .single()
  if (error) throw error
  revalidatePath("/inventory")
  return data as InventoryItem
}

export async function updateInventoryItem(
  id: string,
  patch: { name?: string; level?: StockLevel; location?: string | null; note?: string | null },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("inventory_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
  revalidatePath("/inventory")
}

export async function deleteInventoryItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("inventory_items").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/inventory")
}

/**
 * Start a year from the previous one — same pattern as season closings.
 *
 * Item names carry forward with levels reset to `unknown`, so you re-count
 * rather than retype. Photos do not: last year's shelf is not this year's
 * shelf, and a stale photo presented as current is worse than no photo.
 */
export async function cloneInventoryFromPreviousYear(year: number) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("year", year)
    .limit(1)
  if (existing?.length) return { cloned: 0 }

  const { data: years } = await supabase
    .from("inventory_items")
    .select("year")
    .lt("year", year)
    .order("year", { ascending: false })
    .limit(1)

  const source = years?.[0]?.year as number | undefined
  if (!source) return { cloned: 0 }

  const { data: items } = await supabase
    .from("inventory_items")
    .select("category, name, location, sort_order")
    .eq("year", source)

  if (!items?.length) return { cloned: 0 }

  const { error } = await supabase.from("inventory_items").insert(
    items.map(item => ({
      year,
      category: item.category,
      name: item.name,
      location: item.location,
      sort_order: item.sort_order,
      level: "unknown",
    })),
  )
  if (error) throw error

  revalidatePath("/inventory")
  return { cloned: items.length }
}
