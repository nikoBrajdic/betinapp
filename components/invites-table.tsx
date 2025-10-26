"use client"

import { useState } from "react"
import { deleteInvite } from "@/lib/actions/invites"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Copy, Trash2, Check } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Invite {
  id: string
  code: string
  email: string | null
  used_by: string | null
  used_at: string | null
  expires_at: string
  created_at: string
}

interface InvitesTableProps {
  invites: Invite[]
}

export function InvitesTable({ invites }: InvitesTableProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = async (code: string) => {
    const inviteUrl = `${window.location.origin}/auth/signup?code=${code}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this invite?")) {
      await deleteInvite(id)
    }
  }

  const getStatus = (invite: Invite) => {
    if (invite.used_by) return "used"
    if (new Date(invite.expires_at) < new Date()) return "expired"
    return "active"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Codes</CardTitle>
        <CardDescription>Manage invite codes for new admin users</CardDescription>
      </CardHeader>
      <CardContent>
        {invites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No invite codes yet. Create one to get started.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const status = getStatus(invite)
                return (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">{invite.code}</code>
                    </TableCell>
                    <TableCell>{invite.email || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={status === "active" ? "default" : status === "used" ? "secondary" : "destructive"}
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {status === "active" && (
                          <Button size="sm" variant="ghost" onClick={() => handleCopy(invite.code)}>
                            {copiedCode === invite.code ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(invite.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
