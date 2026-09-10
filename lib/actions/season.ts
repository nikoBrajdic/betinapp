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

/** Ensure every unit exists, copying the last year's customized list atomically. */
export async function ensureSeasonLists(year: number) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("season_closings").select("unit").eq("year", year)
  if (error) throw error
  const existing = new Set((data ?? []).map(row => row.unit))
  for (const unit of SEASON_UNITS) {
    if (!existing.has(unit.key)) await startSeasonClosing(year, unit.key)
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

  const { data, error } = await supabase.rpc("ensure_season_closing", {
    p_year: year,
    p_unit: unit,
    p_template: SEASON_TEMPLATE[unit] ?? [],
  })
  if (error) throw error
  return data as string
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
  input: { title?: string; notes?: string | null; area?: string },
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
 * Only the fields the editor can change are written. `done` and `done_at` are
 * left untouched, so ticking a box on someone else's phone mid-edit does not
 * get clobbered when this lands.
 */
export async function saveSeasonTasks(
  closingId: string,
  rows: { id: string; area: string; title: string }[],
  originalIds: string[],
) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("save_season_tasks", {
    p_closing_id: closingId,
    p_rows: rows,
    p_original_ids: originalIds,
  })
  if (error) throw error
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
