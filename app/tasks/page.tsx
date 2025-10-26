"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, CheckSquare } from "lucide-react"
import { TaskDialog } from "@/components/task-dialog"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  dueDate: Date | null
  createdAt: Date
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Fix leaky faucet",
      description: "Bathroom sink is dripping, need to replace washer",
      status: "in-progress",
      priority: "high",
      dueDate: new Date("2025-10-28"),
      createdAt: new Date("2025-10-20"),
    },
    {
      id: "2",
      title: "Buy groceries",
      description: "Weekly grocery shopping for the household",
      status: "todo",
      priority: "medium",
      dueDate: new Date("2025-10-27"),
      createdAt: new Date("2025-10-25"),
    },
    {
      id: "3",
      title: "Schedule HVAC maintenance",
      description: "Annual HVAC system checkup and filter replacement",
      status: "todo",
      priority: "low",
      dueDate: new Date("2025-11-05"),
      createdAt: new Date("2025-10-24"),
    },
    {
      id: "4",
      title: "Clean garage",
      description: "Organize tools and dispose of old items",
      status: "done",
      priority: "low",
      dueDate: null,
      createdAt: new Date("2025-10-15"),
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleAddTask = (title: string, description: string, priority: Task["priority"], dueDate: Date | null) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      description,
      status: "todo",
      priority,
      dueDate,
      createdAt: new Date(),
    }
    setTasks([newTask, ...tasks])
  }

  const handleEditTask = (
    id: string,
    title: string,
    description: string,
    priority: Task["priority"],
    dueDate: Date | null,
  ) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, title, description, priority, dueDate } : task)))
  }

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter((task) => task.id !== id))
  }

  const handleToggleStatus = (id: string) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          const newStatus = task.status === "done" ? "todo" : task.status === "todo" ? "in-progress" : "done"
          return { ...task, status: newStatus }
        }
        return task
      }),
    )
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingTask(null)
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "low":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "done":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "in-progress":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "todo":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const todoTasks = tasks.filter((t) => t.status === "todo")
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress")
  const doneTasks = tasks.filter((t) => t.status === "done")

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage your household tasks and to-dos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
          <p className="text-muted-foreground mb-4">Create your first task to get started</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">To Do</h2>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoTasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={false} onCheckedChange={() => handleToggleStatus(task.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs", getPriorityColor(task.priority))}>{task.priority}</Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">In Progress</h2>
              <Badge variant="secondary">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <Card key={task.id} className="p-4 border-primary/50">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked="indeterminate"
                      onCheckedChange={() => handleToggleStatus(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs", getPriorityColor(task.priority))}>{task.priority}</Badge>
                        <Badge className={cn("text-xs", getStatusColor(task.status))}>in progress</Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due {task.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-foreground">Done</h2>
              <Badge variant="secondary">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {doneTasks.map((task) => (
                <Card key={task.id} className="p-4 opacity-75">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={true} onCheckedChange={() => handleToggleStatus(task.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground line-through mb-1">{task.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs", getStatusColor(task.status))}>done</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingTask
            ? (title, description, priority, dueDate) =>
                handleEditTask(editingTask.id, title, description, priority, dueDate)
            : handleAddTask
        }
        initialTitle={editingTask?.title}
        initialDescription={editingTask?.description}
        initialPriority={editingTask?.priority}
        initialDueDate={editingTask?.dueDate}
        mode={editingTask ? "edit" : "create"}
      />
    </div>
  )
}
