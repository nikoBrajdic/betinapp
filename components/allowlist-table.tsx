"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { addToAllowlist, updateAllowlistRole, removeFromAllowlist } from "@/lib/actions/admin"
import { useRouter } from "next/navigation"

interface AllowlistItem {
  id: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

interface AllowlistTableProps {
  allowlist: AllowlistItem[]
}

export function AllowlistTable({ allowlist }: AllowlistTableProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowlistItem | null>(null)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("admin")
  const router = useRouter()

  const handleAdd = async () => {
    if (!email.trim()) return
    
    try {
      await addToAllowlist({ email: email.trim(), role })
      setEmail("")
      setRole("admin")
      setIsDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to add to allowlist:", error)
    }
  }

  const handleEdit = async (id: string, newRole: string) => {
    try {
      await updateAllowlistRole(id, newRole)
      router.refresh()
    } catch (error) {
      console.error("Failed to update allowlist:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this email from the allowlist?")) return
    
    try {
      await removeFromAllowlist(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to remove from allowlist:", error)
    }
  }

  const openEditDialog = (item: AllowlistItem) => {
    setEditingItem(item)
    setEmail(item.email)
    setRole(item.role)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
    setEmail("")
    setRole("admin")
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "admin":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Email Allowlist</h2>
          <p className="text-sm text-muted-foreground">
            Manage which email addresses can access the application
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Email
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allowlist.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No emails in allowlist yet</p>
                </TableCell>
              </TableRow>
            ) : (
              allowlist.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.email}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-xs", getRoleColor(item.role))}>
                      {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(item.created_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Allowlist Entry" : "Add Email to Allowlist"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={setRole}>
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
            <Button onClick={handleAdd} disabled={!email.trim()}>
              {editingItem ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
