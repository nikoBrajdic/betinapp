"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signInWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data.url) {
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/auth/login")
}

export async function getCurrentUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get user profile with role
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return {
    ...user,
    profile,
  }
}

export async function verifyInviteCode(code: string) {
  const supabase = await createClient()

  const { data: invite, error } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (error || !invite) {
    return { valid: false, error: "Invalid or expired invite code" }
  }

  return { valid: true, invite }
}

export async function useInviteCode(code: string, userId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("invites")
    .update({
      used_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq("code", code)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
