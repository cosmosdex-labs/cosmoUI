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
import { Upload, Rocket, DollarSign, Droplets, CheckCircle } from "lucide-react"
import { getPublicKey, signTransaction } from "@/lib/stellar-wallets-kit"
import tokenlauncher from "@/contracts/TokenLauncher"
import Image from "next/image"
import crypto from 'crypto'

export default function LaunchPage() {
  const [currentStep, setCurrentStep] = useState(1);
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

  const [poolData, setPoolData] = useState({
    initialPrice: 0.001,
    slippageTolerance: 1,
    fee: 0.3,
  })

  const [liquidityData, setLiquidityData] = useState({
    tokenAmount: 0,
    xlmAmount: 0,
    lockDuration: 365,
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null)

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

  const handleWasmHash = async () => {
    setIsProcessing(true);
    setTransactionStatus("Updating WASM hash...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    tokenlauncher.options.publicKey = publicKey;
    tokenlauncher.options.signTransaction = signTransaction; 
    let tokenWasmHash = "745f837368a4e473312bcaede20893c3e0074ea52b9403950446f5f46da87fef"
    try {
      const tx = await tokenlauncher.update_pool_wasm_hash({
        admin_addr: publicKey,
        new_hash: Buffer.from(tokenWasmHash, 'hex')
      });
      const { result } = await tx.signAndSend();
      console.log("tx result", result);
      setTransactionStatus("WASM hash updated successfully!");
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error updating WASM hash");
    } finally {
      setIsProcessing(false);
    }
  }

  const handleLaunch = async () => {
    setIsProcessing(true);
    setTransactionStatus("Launching token...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    tokenlauncher.options.publicKey = publicKey;
    tokenlauncher.options.signTransaction = signTransaction;
    try {
      // Generate a unique 32-byte salt
      const saltData = `${tokenData.name}${tokenData.symbol}${Date.now()}`;
      const salt = crypto.createHash('sha256').update(saltData).digest();
      
      const tx = await tokenlauncher.create_token({
        token_name: tokenData.name,
        token_symbol: tokenData.symbol,
        token_decimals: 18,
        token_supply: BigInt(tokenData.totalSupply),
        token_owner: publicKey,
        salt
      });
      const { result } = await tx.signAndSend();
      console.log("tx result", result);
      setTransactionStatus("Token launched successfully!");
      setCurrentStep(2);
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error launching token");
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCreatePool = async () => {
    setIsProcessing(true);
    setTransactionStatus("Creating pool...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      // Add pool creation logic here
      setTransactionStatus("Pool created successfully!");
      setCurrentStep(3);
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error creating pool");
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAddLiquidity = async () => {
    setIsProcessing(true);
    setTransactionStatus("Adding liquidity...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      // Add liquidity logic here
      setTransactionStatus("Liquidity added successfully!");
      setCurrentStep(4);
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error adding liquidity");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Launch Your Token
          </h1>
          <p className="text-gray-400 text-lg">
            Create your token, set up a pool, and add liquidity in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step ? 'bg-green-500' : 'bg-gray-700'
                }`}>
                  {step}
                </div>
                <span className="text-sm mt-2">
                  {step === 1 ? 'Token Details' : 
                   step === 2 ? 'Create Pool' : 
                   step === 3 ? 'Add Liquidity' : 
                   'Complete'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Status */}
        {transactionStatus && (
          <div className="mb-4 p-4 rounded-lg bg-gray-800">
            <p className="text-center">{transactionStatus}</p>
          </div>
        )}

        {/* Step 1: Token Details */}
        {currentStep === 1 && (
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

              <Button 
                onClick={handleLaunch} 
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Launch Token"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create Pool */}
        {currentStep === 2 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Droplets className="mr-2 h-5 w-5 text-blue-500" />
                Create Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Initial Price (XLM)</Label>
                <Input
                  type="number"
                  value={poolData.initialPrice}
                  onChange={(e) => setPoolData({ ...poolData, initialPrice: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              
              <div>
                <Label>Slippage Tolerance (%)</Label>
                <Input
                  type="number"
                  value={poolData.slippageTolerance}
                  onChange={(e) => setPoolData({ ...poolData, slippageTolerance: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label>Pool Fee (%)</Label>
                <Input
                  type="number"
                  value={poolData.fee}
                  onChange={(e) => setPoolData({ ...poolData, fee: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <Button 
                onClick={handleCreatePool} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Create Pool"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Add Liquidity */}
        {currentStep === 3 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Droplets className="mr-2 h-5 w-5 text-blue-500" />
                Add Liquidity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Token Amount</Label>
                <Input
                  type="number"
                  value={liquidityData.tokenAmount}
                  onChange={(e) => setLiquidityData({ ...liquidityData, tokenAmount: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label>XLM Amount</Label>
                <Input
                  type="number"
                  value={liquidityData.xlmAmount}
                  onChange={(e) => setLiquidityData({ ...liquidityData, xlmAmount: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label>Lock Duration (days)</Label>
                <Input
                  type="number"
                  value={liquidityData.lockDuration}
                  onChange={(e) => setLiquidityData({ ...liquidityData, lockDuration: parseInt(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <Button 
                onClick={handleAddLiquidity} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Add Liquidity"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Complete */}
        {currentStep === 4 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                Launch Complete
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Congratulations!</h3>
                <p className="text-gray-400">
                  Your token has been launched successfully with a liquidity pool.
                </p>
              </div>
              
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Token Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span>{tokenData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Symbol:</span>
                    <span>{tokenData.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Supply:</span>
                    <span>{tokenData.totalSupply}</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
