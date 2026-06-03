"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, TrendingUp, TrendingDown, Minus, Edit } from "lucide-react"
import { UtilityDialog } from "@/components/utility-dialog"
import { cn } from "@/lib/utils"
import { updateUtility } from "@/lib/actions/utilities"
import { useRouter } from "next/navigation"
import { formatMoney } from "@/lib/currency"

interface Utility {
  id: string
  name: string
  current_usage: number
  max_usage: number
  cost: number
  unit: string
  trend: "up" | "down" | "stable"
}

interface UtilitiesClientProps {
  utilities: Utility[]
}

export function UtilitiesClient({ utilities }: UtilitiesClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const handler = () => setIsDialogOpen(true)
    window.addEventListener("topbar:new", handler)
    return () => window.removeEventListener("topbar:new", handler)
  }, [])
  const [editingUtility, setEditingUtility] = useState<Utility | null>(null)
  const router = useRouter()

  const handleUpdateUtility = async (
    id: string,
    name: string,
    currentUsage: number,
    maxUsage: number,
    cost: number,
    unit: string,
    trend: Utility["trend"],
  ) => {
    try {
      await updateUtility(id, {
        name,
        currentUsage,
        maxUsage,
        cost,
        unit,
        trend,
      })
      router.refresh()
    } catch (error) {
      console.error("Failed to update utility:", error)
    }
  }

  const openEditDialog = (utility: Utility) => {
    setEditingUtility(utility)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingUtility(null)
  }

  const getTrendIcon = (trend: Utility["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-600" />
      case "stable":
        return <Minus className="h-4 w-4 text-blue-600" />
    }
  }

  const getTrendColor = (trend: Utility["trend"]) => {
    switch (trend) {
      case "up":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "down":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "stable":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
    }
  }

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const totalCost = utilities.reduce((sum, utility) => sum + utility.cost, 0)
  const totalUsage = utilities.reduce((sum, utility) => sum + utility.current_usage, 0)
  const totalMaxUsage = utilities.reduce((sum, utility) => sum + utility.max_usage, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-muted-foreground">Monitor household utility usage and costs</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
              <p className="text-2xl font-bold text-foreground">{formatMoney(totalCost)}</p>
            </div>
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Usage</p>
              <p className="text-2xl font-bold text-foreground">{totalUsage.toFixed(1)}</p>
            </div>
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usage %</p>
              <p className="text-2xl font-bold text-foreground">
                {totalMaxUsage > 0 ? ((totalUsage / totalMaxUsage) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {utilities.length === 0 ? (
        <Card className="p-12 text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No utilities yet</h3>
          <p className="text-muted-foreground mb-4">Add your first utility to get started</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {utilities.map((utility) => {
            const usagePercentage = getUsagePercentage(utility.current_usage, utility.max_usage)
            
            return (
              <Card key={utility.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">{utility.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {utility.current_usage} / {utility.max_usage} {utility.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(utility.trend)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(utility)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Usage</span>
                      <span className="text-sm font-medium">{usagePercentage.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={usagePercentage} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cost</span>
                    <span className="text-sm font-medium">{formatMoney(utility.cost)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Trend</span>
                    <Badge className={cn("text-xs", getTrendColor(utility.trend))}>
                      {utility.trend}
                    </Badge>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Updated {new Date(utility.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <UtilityDialog
        open={isDialogOpen}
        onOpenChange={closeDialog}
        onSave={
          editingUtility
            ? (name, currentUsage, maxUsage, cost, unit, trend) =>
                handleUpdateUtility(editingUtility.id, name, currentUsage, maxUsage, cost, unit, trend)
            : () => {} // Utilities are read-only for now
        }
        initialName={editingUtility?.name}
        initialCurrentUsage={editingUtility?.current_usage}
        initialMaxUsage={editingUtility?.max_usage}
        initialCost={editingUtility?.cost}
        initialUnit={editingUtility?.unit}
        initialTrend={editingUtility?.trend}
        mode={editingUtility ? "edit" : "create"}
      />
    </div>
  )
}
