"use client"

import React, { useEffect } from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Upload, Rocket, DollarSign, Droplets, CheckCircle, X, Loader2, Cloud, Coins } from "lucide-react"
import { getPublicKey, signTransaction } from "@/lib/stellar-wallets-kit"
import tokenlauncher from "@/contracts/TokenLauncher"
import poollauncher from "@/contracts/PoolFactory"
import usdtcontract from "@/contracts/USDTMinter"
import { Client as UsdtTokenClient } from "@/packages/USDTToken/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import Image from "next/image"
import crypto from 'crypto'
import Link from "next/link"
import { ExternalLink } from "lucide-react";
import * as Stellar from "@stellar/stellar-sdk";
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { useToast } from "@/hooks/use-toast"
import {
  contract,
  Keypair,
  Networks,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { uploadTokenToPinata, validateImageFile, UploadResult } from "@/utils/pinata";

// Liquidity Modal Component
const LiquidityModal = ({ 
  isOpen, 
  onClose, 
  currentStep, 
  steps, 
  isProcessing, 
  error,
  onRetry
}: {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  steps: Array<{ id: string; title: string; description: string; status: 'pending' | 'processing' | 'completed' | 'error' }>;
  isProcessing: boolean;
  error: string | null;
  onRetry: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={isProcessing}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Adding Liquidity</h3>
          <p className="text-gray-400 text-sm">
            Please sign each transaction to complete the process
          </p>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              {/* Step Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.status === 'completed' 
                  ? 'bg-green-500' 
                  : step.status === 'processing' 
                  ? 'bg-blue-500 animate-pulse' 
                  : step.status === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-600'
              }`}>
                {step.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : step.status === 'processing' ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : step.status === 'error' ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-400' : 
                    step.status === 'processing' ? 'text-blue-400' :
                    step.status === 'error' ? 'text-red-400' : 'text-white'
                  }`}>
                    {step.title}
                  </h4>
                  {step.status === 'completed' && (
                    <span className="text-xs text-green-400">✓ Complete</span>
                  )}
                  {step.status === 'processing' && (
                    <span className="text-xs text-blue-400">Signing...</span>
                  )}
                  {step.status === 'error' && (
                    <span className="text-xs text-red-400">Failed</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            Step {currentStep} of {steps.length}
          </span>
          {!isProcessing && error && (
            <div className="flex space-x-2">
              <Button
                onClick={onRetry}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Retry
              </Button>
              <Button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Close
              </Button>
            </div>
          )}
          {!isProcessing && !error && steps.every(s => s.status === 'pending') && (
            <Button
              onClick={() => {
                // This will be handled by the parent component
                window.dispatchEvent(new CustomEvent('startLiquidityProcess'));
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Start Process
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function LaunchPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tokenData, setTokenData] = useState({
    name: "",
    symbol: "",
    description: "",
    totalSupply: 0,
    initialLiquidity: 0,
    liquidityLockDays: 30,
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
    useXlm: false, // New field to choose between USDC and XLM
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null)
  const [tokenaddress, setTokenAddress] = useState<string | null>(null)
  const [pooladdress, setPoolAddress] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState<string>("0")
  const [usdcBalance, setUsdcBalance] = useState<string>("0")
  const [tokenBalance, setTokenBalance] = useState<string>("0")
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)

  const { toast } = useToast()

  // Liquidity Modal State
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);
  const [liquiditySteps, setLiquiditySteps] = useState<Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
  }>>([
    {
      id: 'approve-custom',
      title: 'Approve Custom Token',
      description: 'Allow pool to spend your custom tokens',
      status: 'pending'
    },
    {
      id: 'approve-second-token',
      title: 'Approve Second Token',
      description: 'Allow pool to spend your second token',
      status: 'pending'
    },
    {
      id: 'add-liquidity',
      title: 'Add Liquidity',
      description: 'Add tokens to the liquidity pool',
      status: 'pending'
    }
  ]);
  const [liquidityError, setLiquidityError] = useState<string | null>(null);

  // Update liquidity steps when pool type changes
  useEffect(() => {
    setLiquiditySteps([
      {
        id: 'approve-custom',
        title: 'Approve Custom Token',
        description: 'Allow pool to spend your custom tokens',
        status: 'pending'
      },
      {
        id: 'approve-second-token',
        title: liquidityData.useXlm ? 'Prepare XLM' : 'Approve USDC',
        description: liquidityData.useXlm 
          ? 'Prepare native XLM for pool (no approval needed)' 
          : 'Allow pool to spend your USDC tokens',
        status: 'pending'
      },
      {
        id: 'add-liquidity',
        title: 'Add Liquidity',
        description: `Add tokens to the ${liquidityData.useXlm ? 'XLM' : 'USDC'} pool`,
        status: 'pending'
      }
    ]);
  }, [liquidityData.useXlm]);

  // Fetch XLM balance
  const fetchXlmBalance = async () => {
    if (!publicKey) return;

    try {
      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(publicKey);
      const xlmBalance = account.balances.find(balance => balance.asset_type === 'native');
      const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      setXlmBalance(balance.toFixed(6));
    } catch (error) {
      console.error("Error fetching XLM balance:", error);
      setXlmBalance("0");
    }
  };

  // Fetch USDC balance
  const fetchUsdcBalance = async () => {
    if (!publicKey) return;

    try {
      const tokenClient = new UsdtTokenClient({
        contractId: CONTRACT_ADDRESSES.USDTToken,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const balanceResult = await tokenClient.balance({ id: publicKey });
      let balance = "0";
      if (balanceResult && typeof balanceResult === "object" && "result" in balanceResult) {
        const balanceValue = BigInt(balanceResult.result || 0);
        balance = (Number(balanceValue) / Math.pow(10, 6)).toFixed(2);
      }
      setUsdcBalance(balance);
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      setUsdcBalance("0");
    }
  };

  // Fetch custom token balance if token address exists
  const fetchTokenBalance = async () => {
    if (!publicKey || !tokenaddress) return;

    try {
      const tokenClient = new UsdtTokenClient({
        contractId: tokenaddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const tokenBalanceResult = await tokenClient.balance({ id: publicKey });
      let tokenBalanceValue = "0";
      if (tokenBalanceResult && typeof tokenBalanceResult === "object" && "result" in tokenBalanceResult) {
        const balance = BigInt(tokenBalanceResult.result || 0);
        tokenBalanceValue = (Number(balance) / Math.pow(10, 18)).toFixed(2);
      }
      setTokenBalance(tokenBalanceValue);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setTokenBalance("0");
    }
  };

  // Fetch all balances
  const fetchBalances = async () => {
    if (!publicKey) return;

    try {
      setIsLoadingBalances(true);
      await Promise.all([
        fetchXlmBalance(),
        fetchUsdcBalance(),
        fetchTokenBalance()
      ]);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Initialize wallet connection
  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  // Fetch balances when public key changes
  useEffect(() => {
    if (publicKey) {
      fetchBalances();
    }
  }, [publicKey]);

  // Fetch token balance when token address changes
  useEffect(() => {
    if (publicKey && tokenaddress) {
      fetchTokenBalance();
    }
  }, [tokenaddress, publicKey]);

  // Fetch balances when switching between XLM and USDC
  useEffect(() => {
    if (publicKey) {
      fetchBalances();
    }
  }, [liquidityData.useXlm]);

  // Fetch balances when entering step 3 (Add Liquidity)
  useEffect(() => {
    if (currentStep === 3 && publicKey) {
      fetchBalances();
    }
  }, [currentStep, publicKey]);

  // Add event listener for starting liquidity process
  React.useEffect(() => {
    const handleStartLiquidity = () => {
      handleAddLiquidity();
    };

    window.addEventListener('startLiquidityProcess', handleStartLiquidity);
    
    return () => {
      window.removeEventListener('startLiquidityProcess', handleStartLiquidity);
    };
  }, [liquidityData, tokenaddress, pooladdress]);

  // Function to reset liquidity process for retry
  const resetLiquidityProcess = () => {
    setLiquiditySteps([
      {
        id: 'approve-custom',
        title: 'Approve Custom Token',
        description: 'Allow pool to spend your custom tokens',
        status: 'pending'
      },
      {
        id: 'approve-second-token',
        title: liquidityData.useXlm ? 'Prepare XLM' : 'Approve USDC',
        description: liquidityData.useXlm 
          ? 'Prepare native XLM for pool (no approval needed)' 
          : 'Allow pool to spend your USDC tokens',
        status: 'pending'
      },
      {
        id: 'add-liquidity',
        title: 'Add Liquidity',
        description: `Add tokens to the ${liquidityData.useXlm ? 'XLM' : 'USDC'} pool`,
        status: 'pending'
      }
    ]);
    setLiquidityError(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate the file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({
          title: "Error",
          description: validation.error,
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
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
    // let tokenWasmHash = "63671b88b2c1070a1cf9165311237baae76a607bf2791e88e663408588382468"
    try {
      const tx = await tokenlauncher.update_pool_wasm_hash({
        admin_addr: publicKey,
        new_hash: Buffer.from(CONTRACT_ADDRESSES.MemeTokenWasmHash, 'hex')
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

  const handlePoolWasmHash = async () => {
    setIsProcessing(true);
    setTransactionStatus("Updating WASM hash...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      alert("Please connect your wallet first");
      return;
    }
    poollauncher.options.publicKey = publicKey;
    poollauncher.options.signTransaction = signTransaction; 
    // let poolWasmHash = "000db6f71d0fe9c1bd1444aaa55086c646b29b90d738cf30f7ff0e669477df0e"
    try {
      const tx = await poollauncher.update_pool_wasm_hash({
        admin_addr: publicKey,
        new_hash: Buffer.from(CONTRACT_ADDRESSES.PoolWasmHash, 'hex')
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
    setUploadProgress("Uploading token metadata to IPFS...");
    
    const publicKey = await getPublicKey();
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    // Check if image is uploaded
    if (!imageFile) {
      toast({
        title: "Error",
        description: "Please upload a token image first",
        variant: "destructive",
      });
      setIsProcessing(false);
      setUploadProgress(null);
      return;
    }

    tokenlauncher.options.publicKey = publicKey;
    tokenlauncher.options.signTransaction = signTransaction;
    
    try {
      // Generate a unique 32-byte salt
      const saltData = `${tokenData.name}${tokenData.symbol}${Date.now()}`;
      const salt = crypto.createHash('sha256').update(saltData).digest();
      
      // Upload token metadata to Pinata
      const uploadResult = await uploadTokenToPinata(
        imageFile,
        {
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description,
          admin_addr: publicKey,
          decimals: 18,
          total_supply: (BigInt(tokenData.totalSupply) * BigInt(10 ** 18)).toString(),
          website: tokenData.website,
          twitter: tokenData.twitter,
          telegram: tokenData.telegram,
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Failed to upload token metadata to Pinata");
      }

      setUploadProgress("Token metadata uploaded successfully! Creating token...");
      
      // Use the metadata URL from Pinata
      const tx = await tokenlauncher.create_token({
        admin_addr: publicKey,
        token_name: tokenData.name,
        token_symbol: tokenData.symbol,
        token_decimals: 18,
        token_supply: BigInt(tokenData.totalSupply) * BigInt(10 ** 18),
        token_owner: publicKey,
        token_metadata: uploadResult.metadataUrl || "",
        salt
      });
      const { result } = await tx.signAndSend();
      console.log("tx result", result);
      setTokenAddress(result)
      setTransactionStatus("Token launched successfully!");
      setUploadProgress(null);
      setCurrentStep(2);

      toast({
        title: "Success",
        description: "Token launched successfully!",
      });
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error launching token");
      setUploadProgress(null);
      toast({
        title: "Error",
        description: "Failed to launch token",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleCreatePool = async () => {
    setIsProcessing(true);
    setTransactionStatus("Creating pool...");
    const publicKey = await getPublicKey();
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    try {
      poollauncher.options.publicKey = publicKey;
      poollauncher.options.signTransaction = signTransaction;
      const saltData = `${tokenData.name}${tokenData.symbol}${Date.now()}`;
      const salt = crypto.createHash('sha256').update(saltData).digest();
      
      // Choose the second token based on user preference
      const secondToken = liquidityData.useXlm 
        ? "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" // Native XLM  testnet contract address
        : CONTRACT_ADDRESSES.USDTToken;
      
      console.log("Creating pool with:", {
        token_a: tokenaddress || "",
        token_b: secondToken,
        poolType: liquidityData.useXlm ? 'XLM' : 'USDC',
        customToken: tokenData.symbol
      });
      
      const tx = await poollauncher.create_pool({
        token_a: tokenaddress || "",
        token_b: secondToken,
        lp_token_name: `${tokenData.symbol}${liquidityData.useXlm ? 'XLM' : 'USDC'} LP`,
        lp_token_symbol: `${tokenData.symbol}${liquidityData.useXlm ? 'XLM' : 'USDC'}LP`,
        salt
      });
      const { result } = await tx.signAndSend();
      console.log("tx result", result);
      setPoolAddress(result)
      setTransactionStatus(`Pool created successfully for ${tokenData.symbol}/${liquidityData.useXlm ? 'XLM' : 'USDC'}!`);
      setCurrentStep(3);

      toast({
        title: "Success",
        description: `Pool created successfully for ${tokenData.symbol}/${liquidityData.useXlm ? 'XLM' : 'USDC'}!`,
      });
    } catch (error) {
      console.error(error);
      setTransactionStatus("Error creating pool");
      toast({
        title: "Error",
        description: "Failed to create pool",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  const handleAddLiquidity = async () => {
    setIsProcessing(true);
    setLiquidityError(null);
    
    // Validate amounts to prevent overflow
    const tokenAmountRaw = BigInt(liquidityData.tokenAmount) * BigInt(10 ** 18);
    const secondTokenAmountRaw = liquidityData.useXlm 
      ? BigInt(liquidityData.xlmAmount) * BigInt(10 ** 7) // XLM has 7 decimals
      : BigInt(liquidityData.xlmAmount) * BigInt(10 ** 6); // USDC has 6 decimals
    
    // Check if amounts are reasonable (prevent overflow in sqrt calculation)
    if (liquidityData.tokenAmount > 1000000000) { // 1 billion tokens max
      setLiquidityError(`Token amount too large. Please use a smaller amount (max 1 billion ${tokenData.symbol || "tokens"} tokens).`);
      setIsProcessing(false);
      return;
    }
    
    const maxSecondTokenAmount = liquidityData.useXlm ? 1000000 : 1000000; // 1 million max
    if (liquidityData.xlmAmount > maxSecondTokenAmount) {
      setLiquidityError(`${liquidityData.useXlm ? 'XLM' : 'USDC'} amount too large. Please use a smaller amount (max ${maxSecondTokenAmount.toLocaleString()} ${liquidityData.useXlm ? 'XLM' : 'USDC'}).`);
      setIsProcessing(false);
      return;
    }
    
    // Check for sqrt calculation overflow
    const product = tokenAmountRaw * secondTokenAmountRaw;
    const maxSafeProduct = BigInt("170141183460469231731687303715884105727"); // Max i128 value (2^127 - 1)
    
    if (product > maxSafeProduct) {
      setLiquidityError("Amounts too large for pool calculation. Please reduce the amounts.");
      setIsProcessing(false);
      return;
    }
    
    // Reset steps to initial state
    setLiquiditySteps([
      {
        id: 'approve-custom',
        title: 'Approve Custom Token',
        description: 'Allow pool to spend your custom tokens',
        status: 'pending'
      },
      {
        id: 'approve-usdc',
        title: liquidityData.useXlm ? 'Prepare XLM' : 'Approve USDC',
        description: liquidityData.useXlm ? 'Prepare native XLM for pool' : 'Allow pool to spend your USDC tokens',
        status: 'pending'
      },
      {
        id: 'add-liquidity',
        title: 'Add Liquidity',
        description: 'Add tokens to the liquidity pool',
        status: 'pending'
      }
    ]);

    const publicKey = await getPublicKey();
    if (!publicKey) {
      setLiquidityError("Please connect your wallet first");
      setIsProcessing(false);
      return;
    }

    const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
    const currentLedger = await server.ledgers().order('desc').limit(1).call();
    const expirationLedger = currentLedger.records[0].sequence + 1000;

    try {
      const clientOptions = {
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        publicKey: publicKey,
        signTransaction: signTransaction,
        allowHttp: true,
      };

      // Step 1: Approve Custom Token
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'approve-custom' ? { ...step, status: 'processing' } : step
      ));

      const customTokenClient = new UsdtTokenClient({
        ...clientOptions,
        contractId: tokenaddress ?? "",
      });

      const approveCustomTx = await customTokenClient.approve({
        from: publicKey,
        spender: pooladdress ?? "",
        amount: BigInt(liquidityData.tokenAmount) * BigInt(10 ** 18),
        expiration_ledger: expirationLedger,
      });
      await approveCustomTx.signAndSend();
      
      // Mark custom token approval as completed
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'approve-custom' ? { ...step, status: 'completed' } : step
      ));

      // Step 2: Handle second token (USDC or XLM)
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'approve-second-token' ? { ...step, status: 'processing' } : step
      ));

      if (liquidityData.useXlm) {
        // For XLM pools, no approval needed - XLM is transferred directly
        console.log("XLM pool - no approval needed for native XLM");
      } else {
        // For USDC pools, approve USDC
        const usdcClient = new UsdtTokenClient({
          ...clientOptions,
          contractId: CONTRACT_ADDRESSES.USDTToken,
        });

        const approveUsdcTx = await usdcClient.approve({
          from: publicKey,
          spender: pooladdress ?? "",
          amount: BigInt(liquidityData.xlmAmount) * BigInt(10 ** 6),
          expiration_ledger: expirationLedger,
        });
        await approveUsdcTx.signAndSend();
      }
      
      // Mark second token step as completed
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'approve-second-token' ? { ...step, status: 'completed' } : step
      ));

      // Step 3: Add Liquidity
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'add-liquidity' ? { ...step, status: 'processing' } : step
      ));

      const poolClient = new PoolClient({
        ...clientOptions,
        contractId: pooladdress ?? "",
      });

      // Debug: Check current pool state
      try {
        const tokenA = await poolClient.get_token_a();
        const tokenB = await poolClient.get_token_b();
        const reserves = await poolClient.get_reserves();
        
        console.log("Debug - Pool State:", {
          tokenA: tokenA.result,
          tokenB: tokenB.result,
          reserveA: reserves.result[0].toString(),
          reserveB: reserves.result[1].toString(),
          expectedTokenA: tokenaddress,
          expectedTokenB: liquidityData.useXlm ? "native" : CONTRACT_ADDRESSES.USDTToken,
          isFirstLiquidity: reserves.result[0] === BigInt(0) && reserves.result[1] === BigInt(0)
        });
      } catch (error) {
        console.error("Error getting pool state:", error);
      }

      // Debug: Log the amounts being sent
      console.log("Debug - Add Liquidity:", {
        poolAddress: pooladdress,
        tokenAddress: tokenaddress,
        secondTokenAddress: liquidityData.useXlm ? "native" : CONTRACT_ADDRESSES.USDTToken,
        tokenAmount: liquidityData.tokenAmount,
        secondTokenAmount: liquidityData.xlmAmount,
        tokenAmountRaw: (BigInt(liquidityData.tokenAmount) * BigInt(10 ** 18)).toString(),
        secondTokenAmountRaw: secondTokenAmountRaw.toString(),
        useXlm: liquidityData.useXlm,
        caller: publicKey
      });
 
      const addLiquidityTx = await poolClient.add_liquidity({
        caller: publicKey,
        amount_a: BigInt(liquidityData.tokenAmount) * BigInt(10 ** 18),
        amount_b: secondTokenAmountRaw,
      });
      await addLiquidityTx.signAndSend();
      
      // Mark add liquidity as completed
      setLiquiditySteps(prev => prev.map(step => 
        step.id === 'add-liquidity' ? { ...step, status: 'completed' } : step
      ));

      // Success - close modal after a brief delay to show completion
      setTimeout(() => {
        setShowLiquidityModal(false);
        setTransactionStatus("Liquidity added successfully!");
        setCurrentStep(4);
      }, 1500);

      toast({
        title: "Success",
        description: `Liquidity added successfully with ${liquidityData.useXlm ? 'native XLM' : 'USDC'} support!`,
      });

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Error adding liquidity";
      setLiquidityError(errorMessage);
      
      // Mark current step as error
      setLiquiditySteps(prev => prev.map(step => 
        step.status === 'processing' ? { ...step, status: 'error' } : step
      ));

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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
          {/* <Button 
                onClick={handleWasmHash} 
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3"
                disabled={isProcessing}
              >
                 token factory wasm hash
              </Button>

              <Button 
                onClick={handlePoolWasmHash} 
                className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3 mt-4"
                disabled={isProcessing}
              >
                 pool factory wasm hash
              </Button> */}
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

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="mb-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <div className="flex items-center justify-center space-x-2">
              <Cloud className="w-5 h-5 text-blue-400 animate-pulse" />
              <p className="text-center text-blue-300">{uploadProgress}</p>
            </div>
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
                <Label htmlFor="image" className="flex items-center">
                  Token Image
                  <span className="text-red-400 ml-1">*</span>
                </Label>
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
                      required
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Required: 512x512px, PNG/JPG/GIF/WebP (max 10MB)
                    </p>
                    {imageFile && (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ Image selected: {imageFile.name}
                      </p>
                    )}
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
                disabled={isProcessing || !imageFile}
              >
                {isProcessing ? (
                  uploadProgress ? "Uploading to IPFS..." : "Processing..."
                ) : !imageFile ? (
                  "Please Upload Token Image First"
                ) : (
                  "Launch Token"
                )}
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
              {/* Pool Type Selection */}
              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Pool Type</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">Choose the second token for your pool:</span>
                  </div>
                </Label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setLiquidityData({ ...liquidityData, useXlm: false })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      !liquidityData.useXlm 
                        ? 'border-green-500 bg-green-500/10 text-green-400' 
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <img src="/usdc.png" alt="USDC" className="w-5 h-5 rounded-full" />
                      <span className="font-medium">USDC Pool</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setLiquidityData({ ...liquidityData, useXlm: true })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      liquidityData.useXlm 
                        ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400' 
                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Coins className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">XLM Pool</span>
                    </div>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You're creating a {liquidityData.useXlm ? 'XLM' : 'USDC'} pool for {tokenData.symbol || 'your token'}
                </p>
              </div>

              <div>
                <Label>Slippage Tolerance (%)</Label>
                <Input
                  type="number"
                  value={poolData.slippageTolerance}
                  disabled={true}
                  className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default value: 1%. This setting helps protect against price fluctuations during pool creation.
                </p>
              </div>

              <div>
                <Label>Pool Fee (%)</Label>
                <Input
                  type="number"
                  value={poolData.fee}
                  disabled={true}
                  className="bg-gray-700 border-gray-600 text-gray-300 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default value: 0.3%. This is the standard AMM fee that will be applied to all swaps in this pool.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mt-4">
                <p className="text-sm text-blue-300">
                  💡 <strong>Ready to proceed?</strong> You're creating a {liquidityData.useXlm ? 'XLM' : 'USDC'} pool with optimized default settings. 
                  The pool will be created with {tokenData.symbol || 'your token'}/{liquidityData.useXlm ? 'XLM' : 'USDC'} pair.
                </p>
              </div>

              <Button 
                onClick={handleCreatePool} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : `Create ${liquidityData.useXlm ? 'XLM' : 'USDC'} Pool`}
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
              {/* Pool Type Display */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {liquidityData.useXlm ? (
                      <Coins className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <img src="/usdc.png" alt="USDC" className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-sm font-medium">
                      {tokenData.symbol || 'Your Token'}/{liquidityData.useXlm ? 'XLM' : 'USDC'} Pool
                    </span>
                  </div>
                  <span className="text-xs text-blue-400">
                    Pool Created ✓
                  </span>
                </div>
                <p className="text-xs text-blue-300 mt-1">
                  Pool address: {pooladdress ? `${pooladdress.slice(0, 8)}...${pooladdress.slice(-8)}` : 'Loading...'}
                </p>
              </div>

              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>Token Amount</span>
                  <div className="flex items-center space-x-2">
                    {isLoadingBalances ? (
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-gray-400">Balance:</span>
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-medium">
                          {tokenBalance} {tokenData.symbol || "TOKEN"}
                        </span>
                        <button
                          onClick={fetchBalances}
                          className="text-gray-400 hover:text-blue-400 transition-colors"
                          title="Refresh balance"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </Label>
                <Input
                  type="number"
                  value={liquidityData.tokenAmount}
                  onChange={(e) => setLiquidityData({ ...liquidityData, tokenAmount: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                />
              </div>

              <div>
                <Label className="flex items-center justify-between mb-2">
                  <span>{liquidityData.useXlm ? 'XLM' : 'USDC'} Amount</span>
                  <div className="flex items-center space-x-2">
                    {isLoadingBalances ? (
                      <div className="flex items-center space-x-1 text-xs text-gray-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-xs">
                        <span className="text-gray-400">Balance:</span>
                        <span className={`px-2 py-1 rounded-full font-medium ${
                          liquidityData.useXlm 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {liquidityData.useXlm ? xlmBalance : usdcBalance} {liquidityData.useXlm ? 'XLM' : 'USDC'}
                        </span>
                        <button
                          onClick={fetchBalances}
                          className={`transition-colors ${
                            liquidityData.useXlm 
                              ? 'text-gray-400 hover:text-yellow-400' 
                              : 'text-gray-400 hover:text-green-400'
                          }`}
                          title="Refresh balance"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {!liquidityData.useXlm && (
                      <Link href="https://cosmo-dex.netlify.app/minter" target="_blank" className="text-blue-500 hover:text-blue-600 flex items-center gap-1">
                        <span className="text-xs">Faucet</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </Label>
                <Input
                  type="number"
                  value={liquidityData.xlmAmount}
                  onChange={(e) => setLiquidityData({ ...liquidityData, xlmAmount: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-700"
                  placeholder={`Enter ${liquidityData.useXlm ? 'XLM' : 'USDC'} amount`}
                />
              </div>

              {/* Pool Information */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Pool Information</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Token Pair:</span>
                    <span className="text-white">
                      {tokenData.symbol || "TOKEN"} / {liquidityData.useXlm ? "XLM" : "USDC"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pool Type:</span>
                    <span className={`font-medium ${
                      liquidityData.useXlm ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {liquidityData.useXlm ? 'Native XLM Pool' : 'Standard Pool'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your Token Amount:</span>
                    <span className="text-white">
                      {liquidityData.tokenAmount || 0} {tokenData.symbol || "TOKEN"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{liquidityData.useXlm ? 'XLM' : 'USDC'} Amount:</span>
                    <span className="text-white">
                      {liquidityData.xlmAmount || 0} {liquidityData.useXlm ? 'XLM' : 'USDC'}
                    </span>
                  </div>
                </div>
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
                onClick={() => setShowLiquidityModal(true)} 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3"
                disabled={isProcessing || !liquidityData.tokenAmount || !liquidityData.xlmAmount}
              >
                {isProcessing ? "Processing..." : `Add Liquidity with ${liquidityData.useXlm ? 'XLM' : 'USDC'}`}
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

      {/* Liquidity Modal */}
      {showLiquidityModal && (
        <LiquidityModal
          isOpen={showLiquidityModal}
          onClose={() => {
            setShowLiquidityModal(false);
            setTransactionStatus(null);
            setUploadProgress(null);
          }}
          currentStep={liquiditySteps.findIndex(s => s.status === 'pending') + 1}
          steps={liquiditySteps}
          isProcessing={isProcessing}
          error={liquidityError}
          onRetry={resetLiquidityProcess}
        />
      )}
    </div>
  )
}
