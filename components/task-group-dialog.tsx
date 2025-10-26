"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string, color: string) => void
  initialTitle?: string
  initialColor?: string
  mode: "create" | "edit"
}

export function TaskGroupDialog({
  open,
  onOpenChange,
  onSave,
  initialTitle = "",
  initialColor = "blue",
  mode,
}: TaskGroupDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [color, setColor] = useState(initialColor)

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setColor(initialColor)
    }
  }, [open, initialTitle, initialColor])

  const handleSave = () => {
    if (title.trim()) {
      onSave(title, color)
      setTitle("")
      setColor("blue")
      onOpenChange(false)
    }
  }

  const getColorOptions = () => [
    { value: "blue", label: "Blue", className: "bg-blue-500" },
    { value: "green", label: "Green", className: "bg-green-500" },
    { value: "yellow", label: "Yellow", className: "bg-yellow-500" },
    { value: "red", label: "Red", className: "bg-red-500" },
    { value: "purple", label: "Purple", className: "bg-purple-500" },
    { value: "pink", label: "Pink", className: "bg-pink-500" },
    { value: "gray", label: "Gray", className: "bg-gray-500" },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Task Group" : "Edit Task Group"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input 
              id="title" 
              placeholder="Enter task group title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select value={color} onValueChange={setColor}>
              <SelectTrigger id="color">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getColorOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${option.className}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim()}>
            {mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
