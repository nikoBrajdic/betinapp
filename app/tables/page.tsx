import { TablesClient } from "./tables-client"

interface TableItem {
  id: string
  name: string
  capacity: number
  location: string
  status: "available" | "occupied" | "reserved"
  notes: string
  updated_at: string
}

export default async function TablesPage() {
  // Mock data for now - in a real app this would come from a database
  const tables: TableItem[] = [
    {
      id: "1",
      name: "Dining Table 1",
      capacity: 6,
      location: "Main Dining Room",
      status: "available",
      notes: "Large wooden table",
      updated_at: new Date().toISOString()
    },
    {
      id: "2", 
      name: "Kitchen Table",
      capacity: 4,
      location: "Kitchen",
      status: "occupied",
      notes: "Small breakfast table",
      updated_at: new Date().toISOString()
    },
    {
      id: "3",
      name: "Outdoor Table",
      capacity: 8,
      location: "Patio",
      status: "reserved",
      notes: "Weather-resistant table",
      updated_at: new Date().toISOString()
    }
  ]

  return <TablesClient tables={tables} />
}