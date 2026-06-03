"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUtilities() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("utilities").select("*").order("name", { ascending: true })

  if (error) throw error
  return data
}

export async function getUtilityReadings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("utility_readings")
    .select("*")
    .order("date", { ascending: false })
    .order("type", { ascending: true })

  if (error) throw error
  return data
}

export async function createDefaultReadingUtilities() {
  const supabase = await createClient()
  const { data: existing, error: existingError } = await supabase
    .from("utilities")
    .select("name")

  if (existingError) throw existingError

  const existingNames = new Set((existing ?? []).map((utility: { name: string }) => utility.name.toLowerCase()))
  const defaults = [
    { name: "Voda", current_usage: 0, max_usage: 100, cost: 0, unit: "m3", trend: "stable" },
    { name: "Struja 1", current_usage: 0, max_usage: 200000, cost: 0, unit: "kWh", trend: "stable" },
    { name: "Struja 2", current_usage: 0, max_usage: 200000, cost: 0, unit: "kWh", trend: "stable" },
  ].filter(utility => !existingNames.has(utility.name.toLowerCase()))

  if (defaults.length > 0) {
    const { error } = await supabase.from("utilities").insert(defaults)
    if (error) throw error
  }

  revalidatePath("/utilities")
}

export async function createUtilityReading(formData: {
  type: string
  value: number
  maxValue: number
  unit: string
  readingDate: string
}) {
  const supabase = await createClient()
  const readingAt = new Date(`${formData.readingDate}T12:00:00`).toISOString()

  const { error } = await supabase.from("utility_readings").insert({
    type: formData.type,
    value: formData.value,
    max_value: formData.maxValue,
    date: readingAt,
  })

  if (error) throw error

  await supabase
    .from("utilities")
    .update({
      current_usage: formData.value,
      max_usage: formData.maxValue,
      unit: formData.unit,
      updated_at: readingAt,
    })
    .eq("name", formData.type)

  revalidatePath("/utilities")
}

export async function updateUtility(
  id: string,
  formData: {
    name: string
    currentUsage: number
    maxUsage: number
    cost: number
    unit: string
    trend: string
    readingDate?: string
  },
) {
  const supabase = await createClient()
  const updatedAt = formData.readingDate
    ? new Date(`${formData.readingDate}T12:00:00`).toISOString()
    : new Date().toISOString()

  const { error } = await supabase
    .from("utilities")
    .update({
      name: formData.name,
      current_usage: formData.currentUsage,
      max_usage: formData.maxUsage,
      cost: formData.cost,
      unit: formData.unit,
      trend: formData.trend,
      updated_at: updatedAt,
    })
    .eq("id", id)

  if (error) throw error

  await supabase.from("utility_readings").insert({
    type: formData.name,
    value: formData.currentUsage,
    max_value: formData.maxUsage,
    date: updatedAt,
  })

  revalidatePath("/utilities")
}
