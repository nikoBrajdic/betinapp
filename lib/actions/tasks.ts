"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTaskGroups() {
  const supabase = await createClient()
  const ordered = await supabase
    .from("task_groups")
    .select(`
      *,
      tasks (*)
    `)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  if (!ordered.error) return ordered.data
  if (ordered.error.code !== "42703") throw ordered.error

  const { data, error } = await supabase
    .from("task_groups")
    .select(`
      *,
      tasks (*)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

async function nextTaskGroupSortOrder(supabase: any) {
  const { data, error } = await supabase
    .from("task_groups")
    .select("sort_order")
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return Number(data?.sort_order ?? -1) + 1
}

// Create a task with optional initial checklist items in one shot
export async function createTaskWithItems(formData: {
  title: string
  color?: string
  items?: string[]
}) {
  const supabase = await createClient()
  const sortOrder = await nextTaskGroupSortOrder(supabase)
  const payload: { title: string; color: string; sort_order?: number } = {
    title: formData.title,
    color: formData.color || "blue",
  }
  if (sortOrder !== null) payload.sort_order = sortOrder

  const { data: group, error } = await supabase
    .from("task_groups")
    .insert(payload)
    .select()
    .single()

  if (error) throw error

  if (formData.items && formData.items.length > 0) {
    const { error: itemsError } = await supabase.from("tasks").insert(
      formData.items.map(title => ({ title, task_group_id: group.id, completed: false }))
    )
    if (itemsError) throw itemsError
  }

  revalidatePath("/tasks")
}

export async function createTaskGroup(formData: {
  title: string
  color?: string
}) {
  const supabase = await createClient()
  const sortOrder = await nextTaskGroupSortOrder(supabase)
  const payload: { title: string; color: string; sort_order?: number } = {
    title: formData.title,
    color: formData.color || "blue",
  }
  if (sortOrder !== null) payload.sort_order = sortOrder

  const { error } = await supabase.from("task_groups").insert(payload)

  if (error) throw error
  revalidatePath("/tasks")
}

export async function updateTaskGroup(
  id: string,
  formData: {
    title: string
    color?: string
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_groups")
    .update({
      title: formData.title,
      color: formData.color || "blue",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/tasks")
}

export async function deleteTaskGroup(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("task_groups").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/tasks")
}

export async function createTask(formData: {
  title: string
  taskGroupId: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").insert({
    title: formData.title,
    task_group_id: formData.taskGroupId,
  })

  if (error) throw error
  revalidatePath("/tasks")
}

export async function updateTask(
  id: string,
  formData: {
    title: string
    completed?: boolean
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      title: formData.title,
      completed: formData.completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/tasks")
}

export async function toggleTaskCompletion(id: string) {
  const supabase = await createClient()
  
  // First get the current task to toggle its completion status
  const { data: task, error: fetchError } = await supabase
    .from("tasks")
    .select("completed")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("tasks")
    .update({
      completed: !task.completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/tasks")
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/tasks")
}
export async function duplicateTaskGroup(id: string) {
  const supabase = await createClient()
  const { data: group, error } = await supabase
    .from("task_groups")
    .select("*, tasks(*)")
    .eq("id", id)
    .single()
  if (error) throw error

  const sortOrder = await nextTaskGroupSortOrder(supabase)
  const payload: { title: string; color: string; sort_order?: number } = {
    title: `${group.title} (copy)`,
    color: group.color,
  }
  if (sortOrder !== null) payload.sort_order = sortOrder

  const { data: newGroup, error: newErr } = await supabase
    .from("task_groups")
    .insert(payload)
    .select()
    .single()
  if (newErr) throw newErr

  if (group.tasks?.length > 0) {
    await supabase.from("tasks").insert(
      group.tasks.map((t: any) => ({
        title: t.title,
        task_group_id: newGroup.id,
        completed: false,
      }))
    )
  }
  revalidatePath("/tasks")
}

export async function reorderTaskGroups(groupIds: string[]) {
  const supabase = await createClient()

  for (const [index, id] of groupIds.entries()) {
    const { error } = await supabase
      .from("task_groups")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error?.code === "42703") return
    if (error) throw error
  }

  revalidatePath("/tasks")
}
