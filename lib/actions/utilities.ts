"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getUtilities() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("utilities").select("*").order("name", { ascending: true })

  if (error) throw error
  return data
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
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("utilities")
    .update({
      name: formData.name,
      current_usage: formData.currentUsage,
      max_usage: formData.maxUsage,
      cost: formData.cost,
      unit: formData.unit,
      trend: formData.trend,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/utilities")
}
