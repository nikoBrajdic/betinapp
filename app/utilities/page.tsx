import { getUtilities } from "@/lib/actions/utilities"
import { UtilitiesClient } from "./utilities-client"

interface Utility {
  id: string
  name: string
  current_usage: number
  max_usage: number
  cost: number
  unit: string
  trend: "up" | "down" | "stable"
}

export default async function UtilitiesPage() {
  const utilities = await getUtilities()

  return <UtilitiesClient utilities={utilities} />
}