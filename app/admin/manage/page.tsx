import { getCurrentUser } from "@/lib/actions/auth"
import { getAdmins } from "@/lib/actions/invites"
import { getAllowlist } from "@/lib/actions/admin"
import { redirect } from "next/navigation"
import { AdminsTable } from "@/components/admins-table"
import { AllowlistTable } from "@/components/allowlist-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AdminManagePage() {
  const user = await getCurrentUser()

  if (!user || user.profile?.role !== "superadmin") {
    redirect("/")
  }

  const { admins } = await getAdmins()
  const allowlist = await getAllowlist()

  return (
    <div className="p-8 space-y-6">
      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Users</TabsTrigger>
          <TabsTrigger value="allowlist">Allow List</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <AdminsTable admins={admins} currentUserRole={user.profile?.role} />
        </TabsContent>

        <TabsContent value="allowlist" className="space-y-4">
          <AllowlistTable allowlist={allowlist} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
