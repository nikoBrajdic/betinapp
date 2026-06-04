import { getCurrentUser } from "@/lib/actions/auth"
import { getAdmins } from "@/lib/actions/invites"
import { getAllowlist, getJoinRequests } from "@/lib/actions/admin"
import { redirect } from "next/navigation"
import { AdminsTable } from "@/components/admins-table"
import { AllowlistTable } from "@/components/allowlist-table"
import { JoinRequestsTable } from "@/components/join-requests-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AdminManagePage() {
  const user = await getCurrentUser()

  if (!user || user.profile?.role !== "superadmin") {
    redirect("/")
  }

  const { admins } = await getAdmins()
  const allowlist = await getAllowlist()
  const joinRequests = await getJoinRequests()

  return (
    <div className="p-8 space-y-6">
      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Users</TabsTrigger>
          <TabsTrigger value="allowlist">Allow List</TabsTrigger>
          <TabsTrigger value="join-requests">Join Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <AdminsTable admins={admins} currentUserRole={user.profile?.role} />
        </TabsContent>

        <TabsContent value="allowlist" className="space-y-4">
          <AllowlistTable allowlist={allowlist} />
        </TabsContent>

        <TabsContent value="join-requests" className="space-y-4">
          <JoinRequestsTable joinRequests={joinRequests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
