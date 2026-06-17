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
        console.log("User email from OAuth:", user.email)
        
        // Check if user is in allowlist (case-insensitive)
        const { data: allowlistEntry, error: allowlistError } = await supabase
          .from("allowlist")
          .select("*")
          .ilike("email", user.email!)
          .single()

        console.log("Allowlist query result:", { allowlistEntry, allowlistError })

        if (!allowlistEntry) {
          // User is not in allowlist, sign them out immediately
          console.log("User not in allowlist, signing out:", user.email)
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL("/auth/login?error=not_authorized", requestUrl.origin))
        }

        console.log("User found in allowlist with role:", allowlistEntry.role)

        // User is in allowlist, check if this is a new user (profile might not exist yet)
        const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error("Profile fetch error:", profileError)
          return NextResponse.redirect(new URL("/auth/login?error=profile_fetch_failed", requestUrl.origin))
        }

        // If user has a profile, they're already approved - let them in
        if (profile) {
          console.log("User has existing profile, allowing access")
          return NextResponse.redirect(new URL("/", requestUrl.origin))
        }

        // User is in allowlist but no profile yet - check for existing join request
        const { data: existingRequest } = await supabase
          .from("join_requests")
          .select("*")
          .eq("email", user.email)
          .single()

        if (existingRequest) {
          if (existingRequest.status === "approved") {
            // Join request was approved, create profile
            const { error: profileCreateError } = await supabase
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
                // Everyone gets full access — all users are superadmins
                role: "superadmin"
              })

            if (profileCreateError) {
              console.error("Profile creation error:", profileCreateError)
              return NextResponse.redirect(new URL("/auth/login?error=profile_creation_failed", requestUrl.origin))
            }

            // Update join request status
            await supabase
              .from("join_requests")
              .update({ status: "approved" })
              .eq("email", user.email)

            console.log("Profile created for approved user")
            return NextResponse.redirect(new URL("/", requestUrl.origin))
          } else {
            // Join request exists but not approved yet
            console.log("User has pending join request")
            await supabase.auth.signOut()
            return NextResponse.redirect(new URL("/auth/login?error=pending_approval", requestUrl.origin))
          }
        } else {
          // No join request exists, create one
          const { error: joinRequestError } = await supabase
            .from("join_requests")
            .insert({
              email: user.email!,
              name: user.user_metadata?.full_name || null,
              status: "pending"
            })

          if (joinRequestError) {
            console.error("Join request creation error:", joinRequestError)
          }

          console.log("Created join request for user")
          await supabase.auth.signOut()
          return NextResponse.redirect(new URL("/auth/login?error=pending_approval", requestUrl.origin))
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
