"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Upload, Rocket, DollarSign, Droplets } from "lucide-react"
import Image from "next/image"

export default function LaunchPage() {
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    description: "",
    totalSupply: 1000000,
    initialLiquidity: 1000,
    liquidityLockDays: 365,
    autoAddLiquidity: true,
    website: "",
    twitter: "",
    telegram: "",
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Launch Your Meme Token
          </h1>
          <p className="text-gray-400 text-lg">
            Create your own meme token with built-in liquidity and trading features
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Token Details Form */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Rocket className="mr-2 h-5 w-5 text-green-500" />
                Token Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Token Image */}
              <div>
                <Label htmlFor="image">Token Image</Label>
                <div className="mt-2 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden">
                    {imagePreview ? (
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="Token"
                        width={80}
                        height={80}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="w-full">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-gray-800 border-gray-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">Recommended: 512x512px, PNG/JPG</p>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., PepeCoin"
                    value={tokenData.name}
                    onChange={(e) => setTokenData({ ...tokenData, name: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="symbol">Token Symbol</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g., PEPE"
                    value={tokenData.symbol}
                    onChange={(e) => setTokenData({ ...tokenData, symbol: e.target.value })}
                    className="bg-gray-800 border-gray-700"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your meme token..."
                  value={tokenData.description}
                  onChange={(e) => setTokenData({ ...tokenData, description: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                  rows={3}
                />
              </div>

              {/* Supply */}
              <div>
                <Label htmlFor="supply">Total Supply</Label>
                <Input
                  id="supply"
                  type="number"
                  value={tokenData.totalSupply}
                  onChange={(e) => setTokenData({ ...tokenData, totalSupply: Number.parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <Label>Social Links (Optional)</Label>
                <Input
                  placeholder="Website URL"
                  value={tokenData.website}
                  onChange={(e) => setTokenData({ ...tokenData, website: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
                <Input
                  placeholder="Twitter URL"
                  value={tokenData.twitter}
                  onChange={(e) => setTokenData({ ...tokenData, twitter: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
                <Input
                  placeholder="Telegram URL"
                  value={tokenData.telegram}
                  onChange={(e) => setTokenData({ ...tokenData, telegram: e.target.value })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </CardContent>
          </Card>

          {/* Liquidity Settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Droplets className="mr-2 h-5 w-5 text-blue-500" />
                Liquidity Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-add Liquidity</Label>
                  <p className="text-sm text-gray-400">Automatically add liquidity on launch</p>
                </div>
                <Switch
                  checked={tokenData.autoAddLiquidity}
                  onCheckedChange={(checked) => setTokenData({ ...tokenData, autoAddLiquidity: checked })}
                />
              </div>

              {tokenData.autoAddLiquidity && (
                <>
                  <div>
                    <Label>Initial Liquidity (USDC)</Label>
                    <Input
                      type="number"
                      value={tokenData.initialLiquidity}
                      onChange={(e) =>
                        setTokenData({ ...tokenData, initialLiquidity: Number.parseInt(e.target.value) })
                      }
                      className="bg-gray-800 border-gray-700"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum: 100 USDC</p>
                  </div>

                  <div>
                    <Label>Liquidity Lock Period: {tokenData.liquidityLockDays} days</Label>
                    <Slider
                      value={[tokenData.liquidityLockDays]}
                      onValueChange={(value) => setTokenData({ ...tokenData, liquidityLockDays: value[0] })}
                      max={1095}
                      min={30}
                      step={30}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>30 days</span>
                      <span>3 years</span>
                    </div>
                  </div>
                </>
              )}

              {/* Fee Structure */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Launch Fees</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Creation</span>
                    <span>0.1 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Liquidity Pool Setup</span>
                    <span>0.05 ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform Fee</span>
                    <span>1% of supply</span>
                  </div>
                  <hr className="border-gray-700" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>0.15 ETH + Gas</span>
                  </div>
                </div>
              </div>

              {/* Launch Button */}
              <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3">
                <Rocket className="mr-2 h-5 w-5" />
                Launch Token
              </Button>

              <p className="text-xs text-gray-400 text-center">
                By launching, you agree to our terms of service and confirm that you own the rights to all uploaded
                content.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Preview Card */}
        {(tokenData.name || tokenData.symbol) && (
          <Card className="bg-gray-900 border-gray-800 mt-8">
            <CardHeader>
              <CardTitle>Token Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <Image
                      src={imagePreview || "/placeholder.svg"}
                      alt="Token"
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <DollarSign className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{tokenData.name || "Token Name"}</h3>
                  <p className="text-gray-400">{tokenData.symbol || "SYMBOL"}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {tokenData.description || "Token description will appear here..."}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">$0.001</div>
                  <div className="text-sm text-gray-400">Initial Price</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
