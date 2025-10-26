"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Package, Search, Edit, Trash2 } from "lucide-react"
import { UtilityDialog } from "@/components/utility-dialog"
import { cn } from "@/lib/utils"
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/actions/inventory"
import { useRouter } from "next/navigation"

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  location: string
  notes: string
  updated_at: string
}

interface InventoryClientProps {
  items: InventoryItem[]
}

export function InventoryClient({ items }: InventoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const router = useRouter()

  const handleAddItem = async (name: string, category: string, location: string, quantity: number, notes: string) => {
    try {
      await createInventoryItem({
        name,
        category,
        location,
        quantity,
        notes,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to create inventory item:", error)
    }
  }

  const handleEditItem = async (
    id: string,
    name: string,
    category: string,
    location: string,
    quantity: number,
    notes: string
  ) => {
    try {
      await updateInventoryItem(id, {
        name,
        category,
        location,
        quantity,
        notes,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update inventory item:", error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteInventoryItem(id)
      router.refresh()
    } catch (error) {
      console.error("Failed to delete inventory item:", error)
    }
  }

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingItem(null)
  }

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const categories = Array.from(new Set(items.map((item) => item.category)))
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Inventory</h1>
          <p className="text-muted-foreground">Track household items and supplies</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categories</p>
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Unique Items</p>
              <p className="text-2xl font-bold text-foreground">{items.length}</p>
            </div>
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search items, categories, or locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? "No items found" : "No items yet"}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search terms" : "Add your first item to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.location}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    item.quantity < 5 ? "border-red-500 text-red-600" : 
                    item.quantity < 10 ? "border-yellow-500 text-yellow-600" : 
                    "border-green-500 text-green-600"
                  )}>
                    {item.quantity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                </div>
                {item.notes && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm text-foreground">{item.notes}</p>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Updated {new Date(item.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <UtilityDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingItem
            ? (name, category, location, quantity, notes) =>
                handleEditItem(editingItem.id, name, category, location, quantity, notes)
            : handleAddItem
        }
        initialName={editingItem?.name}
        initialCategory={editingItem?.category}
        initialLocation={editingItem?.location}
        initialQuantity={editingItem?.quantity}
        initialNotes={editingItem?.notes}
        mode={editingItem ? "edit" : "create"}
      />
    </div>
  )
}
