"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function createTask(formData: {
  title: string
  description: string
  status: string
  priority: string
  dueDate: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").insert({
    title: formData.title,
    description: formData.description,
    status: formData.status,
    priority: formData.priority,
    due_date: formData.dueDate,
  })

  if (error) throw error
  revalidatePath("/tasks")
}

export async function updateTask(
  id: string,
  formData: {
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.dueDate,
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
