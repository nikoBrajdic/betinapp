import { createClient } from "@supabase/supabase-js"

// Called daily by Vercel Cron (vercel.json) so Supabase's free tier never sees a week of
// inactivity and pauses the project. It must reach Postgres: a plain page
// visit does not, because with no session cookie the auth check returns
// without a network call. Public and cookie-free; RLS means the anon query
// sees no rows, and only the success of the round trip is reported.
export const dynamic = "force-dynamic"

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })
  const { error } = await supabase.from("profiles").select("id", { count: "exact", head: true })
  if (error) return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } })
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
}
