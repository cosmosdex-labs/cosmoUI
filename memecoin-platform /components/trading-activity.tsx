"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Activity, RefreshCw } from "lucide-react"

interface TradeActivity {
  id: string
  type: "buy" | "sell"
  amount: string
  price: number
  value: string
  timestamp: number
  user: string
  impact: "high" | "medium" | "low"
}

interface TradingActivityProps {
  tokenSymbol: string
}

// Generate realistic trading activity
const generateTradeActivity = (symbol: string): TradeActivity[] => {
  const activities: TradeActivity[] = []
  const basePrice = 0.000012

  for (let i = 0; i < 20; i++) {
    const timestamp = Date.now() - i * 30000 // 30 seconds apart
    const type = Math.random() > 0.5 ? "buy" : "sell"
    const priceVariation = (Math.random() - 0.5) * 0.1 // ±10% price variation
    const price = basePrice * (1 + priceVariation)

    const amounts = [
      { min: 1000, max: 10000, impact: "low" as const },
      { min: 10000, max: 100000, impact: "medium" as const },
      { min: 100000, max: 1000000, impact: "high" as const },
    ]

    const selectedAmount = amounts[Math.floor(Math.random() * amounts.length)]
    const amount = Math.floor(Math.random() * (selectedAmount.max - selectedAmount.min) + selectedAmount.min)
    const value = (amount * price).toFixed(2)

    activities.push({
      id: `trade_${i}`,
      type,
      amount: amount.toLocaleString(),
      price,
      value: `$${value}`,
      timestamp,
      user: `0x${Math.random().toString(16).substr(2, 8)}...${Math.random().toString(16).substr(2, 4)}`,
      impact: selectedAmount.impact,
    })
  }

  return activities.sort((a, b) => b.timestamp - a.timestamp)
}

export function TradingActivity({ tokenSymbol }: TradingActivityProps) {
  const [activities, setActivities] = useState<TradeActivity[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    setActivities(generateTradeActivity(tokenSymbol))
  }, [tokenSymbol])

  const refreshActivities = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setActivities(generateTradeActivity(tokenSymbol))
      setIsRefreshing(false)
    }, 1000)
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp

    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  const formatPrice = (price: number) => {
    if (price < 0.001) return price.toFixed(8)
    if (price < 1) return price.toFixed(6)
    return price.toFixed(4)
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-orange-500 text-black"
      case "medium":
        return "bg-yellow-500 text-black"
      case "low":
        return "bg-gray-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const buyActivities = activities.filter((a) => a.type === "buy")
  const sellActivities = activities.filter((a) => a.type === "sell")
  const totalBuyVolume = buyActivities.reduce((sum, a) => sum + Number.parseFloat(a.value.replace("$", "")), 0)
  const totalSellVolume = sellActivities.reduce((sum, a) => sum + Number.parseFloat(a.value.replace("$", "")), 0)

  return (
    <div className="space-y-6">
      {/* Activity Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5 text-blue-500" />
              Trading Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refreshActivities} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Buy Pressure</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-xl font-bold text-green-500">${totalBuyVolume.toFixed(0)}</div>
              <div className="text-sm text-gray-400">{buyActivities.length} trades</div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Sell Pressure</span>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-xl font-bold text-red-500">${totalSellVolume.toFixed(0)}</div>
              <div className="text-sm text-gray-400">{sellActivities.length} trades</div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Net Flow</span>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <div
                className={`text-xl font-bold ${totalBuyVolume > totalSellVolume ? "text-green-500" : "text-red-500"}`}
              >
                ${Math.abs(totalBuyVolume - totalSellVolume).toFixed(0)}
              </div>
              <div className="text-sm text-gray-400">{totalBuyVolume > totalSellVolume ? "Bullish" : "Bearish"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Live Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${activity.type === "buy" ? "bg-green-500" : "bg-red-500"}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${activity.type === "buy" ? "text-green-500" : "text-red-500"}`}>
                        {activity.type.toUpperCase()}
                      </span>
                      <span className="text-gray-300">
                        {activity.amount} {tokenSymbol}
                      </span>
                      <Badge className={getImpactColor(activity.impact)}>{activity.impact}</Badge>
                    </div>
                    <div className="text-sm text-gray-400">
                      {activity.user} • {formatTime(activity.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{activity.value}</div>
                  <div className="text-sm text-gray-400">@${formatPrice(activity.price)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
