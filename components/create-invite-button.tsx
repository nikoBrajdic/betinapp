"use client"

import { useState } from "react"
import { createInvite } from "@/lib/actions/invites"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Copy, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CreateInviteButton() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createdInvite, setCreatedInvite] = useState<{ code: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleCreate = async () => {
    setIsCreating(true)
    setError("")

    const result = await createInvite(email || undefined)

    setIsCreating(false)

    if (result.success && result.invite) {
      setCreatedInvite(result.invite)
      setEmail("")
    } else {
      setError(result.error || "Failed to create invite")
    }
  }

  const handleCopy = async () => {
    if (createdInvite) {
      const inviteUrl = `${window.location.origin}/auth/signup?code=${createdInvite.code}`
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCreatedInvite(null)
    setEmail("")
    setError("")
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Admin Invite</DialogTitle>
          <DialogDescription>Generate a new invite code for an admin user</DialogDescription>
        </DialogHeader>

        {!createdInvite ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, this invite will be associated with the email
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Invite"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <Alert className="border-teal-500 bg-teal-50 dark:bg-teal-950">
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Invite code created successfully!</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-background px-3 py-2 text-lg font-mono tracking-wider">
                        {createdInvite.code}
                      </code>
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this code with the new admin. It expires in 7 days.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
