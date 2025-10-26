import { getCurrentUser } from "@/lib/actions/auth"
import { getInvites, getAdmins } from "@/lib/actions/invites"
import { redirect } from "next/navigation"
import { InvitesTable } from "@/components/invites-table"
import { AdminsTable } from "@/components/admins-table"
import { CreateInviteButton } from "@/components/create-invite-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AdminManagePage() {
  const user = await getCurrentUser()

  // Only superadmins can access this page
  if (!user || user.profile?.role !== "superadmin") {
    redirect("/")
  }

  const { invites } = await getInvites()
  const { admins } = await getAdmins()

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Management</h1>
          <p className="text-muted-foreground mt-1">Manage admin users and invite codes</p>
        </div>
        <CreateInviteButton />
      </div>

      <Tabs defaultValue="invites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invites">Invite Codes</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="space-y-4">
          <InvitesTable invites={invites} />
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <AdminsTable admins={admins} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
