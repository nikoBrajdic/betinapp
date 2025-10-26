import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(new URL(`/auth/login?error=${error}`, requestUrl.origin))
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error("Code exchange error:", exchangeError)
        return NextResponse.redirect(new URL("/auth/login?error=code_exchange_failed", requestUrl.origin))
      }

      // Check if user just signed up and has invite code
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser()

      if (userError) {
        console.error("Get user error:", userError)
        return NextResponse.redirect(new URL("/auth/login?error=user_fetch_failed", requestUrl.origin))
      }

      if (user) {
        // Check if this is a new user (profile might not exist yet)
        const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Profile fetch error:", profileError)
          return NextResponse.redirect(new URL("/auth/login?error=profile_fetch_failed", requestUrl.origin))
        }

        // If new user, try to use invite code from session storage
        // Note: We can't access sessionStorage from server, so we'll check if profile exists
        // The invite code usage will be handled by the client after redirect
        if (!profile) {
          // New user - redirect to complete signup
          return NextResponse.redirect(new URL("/auth/complete-signup", requestUrl.origin))
        }
      }
    } catch (error) {
      console.error("Callback error:", error)
      return NextResponse.redirect(new URL("/auth/login?error=callback_failed", requestUrl.origin))
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
