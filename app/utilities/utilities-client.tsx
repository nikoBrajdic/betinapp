"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Droplets,
  Edit,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Trash2,
  Wifi,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { BillDialog } from "@/components/bill-dialog"
import { UtilityDialog } from "@/components/utility-dialog"
import { deleteBill, createBill, updateBill } from "@/lib/actions/bills"
import { createDefaultReadingUtilities, createUtilityReading, updateUtility } from "@/lib/actions/utilities"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"

interface Utility {
  id: string
  name: string
  current_usage: number
  max_usage: number
  cost: number
  unit: string
  trend: "up" | "down" | "stable"
  updated_at?: string
}

interface UtilityReading {
  id: string
  type: string
  value: number
  max_value: number
  date: string
}

interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  paid: boolean
  category: "utilities" | "rent" | "insurance" | "subscription" | "other"
  recurring: boolean
}

interface Stay {
  id: string
  guest_name: string
  from_date: string
  to_date: string
}

interface UtilitiesClientProps {
  utilities: Utility[]
  readings: UtilityReading[]
  bills: Bill[]
  stays: Stay[]
}

function utilityIcon(name: string) {
  const key = name.toLowerCase()
  if (key.includes("water") || key.includes("voda")) return Droplets
  if (key.includes("internet")) return Wifi
  return Zap
}

function meterGroupName(name: string) {
  return name.toLowerCase().startsWith("struja ") ? "Struja" : name
}

function electricityPart(name: string) {
  const match = name.match(/struja\s*(\d+)/i)
  return match?.[1]
}

function isReadingFresh(utility: Utility, now = new Date()) {
  if (!utility.updated_at) return false
  const updated = new Date(utility.updated_at)
  return updated.getFullYear() === now.getFullYear() && updated.getMonth() === now.getMonth()
}

function shortDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function monthName(now = new Date()) {
  return now.toLocaleDateString("en-US", { month: "long" })
}

function dateOnly(value: string) {
  return new Date(value).toISOString().split("T")[0]
}

function dayIndex(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Date.UTC(year, month - 1, day) / 86400000
}

function periodText(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return "First reading"
  return `${shortDate(`${startDate}T12:00:00`)} - ${shortDate(`${endDate}T12:00:00`)}`
}

function personNightsForPeriod(stays: Stay[], startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return { total: null as number | null, people: "Need previous reading" }
  }

  const start = dayIndex(startDate)
  const end = dayIndex(endDate)
  const entries = stays
    .map(stay => {
      const overlapStart = Math.max(start, dayIndex(stay.from_date))
      const overlapEnd = Math.min(end, dayIndex(stay.to_date))
      return {
        name: stay.guest_name,
        nights: Math.max(0, overlapEnd - overlapStart),
      }
    })
    .filter(entry => entry.nights > 0)

  return {
    total: entries.reduce((sum, entry) => sum + entry.nights, 0),
    people: entries.length === 0
      ? "No stays recorded"
      : entries.map(entry => `${entry.name} ${entry.nights}`).join(", "),
  }
}

