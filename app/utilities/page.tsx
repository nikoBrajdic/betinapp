import { getUtilities, getUtilityReadings } from "@/lib/actions/utilities"
import { getBills } from "@/lib/actions/bills"
import { getGuestStays } from "@/lib/actions/guest-stays"
import { UtilitiesClient } from "./utilities-client"

interface Utility {
  id: string
  name: string
  current_usage: number
  max_usage: number
  cost: number
  unit: string
  trend: "up" | "down" | "stable"
  updated_at?: string
}

export default async function UtilitiesPage() {
  const [utilities, readings, bills, stays] = await Promise.all([
    getUtilities(),
    getUtilityReadings().catch(() => []),
    getBills(),
    getGuestStays(),
  ])

  return <UtilitiesClient utilities={utilities as Utility[]} readings={readings as any} bills={bills as any} stays={stays as any} />
}
