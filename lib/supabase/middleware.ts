import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const publicRoutes = ["/auth/login", "/auth/signup", "/auth/callback", "/auth/complete-signup"]
  const isPublicRoute = publicRoutes.includes(path)
  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    url.search = ""
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }
  if (!user) return isPublicRoute ? supabaseResponse : redirectTo("/auth/login")
  // The OAuth callback must finish signup before membership can be checked.
  if (path === "/auth/callback" || path === "/auth/complete-signup") return supabaseResponse
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
  if (error || !profile) {
    await supabase.auth.signOut()
    return isPublicRoute ? supabaseResponse : redirectTo("/auth/login")
  }
  return isPublicRoute ? redirectTo("/") : supabaseResponse
}
