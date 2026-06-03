"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Trash2, CheckSquare, MoreHorizontal,
  Pencil, Copy, GripVertical,
} from "lucide-react"
import { TaskGroupDialog } from "@/components/task-group-dialog"
import { cn } from "@/lib/utils"
import {
  createTaskWithItems, updateTaskGroup, deleteTaskGroup,
  createTask, updateTask, deleteTask, toggleTaskCompletion,
  duplicateTaskGroup,
} from "@/lib/actions/tasks"
import { useRouter } from "next/navigation"

interface Task {
  id: string; title: string; completed: boolean
  created_at: string; updated_at: string
}
interface TaskGroup {
  id: string; title: string; color: string
  created_at: string; updated_at: string; tasks: Task[]
}
interface TasksClientProps { taskGroups: TaskGroup[] }

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
  blue: "bg-blue-500", violet: "bg-violet-500", green: "bg-green-500",
  yellow: "bg-yellow-400", red: "bg-red-500", pink: "bg-pink-500",
  gray: "bg-gray-400", purple: "bg-purple-500",
}

// ── Inline add row ────────────────────────────────────────────────────────────
function AddItemRow({ groupId, onAdded }: { groupId: string; onAdded: () => void }) {
  const [value, setValue] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)

  const startAdding = () => {
    setAdding(true)
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  const submit = async () => {
    const v = value.trim()
    if (!v) { setAdding(false); return }
    submitting.current = true
    await createTask({ title: v, taskGroupId: groupId })
    setValue("")
    submitting.current = false
    onAdded()
    // Stay open so user can keep adding
    setTimeout(() => inputRef.current?.focus(), 20)
  }

  const handleBlur = () => {
    // Small delay so clicking "Add" button fires before we close
    setTimeout(() => {
      if (!submitting.current) { setAdding(false); setValue("") }
    }, 150)
  }

  if (!adding) return (
    <button
      onClick={startAdding}
      className="flex items-center gap-1.5 w-full text-sm text-gray-400 hover:text-gray-600 py-1 cursor-pointer transition-colors"
    >
      <Plus className="h-3.5 w-3.5" /> Add item
    </button>
  )

  return (
    <div className="flex items-center gap-2 py-0.5 px-1">
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") { setAdding(false); setValue("") }
        }}
        placeholder="Add item…"
        className="flex-1 text-sm text-gray-800 placeholder:text-gray-300 bg-transparent outline-none border-none"
      />
      {value.trim() && (
        <button
          onMouseDown={() => { submitting.current = true }}
          onClick={submit}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 cursor-pointer transition-colors flex-shrink-0"
        >
          Add
        </button>
      )}
    </div>
  )
}

