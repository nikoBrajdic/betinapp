"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Zap, Droplet, Flame, Wifi, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Utility {
  id: string
  name: string
  type: "electricity" | "water" | "gas" | "internet"
  usage: number
  limit: number
  unit: string
  cost: number
  lastReading: Date
  trend: "up" | "down" | "stable"
}

export default function UtilitiesPage() {
  const [utilities, setUtilities] = useState<Utility[]>([
    {
      id: "1",
      name: "Electricity",
      type: "electricity",
      usage: 420,
      limit: 600,
      unit: "kWh",
      cost: 84.5,
      lastReading: new Date("2025-10-25"),
      trend: "up",
    },
    {
      id: "2",
      name: "Water",
      type: "water",
      usage: 8500,
      limit: 15000,
      unit: "gallons",
      cost: 45.2,
      lastReading: new Date("2025-10-24"),
      trend: "down",
    },
    {
      id: "3",
      name: "Natural Gas",
      type: "gas",
      usage: 35,
      limit: 50,
      unit: "therms",
      cost: 28.75,
      lastReading: new Date("2025-10-26"),
      trend: "stable",
    },
    {
      id: "4",
      name: "Internet",
      type: "internet",
      usage: 850,
      limit: 1200,
      unit: "GB",
      cost: 79.99,
      lastReading: new Date("2025-10-26"),
      trend: "up",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddReading = (id: string, usage: number, cost: number) => {
    setUtilities(
      utilities.map((utility) =>
        utility.id === id
          ? {
              ...utility,
              usage,
              cost,
              lastReading: new Date(),
              trend: usage > utility.usage ? "up" : usage < utility.usage ? "down" : "stable",
            }
          : utility,
      ),
    )
  }

  const getIcon = (type: Utility["type"]) => {
    switch (type) {
      case "electricity":
        return Zap
      case "water":
        return Droplet
      case "gas":
        return Flame
      case "internet":
        return Wifi
    }
  }

  const getUsageColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100
    if (percentage >= 90) return "text-red-600 dark:text-red-400"
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400"
    return "text-green-600 dark:text-green-400"
  }

  const getProgressColor = (usage: number, limit: number) => {
    const percentage = (usage / limit) * 100
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-primary"
  }

  const totalCost = utilities.reduce((sum, utility) => sum + utility.cost, 0)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Utilities</h1>
          <p className="text-muted-foreground">Monitor household utility usage and costs</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
          <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {utilities.map((utility) => {
          const Icon = getIcon(utility.type)
          const percentage = (utility.usage / utility.limit) * 100

          return (
            <Card key={utility.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{utility.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last reading:{" "}
                      {utility.lastReading.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {utility.trend === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {utility.trend === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
                  <Badge variant="outline">${utility.cost.toFixed(2)}</Badge>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className={cn("font-semibold", getUsageColor(utility.usage, utility.limit))}>
                    {utility.usage.toLocaleString()} / {utility.limit.toLocaleString()} {utility.unit}
                  </span>
                </div>
                <Progress value={percentage} className={getProgressColor(utility.usage, utility.limit)} />
                <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(1)}% of limit</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full bg-transparent"
                onClick={() => {
                  /* Open update dialog */
                }}
              >
                Update Reading
              </Button>
            </Card>
          )
        })}
      </div>

      {/* Usage History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Usage Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {utilities.map((utility) => {
            const Icon = getIcon(utility.type)
            return (
              <div key={utility.id} className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{utility.name}</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {utility.usage.toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">{utility.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {((utility.usage / utility.limit) * 100).toFixed(0)}% of monthly limit
                </p>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
