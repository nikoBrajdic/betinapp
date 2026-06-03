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
    { name: "Struja", current_usage: 0, max_usage: 200000, cost: 0, unit: "kWh", trend: "stable" },
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
  secondaryValue?: number
}) {
  const supabase = await createClient()
  const readingAt = new Date(`${formData.readingDate}T12:00:00`).toISOString()
  const isElectricity = formData.type.toLowerCase().includes("struja")
  const readings = isElectricity && typeof formData.secondaryValue === "number"
    ? [
      { type: "Struja 1", value: formData.value, max_value: formData.maxValue, date: readingAt },
      { type: "Struja 2", value: formData.secondaryValue, max_value: formData.maxValue, date: readingAt },
    ]
    : [{
      type: formData.type,
      value: formData.value,
      max_value: formData.maxValue,
      date: readingAt,
    }]
  const currentUsage = isElectricity && typeof formData.secondaryValue === "number"
    ? formData.value + formData.secondaryValue
    : formData.value

  const { error } = await supabase.from("utility_readings").insert(readings)

  if (error) throw error

  await supabase
    .from("utilities")
    .update({
      current_usage: currentUsage,
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
    secondaryUsage?: number
  },
) {
  const supabase = await createClient()
  const updatedAt = formData.readingDate
    ? new Date(`${formData.readingDate}T12:00:00`).toISOString()
    : new Date().toISOString()
  const isElectricity = formData.name.toLowerCase().includes("struja")
  const currentUsage = isElectricity && typeof formData.secondaryUsage === "number"
    ? formData.currentUsage + formData.secondaryUsage
    : formData.currentUsage

  const { error } = await supabase
    .from("utilities")
    .update({
      name: formData.name,
      current_usage: currentUsage,
      max_usage: formData.maxUsage,
      cost: formData.cost,
      unit: formData.unit,
      trend: formData.trend,
      updated_at: updatedAt,
    })
    .eq("id", id)

  if (error) throw error

  await supabase.from("utility_readings").insert(
    isElectricity && typeof formData.secondaryUsage === "number"
      ? [
        { type: "Struja 1", value: formData.currentUsage, max_value: formData.maxUsage, date: updatedAt },
        { type: "Struja 2", value: formData.secondaryUsage, max_value: formData.maxUsage, date: updatedAt },
      ]
      : [{
        type: formData.name,
        value: formData.currentUsage,
        max_value: formData.maxUsage,
        date: updatedAt,
      }],
  )

  revalidatePath("/utilities")
}
