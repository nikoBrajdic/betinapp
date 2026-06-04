"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const COLORS = [
  { value: "blue",   className: "bg-blue-500" },
  { value: "violet", className: "bg-violet-500" },
  { value: "green",  className: "bg-green-500" },
  { value: "yellow", className: "bg-yellow-400" },
  { value: "red",    className: "bg-red-500" },
  { value: "pink",   className: "bg-pink-500" },
  { value: "gray",   className: "bg-gray-400" },
]

interface TaskGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // create mode passes items too; edit mode only title+color
  onSave: (title: string, color: string, items?: string[]) => void
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
  const [items, setItems] = useState<string[]>([])
  const [itemInput, setItemInput] = useState("")
  const itemInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setColor(initialColor)
      setItems([])
      setItemInput("")
    }
  }, [open, initialTitle, initialColor])

  const addItem = () => {
    const v = itemInput.trim()
    if (!v) return
    setItems(prev => [...prev, v])
    setItemInput("")
    itemInputRef.current?.focus()
  }

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = () => {
    if (!title.trim()) return
    onSave(title.trim(), color, mode === "create" ? items : undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Task" : "Edit Task"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">Task name</Label>
            <Input
              id="title"
              placeholder="e.g. Clean the house"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && itemInputRef.current?.focus()}
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all cursor-pointer",
                    c.className,
                    color === c.value ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "opacity-60 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Checklist items — only on create */}
          {mode === "create" && (
            <div className="space-y-1.5">
              <Label>Checklist items <span className="text-gray-400 font-normal">(optional)</span></Label>

              {items.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                      <span className="flex-1">{item}</span>
                      <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <Input
                  ref={itemInputRef}
                  placeholder="Add an item (press Enter)"
                  value={itemInput}
                  onChange={e => setItemInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem() } }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addItem} className="cursor-pointer flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()} className="cursor-pointer">
            {mode === "create" ? "Create Task" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
