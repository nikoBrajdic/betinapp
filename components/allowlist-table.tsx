"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2 } from "lucide-react"
import { addToAllowlist, updateAllowlistRole, removeFromAllowlist } from "@/lib/actions/admin"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

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
      if (editingItem) {
        // Update existing allowlist entry
        await updateAllowlistRole(editingItem.id, role)
      } else {
        // Add new allowlist entry
        await addToAllowlist({ email: email.trim(), role })
      }
      setEmail("")
      setRole("admin")
      setIsDialogOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to add/update allowlist:", error)
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

  useEffect(() => {
    const handleAdd = () => {
      setEditingItem(null)
      setEmail("")
      setRole("admin")
      setIsDialogOpen(true)
    }
    window.addEventListener("allowlist:add", handleAdd)
    return () => window.removeEventListener("allowlist:add", handleAdd)
  }, [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Email Allowlist</CardTitle>
          <CardDescription>
            Manage which email addresses can access the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allowlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No emails in allowlist yet.</div>
          ) : (
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
                {allowlist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell>
                      <Badge variant={item.role === "superadmin" ? "default" : "secondary"}>
                        {item.role === "superadmin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
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
                disabled={!!editingItem}
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
    </>
  )
}
