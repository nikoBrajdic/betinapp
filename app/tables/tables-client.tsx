"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { TableDialog } from "@/components/table-dialog"
import { createTable, updateTable, deleteTable } from "@/lib/actions/tables"
import { useRouter } from "next/navigation"

interface TableItem {
  id: string
  name: string
  capacity: number
  location: string
  status: "available" | "occupied" | "reserved"
  notes: string
  updated_at: string
}

interface TablesClientProps {
  tables: TableItem[]
}

export function TablesClient({ tables }: TablesClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const handler = () => setIsDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])
  const [editingTable, setEditingTable] = useState<TableItem | null>(null)
  const router = useRouter()

  const filteredTables = tables.filter(
    (table) =>
      table.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.status.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status: TableItem["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "occupied":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "reserved":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
    }
  }

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0)
  const availableTables = tables.filter(table => table.status === "available").length
  const occupiedTables = tables.filter(table => table.status === "occupied").length

  const handleAddTable = () => {
    setEditingTable(null)
    setIsDialogOpen(true)
  }

  const handleEditTable = (table: TableItem) => {
    setEditingTable(table)
    setIsDialogOpen(true)
  }

  const handleSaveTable = async (tableData: Omit<TableItem, "id" | "updated_at">) => {
    try {
      if (editingTable) {
        // Update existing table
        await updateTable(editingTable.id, tableData)
      } else {
        // Add new table
        await createTable(tableData)
      }
      router.refresh()
    } catch (error) {
      console.error("Failed to save table:", error)
    }
  }

  const handleDeleteTable = async (id: string) => {
    if (confirm("Are you sure you want to delete this table?")) {
      try {
        await deleteTable(id)
        router.refresh()
      } catch (error) {
        console.error("Failed to delete table:", error)
      }
    }
  }

  return (
    <div className="p-8">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tables</p>
              <p className="text-2xl font-bold text-foreground">{tables.length}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Capacity</p>
              <p className="text-2xl font-bold text-foreground">{totalCapacity}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-foreground">{availableTables}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Occupied</p>
              <p className="text-2xl font-bold text-foreground">{occupiedTables}</p>
            </div>
            <Users className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tables, locations, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredTables.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? "No tables found" : "No tables yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search terms" : "Add your first table to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddTable}>
              <Plus className="h-4 w-4 mr-2" />
              Add Table
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.location}</TableCell>
                  <TableCell>{table.capacity}</TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getStatusColor(table.status))}>
                      {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{table.notes || "-"}</TableCell>
                  <TableCell>
                    {new Date(table.updated_at).toLocaleDateString("en-US", { 
                      month: "short", 
                      day: "numeric",
                      year: "numeric"
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditTable(table)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTable(table.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TableDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        table={editingTable}
        onSave={handleSaveTable}
      />
    </div>
  )
}
