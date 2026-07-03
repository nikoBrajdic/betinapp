"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { AdminsTable } from "@/components/admins-table"
import { AllowlistTable } from "@/components/allowlist-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface Admin {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface AllowlistItem {
  id: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

interface AdminManageClientProps {
  admins: Admin[]
  allowlist: AllowlistItem[]
  currentUserRole?: string
}

export function AdminManageClient({ admins, allowlist, currentUserRole }: AdminManageClientProps) {
  const [activeTab, setActiveTab] = useState("admins")

  const handleAddAllowlist = () => {
    window.dispatchEvent(new CustomEvent("allowlist:add"))
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="admins">Users</TabsTrigger>
            <TabsTrigger value="allowlist">Allow List</TabsTrigger>
          </TabsList>
          {activeTab === "allowlist" && (
            <Button onClick={handleAddAllowlist} className="h-9 px-3 text-xs sm:text-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Email
            </Button>
          )}
        </div>

        <TabsContent value="admins" className="space-y-4">
          <AdminsTable admins={admins} currentUserRole={currentUserRole} />
        </TabsContent>

        <TabsContent value="allowlist" className="space-y-4">
          <AllowlistTable allowlist={allowlist} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
