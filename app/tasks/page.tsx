import { getTaskGroups } from "@/lib/actions/tasks"
import { TasksClient } from "./tasks-client"

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

export default async function TasksPage() {
  const taskGroups = await getTaskGroups()

  return <TasksClient taskGroups={taskGroups} />
}
