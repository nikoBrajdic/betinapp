"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getAllowlist() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("allowlist")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function addToAllowlist(formData: {
  email: string
  role: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("allowlist").insert({
    email: formData.email,
    role: formData.role,
  })

  if (error) throw error
  revalidatePath("/admin/manage")
}

export async function updateAllowlistRole(
  id: string,
  role: string,
) {
  const supabase = await createClient()
  
  // Get the allowlist entry to find the email
  const { data: allowlistEntry, error: fetchError } = await supabase
    .from("allowlist")
    .select("email")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Update allowlist role
  const { error: allowlistError } = await supabase
    .from("allowlist")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (allowlistError) throw allowlistError

  // Also update the corresponding profile role if it exists
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("email", allowlistEntry.email)

  // Don't throw error if profile doesn't exist yet
  if (profileError && profileError.code !== "PGRST116") {
    console.warn("Could not update profile role:", profileError)
  }

  revalidatePath("/admin/manage")
}

export async function removeFromAllowlist(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("allowlist").delete().eq("id", id)

  if (error) throw error
  revalidatePath("/admin/manage")
}

export async function getJoinRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("join_requests")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function approveJoinRequest(id: string, role: string) {
  const supabase = await createClient()
  
  // Get the join request
  const { data: request, error: fetchError } = await supabase
    .from("join_requests")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError) throw fetchError

  // Add to allowlist
  const { error: allowlistError } = await supabase.from("allowlist").insert({
    email: request.email,
    role,
  })

  if (allowlistError) throw allowlistError

  // Update join request status
  const { error: updateError } = await supabase
    .from("join_requests")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) throw updateError
  revalidatePath("/admin/manage")
}

export async function rejectJoinRequest(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("join_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) throw error
  revalidatePath("/admin/manage")
}

export async function createJoinRequest(formData: {
  email: string
  name?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from("join_requests").insert({
    email: formData.email,
    name: formData.name,
  })

  if (error) throw error
  revalidatePath("/admin/manage")
}

export async function updateProfileRole(profileId: string, role: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .select()

  if (error) {
    console.error("Profile role update error:", error)
    throw error
  }
  
  revalidatePath("/admin/manage")
}
