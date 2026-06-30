"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getBills() {
  const supabase = await createClient()
  const { data, error } = await supabase.from("bills").select("*").order("due_date", { ascending: true })

  if (error) throw error
  return data
}

export async function createBill(formData: {
  name: string
  amount: number
  dueDate: string
  periodEnd?: string | null
  paid: boolean
  paidBy: string
  splitBetween: string[]
  category: string
  recurring: boolean
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("bills").insert({
    name: formData.name,
    amount: formData.amount,
    due_date: formData.dueDate,
    period_end: formData.periodEnd ?? null,
    paid: formData.paid,
    paid_by: formData.paidBy,
    split_between: formData.splitBetween,
    category: formData.category,
    recurring: formData.recurring,
  })

  if (error) throw error
  revalidatePath("/bills")
  revalidatePath("/utilities")
}

export async function updateBill(
  id: string,
  formData: {
    name: string
    amount: number
    dueDate: string
    periodEnd?: string | null
    paid: boolean
    paidBy: string
    splitBetween: string[]
    category: string
    recurring: boolean
  },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("bills")
    .update({
      name: formData.name,
      amount: formData.amount,
      due_date: formData.dueDate,
      period_end: formData.periodEnd ?? null,
      paid: formData.paid,
      paid_by: formData.paidBy,
      split_between: formData.splitBetween,
      category: formData.category,
      recurring: formData.recurring,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/bills")
  revalidatePath("/utilities")
}

export async function deleteBill(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("bills").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/bills")
  revalidatePath("/utilities")
}
