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
 * Split one checkbox into two at the caret.
 *
 * Covers both keystrokes with one operation: Enter mid-sentence leaves the
 * text before the caret and carries the rest into a new row; Enter at the end
 * is the same thing with an empty tail, i.e. a fresh row.
 *
 * Returns the new row's id so the caller can put the caret in it.
 */
export async function splitSeasonTask(id: string, before: string, after: string) {
  const supabase = await createClient()

  const { data: current, error: readError } = await supabase
    .from("season_tasks")
    .select("closing_id, area, sort_order")
    .eq("id", id)
    .single()
  if (readError || !current) throw readError ?? new Error("Task not found")

  const { error: updateError } = await supabase
    .from("season_tasks")
    .update({ title: before })
    .eq("id", id)
  if (updateError) throw updateError

  const { data: created, error: insertError } = await supabase
    .from("season_tasks")
    .insert({
      closing_id: current.closing_id,
      area: current.area,
      title: after,
      sort_order: current.sort_order + 1,
    })
    .select("id")
    .single()
  if (insertError) throw insertError

  // sort_order is a plain int, so everything below the split shifts down one.
  const { data: rest } = await supabase
    .from("season_tasks")
    .select("id, sort_order")
    .eq("closing_id", current.closing_id)
    .gt("sort_order", current.sort_order)
    .neq("id", created.id)
    .order("sort_order", { ascending: true })

  for (const task of rest ?? []) {
    await supabase.from("season_tasks").update({ sort_order: task.sort_order + 1 }).eq("id", task.id)
  }

  revalidatePath("/season")
  return created.id as string
}

/** Merge a row back into the one above it, for Backspace at the start. */
export async function mergeSeasonTaskUp(id: string) {
  const supabase = await createClient()

  const { data: current } = await supabase
    .from("season_tasks")
    .select("closing_id, sort_order, title")
    .eq("id", id)
    .single()
  if (!current) return null

  const { data: previous } = await supabase
    .from("season_tasks")
    .select("id, title")
    .eq("closing_id", current.closing_id)
    .lt("sort_order", current.sort_order)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!previous) return null

  await supabase
    .from("season_tasks")
    .update({ title: `${previous.title}${current.title}` })
    .eq("id", previous.id)
  await supabase.from("season_tasks").delete().eq("id", id)

  revalidatePath("/season")
  return { id: previous.id as string, caret: (previous.title as string).length }
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
