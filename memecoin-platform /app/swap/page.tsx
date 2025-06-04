"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, Settings, TrendingUp, Clock } from "lucide-react"
import Image from "next/image"

const tokens = [
  { symbol: "USDC", name: "USD Coin", image: "/placeholder.svg?height=32&width=32", balance: "1,234.56" },
  { symbol: "USDT", name: "Tether USD", image: "/placeholder.svg?height=32&width=32", balance: "567.89" },
  { symbol: "PEPE", name: "PepeCoin", image: "/placeholder.svg?height=32&width=32", balance: "1,000,000" },
  { symbol: "DMAX", name: "DogeMax", image: "/placeholder.svg?height=32&width=32", balance: "50,000" },
  { symbol: "MSHIB", name: "MoonShiba", image: "/placeholder.svg?height=32&width=32", balance: "750,000" },
]

const recentTrades = [
  { from: "PEPE", to: "USDC", amount: "100,000", value: "$1,200", time: "2m ago", type: "buy" },
  { from: "USDC", to: "DMAX", amount: "500", value: "$500", time: "5m ago", type: "sell" },
  { from: "MSHIB", to: "USDT", amount: "25,000", value: "$2,225", time: "8m ago", type: "buy" },
]

export default function SwapPage() {
  const [fromToken, setFromToken] = useState("USDC")
  const [toToken, setToToken] = useState("PEPE")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const calculateToAmount = (amount: string) => {
    if (!amount) return ""
    // Mock calculation - in real app, this would call pricing API
    const rate = fromToken === "USDC" ? 83333.33 : 0.000012
    return (Number.parseFloat(amount) * rate).toFixed(fromToken === "USDC" ? 0 : 6)
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    setToAmount(calculateToAmount(value))
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Swap Tokens
          </h1>
          <p className="text-gray-400 text-lg">Trade meme tokens with minimal slippage and low fees</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Swap Interface */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <ArrowUpDown className="mr-2 h-5 w-5 text-green-500" />
                    Swap
                  </CardTitle>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* From Token */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">From</span>
                    <span className="text-sm text-gray-400 hidden sm:inline">
                      Balance: {tokens.find((t) => t.symbol === fromToken)?.balance}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={(e) => handleFromAmountChange(e.target.value)}
                      className="bg-transparent border-none text-2xl font-semibold p-0 h-auto"
                    />
                    <Select value={fromToken} onValueChange={setFromToken}>
                      <SelectTrigger className="w-full sm:w-auto bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {tokens.map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex items-center space-x-2">
                              <Image
                                src={token.image || "/placeholder.svg"}
                                alt={token.symbol}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                              <span>{token.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-400 mt-2 sm:hidden">
                    Balance: {tokens.find((t) => t.symbol === fromToken)?.balance}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSwapTokens}
                    className="rounded-full bg-gray-800 hover:bg-gray-700"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* To Token */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">To</span>
                    <span className="text-sm text-gray-400 hidden sm:inline">
                      Balance: {tokens.find((t) => t.symbol === toToken)?.balance}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      placeholder="0.0"
                      value={toAmount}
                      readOnly
                      className="bg-transparent border-none text-2xl font-semibold p-0 h-auto"
                    />
                    <Select value={toToken} onValueChange={setToToken}>
                      <SelectTrigger className="w-full sm:w-auto bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {tokens.map((token) => (
                          <SelectItem key={token.symbol} value={token.symbol}>
                            <div className="flex items-center space-x-2">
                              <Image
                                src={token.image || "/placeholder.svg"}
                                alt={token.symbol}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                              <span>{token.symbol}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-400 mt-2 sm:hidden">
                    Balance: {tokens.find((t) => t.symbol === toToken)?.balance}
                  </div>
                </div>

                {/* Swap Details */}
                {fromAmount && toAmount && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rate</span>
                      <span>
                        1 {fromToken} = {(Number.parseFloat(toAmount) / Number.parseFloat(fromAmount)).toFixed(6)}{" "}
                        {toToken}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Slippage Tolerance</span>
                      <span>{slippage}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Minimum Received</span>
                      <span>
                        {(Number.parseFloat(toAmount) * (1 - Number.parseFloat(slippage) / 100)).toFixed(6)} {toToken}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Network Fee</span>
                      <span>~$2.50</span>
                    </div>
                  </div>
                )}

                <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3">
                  {fromAmount && toAmount ? "Swap Tokens" : "Enter Amount"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Trades */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-blue-500" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${trade.type === "buy" ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span className="text-sm">
                          {trade.from} → {trade.to}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{trade.value}</div>
                        <div className="text-xs text-gray-400">{trade.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Gainers */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { symbol: "MSHIB", change: "+67.8%", price: "$0.000234" },
                    { symbol: "FMAX", change: "+42.7%", price: "$0.000089" },
                    { symbol: "PEPE", change: "+15.2%", price: "$0.000012" },
                  ].map((token, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-semibold">{token.symbol}</span>
                      <div className="text-right">
                        <div className="text-green-500 font-semibold">{token.change}</div>
                        <div className="text-sm text-gray-400">{token.price}</div>
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
