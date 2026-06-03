"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Plus, Pencil, Trash2, CheckSquare } from "lucide-react"
import { TaskGroupDialog } from "@/components/task-group-dialog"
import { TaskDialog } from "@/components/task-dialog"
import { cn } from "@/lib/utils"
import {
  createTaskWithItems,
  updateTaskGroup,
  deleteTaskGroup,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion,
} from "@/lib/actions/tasks"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  title: string
  completed: boolean
  created_at: string
  updated_at: string
}

interface TaskGroup {
  id: string
  title: string
  color: string
  created_at: string
  updated_at: string
  tasks: Task[]
}

interface TasksClientProps {
  taskGroups: TaskGroup[]
}

const colorBg: Record<string, string> = {
  blue:   "bg-blue-50   border-blue-200",
  violet: "bg-violet-50 border-violet-200",
  green:  "bg-green-50  border-green-200",
  yellow: "bg-yellow-50 border-yellow-200",
  red:    "bg-red-50    border-red-200",
  pink:   "bg-pink-50   border-pink-200",
  gray:   "bg-gray-50   border-gray-200",
  purple: "bg-purple-50 border-purple-200",
}

const colorDot: Record<string, string> = {
  blue:   "bg-blue-500",
  violet: "bg-violet-500",
  green:  "bg-green-500",
  yellow: "bg-yellow-400",
  red:    "bg-red-500",
  pink:   "bg-pink-500",
  gray:   "bg-gray-400",
  purple: "bg-purple-500",
}

// Inline "add item" row inside a task card
function AddItemRow({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const [value, setValue] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    const v = value.trim()
    if (!v) { setAdding(false); return }
    await createTask({ title: v, taskGroupId: groupId })
    setValue("")
    onAdded()
    inputRef.current?.focus()
  }

  if (!adding) {
    return (
      <button
        onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-600 py-1 cursor-pointer transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add item
      </button>
    )
  }

  return (
    <div className="flex gap-1.5">
      <Input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") { setAdding(false); setValue("") }
        }}
        placeholder="Item name…"
        className="h-7 text-sm"
      />
      <Button size="sm" className="h-7 px-2 cursor-pointer" onClick={submit}>Add</Button>
    </div>
  )
}

export function TasksClient({ taskGroups }: TasksClientProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = () => { setEditingGroup(null); setIsGroupDialogOpen(true) }
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const handleCreateTask = async (title: string, color: string, items?: string[]) => {
    try {
      await createTaskWithItems({ title, color, items })
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleEditTask = async (id: string, title: string, color: string) => {
    try {
      await updateTaskGroup(id, { title, color })
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTaskGroup(id)
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleEditItem = async (id: string, title: string) => {
    try {
      await updateTask(id, { title })
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteTask(id)
      router.refresh()
    } catch (e) { console.error(e) }
  }

  const handleToggle = async (id: string) => {
    try {
      await toggleTaskCompletion(id)
      router.refresh()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="p-8">
      {taskGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">Create your first household task to get started</p>
          <Button onClick={() => setIsGroupDialogOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {taskGroups.map(group => {
            const items = group.tasks || []
            const done = items.filter(t => t.completed).length
            const pending = items.filter(t => !t.completed)
            const completed = items.filter(t => t.completed)
            const sorted = [...pending, ...completed]
            const bg = colorBg[group.color] ?? colorBg.blue
            const dot = colorDot[group.color] ?? colorDot.blue

            return (
              <Card key={group.id} className={cn("p-5 border-2 flex flex-col", bg)}>
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", dot)} />
                    <h3 className="font-semibold text-gray-800 truncate">{group.title}</h3>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => { setEditingGroup(group); setIsGroupDialogOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive" onClick={() => handleDeleteTask(group.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress */}
                {items.length > 0 && (
                  <p className="text-xs text-gray-400 mb-3">{done}/{items.length} done</p>
                )}

                {/* Items */}
                <div className="space-y-1.5 flex-1 mb-3">
                  {sorted.map(item => (
                    <div key={item.id} className="flex items-center gap-2 group/item">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => handleToggle(item.id)}
                        className="cursor-pointer"
                      />
                      <span className={cn("flex-1 text-sm", item.completed && "line-through text-gray-400")}>
                        {item.title}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-5 w-5 cursor-pointer" onClick={() => { setEditingTask(item); setIsItemDialogOpen(true) }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5 cursor-pointer text-destructive hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline add item */}
                <AddItemRow groupId={group.id} onAdded={() => router.refresh()} />
              </Card>
            )
          })}
        </div>
      )}

      {/* Create / edit task dialog */}
      <TaskGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={open => { if (!open) { setIsGroupDialogOpen(false); setEditingGroup(null) } }}
        onSave={editingGroup
          ? (title, color) => handleEditTask(editingGroup.id, title, color)
          : handleCreateTask
        }
        initialTitle={editingGroup?.title}
        initialColor={editingGroup?.color}
        mode={editingGroup ? "edit" : "create"}
      />

      {/* Edit checklist item dialog */}
      <TaskDialog
        open={isItemDialogOpen}
        onOpenChange={open => { if (!open) { setIsItemDialogOpen(false); setEditingTask(null) } }}
        onSave={editingTask ? title => handleEditItem(editingTask.id, title) : () => {}}
        initialTitle={editingTask?.title}
        mode="edit"
      />
    </div>
  )
}
