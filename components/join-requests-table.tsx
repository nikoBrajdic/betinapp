"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Clock, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { approveJoinRequest, rejectJoinRequest } from "@/lib/actions/admin"
import { useRouter } from "next/navigation"

interface JoinRequest {
  id: string
  email: string
  name: string | null
  status: string
  created_at: string
  updated_at: string
}

interface JoinRequestsTableProps {
  joinRequests: JoinRequest[]
}

export function JoinRequestsTable({ joinRequests }: JoinRequestsTableProps) {
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null)
  const [selectedRole, setSelectedRole] = useState("admin")
  const router = useRouter()

  const handleApprove = async () => {
    if (!selectedRequest) return
    
    try {
      await approveJoinRequest(selectedRequest.id, selectedRole)
      setIsApprovalDialogOpen(false)
      setSelectedRequest(null)
      router.refresh()
    } catch (error) {
      console.error("Failed to approve join request:", error)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this join request?")) return
    
    try {
      await rejectJoinRequest(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to reject join request:", error)
    }
  }

  const openApprovalDialog = (request: JoinRequest) => {
    setSelectedRequest(request)
    setIsApprovalDialogOpen(true)
  }

  const closeApprovalDialog = () => {
    setIsApprovalDialogOpen(false)
    setSelectedRequest(null)
    setSelectedRole("admin")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "rejected":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      case "pending":
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const pendingRequests = joinRequests.filter(req => req.status === "pending")
  const processedRequests = joinRequests.filter(req => req.status !== "pending")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Join Requests</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve requests from new users to join the application
          </p>
        </div>
        <Badge variant="outline" className="text-yellow-600 border-yellow-200">
          {pendingRequests.length} Pending
        </Badge>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {joinRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No join requests yet</p>
                </TableCell>
              </TableRow>
            ) : (
              joinRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.email}</TableCell>
                  <TableCell>{request.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <Badge className={cn("text-xs", getStatusColor(request.status))}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(request.created_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    {request.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openApprovalDialog(request)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleReject(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {request.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isApprovalDialogOpen} onOpenChange={closeApprovalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Join Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm text-muted-foreground">{selectedRequest?.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm text-muted-foreground">{selectedRequest?.name || "Not provided"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Assign Role</Label>
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
            <Button variant="outline" onClick={closeApprovalDialog}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Add to Allowlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
