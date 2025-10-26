"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTaskGroups() {
  const supabase = await createClient()
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

export async function createTaskGroup(formData: {
  title: string
  color?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("task_groups").insert({
    title: formData.title,
    color: formData.color || "blue",
  })

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