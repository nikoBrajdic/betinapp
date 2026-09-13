import { updateSession } from "@/lib/supabase/middleware"
import { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/health (public keep-alive ping; must not redirect to login)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
