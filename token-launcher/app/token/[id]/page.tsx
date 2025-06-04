"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, ExternalLink, Copy, BarChart3, Users, Droplets, ArrowUpDown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { CandlestickChart } from "@/components/candlestick-chart"
import { TradingActivity } from "@/components/trading-activity"
import { PriceAlerts } from "@/components/price-alerts"

// Mock token data - in real app, this would be fetched based on the ID
const tokenData = {
  id: 1,
  name: "PepeCoin",
  symbol: "PEPE",
  image: "/placeholder.svg?height=80&width=80",
  price: "$0.000012",
  change24h: "+15.2%",
  marketCap: "$1.2M",
  volume24h: "$245K",
  liquidity: "$89K",
  holders: "15,234",
  description:
    "The ultimate meme token inspired by the legendary Pepe the Frog. Join the community and ride the green wave to the moon! 🐸🚀",
  contract: "0x1234...5678",
  website: "https://pepecoin.meme",
  twitter: "https://twitter.com/pepecoin",
  telegram: "https://t.me/pepecoin",
  totalSupply: "1,000,000,000",
  circulatingSupply: "800,000,000",
  maxSupply: "1,000,000,000",
}

const priceHistory = [
  { time: "00:00", price: 0.00001 },
  { time: "04:00", price: 0.000011 },
  { time: "08:00", price: 0.000009 },
  { time: "12:00", price: 0.000012 },
  { time: "16:00", price: 0.000013 },
  { time: "20:00", price: 0.000012 },
]

const transactions = [
  { type: "buy", amount: "100,000 PEPE", value: "$1.20", time: "2m ago", user: "0x1234...5678" },
  { type: "sell", amount: "50,000 PEPE", value: "$0.60", time: "5m ago", user: "0x9876...4321" },
  { type: "buy", amount: "250,000 PEPE", value: "$3.00", time: "8m ago", user: "0x5555...1111" },
]

export default function TokenPage() {
  const [timeframe, setTimeframe] = useState("24h")

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Token Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <Image
              src={tokenData.image || "/placeholder.svg"}
              alt={tokenData.name}
              width={60}
              height={60}
              className="rounded-full"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{tokenData.name}</h1>
              <div className="flex items-center space-x-2 flex-wrap">
                <span className="text-gray-400">{tokenData.symbol}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(tokenData.contract)}
                  className="text-gray-400 hover:text-white"
                >
                  <span className="hidden sm:inline">{tokenData.contract}</span>
                  <span className="inline sm:hidden">Copy</span>
                  <Copy className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex space-x-3 w-full md:w-auto">
            <Link href="/swap" className="flex-1 md:flex-none">
              <Button className="bg-green-500 hover:bg-green-600 text-black w-full">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Trade
              </Button>
            </Link>
            <Link href="/liquidity" className="flex-1 md:flex-none">
              <Button
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black w-full"
              >
                <Droplets className="mr-2 h-4 w-4" />
                Add Liquidity
              </Button>
            </Link>
          </div>
        </div>

        {/* Price and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800 md:col-span-2">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl md:text-3xl font-bold mb-2">{tokenData.price}</div>
                  <div
                    className={`flex items-center space-x-2 ${tokenData.change24h.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                  >
                    {tokenData.change24h.startsWith("+") ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold">{tokenData.change24h}</span>
                    <span className="text-gray-400">24h</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400 mb-1">Market Cap</div>
                  <div className="text-lg md:text-xl font-semibold">{tokenData.marketCap}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-500 mb-2">{tokenData.volume24h}</div>
              <div className="text-gray-400 text-sm">24h Volume</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xl md:text-2xl font-bold text-purple-500 mb-2">{tokenData.liquidity}</div>
              <div className="text-gray-400 text-sm">Liquidity</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart Section */}
            <div className="space-y-6">
              <CandlestickChart tokenSymbol={tokenData.symbol} timeframe={timeframe} onTimeframeChange={setTimeframe} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TradingActivity tokenSymbol={tokenData.symbol} />
                <PriceAlerts
                  tokenSymbol={tokenData.symbol}
                  currentPrice={Number.parseFloat(tokenData.price.replace("$", ""))}
                />
              </div>
            </div>

            {/* Token Info */}
            <Tabs defaultValue="about" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="trades">Recent Trades</TabsTrigger>
                <TabsTrigger value="holders">Holders</TabsTrigger>
              </TabsList>

              <TabsContent value="about">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>About {tokenData.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300">{tokenData.description}</p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Total Supply</div>
                        <div className="font-semibold">{tokenData.totalSupply}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Circulating Supply</div>
                        <div className="font-semibold">{tokenData.circulatingSupply}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Max Supply</div>
                        <div className="font-semibold">{tokenData.maxSupply}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Holders</div>
                        <div className="font-semibold">{tokenData.holders}</div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <Button variant="outline" size="sm" className="border-gray-700">
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Website
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-700">
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Twitter
                      </Button>
                      <Button variant="outline" size="sm" className="border-gray-700">
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Telegram
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trades">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Recent Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transactions.map((tx, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-2 h-2 rounded-full ${tx.type === "buy" ? "bg-green-500" : "bg-red-500"}`}
                            ></div>
                            <div>
                              <div className="font-semibold">{tx.amount}</div>
                              <div className="text-gray-400 text-sm">{tx.user}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{tx.value}</div>
                            <div className="text-gray-400 text-sm">{tx.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="holders">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Top Holders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">Holder analytics coming soon</p>
                      <p className="text-gray-500 text-sm">Distribution and whale tracking</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Token Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Rank</span>
                  <span className="font-semibold">#42</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">All-time High</span>
                  <span className="font-semibold">$0.000015</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">All-time Low</span>
                  <span className="font-semibold">$0.000001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Launch Date</span>
                  <span className="font-semibold">Dec 15, 2024</span>
                </div>
              </CardContent>
            </Card>

            {/* Trading Actions */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/swap">
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-black">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Swap PEPE
                  </Button>
                </Link>
                <Link href="/liquidity">
                  <Button
                    variant="outline"
                    className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black"
                  >
                    <Droplets className="mr-2 h-4 w-4" />
                    Add Liquidity
                  </Button>
                </Link>
                <Button variant="outline" className="w-full border-gray-700">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
              </CardContent>
            </Card>

            {/* Similar Tokens */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Similar Tokens</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { symbol: "DMAX", name: "DogeMax", change: "-3.1%" },
                    { symbol: "MSHIB", name: "MoonShiba", change: "+42.7%" },
                    { symbol: "FMAX", name: "FlokiMax", change: "+67.8%" },
                  ].map((token, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{token.symbol}</div>
                        <div className="text-gray-400 text-sm">{token.name}</div>
                      </div>
                      <div
                        className={`font-semibold ${token.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                      >
                        {token.change}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
