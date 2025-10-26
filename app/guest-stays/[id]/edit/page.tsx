import { redirect } from "next/navigation"

export default function GuestStaysEditPage() {
  // For now, redirect to the main guest stays page
  // In a real app, this would show a form to edit the guest stay
  redirect("/guest-stays")
}
