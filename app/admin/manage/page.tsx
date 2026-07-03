import { getCurrentUser } from "@/lib/actions/auth"
import { getAdmins } from "@/lib/actions/invites"
import { getAllowlist } from "@/lib/actions/admin"
import { redirect } from "next/navigation"
import { AdminManageClient } from "@/components/admin-manage-client"

export default async function AdminManagePage() {
  const user = await getCurrentUser()

  if (!user || user.profile?.role !== "superadmin") {
    redirect("/")
  }

  const { admins } = await getAdmins()
  const allowlist = await getAllowlist()

  return (
    <AdminManageClient admins={admins} allowlist={allowlist} currentUserRole={user.profile?.role} />
  )
}
