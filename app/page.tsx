"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, Search, Plus, Zap, BarChart3, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { CandlestickChart } from "@/components/candlestick-chart"

const mockTokens = [
  {
    id: 1,
    name: "PepeCoin",
    symbol: "PEPE",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.000012",
    change: "+15.2%",
    marketCap: "$1.2M",
    volume: "$245K",
    liquidity: "$89K",
    trending: true,
  },
  {
    id: 2,
    name: "DogeMax",
    symbol: "DMAX",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.0045",
    change: "-3.1%",
    marketCap: "$890K",
    volume: "$156K",
    liquidity: "$67K",
    trending: false,
  },
  {
    id: 3,
    name: "MoonShiba",
    symbol: "MSHIB",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.000089",
    change: "+42.7%",
    marketCap: "$2.1M",
    volume: "$567K",
    liquidity: "$234K",
    trending: true,
  },
  {
    id: 4,
    name: "SafeMeme",
    symbol: "SMEME",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.0012",
    change: "+8.9%",
    marketCap: "$456K",
    volume: "$89K",
    liquidity: "$45K",
    trending: false,
  },
  {
    id: 5,
    name: "RocketDoge",
    symbol: "RDOGE",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.0067",
    change: "-12.4%",
    marketCap: "$1.8M",
    volume: "$234K",
    liquidity: "$123K",
    trending: false,
  },
  {
    id: 6,
    name: "FlokiMax",
    symbol: "FMAX",
    image: "/placeholder.svg?height=60&width=60",
    price: "$0.000234",
    change: "+67.8%",
    marketCap: "$3.4M",
    volume: "$789K",
    liquidity: "$345K",
    trending: true,
  },
]

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showHowItWorks, setShowHowItWorks] = useState(false)

  const filteredTokens = mockTokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1200')] opacity-5"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              Launch Your Meme Token
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              The ultimate platform for creating, trading, and managing meme tokens with built-in liquidity pools and
              advanced DeFi features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/launch">
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-black font-semibold px-8 py-3 w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Launch Token
                </Button>
              </Link>
              <Link href="/swap">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-green-500 text-green-500 hover:bg-green-500 hover:text-black px-8 py-3 w-full sm:w-auto"
                >
                  <ArrowUpDown className="mr-2 h-5 w-5" />
                  Start Trading
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                className="text-gray-300 hover:text-white px-8 py-3 w-full sm:w-auto"
                onClick={() => setShowHowItWorks(true)}
              >
                How it Works
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">1,247</div>
              <div className="text-gray-400">Tokens Launched</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">$12.4M</div>
              <div className="text-gray-400">Total Volume</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">$4.2M</div>
              <div className="text-gray-400">Total Liquidity</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">8,934</div>
              <div className="text-gray-400">Active Traders</div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Token Chart */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Featured Token</h2>
          <CandlestickChart tokenSymbol="PEPE" timeframe="1d" onTimeframeChange={() => {}} />
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tokens..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <Tabs defaultValue="all" className="w-full sm:w-auto">
            <TabsList className="bg-gray-900 border-gray-700 w-full sm:w-auto">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                All Tokens
              </TabsTrigger>
              <TabsTrigger value="trending" className="flex-1 sm:flex-none">
                Trending
              </TabsTrigger>
              <TabsTrigger value="new" className="flex-1 sm:flex-none">
                New
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Token Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTokens.map((token) => (
            <Card
              key={token.id}
              className="bg-gray-900 border-gray-800 hover:border-green-500 transition-colors cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={token.image || "/placeholder.svg"}
                      alt={token.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                    <div>
                      <CardTitle className="text-lg">{token.name}</CardTitle>
                      <p className="text-gray-400 text-sm">{token.symbol}</p>
                    </div>
                  </div>
                  {token.trending && (
                    <Badge className="bg-green-500 text-black">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Hot
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price</span>
                    <span className="font-semibold">{token.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">24h Change</span>
                    <span
                      className={`font-semibold ${token.change.startsWith("+") ? "text-green-500" : "text-red-500"}`}
                    >
                      {token.change.startsWith("+") ? (
                        <TrendingUp className="inline h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-3 w-3 mr-1" />
                      )}
                      {token.change}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="font-semibold">{token.marketCap}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volume</span>
                    <span className="font-semibold">{token.volume}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Liquidity</span>
                    <span className="font-semibold">{token.liquidity}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/token/${token.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-gray-700 hover:border-green-500">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </Link>
                  <Link href="/swap" className="flex-1">
                    <Button size="sm" className="w-full bg-green-500 hover:bg-green-600 text-black">
                      <Zap className="h-4 w-4 mr-1" />
                      Trade
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works Modal */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">How it Works</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-gray-300">
              Our platform allows anyone to create tokens. All tokens created are fair-launch, meaning everyone has
              equal access to buy and sell when the token is first created.
            </p>
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-green-500">Step 1:</span> Pick a token that you like
              </div>
              <div>
                <span className="font-semibold text-green-500">Step 2:</span> Buy the token on the bonding curve
              </div>
              <div>
                <span className="font-semibold text-green-500">Step 3:</span> Sell at any time to lock in your profits
                or losses
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              By clicking this button you agree to the terms and conditions and certify that you are over 18 years old
            </p>
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
              onClick={() => setShowHowItWorks(false)}
            >
              I'm ready to pump
            </Button>
            <div className="text-center text-xs text-gray-500 space-x-2">
              <span>privacy policy</span>
              <span>|</span>
              <span>terms of service</span>
              <span>|</span>
              <span>fees</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
