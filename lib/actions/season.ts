"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  SEASON_TEMPLATE,
  SEASON_UNITS,
  type SeasonClosing,
  type SeasonTask,
  type SeasonUnit,
} from "@/lib/season"

/**
 * Make sure the four lists exist for a year, seeding each from its template.
 *
 * The checklist is a fixed yearly ritual — opening the page to an empty screen
 * and a button per unit was pointless ceremony. Safe to call on every load: the
 * unique (year, unit) constraint means a second caller just no-ops.
 */
export async function ensureSeasonLists(year: number) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("season_closings")
    .select("unit")
    .eq("year", year)

  const have = new Set((existing ?? []).map(row => row.unit))
  const missing = SEASON_UNITS.map(u => u.key).filter(unit => !have.has(unit))
  if (!missing.length) return

  for (const unit of missing) {
    const { data: closing, error } = await supabase
      .from("season_closings")
      .insert({ year, unit })
      .select()
      .single()
    if (error || !closing) continue // raced with another request; fine

    const template = SEASON_TEMPLATE[unit] ?? []
    if (!template.length) continue

    await supabase.from("season_tasks").insert(
      template.map((item, index) => ({ ...item, closing_id: closing.id, sort_order: index })),
    )
  }
}

export async function getSeasonClosings(year: number): Promise<SeasonClosing[]> {
  const supabase = await createClient()

  const { data: closings, error } = await supabase
    .from("season_closings")
    .select("*")
    .eq("year", year)
  if (error) throw error

  const ids = (closings ?? []).map(c => c.id)
  let tasks: SeasonTask[] = []
  if (ids.length) {
    const { data, error: taskError } = await supabase
      .from("season_tasks")
      .select("*")
      .in("closing_id", ids)
      .order("sort_order", { ascending: true })
    if (taskError) throw taskError
    tasks = data ?? []
  }

  return (closings ?? []).map(closing => ({
    ...closing,
    tasks: tasks.filter(t => t.closing_id === closing.id),
  }))
}

/** Every year that has at least one list, newest first. */
export async function getSeasonYears(): Promise<number[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("season_closings")
    .select("year")
    .order("year", { ascending: false })
  if (error) throw error
  const years = Array.from(new Set((data ?? []).map(row => row.year as number)))
  return years.length ? years : [new Date().getFullYear()]
}

/**
 * Start a unit's list for a year. Clones the most recent previous list for that
 * unit so last year's hard-won items come back; falls back to the template.
 */
export async function startSeasonClosing(year: number, unit: SeasonUnit) {
  const supabase = await createClient()

  const { data: closing, error } = await supabase
    .from("season_closings")
    .insert({ year, unit })
    .select()
    .single()
  if (error) throw error

  const { data: previous } = await supabase
    .from("season_closings")
    .select("id")
    .eq("unit", unit)
    .lt("year", year)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle()

  // Each unit has its own starter list — closing the house is nothing like
  // closing the šok soba.
  let seed = (SEASON_TEMPLATE[unit] ?? []).map((item, index) => ({ ...item, sort_order: index }))

  if (previous) {
    const { data: previousTasks } = await supabase
      .from("season_tasks")
      .select("area, title, sort_order")
      .eq("closing_id", previous.id)
      .order("sort_order", { ascending: true })
    if (previousTasks?.length) {
      seed = previousTasks.map(t => ({ area: t.area, title: t.title, sort_order: t.sort_order }))
    }
  }

  const { error: seedError } = await supabase.from("season_tasks").insert(
    seed.map(item => ({ ...item, closing_id: closing.id })),
  )
  if (seedError) throw seedError

  revalidatePath("/season")
  return closing
}

export async function toggleSeasonTask(id: string, done: boolean, doneByName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from("season_tasks")
    .update({
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? user?.id ?? null : null,
      done_by_name: done ? doneByName : null,
    })
    .eq("id", id)
  if (error) throw error
  revalidatePath("/season")
}

export async function updateSeasonTask(
  id: string,
  input: { title?: string; notes?: string | null; photo_url?: string | null; area?: string },
) {
  const supabase = await createClient()
  const { error } = await supabase.from("season_tasks").update(input).eq("id", id)
  if (error) throw error
  revalidatePath("/season")
}

export async function addSeasonTask(closingId: string, area: string, title: string) {
  const supabase = await createClient()
  const { data: last } = await supabase
    .from("season_tasks")
    .select("sort_order")
    .eq("closing_id", closingId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from("season_tasks").insert({
    closing_id: closingId,
    area,
    title,
    sort_order: (last?.sort_order ?? -1) + 1,
  })
  if (error) throw error
  revalidatePath("/season")
}

/**
 * Persist a whole edited list in one go.
 *
 * Editing is local until you press Done — typing must never wait on the
 * network — so this reconciles the final shape rather than replaying each
 * keystroke. Rows carrying a `tmp-` id are new.
 *
 * Only the fields the editor can change are written. `done`, `done_at` and
 * `photo_url` are left untouched, so ticking a box on someone else's phone
 * mid-edit does not get clobbered when this lands.
 */
export async function saveSeasonTasks(
  closingId: string,
  rows: { id: string; area: string; title: string }[],
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("season_tasks")
    .select("id")
    .eq("closing_id", closingId)

  const keep = new Set(rows.filter(r => !r.id.startsWith("tmp-")).map(r => r.id))
  const removed = (existing ?? []).map(r => r.id).filter(id => !keep.has(id))
  if (removed.length) {
    await supabase.from("season_tasks").delete().in("id", removed)
  }

  const additions = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.id.startsWith("tmp-"))
  if (additions.length) {
    await supabase.from("season_tasks").insert(
      additions.map(({ row, index }) => ({
        closing_id: closingId,
        area: row.area,
        title: row.title,
        sort_order: index,
      })),
    )
  }

  for (const [index, row] of rows.entries()) {
    if (row.id.startsWith("tmp-")) continue
    await supabase
      .from("season_tasks")
      .update({ title: row.title, area: row.area, sort_order: index })
      .eq("id", row.id)
  }

  revalidatePath("/season")
}

export async function deleteSeasonTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("season_tasks").delete().eq("id", id)
  if (error) throw error
  revalidatePath("/season")
}

/** Mark the whole unit closed for the year. */
export async function setSeasonClosed(closingId: string, closed: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("season_closings")
    .update({ closed_at: closed ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", closingId)
  if (error) throw error
  revalidatePath("/season")
}
