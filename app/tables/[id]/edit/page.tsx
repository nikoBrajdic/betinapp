import { redirect } from "next/navigation"

export default function TablesEditPage() {
  // For now, redirect to the main tables page
  // In a real app, this would show a form to edit the table
  redirect("/tables")
}
