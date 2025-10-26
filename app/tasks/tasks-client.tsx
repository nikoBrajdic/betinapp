"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, CheckSquare } from "lucide-react"
import { TaskGroupDialog } from "@/components/task-group-dialog"
import { TaskDialog } from "@/components/task-dialog"
import { cn } from "@/lib/utils"
import { 
  createTaskGroup, 
  updateTaskGroup, 
  deleteTaskGroup,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion
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

export function TasksClient({ taskGroups }: TasksClientProps) {
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TaskGroup | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const router = useRouter()

  const handleAddTaskGroup = async (title: string, color: string) => {
    try {
      await createTaskGroup({ title, color })
      router.refresh()
    } catch (error) {
      console.error("Failed to create task group:", error)
    }
  }

  const handleEditTaskGroup = async (id: string, title: string, color: string) => {
    try {
      await updateTaskGroup(id, { title, color })
      router.refresh()
    } catch (error) {
      console.error("Failed to update task group:", error)
    }
  }

  const handleDeleteTaskGroup = async (id: string) => {
    try {
      await deleteTaskGroup(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete task group:", error)
    }
  }

  const handleAddTask = async (title: string) => {
    if (!selectedGroupId) return
    try {
      await createTask({ title, taskGroupId: selectedGroupId })
      router.refresh()
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  const handleEditTask = async (id: string, title: string) => {
    try {
      await updateTask(id, { title })
      router.refresh()
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  const handleToggleTask = async (id: string) => {
    try {
      await toggleTaskCompletion(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to toggle task:", error)
    }
  }

  const openGroupEditDialog = (group: TaskGroup) => {
    setEditingGroup(group)
    setIsGroupDialogOpen(true)
  }

  const openTaskDialog = (groupId: string) => {
    setSelectedGroupId(groupId)
    setIsTaskDialogOpen(true)
  }

  const openTaskEditDialog = (task: Task) => {
    setEditingTask(task)
    setIsTaskDialogOpen(true)
  }

  const closeGroupDialog = () => {
    setIsGroupDialogOpen(false)
    setEditingGroup(null)
  }

  const closeTaskDialog = () => {
    setIsTaskDialogOpen(false)
    setSelectedGroupId(null)
    setEditingTask(null)
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
      green: "bg-green-500/10 border-green-200 dark:border-green-800",
      yellow: "bg-yellow-500/10 border-yellow-200 dark:border-yellow-800",
      red: "bg-red-500/10 border-red-200 dark:border-red-800",
      purple: "bg-purple-500/10 border-purple-200 dark:border-purple-800",
      pink: "bg-pink-500/10 border-pink-200 dark:border-pink-800",
      gray: "bg-gray-500/10 border-gray-200 dark:border-gray-800",
    }
    return colorMap[color as keyof typeof colorMap] || colorMap.blue
  }

  const getColorAccent = (color: string) => {
    const accentMap = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
      pink: "bg-pink-500",
      gray: "bg-gray-500",
    }
    return accentMap[color as keyof typeof accentMap] || accentMap.blue
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
          <p className="text-muted-foreground">Organize your tasks in groups like Google Keep</p>
        </div>
        <Button onClick={() => setIsGroupDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      {taskGroups.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No task groups yet</h3>
          <p className="text-muted-foreground mb-4">Create your first task group to get started</p>
          <Button onClick={() => setIsGroupDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {taskGroups.map((group) => {
            const completedTasks = group.tasks.filter(task => task.completed)
            const pendingTasks = group.tasks.filter(task => !task.completed)
            const sortedTasks = [...pendingTasks, ...completedTasks]

            return (
              <Card key={group.id} className={cn("p-6 border-2", getColorClasses(group.color))}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", getColorAccent(group.color))} />
                    <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={() => openGroupEditDialog(group)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTaskGroup(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {sortedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-2 group">
                      <Checkbox 
                        checked={task.completed} 
                        onCheckedChange={() => handleToggleTask(task.id)}
                      />
                      <span 
                        className={cn(
                          "flex-1 text-sm",
                          task.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => openTaskEditDialog(task)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => openTaskDialog(group.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <TaskGroupDialog
        open={isGroupDialogOpen}
        onOpenChange={closeGroupDialog}
        onSave={editingGroup ? (title, color) => handleEditTaskGroup(editingGroup.id, title, color) : handleAddTaskGroup}
        initialTitle={editingGroup?.title}
        initialColor={editingGroup?.color}
        mode={editingGroup ? "edit" : "create"}
      />

      <TaskDialog
        open={isTaskDialogOpen}
        onOpenChange={closeTaskDialog}
        onSave={editingTask ? (title) => handleEditTask(editingTask.id, title) : handleAddTask}
        initialTitle={editingTask?.title}
        mode={editingTask ? "edit" : "create"}
      />
    </div>
  )
}