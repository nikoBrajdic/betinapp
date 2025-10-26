"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function createInvite(email?: string) {
  const supabase = await createClient()

  // Check if user is superadmin
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "superadmin") {
    return { success: false, error: "Only superadmins can create invites" }
  }

  // Generate unique code
  let code = generateInviteCode()
  let isUnique = false

  while (!isUnique) {
    const { data: existing } = await supabase.from("invites").select("id").eq("code", code).single()

    if (!existing) {
      isUnique = true
    } else {
      code = generateInviteCode()
    }
  }

  // Create invite (expires in 7 days)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from("invites")
    .insert({
      code,
      email,
      role: "admin",
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/invites")
  return { success: true, invite: data }
}

export async function getInvites() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("invites").select("*").order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, invites: [] }
  }

  return { success: true, invites: data }
}

export async function deleteInvite(id: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("invites").delete().eq("id", id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/admin/invites")
  return { success: true }
}

export async function getAdmins() {
  const supabase = await createClient()

  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  if (error) {
    return { success: false, error: error.message, admins: [] }
  }

  return { success: true, admins: data }
}
