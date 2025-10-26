"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  location: string
  lastUpdated: Date
}

export default function TablesPage() {
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: "1",
      name: "Paper Towels",
      category: "Cleaning",
      quantity: 12,
      location: "Pantry",
      lastUpdated: new Date("2025-10-20"),
    },
    {
      id: "2",
      name: "Laundry Detergent",
      category: "Cleaning",
      quantity: 2,
      location: "Laundry Room",
      lastUpdated: new Date("2025-10-22"),
    },
    {
      id: "3",
      name: "Light Bulbs (LED)",
      category: "Hardware",
      quantity: 8,
      location: "Garage",
      lastUpdated: new Date("2025-10-15"),
    },
    {
      id: "4",
      name: "Batteries (AA)",
      category: "Electronics",
      quantity: 24,
      location: "Kitchen Drawer",
      lastUpdated: new Date("2025-10-18"),
    },
    {
      id: "5",
      name: "Trash Bags",
      category: "Cleaning",
      quantity: 30,
      location: "Under Sink",
      lastUpdated: new Date("2025-10-25"),
    },
  ])

  const [searchQuery, setSearchQuery] = useState("")

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Household Inventory</h1>
          <p className="text-muted-foreground">Track household items and supplies</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Items</h3>
          <p className="text-2xl font-bold text-foreground">{totalItems}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Categories</h3>
          <p className="text-2xl font-bold text-foreground">{categories.length}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Unique Products</h3>
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items, categories, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Item Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Quantity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Location</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Updated</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-medium text-foreground">{item.name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className="text-xs">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-foreground">{item.quantity}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-muted-foreground text-sm">{item.location}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-muted-foreground text-sm">
                      {item.lastUpdated.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No items found matching your search</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
