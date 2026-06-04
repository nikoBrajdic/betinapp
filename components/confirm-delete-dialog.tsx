"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  itemName?: string
}

export function ConfirmDeleteDialog({ open, onOpenChange, onConfirm, itemName }: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Delete{itemName ? ` "${itemName}"` : ""}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-500">This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(); onOpenChange(false) }}
            className="cursor-pointer"
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
