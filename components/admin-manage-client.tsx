"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { AdminsTable } from "@/components/admins-table"
import { AllowlistTable } from "@/components/allowlist-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useLanguage, LANGUAGE_LABELS, type Language } from "@/lib/language"

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
  isSuperadmin?: boolean
}

export function AdminManageClient({ admins, allowlist, currentUserRole, isSuperadmin = false }: AdminManageClientProps) {
  const [activeTab, setActiveTab] = useState("admins")
  const { lang, setLang } = useLanguage()

  const handleAddAllowlist = () => {
    window.dispatchEvent(new CustomEvent("allowlist:add"))
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Language preference — available to everyone */}
      <Card className="shadow-none border-2 p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Language</h2>
            <p className="text-xs text-gray-400 mt-0.5">Choose your interface language.</p>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
            {(["en", "hr"] as Language[]).map(code => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  lang === code ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {LANGUAGE_LABELS[code]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {isSuperadmin && (
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
      )}
    </div>
  )
}
