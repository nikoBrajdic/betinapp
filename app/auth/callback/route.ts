import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const supabase = await createClient()
  const fail = async (reason: string) => {
    await supabase.auth.signOut()
    const target = new URL("/auth/login", url.origin)
    target.searchParams.set("error", reason)
    return NextResponse.redirect(target)
  }

  try {
    const code = url.searchParams.get("code")
    if (url.searchParams.has("error") || !code) return fail("callback_failed")
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) return fail("code_exchange_failed")
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.email) return fail("user_fetch_failed")

    // Policies expose only this account's allowlist entry until approved.
    const { data: allowlist, error: allowError } = await supabase.from("allowlist").select("email")
    if (allowError) return fail("callback_failed")
    if (!allowlist?.some(row => row.email.toLowerCase() === user.email!.toLowerCase())) {
      return fail("not_authorized")
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("id").eq("id", user.id).maybeSingle()
    if (profileError) return fail("profile_fetch_failed")
    if (profile) return NextResponse.redirect(new URL("/", url.origin))

    const { data: requests, error: requestError } = await supabase.from("join_requests").select("email,status")
    if (requestError) return fail("callback_failed")
    const existing = requests?.find(row => row.email.toLowerCase() === user.email!.toLowerCase())
    if (existing?.status === "approved") {
      const { error } = await supabase.rpc("complete_household_signup")
      if (error) return fail("profile_creation_failed")
      return NextResponse.redirect(new URL("/", url.origin))
    }
    if (!existing) {
      const { error } = await supabase.from("join_requests").insert({
        email: user.email.toLowerCase(),
        name: user.user_metadata?.full_name || null,
        status: "pending",
      })
      if (error && error.code !== "23505") return fail("callback_failed")
    }
    return fail("pending_approval")
  } catch {
    return fail("callback_failed")
  }
}
