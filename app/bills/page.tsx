"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, DollarSign, CheckCircle2, AlertCircle, Clock } from "lucide-react"
import { BillDialog } from "@/components/bill-dialog"
import { cn } from "@/lib/utils"

interface Bill {
  id: string
  name: string
  amount: number
  dueDate: Date
  status: "paid" | "pending" | "overdue"
  category: "utilities" | "rent" | "insurance" | "subscription" | "other"
  recurring: boolean
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([
    {
      id: "1",
      name: "Electricity Bill",
      amount: 84.5,
      dueDate: new Date("2025-10-28"),
      status: "pending",
      category: "utilities",
      recurring: true,
    },
    {
      id: "2",
      name: "Internet Service",
      amount: 79.99,
      dueDate: new Date("2025-10-30"),
      status: "pending",
      category: "utilities",
      recurring: true,
    },
    {
      id: "3",
      name: "Home Insurance",
      amount: 125.0,
      dueDate: new Date("2025-11-01"),
      status: "pending",
      category: "insurance",
      recurring: true,
    },
    {
      id: "4",
      name: "Water Bill",
      amount: 45.2,
      dueDate: new Date("2025-10-15"),
      status: "paid",
      category: "utilities",
      recurring: true,
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)

  const handleAddBill = (
    name: string,
    amount: number,
    dueDate: Date,
    category: Bill["category"],
    recurring: boolean,
  ) => {
    const newBill: Bill = {
      id: Date.now().toString(),
      name,
      amount,
      dueDate,
      status: "pending",
      category,
      recurring,
    }
    setBills([newBill, ...bills])
  }

  const handleEditBill = (
    id: string,
    name: string,
    amount: number,
    dueDate: Date,
    category: Bill["category"],
    recurring: boolean,
  ) => {
    setBills(bills.map((bill) => (bill.id === id ? { ...bill, name, amount, dueDate, category, recurring } : bill)))
  }

  const handleDeleteBill = (id: string) => {
    setBills(bills.filter((bill) => bill.id !== id))
  }

  const handleToggleStatus = (id: string) => {
    setBills(
      bills.map((bill) => {
        if (bill.id === id) {
          return { ...bill, status: bill.status === "paid" ? "pending" : "paid" }
        }
        return bill
      }),
    )
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
        return CheckCircle2
      case "pending":
        return Clock
      case "overdue":
        return AlertCircle
    }
  }

  const getStatusColor = (status: Bill["status"]) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
      case "overdue":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
    }
  }

  const getCategoryColor = (category: Bill["category"]) => {
    switch (category) {
      case "utilities":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "rent":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      case "insurance":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400"
      case "subscription":
        return "bg-pink-500/10 text-pink-700 dark:text-pink-400"
      case "other":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
    }
  }

  const pendingBills = bills.filter((b) => b.status === "pending")
  const paidBills = bills.filter((b) => b.status === "paid")
  const totalPending = pendingBills.reduce((sum, bill) => sum + bill.amount, 0)
  const totalPaid = paidBills.reduce((sum, bill) => sum + bill.amount, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Bills</h1>
          <p className="text-muted-foreground">Track and manage household bills and payments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Pending Bills</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalPending.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">{pendingBills.length} bills due</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Paid This Month</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">${totalPaid.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">{paidBills.length} bills paid</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Monthly</h3>
          </div>
          <p className="text-2xl font-bold text-foreground">${(totalPending + totalPaid).toFixed(2)}</p>
          <p className="text-sm text-muted-foreground mt-1">{bills.length} total bills</p>
        </Card>
      </div>

      {/* Bills List */}
      {bills.length === 0 ? (
        <Card className="p-12 text-center">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No bills yet</h3>
          <p className="text-muted-foreground mb-4">Add your first bill to start tracking</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bill
          </Button>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">All Bills</h2>
          <div className="space-y-3">
            {bills.map((bill) => {
              const StatusIcon = getStatusIcon(bill.status)
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => handleToggleStatus(bill.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        bill.status === "paid" ? "bg-green-500/10" : "bg-gray-500/10 hover:bg-primary/10",
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-5 w-5",
                          bill.status === "paid" ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                        )}
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground mb-1">{bill.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("text-xs", getCategoryColor(bill.category))}>{bill.category}</Badge>
                        <Badge className={cn("text-xs", getStatusColor(bill.status))}>{bill.status}</Badge>
                        {bill.recurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Due {bill.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">${bill.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(bill)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteBill(bill.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
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
        initialDueDate={editingBill?.dueDate}
        initialCategory={editingBill?.category}
        initialRecurring={editingBill?.recurring}
        mode={editingBill ? "edit" : "create"}
      />
    </div>
  )
}
