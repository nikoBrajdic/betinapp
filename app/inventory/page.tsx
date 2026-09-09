import { InventoryClient } from "./inventory-client"
import { getInventory, getInventoryYears } from "@/lib/actions/inventory"

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: requested } = await searchParams
  const years = await getInventoryYears()

  const parsed = Number(requested)
  const year = years.includes(parsed) ? parsed : years[0] ?? new Date().getFullYear()

  const inventory = await getInventory(year)

  return <InventoryClient inventory={inventory} years={years} />
}
