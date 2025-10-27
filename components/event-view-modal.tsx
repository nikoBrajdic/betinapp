"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { EventDialog } from "@/components/event-dialog"

interface Event {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string | null
  time: string | null
  category: "family" | "maintenance" | "appointment" | "other"
  created_at: string
  updated_at: string
}

interface EventViewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event | null
  onEdit: (event: Event) => void
  onDelete: (id: string) => void
  onEditSave: (id: string, title: string, description: string, startDate: Date, endDate: Date | null, time: string, category: Event["category"]) => void
}

export function EventViewModal({ open, onOpenChange, event, onEdit, onDelete, onEditSave }: EventViewModalProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  if (!event) return null

  const handleEdit = () => {
    setIsEditDialogOpen(true)
  }

  const handleDelete = () => {
    onDelete(event.id)
    onOpenChange(false)
  }

  const handleEditSave = (id: string, title: string, description: string, startDate: Date | string | null, endDate: Date | string | null, time: string, category: Event["category"], created_at?: string) => {
    onEditSave(id, title, description, startDate, endDate, time, category, created_at)
    setIsEditDialogOpen(false)
    onOpenChange(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return ""
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    })
  }

  const getCategoryColor = (category: Event["category"]) => {
    switch (category) {
      case "family":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "maintenance":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      case "appointment":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "other":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const isMultiDay = event.end_date && event.start_date !== event.end_date

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-[80vw] max-w-[1000px] min-h-[90vh] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 py-6 space-y-6">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(event.category)}`}>
                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Date & Time</h3>
                <div className="space-y-1">
                  <p className="text-base">
                    {isMultiDay ? (
                      <>
                        <span className="font-medium">From:</span> {formatDate(event.start_date)}
                        <br />
                        <span className="font-medium">To:</span> {formatDate(event.end_date!)}
                      </>
                    ) : (
                      formatDate(event.start_date)
                    )}
                  </p>
                  {event.time && (
                    <p className="text-base">
                      <span className="font-medium">Time:</span> {formatTime(event.time)}
                    </p>
                  )}
                </div>
              </div>

              {event.description && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <div className="prose prose-gray dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-base leading-relaxed">
                      {event.description}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Updated {new Date(event.updated_at).toLocaleDateString("en-US", { 
                month: "long", 
                day: "numeric", 
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EventDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleEditSave}
        initialTitle={event.title}
        initialDescription={event.description}
        initialStartDate={new Date(event.start_date)}
        initialEndDate={event.end_date ? new Date(event.end_date) : null}
        initialTime={event.time || ""}
        initialCategory={event.category}
        initialId={event.id}
        initialCreatedAt={event.created_at}
        mode="edit"
      />
    </>
  )
}