// ── Draggable task list inside a card ─────────────────────────────────────────
function TaskList({
  groupId, items, onToggle, onDelete, onEdit, onReorder,
}: {
  groupId: string
  items: Task[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (id: string, title: string) => void
  onReorder: (next: Task[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const startEdit = (item: Task) => {
    setEditingId(item.id)
    setEditText(item.title)
  }

  const saveEdit = async () => {
    if (editingId && editText.trim()) await onEdit(editingId, editText.trim())
    setEditingId(null)
  }

  const handleDrop = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const next = [...items]
    const [moved] = next.splice(dragItem.current, 1)
    next.splice(dragOverItem.current, 0, moved)
    dragItem.current = null
    dragOverItem.current = null
    setDragOver(null)
    onReorder(next)
  }

  return (
    <div className="space-y-1">
      {items.map((item, idx) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => { dragItem.current = idx }}
          onDragEnter={() => { dragOverItem.current = idx; setDragOver(idx) }}
          onDragEnd={handleDrop}
          onDragOver={e => e.preventDefault()}
          className={cn(
            "flex items-center gap-2 group/item rounded-lg px-1 py-0.5 transition-colors",
            dragOver === idx && "bg-white/70 border border-dashed border-gray-300"
          )}
        >
          {/* Drag handle */}
          <GripVertical className="h-3.5 w-3.5 text-gray-300 cursor-grab flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />

          <Checkbox
            checked={item.completed}
            onCheckedChange={() => onToggle(item.id)}
            className="cursor-pointer flex-shrink-0"
          />

          {/* Inline editable text */}
          {editingId === item.id ? (
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={e => {
                if (e.key === "Enter") saveEdit()
                if (e.key === "Escape") setEditingId(null)
              }}
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none border-b border-gray-400"
            />
          ) : (
            <span
              onClick={() => !item.completed && startEdit(item)}
              className={cn(
                "flex-1 text-sm",
                item.completed ? "line-through text-gray-400 cursor-default" : "cursor-text hover:text-gray-500"
              )}
            >
              {item.title}
            </span>
          )}

          {/* Delete only */}
          <Button
            variant="ghost" size="icon"
            className="h-5 w-5 cursor-pointer text-destructive hover:text-destructive opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0"
            onClick={() => onDelete(item.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function TasksClient({ taskGroups }: TasksClientProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null)
  // Local task order per group (for drag reorder)
  const [localOrder, setLocalOrder] = useState<Record<string, Task[]>>(() =>
    Object.fromEntries(taskGroups.map(g => [g.id, g.tasks ?? []]))
  )
  const router = useRouter()

  // Keep localOrder in sync when props update
  useEffect(() => {
    setLocalOrder(Object.fromEntries(taskGroups.map(g => [g.id, g.tasks ?? []])))
  }, [taskGroups])

  useEffect(() => {
    const handler = () => { setEditingGroup(null); setIsGroupDialogOpen(true) }
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])

  const refresh = () => router.refresh()

  const handleCreateTask = async (title: string, color: string, items?: string[]) => {
    try { await createTaskWithItems({ title, color, items }); refresh() }
    catch (e) { console.error(e) }
  }

  const handleEditTask = async (id: string, title: string, color: string) => {
    try { await updateTaskGroup(id, { title, color }); refresh() }
    catch (e) { console.error(e) }
  }

  const handleDeleteTask = async (id: string) => {
    try { await deleteTaskGroup(id); refresh() }
    catch (e) { console.error(e) }
  }

  const handleDuplicate = async (id: string) => {
    try { await duplicateTaskGroup(id); refresh() }
    catch (e) { console.error(e) }
  }

  const handleEditItem = async (id: string, title: string) => {
    try { await updateTask(id, { title }); refresh() }
    catch (e) { console.error(e) }
  }

  const handleDeleteItem = async (id: string) => {
    try { await deleteTask(id); refresh() }
    catch (e) { console.error(e) }
  }

  const handleToggle = async (id: string) => {
    try { await toggleTaskCompletion(id); refresh() }
    catch (e) { console.error(e) }
  }

  return (
    <div className="p-8">
      {taskGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-400 text-base">No tasks yet</p>
          <button onClick={() => setIsGroupDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {taskGroups.map(group => {
            const items = localOrder[group.id] ?? group.tasks ?? []
            const done = items.filter(t => t.completed).length
            const pending = items.filter(t => !t.completed)
            const completed = items.filter(t => t.completed)
            const sorted = [...pending, ...completed]
            const bg = colorBg[group.color] ?? colorBg.blue
            const dot = colorDot[group.color] ?? colorDot.blue

            return (
              <Card key={group.id} className={cn("p-5 border-2 flex flex-col shadow-none transition-all hover:shadow-md hover:-translate-y-0.5", bg)}>
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", dot)} />
                    <h3 className="font-semibold text-gray-800 truncate">{group.title}</h3>
                  </div>

                  {/* 3-dots menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => { setEditingGroup(group); setIsGroupDialogOpen(true) }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => handleDuplicate(group.id)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={() => handleDeleteTask(group.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Progress */}
                {items.length > 0 && (
                  <p className="text-xs text-gray-400 mb-3">{done}/{items.length} done</p>
                )}

                {/* Task list with inline edit + drag */}
                <div className="flex-1 mb-3">
                  <TaskList
                    groupId={group.id}
                    items={sorted}
                    onToggle={handleToggle}
                    onDelete={handleDeleteItem}
                    onEdit={handleEditItem}
                    onReorder={next => setLocalOrder(prev => ({ ...prev, [group.id]: next }))}
                  />
                </div>

                {/* Add item */}
                <AddItemRow groupId={group.id} onAdded={refresh} />
              </Card>
            )
          })}
        </div>
      )}

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
    </div>
  )
}
