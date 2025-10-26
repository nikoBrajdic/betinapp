import { getBills } from "@/lib/actions/bills"
import { BillsClient } from "./bills-client"

interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  status: "pending" | "paid" | "overdue"
  category: "utilities" | "rent" | "insurance" | "subscription" | "other"
  recurring: boolean
}

export default async function BillsPage() {
  const bills = await getBills()

  return <BillsClient bills={bills} />
}