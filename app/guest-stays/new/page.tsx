import { redirect } from "next/navigation"

export default function GuestStaysNewPage() {
  // For now, redirect to the main guest stays page
  // In a real app, this would show a form to create a new guest stay
  redirect("/guest-stays")
}
