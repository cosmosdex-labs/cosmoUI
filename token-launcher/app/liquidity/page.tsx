"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Droplets, Plus, Minus, TrendingUp, DollarSign } from "lucide-react"
import Image from "next/image"

const liquidityPools = [
  {
    id: 1,
    tokenA: { symbol: "PEPE", name: "PepeCoin", image: "/placeholder.svg?height=32&width=32" },
    tokenB: { symbol: "USDC", name: "USD Coin", image: "/placeholder.svg?height=32&width=32" },
    tvl: "$1,234,567",
    apr: "45.2%",
    volume24h: "$234,567",
    myLiquidity: "$1,250",
    myShare: "0.12%",
    fees24h: "$12.50",
  },
  {
    id: 2,
    tokenA: { symbol: "DMAX", name: "DogeMax", image: "/placeholder.svg?height=32&width=32" },
    tokenB: { symbol: "USDT", name: "Tether USD", image: "/placeholder.svg?height=32&width=32" },
    tvl: "$567,890",
    apr: "32.8%",
    volume24h: "$89,123",
    myLiquidity: "$0",
    myShare: "0%",
    fees24h: "$0",
  },
  {
    id: 3,
    tokenA: { symbol: "MSHIB", name: "MoonShiba", image: "/placeholder.svg?height=32&width=32" },
    tokenB: { symbol: "USDC", name: "USD Coin", image: "/placeholder.svg?height=32&width=32" },
    tvl: "$2,345,678",
    apr: "67.9%",
    volume24h: "$456,789",
    myLiquidity: "$2,500",
    myShare: "0.11%",
    fees24h: "$25.75",
  },
]

