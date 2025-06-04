"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Zap } from "lucide-react"
import Image from "next/image"
import { CandlestickChart } from "@/components/candlestick-chart"

const analyticsData = {
  overview: {
    totalVolume: "$45.2M",
    totalTVL: "$12.4M",
    totalTrades: "156,789",
    activeUsers: "8,934",
    volumeChange: "+23.5%",
    tvlChange: "+12.8%",
    tradesChange: "+45.2%",
    usersChange: "+18.9%",
  },
  topTokens: [
    {
      rank: 1,
      symbol: "PEPE",
      name: "PepeCoin",
      image: "/pepe-logo.svg",
      price: "$0.000012",
      change: "+15.2%",
      volume: "$2.4M",
      marketCap: "$12.5M",
      holders: "15,234",
    },
    {
      rank: 2,
      symbol: "MSHIB",
      name: "MoonShiba",
      image: "/placeholder.svg?height=32&width=32",
      price: "$0.000089",
      change: "+42.7%",
      volume: "$1.8M",
      marketCap: "$8.9M",
      holders: "12,456",
    },
    {
      rank: 3,
      symbol: "FMAX",
      name: "FlokiMax",
      image: "/placeholder.svg?height=32&width=32",
      price: "$0.000234",
      change: "+67.8%",
      volume: "$1.2M",
      marketCap: "$6.7M",
      holders: "9,876",
    },
  ],
  topPools: [
    {
      rank: 1,
      pool: "PEPE/USDC",
      tvl: "$2.1M",
      volume24h: "$456K",
      apr: "45.2%",
      fees24h: "$1.37K",
    },
    {
      rank: 2,
      pool: "MSHIB/USDC",
      tvl: "$1.8M",
      volume24h: "$234K",
      apr: "67.9%",
      fees24h: "$702",
    },
    {
      rank: 3,
      pool: "FMAX/USDT",
      tvl: "$1.2M",
      volume24h: "$189K",
      apr: "52.3%",
      fees24h: "$567",
    },
  ],
}

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState("24h")

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Analytics
            </h1>
            <p className="text-gray-400 text-lg">Platform statistics and market insights</p>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32 bg-gray-900 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="24h">24h</SelectItem>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-6 w-6 text-green-500 mr-2" />
                <div className="text-2xl font-bold">{analyticsData.overview.totalVolume}</div>
              </div>
              <div className="text-gray-400 text-sm mb-1">Total Volume</div>
              <div className="text-green-500 text-sm font-semibold">{analyticsData.overview.volumeChange}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="h-6 w-6 text-blue-500 mr-2" />
                <div className="text-2xl font-bold">{analyticsData.overview.totalTVL}</div>
              </div>
              <div className="text-gray-400 text-sm mb-1">Total TVL</div>
              <div className="text-green-500 text-sm font-semibold">{analyticsData.overview.tvlChange}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-purple-500 mr-2" />
                <div className="text-2xl font-bold">{analyticsData.overview.totalTrades}</div>
              </div>
              <div className="text-gray-400 text-sm mb-1">Total Trades</div>
              <div className="text-green-500 text-sm font-semibold">{analyticsData.overview.tradesChange}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-orange-500 mr-2" />
                <div className="text-2xl font-bold">{analyticsData.overview.activeUsers}</div>
              </div>
              <div className="text-gray-400 text-sm mb-1">Active Users</div>
              <div className="text-green-500 text-sm font-semibold">{analyticsData.overview.usersChange}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900">
            <TabsTrigger value="tokens" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
              Top Tokens
            </TabsTrigger>
            <TabsTrigger value="pools" className="data-[state=active]:bg-blue-500 data-[state=active]:text-black">
              Top Pools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Top Performing Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left py-3 px-4">#</th>
                          <th className="text-left py-3 px-4">Token</th>
                          <th className="text-left py-3 px-4">Price</th>
                          <th className="text-left py-3 px-4">24h Change</th>
                          <th className="text-left py-3 px-4 hidden md:table-cell">Volume</th>
                          <th className="text-left py-3 px-4 hidden sm:table-cell">Market Cap</th>
                          <th className="text-left py-3 px-4 hidden lg:table-cell">Holders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsData.topTokens.map((token) => (
                          <tr key={token.rank} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-4 font-semibold">{token.rank}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <Image
                                  src={token.image || "/placeholder.svg"}
                                  alt={token.symbol}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                  priority={token.rank === 1}
                                />
                                <div>
                                  <div className="font-semibold">{token.name}</div>
                                  <div className="text-gray-400 text-sm">{token.symbol}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold">{token.price}</td>
                            <td className="py-3 px-4">
                              <div
                                className={`flex items-center ${token.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                              >
                                {token.change.startsWith("+") ? (
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {token.change}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold hidden md:table-cell">{token.volume}</td>
                            <td className="py-3 px-4 font-semibold hidden sm:table-cell">{token.marketCap}</td>
                            <td className="py-3 px-4 hidden lg:table-cell">{token.holders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pools">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Top Liquidity Pools</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left py-3 px-4">#</th>
                        <th className="text-left py-3 px-4">Pool</th>
                        <th className="text-left py-3 px-4">TVL</th>
                        <th className="text-left py-3 px-4">24h Volume</th>
                        <th className="text-left py-3 px-4">APR</th>
                        <th className="text-left py-3 px-4">24h Fees</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.topPools.map((pool) => (
                        <tr key={pool.rank} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4 font-semibold">{pool.rank}</td>
                          <td className="py-3 px-4 font-semibold">{pool.pool}</td>
                          <td className="py-3 px-4 font-semibold">{pool.tvl}</td>
                          <td className="py-3 px-4">{pool.volume24h}</td>
                          <td className="py-3 px-4">
                            <Badge className="bg-green-500 text-black">{pool.apr}</Badge>
                          </td>
                          <td className="py-3 px-4 text-green-500 font-semibold">{pool.fees24h}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Market Overview Chart */}
        <div className="mb-8">
          <CandlestickChart tokenSymbol="MARKET" timeframe="1d" onTimeframeChange={() => {}} />
        </div>

        {/* Chart Placeholder */}
        <Card className="bg-gray-900 border-gray-800 mt-8">
          <CardHeader>
            <CardTitle>Platform Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Interactive charts coming soon</p>
                <p className="text-gray-500 text-sm">Volume, TVL, and trading activity over time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
