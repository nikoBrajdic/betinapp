import { getCurrentUser } from "@/lib/actions/auth"
import { getAdmins } from "@/lib/actions/invites"
import { getAllowlist } from "@/lib/actions/admin"
import { redirect } from "next/navigation"
import { AdminManageClient } from "@/components/admin-manage-client"

export default async function AdminManagePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/")
  }

  const isSuperadmin = user.profile?.role === "superadmin"

  // Only superadmins can see/manage users and the allow list; everyone else gets settings only.
  const { admins } = isSuperadmin ? await getAdmins() : { admins: [] }
  const allowlist = isSuperadmin ? await getAllowlist() : []

  return (
    <AdminManageClient
      admins={admins}
      allowlist={allowlist}
      currentUserRole={user.profile?.role}
      isSuperadmin={isSuperadmin}
    />
  )
}
