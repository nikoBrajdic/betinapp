"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Edit, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { updateProfileRole } from "@/lib/actions/admin"
import { useRouter } from "next/navigation"

interface Admin {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface AdminsTableProps {
  admins: Admin[]
  currentUserRole?: string
}

export function AdminsTable({ admins, currentUserRole }: AdminsTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [selectedRole, setSelectedRole] = useState("admin")
  const router = useRouter()

  const handleRoleUpdate = async () => {
    if (!editingAdmin) return
    
    try {
      await updateProfileRole(editingAdmin.id, selectedRole)
      setIsDialogOpen(false)
      setEditingAdmin(null)
      router.refresh()
    } catch (error) {
      console.error("Failed to update profile role:", error)
    }
  }

  const openEditDialog = (admin: Admin) => {
    setEditingAdmin(admin)
    setSelectedRole(admin.role)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingAdmin(null)
    setSelectedRole("admin")
  }

  const canEdit = currentUserRole === "superadmin"
  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Users</CardTitle>
        <CardDescription>All users with access to the household dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        {admins.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No admin users found.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name || "—"}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant={admin.role === "superadmin" ? "default" : "secondary"}>
                      {admin.role === "superadmin" ? "Super Admin" : "Admin"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(admin.created_at), { addSuffix: true })}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(admin)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <User className="h-4 w-4" />
                <span className="font-medium">{editingAdmin?.full_name || editingAdmin?.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleRoleUpdate}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
