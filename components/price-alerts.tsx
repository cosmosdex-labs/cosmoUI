"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Bell, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react"

interface PriceAlert {
  id: string
  type: "above" | "below"
  price: number
  isActive: boolean
  createdAt: number
}

interface PriceAlertsProps {
  tokenSymbol: string
  currentPrice: number
}

export function PriceAlerts({ tokenSymbol, currentPrice }: PriceAlertsProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [newAlertPrice, setNewAlertPrice] = useState("")
  const [newAlertType, setNewAlertType] = useState<"above" | "below">("above")

  const addAlert = () => {
    const price = Number.parseFloat(newAlertPrice)
    if (isNaN(price) || price <= 0) return

    const newAlert: PriceAlert = {
      id: Date.now().toString(),
      type: newAlertType,
      price,
      isActive: true,
      createdAt: Date.now(),
    }

    setAlerts([...alerts, newAlert])
    setNewAlertPrice("")
  }

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id))
  }

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map((alert) => (alert.id === id ? { ...alert, isActive: !alert.isActive } : alert)))
  }

  const formatPrice = (price: number) => {
    if (price < 0.001) return price.toFixed(8)
    if (price < 1) return price.toFixed(6)
    return price.toFixed(4)
  }

  const getAlertStatus = (alert: PriceAlert) => {
    if (!alert.isActive) return "inactive"

    if (alert.type === "above" && currentPrice >= alert.price) return "triggered"
    if (alert.type === "below" && currentPrice <= alert.price) return "triggered"

    return "active"
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-5 w-5 text-yellow-500" />
          Price Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Alert */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Alert price"
                value={newAlertPrice}
                onChange={(e) => setNewAlertPrice(e.target.value)}
                type="number"
                step="any"
                className="bg-gray-700 border-gray-600"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={newAlertType === "above" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewAlertType("above")}
                className={newAlertType === "above" ? "bg-green-500 text-black" : "border-gray-600"}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Above
              </Button>
              <Button
                variant={newAlertType === "below" ? "default" : "outline"}
                size="sm"
                onClick={() => setNewAlertType("below")}
                className={newAlertType === "below" ? "bg-red-500 text-white" : "border-gray-600"}
              >
                <TrendingDown className="h-3 w-3 mr-1" />
                Below
              </Button>
            </div>
            <Button onClick={addAlert} className="bg-blue-500 hover:bg-blue-600">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-gray-400 mt-2">Current price: ${formatPrice(currentPrice)}</div>
        </div>

        {/* Active Alerts */}
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No price alerts set</p>
              <p className="text-sm">Add an alert to get notified of price movements</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const status = getAlertStatus(alert)
              return (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {alert.type === "above" ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-semibold">${formatPrice(alert.price)}</span>
                    </div>
                    <Badge
                      className={
                        status === "triggered"
                          ? "bg-yellow-500 text-black"
                          : status === "active"
                            ? "bg-green-500 text-black"
                            : "bg-gray-500 text-white"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleAlert(alert.id)}>
                      {alert.isActive ? "Pause" : "Resume"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => removeAlert(alert.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
