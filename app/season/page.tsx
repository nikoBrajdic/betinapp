import { ensureSeasonLists, getSeasonClosings, getSeasonYears } from "@/lib/actions/season"
import { getCurrentUser } from "@/lib/actions/auth"
import { SeasonClient } from "./season-client"

export default async function SeasonPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const params = await searchParams
  const years = await getSeasonYears()
  const year = Number(params.year) || years[0] || new Date().getFullYear()
  // The lists exist for every year you look at, already filled in.
  await ensureSeasonLists(year)
  const [closings, user] = await Promise.all([getSeasonClosings(year), getCurrentUser()])

  const displayName =
    user?.profile?.full_name || user?.email?.split("@")[0] || "Someone"

  return (
    <SeasonClient
      year={year}
      years={Array.from(new Set([...years, year])).sort((a, b) => b - a)}
      closings={closings}
      currentUserName={displayName}
    />
  )
}
