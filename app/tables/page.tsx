import { TablesClient } from "./tables-client"
import { getTables } from "@/lib/actions/tables"

export default async function TablesPage() {
  const tables = await getTables()

  return <TablesClient tables={tables} />
}