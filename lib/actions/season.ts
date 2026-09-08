"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
  SEASON_TEMPLATE,
  type SeasonClosing,
  type SeasonTask,
  type SeasonUnit,
} from "@/lib/season"

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
