"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Wallet, Droplets, BarChart3, ArrowUpDown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const portfolioData = {
  totalValue: "$12,450.75",
  totalChange: "+$1,234.50",
  totalChangePercent: "+11.02%",
  tokens: [
    {
      symbol: "PEPE",
      name: "PepeCoin",
      image: "/placeholder.svg?height=40&width=40",
      balance: "1,000,000",
      value: "$12,000",
      change: "+15.2%",
      price: "$0.000012",
    },
    {
      symbol: "MSHIB",
      name: "MoonShiba",
      image: "/placeholder.svg?height=40&width=40",
      balance: "250,000",
      value: "$22.25",
      change: "+42.7%",
      price: "$0.000089",
    },
    {
      symbol: "DMAX",
      name: "DogeMax",
      image: "/placeholder.svg?height=40&width=40",
      balance: "5,000",
      value: "$22.50",
      change: "-3.1%",
      price: "$0.0045",
    },
  ],
  liquidityPositions: [
    {
      pool: "PEPE/USDC",
      tokenA: { symbol: "PEPE", image: "/placeholder.svg?height=24&width=24" },
      tokenB: { symbol: "USDC", image: "/placeholder.svg?height=24&width=24" },
      value: "$1,250",
      share: "0.12%",
      apr: "45.2%",
      fees24h: "$12.50",
      feesTotal: "$156.75",
    },
    {
      pool: "MSHIB/USDC",
      tokenA: { symbol: "MSHIB", image: "/placeholder.svg?height=24&width=24" },
      tokenB: { symbol: "USDC", image: "/placeholder.svg?height=24&width=24" },
      value: "$2,500",
      share: "0.11%",
      apr: "67.9%",
      fees24h: "$25.75",
      feesTotal: "$289.50",
    },
  ],
  transactions: [
    {
      type: "swap",
      from: "USDC",
      to: "PEPE",
      amount: "500 USDC",
      value: "$500",
      time: "2 hours ago",
      status: "completed",
    },
    {
      type: "add_liquidity",
      pool: "MSHIB/USDC",
      amount: "$1,000",
      value: "$1,000",
      time: "1 day ago",
      status: "completed",
    },
    {
      type: "remove_liquidity",
      pool: "PEPE/USDC",
      amount: "$250",
      value: "$275",
      time: "3 days ago",
      status: "completed",
    },
  ],
}

export default function PortfolioPage() {
  const [timeframe, setTimeframe] = useState("24h")

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Portfolio
          </h1>
          <p className="text-gray-400 text-lg">Track your tokens, liquidity positions, and trading performance</p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800 md:col-span-2">
            <CardContent className="p-4 md:p-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold mb-2">{portfolioData.totalValue}</div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-green-500 font-semibold">{portfolioData.totalChange}</span>
                  <span className="text-green-500 font-semibold">({portfolioData.totalChangePercent})</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-gray-400 text-sm mt-1">Total Portfolio Value</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-500 mb-2">$3,750</div>
              <div className="text-gray-400 text-sm">Liquidity Value</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-500 mb-2">$446.25</div>
              <div className="text-gray-400 text-sm">Total Fees Earned</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger
              value="tokens"
              className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-xs sm:text-sm"
            >
              <Wallet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Tokens</span>
            </TabsTrigger>
            <TabsTrigger
              value="liquidity"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-black text-xs sm:text-sm"
            >
              <Droplets className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Liquidity</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-purple-500 data-[state=active]:text-black text-xs sm:text-sm"
            >
              <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Token Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolioData.tokens.map((token, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors gap-4"
                    >
                      <div className="flex items-center space-x-4">
                        <Image
                          src={token.image || "/placeholder.svg"}
                          alt={token.symbol}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <div className="font-semibold">{token.name}</div>
                          <div className="text-gray-400 text-sm">{token.symbol}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full sm:w-auto">
                        <div className="text-center">
                          <div className="font-semibold">{token.balance}</div>
                          <div className="text-gray-400 text-xs">Balance</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{token.price}</div>
                          <div className="text-gray-400 text-xs">Price</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{token.value}</div>
                          <div
                            className={`text-xs ${token.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                          >
                            {token.change.startsWith("+") ? (
                              <TrendingUp className="inline h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="inline h-3 w-3 mr-1" />
                            )}
                            {token.change}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center sm:justify-end w-full sm:w-auto">
                        <Link href="/swap">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black w-full sm:w-auto">
                            <ArrowUpDown className="h-3 w-3 mr-1" />
                            Trade
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liquidity">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Liquidity Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolioData.liquidityPositions.map((position, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-1">
                            <Image
                              src={position.tokenA.image || "/placeholder.svg"}
                              alt={position.tokenA.symbol}
                              width={24}
                              height={24}
                              className="rounded-full border border-gray-600"
                            />
                            <Image
                              src={position.tokenB.image || "/placeholder.svg"}
                              alt={position.tokenB.symbol}
                              width={24}
                              height={24}
                              className="rounded-full border border-gray-600"
                            />
                          </div>
                          <span className="font-semibold">{position.pool}</span>
                        </div>
                        <Badge className="bg-green-500 text-black">{position.apr} APR</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400">Value</div>
                          <div className="font-semibold">{position.value}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Pool Share</div>
                          <div className="font-semibold">{position.share}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Fees (24h)</div>
                          <div className="font-semibold text-green-500">{position.fees24h}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Total Fees</div>
                          <div className="font-semibold text-green-500">{position.feesTotal}</div>
                        </div>
                      </div>
                      <div className="flex space-x-2 mt-3">
                        <Link href="/liquidity">
                          <Button size="sm" variant="outline" className="border-gray-700 hover:border-green-500">
                            Add More
                          </Button>
                        </Link>
                        <Link href="/liquidity">
                          <Button size="sm" variant="outline" className="border-gray-700 hover:border-red-500">
                            Remove
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portfolioData.transactions.map((tx, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === "swap"
                              ? "bg-blue-500"
                              : tx.type === "add_liquidity"
                                ? "bg-green-500"
                                : "bg-red-500"
                          }`}
                        >
                          {tx.type === "swap" ? (
                            <ArrowUpDown className="h-4 w-4 text-white" />
                          ) : tx.type === "add_liquidity" ? (
                            <Droplets className="h-4 w-4 text-white" />
                          ) : (
                            <Droplets className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">
                            {tx.type === "swap"
                              ? `Swap ${tx.from} → ${tx.to}`
                              : tx.type === "add_liquidity"
                                ? `Add Liquidity to ${tx.pool}`
                                : `Remove Liquidity from ${tx.pool}`}
                          </div>
                          <div className="text-gray-400 text-sm">{tx.amount}</div>
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
        </Tabs>
      </div>
    </div>
  )
}