export default function LiquidityPage() {
  const [selectedPool, setSelectedPool] = useState(liquidityPools[0])
  const [tokenAAmount, setTokenAAmount] = useState("")
  const [tokenBAmount, setTokenBAmount] = useState("")
  const [removePercentage, setRemovePercentage] = useState(25)

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Liquidity Pools
          </h1>
          <p className="text-gray-400 text-lg">Provide liquidity to earn fees from trades</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pool Management */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="add" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 bg-gray-900">
                <TabsTrigger value="add" className="data-[state=active]:bg-green-500 data-[state=active]:text-black">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Liquidity
                </TabsTrigger>
                <TabsTrigger value="remove" className="data-[state=active]:bg-red-500 data-[state=active]:text-black">
                  <Minus className="mr-2 h-4 w-4" />
                  Remove Liquidity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="add">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Add Liquidity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pool Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Pool</label>
                      <Select
                        value={selectedPool.id.toString()}
                        onValueChange={(value) =>
                          setSelectedPool(liquidityPools.find((p) => p.id.toString() === value) || liquidityPools[0])
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {liquidityPools.map((pool) => (
                            <SelectItem key={pool.id} value={pool.id.toString()}>
                              <div className="flex items-center space-x-2">
                                <div className="flex -space-x-1">
                                  <Image
                                    src={pool.tokenA.image || "/placeholder.svg"}
                                    alt={pool.tokenA.symbol}
                                    width={20}
                                    height={20}
                                    className="rounded-full border border-gray-600"
                                  />
                                  <Image
                                    src={pool.tokenB.image || "/placeholder.svg"}
                                    alt={pool.tokenB.symbol}
                                    width={20}
                                    height={20}
                                    className="rounded-full border border-gray-600"
                                  />
                                </div>
                                <span>
                                  {pool.tokenA.symbol}/{pool.tokenB.symbol}
                                </span>
                                <Badge variant="secondary" className="bg-green-500 text-black text-xs">
                                  {pool.apr} APR
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Token A Input */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">{selectedPool.tokenA.symbol}</span>
                        <span className="text-sm text-gray-400">Balance: 1,000,000</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Input
                          placeholder="0.0"
                          value={tokenAAmount}
                          onChange={(e) => setTokenAAmount(e.target.value)}
                          className="bg-transparent border-none text-xl font-semibold p-0 h-auto"
                        />
                        <div className="flex items-center space-x-2">
                          <Image
                            src={selectedPool.tokenA.image || "/placeholder.svg"}
                            alt={selectedPool.tokenA.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <span className="font-semibold">{selectedPool.tokenA.symbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Token B Input */}
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-400">{selectedPool.tokenB.symbol}</span>
                        <span className="text-sm text-gray-400">Balance: 1,234.56</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Input
                          placeholder="0.0"
                          value={tokenBAmount}
                          onChange={(e) => setTokenBAmount(e.target.value)}
                          className="bg-transparent border-none text-xl font-semibold p-0 h-auto"
                        />
                        <div className="flex items-center space-x-2">
                          <Image
                            src={selectedPool.tokenB.image || "/placeholder.svg"}
                            alt={selectedPool.tokenB.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <span className="font-semibold">{selectedPool.tokenB.symbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pool Info */}
                    <div className="bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pool Share</span>
                        <span>0.05%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current APR</span>
                        <span className="text-green-500">{selectedPool.apr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">LP Tokens</span>
                        <span>~1,234.56</span>
                      </div>
                    </div>

                    <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Liquidity
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="remove">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Remove Liquidity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pool Selection */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Select Pool</label>
                      <Select
                        value={selectedPool.id.toString()}
                        onValueChange={(value) =>
                          setSelectedPool(liquidityPools.find((p) => p.id.toString() === value) || liquidityPools[0])
                        }
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {liquidityPools
                            .filter((pool) => pool.myLiquidity !== "$0")
                            .map((pool) => (
                              <SelectItem key={pool.id} value={pool.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <div className="flex -space-x-1">
                                    <Image
                                      src={pool.tokenA.image || "/placeholder.svg"}
                                      alt={pool.tokenA.symbol}
                                      width={20}
                                      height={20}
                                      className="rounded-full border border-gray-600"
                                    />
                                    <Image
                                      src={pool.tokenB.image || "/placeholder.svg"}
                                      alt={pool.tokenB.symbol}
                                      width={20}
                                      height={20}
                                      className="rounded-full border border-gray-600"
                                    />
                                  </div>
                                  <span>
                                    {pool.tokenA.symbol}/{pool.tokenB.symbol}
                                  </span>
                                  <span className="text-sm text-gray-400">({pool.myLiquidity})</span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove Percentage */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-medium">Amount to Remove</span>
                        <span className="text-lg font-bold">{removePercentage}%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[25, 50, 75, 100].map((percentage) => (
                          <Button
                            key={percentage}
                            variant={removePercentage === percentage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setRemovePercentage(percentage)}
                            className={
                              removePercentage === percentage
                                ? "bg-red-500 hover:bg-red-600 text-white"
                                : "border-gray-700"
                            }
                          >
                            {percentage}%
                          </Button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={removePercentage}
                        onChange={(e) => setRemovePercentage(Number.parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Removal Preview */}
                    <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                      <h4 className="font-semibold">You will receive:</h4>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Image
                            src={selectedPool.tokenA.image || "/placeholder.svg"}
                            alt={selectedPool.tokenA.symbol}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                          <span>{selectedPool.tokenA.symbol}</span>
                        </div>
                        <span className="font-semibold">12,500</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Image
                            src={selectedPool.tokenB.image || "/placeholder.svg"}
                            alt={selectedPool.tokenB.symbol}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                          <span>{selectedPool.tokenB.symbol}</span>
                        </div>
                        <span className="font-semibold">312.50</span>
                      </div>
                    </div>

                    <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3">
                      <Minus className="mr-2 h-4 w-4" />
                      Remove Liquidity
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Pool Stats */}
          <div className="space-y-6">
            {/* My Positions */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Droplets className="mr-2 h-4 w-4 text-blue-500" />
                  My Positions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liquidityPools
                    .filter((pool) => pool.myLiquidity !== "$0")
                    .map((pool) => (
                      <div key={pool.id} className="bg-gray-800 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="flex -space-x-1">
                              <Image
                                src={pool.tokenA.image || "/placeholder.svg"}
                                alt={pool.tokenA.symbol}
                                width={16}
                                height={16}
                                className="rounded-full border border-gray-600"
                              />
                              <Image
                                src={pool.tokenB.image || "/placeholder.svg"}
                                alt={pool.tokenB.symbol}
                                width={16}
                                height={16}
                                className="rounded-full border border-gray-600"
                              />
                            </div>
                            <span className="font-semibold text-sm">
                              {pool.tokenA.symbol}/{pool.tokenB.symbol}
                            </span>
                          </div>
                          <Badge className="bg-green-500 text-black text-xs">{pool.apr}</Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Value</span>
                            <span>{pool.myLiquidity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Share</span>
                            <span>{pool.myShare}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Fees (24h)</span>
                            <span className="text-green-500">{pool.fees24h}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Pool Statistics */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  Pool Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Value Locked</span>
                    <span className="font-semibold">$4.2M</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">24h Volume</span>
                    <span className="font-semibold">$780K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">24h Fees</span>
                    <span className="font-semibold text-green-500">$2.34K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Pools</span>
                    <span className="font-semibold">12</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Pools */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4 text-yellow-500" />
                  Top Pools by APR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liquidityPools
                    .sort((a, b) => Number.parseFloat(b.apr) - Number.parseFloat(a.apr))
                    .slice(0, 3)
                    .map((pool) => (
                      <div key={pool.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex -space-x-1">
                            <Image
                              src={pool.tokenA.image || "/placeholder.svg"}
                              alt={pool.tokenA.symbol}
                              width={16}
                              height={16}
                              className="rounded-full border border-gray-600"
                            />
                            <Image
                              src={pool.tokenB.image || "/placeholder.svg"}
                              alt={pool.tokenB.symbol}
                              width={16}
                              height={16}
                              className="rounded-full border border-gray-600"
                            />
                          </div>
                          <span className="text-sm font-semibold">
                            {pool.tokenA.symbol}/{pool.tokenB.symbol}
                          </span>
                        </div>
                        <Badge className="bg-green-500 text-black text-xs">{pool.apr}</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Pools Table */}
        <Card className="bg-gray-900 border-gray-800 mt-8">
          <CardHeader>
            <CardTitle>All Liquidity Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4">Pool</th>
                      <th className="text-left py-3 px-4">TVL</th>
                      <th className="text-left py-3 px-4">APR</th>
                      <th className="text-left py-3 px-4 hidden md:table-cell">24h Volume</th>
                      <th className="text-left py-3 px-4 hidden sm:table-cell">My Liquidity</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liquidityPools.map((pool) => (
                      <tr key={pool.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex -space-x-1">
                              <Image
                                src={pool.tokenA.image || "/placeholder.svg"}
                                alt={pool.tokenA.symbol}
                                width={24}
                                height={24}
                                className="rounded-full border border-gray-600"
                              />
                              <Image
                                src={pool.tokenB.image || "/placeholder.svg"}
                                alt={pool.tokenB.symbol}
                                width={24}
                                height={24}
                                className="rounded-full border border-gray-600"
                              />
                            </div>
                            <span className="font-semibold">
                              {pool.tokenA.symbol}/{pool.tokenB.symbol}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold">{pool.tvl}</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500 text-black">{pool.apr}</Badge>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">{pool.volume24h}</td>
                        <td className="py-3 px-4 hidden sm:table-cell">{pool.myLiquidity}</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="border-gray-700 hover:border-green-500">
                              Add
                            </Button>
                            {pool.myLiquidity !== "$0" && (
                              <Button size="sm" variant="outline" className="border-gray-700 hover:border-red-500">
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
