"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  DollarSign, 
  Calendar, 
  Home, 
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/currency"

interface Bill {
  id: string
  name: string
  amount: number
  due_date: string
  paid: boolean
  created_at: string
}

interface GuestStay {
  id: string
  guest_name: string
  from_date: string
  to_date: string
  notes: string
}

interface Event {
  id: string
  title: string
  start_date: string
  end_date: string | null
  category: string
}

interface ProfileClientProps {
  user: any
  profile: any
  bills: Bill[]
  guestStays: GuestStay[]
  events: Event[]
}

export function ProfileClient({ user, profile, bills, guestStays, events }: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState("overview")

  // Calculate outstanding debts
  const calculateOutstandingDebts = () => {
    const unpaidBills = bills.filter(bill => !bill.paid)
    const totalOutstanding = unpaidBills.reduce((sum, bill) => sum + bill.amount, 0)
    
    return {
      unpaidBills,
      totalOutstanding,
      count: unpaidBills.length
    }
  }

  const { unpaidBills, totalOutstanding, count } = calculateOutstandingDebts()

  // Calculate user's share of bills based on stay duration
  const calculateUserShare = () => {
    const userShares: Array<{
      bill: Bill
      share: number
      reason: string
    }> = []

    unpaidBills.forEach(bill => {
      // For now, assume equal sharing among all users
      // In a real implementation, this would calculate based on:
      // - Recurring expenses: equal share among regulars
      // - Metered expenses: proportional to stay duration
      // - Guest participation: based on guest stays during bill period
      
      const share = bill.amount / 4 // Assuming 4 regular users
      userShares.push({
        bill,
        share,
        reason: "Equal share among household members"
      })
    })

    return userShares
  }

  const userShares = calculateUserShare()
  const totalUserDebt = userShares.reduce((sum, share) => sum + share.share, 0)

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User"
  const role = profile?.role === "superadmin" ? "Super Admin" : "Admin"

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Manage your profile and view outstanding debts</p>
        </div>
      </div>

      {/* Outstanding Debts Banner */}
      {totalUserDebt > 0 && (
        <Alert className="mb-8 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Outstanding Debt:</strong> You owe {formatMoney(totalUserDebt)} across {userShares.length} unpaid bills.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="debts">You Owe</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Information */}
            <Card className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
                  <p className="text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="mt-1">
                    {role}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {new Date(user.created_at).toLocaleDateString("en-US", { 
                      month: "long", 
                      year: "numeric" 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                    Active
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Outstanding Debt</span>
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    totalUserDebt > 0 ? "text-orange-600" : "text-green-600"
                  )}>
                    {formatMoney(totalUserDebt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Unpaid Bills</span>
                  </div>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Guest Stays</span>
                  </div>
                  <span className="text-sm font-medium">{guestStays.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="debts" className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Outstanding Debts</h3>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Total: {formatMoney(totalUserDebt)}
              </Badge>
            </div>

            {userShares.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">All caught up!</h4>
                <p className="text-muted-foreground">You have no outstanding debts.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userShares.map((share) => (
                  <div key={share.bill.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{share.bill.name}</h4>
                      <p className="text-sm text-muted-foreground">{share.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {new Date(share.bill.due_date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-orange-600">
                        {formatMoney(share.share)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {formatMoney(share.bill.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Bills */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Bills</h3>
              <div className="space-y-3">
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(bill.due_date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric" 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatMoney(bill.amount)}</p>
                      <Badge 
                        className={cn(
                          "text-xs",
                          bill.paid 
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-orange-500/10 text-orange-700 dark:text-orange-400"
                        )}
                      >
                        {bill.paid ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Guest Stays */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Guest Stays</h3>
              <div className="space-y-3">
                {guestStays.slice(0, 5).map((stay) => (
                  <div key={stay.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{stay.guest_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(stay.from_date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric" 
                        })} - {new Date(stay.to_date).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric" 
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stay.notes || "No notes"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
