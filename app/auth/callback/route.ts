import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  console.log("Callback route called")
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")

  console.log("Callback params:", { code: code?.substring(0, 10) + "...", error })

  // Handle OAuth errors
  if (error) {
    console.error("OAuth error:", error)
    return NextResponse.redirect(new URL(`/auth/login?error=${error}`, requestUrl.origin))
  }

  if (code) {
    try {
      console.log("Attempting code exchange...")
      const supabase = await createClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log("Code exchange result:", { success: !exchangeError, error: exchangeError?.message })
      
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
        // Check if user is in allowlist
        const { data: allowlistEntry } = await supabase
          .from("allowlist")
          .select("*")
          .eq("email", user.email)
          .single()

        if (!allowlistEntry) {
          // User is not in allowlist, create join request
          const { error: joinRequestError } = await supabase
            .from("join_requests")
            .upsert({
              email: user.email!,
              name: user.user_metadata?.full_name || null,
              status: "pending"
            }, {
              onConflict: "email"
            })

          if (joinRequestError) {
            console.error("Join request creation error:", joinRequestError)
          }

          // Sign out the user and redirect to login with message
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL("/auth/login?error=not_authorized", requestUrl.origin))
        }

        // Check if this is a new user (profile might not exist yet)
        const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Profile fetch error:", profileError)
          return NextResponse.redirect(new URL("/auth/login?error=profile_fetch_failed", requestUrl.origin))
        }

        // If new user, create profile with role from allowlist
        if (!profile) {
          const { error: profileCreateError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
              role: allowlistEntry.role
            })

          if (profileCreateError) {
            console.error("Profile creation error:", profileCreateError)
            return NextResponse.redirect(new URL("/auth/login?error=profile_creation_failed", requestUrl.origin))
          }

          // Remove from join requests if it exists
          await supabase
            .from("join_requests")
            .delete()
            .eq("email", user.email)
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
