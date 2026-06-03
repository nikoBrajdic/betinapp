"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, DollarSign, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { BillDialog } from "@/components/bill-dialog"
import { cn } from "@/lib/utils"
import { createBill, updateBill, deleteBill } from "@/lib/actions/bills"
import { useRouter } from "next/navigation"
import { formatMoney } from "@/lib/currency"

interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  status: "pending" | "paid" | "overdue"
  category: "utilities" | "rent" | "insurance" | "subscription" | "other"
  recurring: boolean
}

interface BillsClientProps {
  bills: Bill[]
}

export function BillsClient({ bills }: BillsClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const handler = () => setIsDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const router = useRouter()

  const handleAddBill = async (
    name: string,
    amount: number,
    dueDate: Date,
    category: Bill["category"],
    recurring: boolean,
  ) => {
    try {
      await createBill({
        name,
        amount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: "pending",
        category,
        recurring,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to create bill:", error)
    }
  }

  const handleEditBill = async (
    id: string,
    name: string,
    amount: number,
    dueDate: Date,
    category: Bill["category"],
    recurring: boolean,
  ) => {
    try {
      await updateBill(id, {
        name,
        amount,
        dueDate: dueDate.toISOString().split('T')[0],
        status: "pending", // Keep existing status
        category,
        recurring,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update bill:", error)
    }
  }

  const handleDeleteBill = async (id: string) => {
    try {
      await deleteBill(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete bill:", error)
    }
  }

  const handleToggleStatus = async (id: string) => {
    const bill = bills.find(b => b.id === id)
    if (!bill) return

    const newStatus = bill.status === "paid" ? "pending" : "paid"
    
    try {
      await updateBill(id, {
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        status: newStatus,
        category: bill.category,
        recurring: bill.recurring,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update bill status:", error)
    }
  }

  const openEditDialog = (bill: Bill) => {
    setEditingBill(bill)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingBill(null)
  }

  const getStatusIcon = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "overdue":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    }
  }

  const getCategoryColor = (category: Bill["category"]) => {
    switch (category) {
      case "utilities":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "rent":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "insurance":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "subscription":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      case "other":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const pendingAmount = bills.filter(b => b.status === "pending").reduce((sum, bill) => sum + bill.amount, 0)
  const paidAmount = bills.filter(b => b.status === "paid").reduce((sum, bill) => sum + bill.amount, 0)

  return (
    <div className="p-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Bills</p>
              <p className="text-2xl font-bold text-foreground">{formatMoney(totalAmount)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{formatMoney(pendingAmount)}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-6 shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(paidAmount)}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {bills.length === 0 ? (
        <Card className="p-12 text-center shadow-none">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No bills yet</h3>
          <p className="text-muted-foreground mb-4">Add your first bill to get started</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bills.map((bill) => (
            <Card key={bill.id} className="p-6 shadow-none transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{bill.name}</h3>
                  <p className="text-2xl font-bold text-foreground">{formatMoney(bill.amount)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(bill.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="text-sm font-medium">
                    {new Date(bill.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge className={cn("text-xs", getCategoryColor(bill.category))}>
                    {bill.category}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className={cn("text-xs", getStatusColor(bill.status))}>
                    {bill.status}
                  </Badge>
                </div>
                {bill.recurring && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-xs">Recurring</Badge>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleToggleStatus(bill.id)}
                >
                  {bill.status === "paid" ? "Mark Pending" : "Mark Paid"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(bill)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDeleteBill(bill.id)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BillDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingBill
            ? (name, amount, dueDate, category, recurring) =>
                handleEditBill(editingBill.id, name, amount, dueDate, category, recurring)
            : handleAddBill
        }
        initialName={editingBill?.name}
        initialAmount={editingBill?.amount}
        initialDueDate={editingBill?.due_date ? new Date(editingBill.due_date) : undefined}
        initialCategory={editingBill?.category}
        initialRecurring={editingBill?.recurring}
        mode={editingBill ? "edit" : "create"}
      />
    </div>
  )
}