export function UtilitiesClient({ utilities, readings, bills, stays }: UtilitiesClientProps) {
  const [activeTab, setActiveTab] = useState("readings")
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null)
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billDialogOpen, setBillDialogOpen] = useState(false)
  const [deleteBill_, setDeleteBill_] = useState<Bill | null>(null)
  const router = useRouter()

  const readingUtilities = useMemo(
    () => utilities.filter(utility => {
      const key = utility.name.toLowerCase()
      if (/^struja\s+\d+$/.test(key)) return false
      return key.includes("water") || key.includes("voda") || key.includes("electric") || key.includes("struja")
    }),
    [utilities],
  )

  const meterOptions = useMemo(
    () => readingUtilities.map(utility => ({ name: utility.name, unit: utility.unit })),
    [readingUtilities],
  )

  const readingRows = useMemo(() => {
    const rows = readings.length > 0
      ? Object.values(readings.reduce<Record<string, {
        id: string
        name: string
        value: number
        unit: string
        date: string
        utility: Utility | null
        parts: Array<{ label: string; value: number }>
      }>>((groups, reading) => {
        const name = meterGroupName(reading.type)
        const date = dateOnly(reading.date)
        const key = `${name}-${date}`
        const meter = utilities.find(utility => utility.name === name)
        const part = electricityPart(reading.type)

        if (!groups[key]) {
          groups[key] = {
            id: key,
            name,
            value: 0,
            unit: meter?.unit ?? "",
            date: reading.date,
            utility: meter ?? null,
            parts: [],
          }
        }

        groups[key].value += Number(reading.value)
        if (part) {
          groups[key].parts.push({ label: part, value: Number(reading.value) })
        }

        return groups
      }, {})).map(row => ({
        ...row,
        displayValue: row.parts.length > 0
          ? row.parts
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(part => `${part.label}: ${part.value}`)
            .join(" / ")
          : String(row.value),
      }))
      : readingUtilities.map(utility => {
        const name = meterGroupName(utility.name)
        return {
          id: utility.id,
          name,
          value: Number(utility.current_usage),
          displayValue: String(Number(utility.current_usage)),
          unit: utility.unit,
          date: utility.updated_at ?? "",
          utility,
        }
      })

    const previousByMeter = new Map<string, string>()
    return [...rows]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(row => {
        const currentDate = row.date ? dateOnly(row.date) : ""
        const previousDate = previousByMeter.get(row.name)
        if (currentDate) previousByMeter.set(row.name, currentDate)
        return { ...row, previousDate, currentDate }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [readings, readingUtilities, utilities])

  const readingsDone = readingUtilities.filter(utility => isReadingFresh(utility)).length
  const unpaidBills = bills.filter(bill => !bill.paid)
  const unpaidTotal = unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0)
  const monthlyReadingDue = readingUtilities.length > 0 && readingsDone < readingUtilities.length

  const refresh = () => router.refresh()

  const handleUpdateUtility = async (utility: Utility, usage: number, readingDate: string, _meterName?: string, details?: { secondaryUsage?: number }) => {
    try {
      await updateUtility(utility.id, {
        name: utility.name,
        currentUsage: usage,
        maxUsage: utility.max_usage,
        cost: utility.cost,
        unit: utility.unit,
        trend: usage > utility.current_usage ? "up" : usage < utility.current_usage ? "down" : "stable",
        readingDate,
        secondaryUsage: details?.secondaryUsage,
      })
      refresh()
    } catch (error) {
      console.error("Failed to update utility:", error)
    }
  }

  const handleSetupReadings = async () => {
    try {
      await createDefaultReadingUtilities()
      refresh()
    } catch (error) {
      console.error("Failed to set up readings:", error)
    }
  }

  const handleAddReading = async (usage: number, readingDate: string, utilityName: string, details?: { secondaryUsage?: number }) => {
    const utility = utilities.find(item => item.name === utilityName)
    if (!utility) return

    try {
      await createUtilityReading({
        type: utility.name,
        value: usage,
        maxValue: utility.max_usage,
        unit: utility.unit,
        readingDate,
        secondaryValue: details?.secondaryUsage,
      })
      refresh()
    } catch (error) {
      console.error("Failed to create utility reading:", error)
    }
  }

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
        dueDate: dueDate.toISOString().split("T")[0],
        paid: false,
        category,
        recurring,
      })
      refresh()
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
    const existing = bills.find(bill => bill.id === id)
    try {
      await updateBill(id, {
        name,
        amount,
        dueDate: dueDate.toISOString().split("T")[0],
        paid: existing?.paid ?? false,
        category,
        recurring,
      })
      refresh()
    } catch (error) {
      console.error("Failed to update bill:", error)
    }
  }

  const handleToggleBill = async (bill: Bill) => {
    try {
      await updateBill(bill.id, {
        name: bill.name,
        amount: bill.amount,
        dueDate: bill.due_date,
        paid: !bill.paid,
        category: bill.category,
        recurring: bill.recurring,
      })
      refresh()
    } catch (error) {
      console.error("Failed to update bill:", error)
    }
  }

  const handleDeleteBill = async () => {
    if (!deleteBill_) return
    try {
      await deleteBill(deleteBill_.id)
      refresh()
    } catch (error) {
      console.error("Failed to delete bill:", error)
    }
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Card className={cn("p-5 shadow-none border-2", monthlyReadingDue ? "border-amber-200 bg-amber-50/40" : "border-green-100 bg-green-50/30")}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">{monthName()} readings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{readingsDone}/{readingUtilities.length || utilities.length}</p>
              <p className="text-xs text-gray-400 mt-1">{monthlyReadingDue ? "Log on the 1st of the month" : "Current month is up to date"}</p>
            </div>
            <CalendarClock className={cn("h-7 w-7", monthlyReadingDue ? "text-amber-500" : "text-green-600")} />
          </div>
        </Card>
        <Card className="p-5 shadow-none border-2 border-blue-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Unpaid bills</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{unpaidBills.length}</p>
              <p className="text-xs text-gray-400 mt-1">{formatMoney(unpaidTotal)} due</p>
            </div>
            <ReceiptText className="h-7 w-7 text-blue-500" />
          </div>
        </Card>
        <Card className="p-5 shadow-none border-2 border-emerald-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Tracked meters</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{readingUtilities.length || utilities.length}</p>
              <p className="text-xs text-gray-400 mt-1">Water and electricity numbers</p>
            </div>
            <Droplets className="h-7 w-7 text-emerald-500" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="readings">Readings</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
          </TabsList>
          {activeTab === "readings" && readingUtilities.length > 0 && (
            <Button onClick={() => setIsReadingDialogOpen(true)} className="cursor-pointer bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" /> New Reading
            </Button>
          )}
          {activeTab === "bills" && bills.length > 0 && (
            <Button onClick={() => { setEditingBill(null); setBillDialogOpen(true) }} className="cursor-pointer bg-blue-500 hover:bg-blue-600">
              <Plus className="h-4 w-4 mr-2" /> New Bill
            </Button>
          )}
        </div>

        <TabsContent value="readings">
          {utilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No utilities yet</p>
              <button
                onClick={handleSetupReadings}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" /> Set Up Readings
              </button>
            </div>
          ) : readingUtilities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No readings yet</p>
              <button
                onClick={handleSetupReadings}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" /> Set Up Readings
              </button>
            </div>
          ) : (
            <Card className="shadow-none border-2 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="px-4">Date</TableHead>
                    <TableHead>Meter</TableHead>
                    <TableHead>Reading</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Stay nights</TableHead>
                    <TableHead>People</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[72px] text-right px-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readingRows.map(row => {
                    const Icon = utilityIcon(row.name)
                    const fresh = row.utility ? isReadingFresh(row.utility) : false
                    const nightSummary = personNightsForPeriod(stays, row.previousDate, row.currentDate)

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="px-4 font-medium text-gray-800">
                          {row.date ? shortDate(row.date) : "No date"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span className="font-medium text-gray-800">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">{row.displayValue}</span>
                          {row.unit && <span className="text-gray-400 ml-1">{row.unit}</span>}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {periodText(row.previousDate, row.currentDate)}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-gray-900">
                            {nightSummary.total === null ? "-" : nightSummary.total}
                          </span>
                          {nightSummary.total !== null && <span className="text-gray-400 ml-1">nights</span>}
                        </TableCell>
                        <TableCell className="text-gray-600 whitespace-normal min-w-[240px]">
                          {nightSummary.people}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", fresh ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700")}>
                            {fresh ? "Logged" : "Due"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer text-gray-400 hover:text-gray-700"
                            onClick={() => row.utility && setEditingUtility(row.utility)}
                            disabled={!row.utility}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bills">
          {bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <p className="text-gray-400 text-base">No bills yet</p>
              <button onClick={() => setBillDialogOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
                <Plus className="h-4 w-4" /> New Bill
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bills.map(bill => (
                <Card key={bill.id} className={cn("p-5 shadow-none border-2 transition-all hover:shadow-md hover:-translate-y-0.5 group", bill.paid ? "bg-green-50/20 border-green-100" : "border-blue-100")}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {bill.paid ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                        <h3 className="font-semibold text-gray-800 truncate">{bill.name}</h3>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Due {shortDate(bill.due_date)}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => handleToggleBill(bill)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> {bill.paid ? "Mark Unpaid" : "Mark Paid"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => { setEditingBill(bill); setBillDialogOpen(true) }}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteBill_(bill)}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-3xl font-bold text-gray-900">{formatMoney(bill.amount)}</span>
                    <Badge className={cn("text-xs", bill.paid ? "bg-green-500/10 text-green-700" : "bg-amber-500/10 text-amber-700")}>
                      {bill.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{bill.category}</span>
                    {bill.recurring && <Badge variant="outline" className="text-xs">Recurring</Badge>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingUtility && (
        <UtilityDialog
          open={!!editingUtility}
          onOpenChange={open => { if (!open) setEditingUtility(null) }}
          onSave={(usage, readingDate) => handleUpdateUtility(editingUtility, usage, readingDate)}
          utilityName={editingUtility.name}
          unit={editingUtility.unit}
          meters={meterOptions}
          initialReadingDate={editingUtility.updated_at ? new Date(editingUtility.updated_at).toISOString().split("T")[0] : undefined}
          stays={stays}
        />
      )}

      <UtilityDialog
        open={isReadingDialogOpen}
        onOpenChange={setIsReadingDialogOpen}
        onSave={handleAddReading}
        meters={meterOptions}
        stays={stays}
      />

      <BillDialog
        open={billDialogOpen}
        onOpenChange={open => { if (!open) { setBillDialogOpen(false); setEditingBill(null) } }}
        onSave={
          editingBill
            ? (name, amount, dueDate, category, recurring) => handleEditBill(editingBill.id, name, amount, dueDate, category, recurring)
            : handleAddBill
        }
        initialName={editingBill?.name}
        initialAmount={editingBill?.amount}
        initialDueDate={editingBill?.due_date ? new Date(editingBill.due_date) : undefined}
        initialCategory={editingBill?.category ?? "utilities"}
        initialRecurring={editingBill?.recurring}
        mode={editingBill ? "edit" : "create"}
      />

      <ConfirmDeleteDialog
        open={!!deleteBill_}
        onOpenChange={open => { if (!open) setDeleteBill_(null) }}
        onConfirm={handleDeleteBill}
        itemName={deleteBill_?.name}
      />
    </div>
  )
}
