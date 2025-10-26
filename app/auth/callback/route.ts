import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Check if user just signed up and has invite code
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check if this is a new user (profile might not exist yet)
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      // If new user, try to use invite code from session storage
      // Note: We can't access sessionStorage from server, so we'll check if profile exists
      // The invite code usage will be handled by the client after redirect
      if (!profile) {
        // New user - redirect to complete signup
        return NextResponse.redirect(new URL("/auth/complete-signup", requestUrl.origin))
      }
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
