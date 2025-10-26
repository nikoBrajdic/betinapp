import { redirect } from "next/navigation"

export default function TablesNewPage() {
  // For now, redirect to the main tables page
  // In a real app, this would show a form to create a new table
  redirect("/tables")
}
