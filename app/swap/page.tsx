"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, Settings, TrendingUp, Clock, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { Client as TokenFactoryClient } from "@/packages/TokenLauncher/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import { Client as UsdtTokenClient } from "@/packages/USDTToken/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { getPublicKey, signTransaction } from "@/lib/stellar-wallets-kit"
import * as Stellar from "@stellar/stellar-sdk"

// Interface for token metadata from IPFS
interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: {
    admin_addr: string;
    decimals: number;
    total_supply: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    created_at: string;
  };
}

// Interface for swap token data
interface SwapToken {
  symbol: string;
  name: string;
  image: string;
  contractAddress: string;
  balance: string;
  decimals: number;
}

// Interface for pool data
interface PoolData {
  poolAddress: string;
  reserves: [bigint, bigint];
  tokenA: string;
  tokenB: string;
}

const recentTrades = [
  { from: "PEPE", to: "USDC", amount: "100,000", value: "$1,200", time: "2m ago", type: "buy" },
  { from: "USDC", to: "DMAX", amount: "500", value: "$500", time: "5m ago", type: "sell" },
  { from: "MSHIB", to: "USDC", amount: "25,000", value: "$2,225", time: "8m ago", type: "buy" },
]

export default function SwapPage() {
  const [fromToken, setFromToken] = useState("USDC")
  const [toToken, setToToken] = useState("")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippage, setSlippage] = useState("2")
  const [availableTokens, setAvailableTokens] = useState<SwapToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isLoadingSwap, setIsLoadingSwap] = useState(false)
  const [currentPool, setCurrentPool] = useState<PoolData | null>(null)
  const [swapError, setSwapError] = useState<string | null>(null)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({})
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)

  // Initialize wallet connection
  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  // Fetch metadata from IPFS URL
  const fetchMetadataFromIPFS = async (ipfsUrl: string): Promise<TokenMetadata | null> => {
    try {
      const response = await fetch(ipfsUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error("Error fetching metadata from IPFS:", error);
      return null;
    }
  };

  // Fetch token metadata and create swap token
  const fetchTokenMetadata = async (tokenAddress: string): Promise<SwapToken | null> => {
    try {
      const tokenFactoryClient = new TokenFactoryClient({
        contractId: CONTRACT_ADDRESSES.TokenLauncher,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const metadataResult = await tokenFactoryClient.get_token_metadata({
        token_addr: tokenAddress
      });

      let ipfsUrl = "";
      if (metadataResult && typeof metadataResult === "object" && "result" in metadataResult) {
        ipfsUrl = metadataResult.result;
      } else if (typeof metadataResult === "string") {
        ipfsUrl = metadataResult;
      }

      if (!ipfsUrl) {
        console.error("No IPFS URL found for token:", tokenAddress);
        return null;
      }

      const metadata = await fetchMetadataFromIPFS(ipfsUrl);
      if (!metadata) {
        return null;
      }

      return {
        symbol: metadata.symbol,
        name: metadata.name,
        image: metadata.image,
        contractAddress: tokenAddress,
        balance: "0", // Will be updated later
        decimals: metadata.attributes.decimals,
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
    }
  };

  // Fetch all available tokens
  const fetchAvailableTokens = async () => {
    try {
      setIsLoadingTokens(true);
      const tokenFactoryClient = new TokenFactoryClient({
        contractId: CONTRACT_ADDRESSES.TokenLauncher,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const tokens = await tokenFactoryClient.get_all_deployed_tokens();
      
      let tokenAddresses: string[] = [];
      if (tokens && typeof tokens === "object" && "result" in tokens && Array.isArray(tokens.result)) {
        tokenAddresses = tokens.result;
      } else if (Array.isArray(tokens)) {
        tokenAddresses = tokens;
      }

      // Fetch metadata for each token
      const tokenPromises = tokenAddresses.map(fetchTokenMetadata);
      const tokenResults = await Promise.all(tokenPromises);
      
      // Filter out null results
      const validTokens = tokenResults.filter((token): token is SwapToken => token !== null);

      // Add USDC token
      const usdcToken: SwapToken = {
        symbol: "USDC",
        name: "USD Coin",
        image: "/usdc.png",
        contractAddress: CONTRACT_ADDRESSES.USDTToken,
        balance: "0",
        decimals: 6,
      };

      const allTokens = [usdcToken, ...validTokens];
      setAvailableTokens(allTokens);
      
      // Set initial toToken if not set
      if (!toToken && allTokens.length > 1) {
        setToToken(allTokens[1].symbol);
      }

      console.log("Available tokens loaded:", allTokens);
    } catch (error) {
      console.error("Failed to fetch available tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Fetch pool data for token pair
  const fetchPoolData = async (tokenAAddress: string, tokenBAddress: string): Promise<PoolData | null> => {
    try {
      const poolFactoryClient = new PoolFactoryClient({
        contractId: CONTRACT_ADDRESSES.PoolFactory,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      // Try both directions: tokenA/tokenB and tokenB/tokenA
      let poolResult = await poolFactoryClient.get_pool({
        token_a: tokenAAddress,
        token_b: tokenBAddress,
      });

      let poolAddress = "";
      if (poolResult && typeof poolResult === "object" && "result" in poolResult) {
        poolAddress = poolResult.result || "";
      } else if (typeof poolResult === "string") {
        poolAddress = poolResult;
      }

      // If first direction didn't work, try the reverse
      if (!poolAddress) {
        poolResult = await poolFactoryClient.get_pool({
          token_a: tokenBAddress,
          token_b: tokenAAddress,
        });

        if (poolResult && typeof poolResult === "object" && "result" in poolResult) {
          poolAddress = poolResult.result || "";
        } else if (typeof poolResult === "string") {
          poolAddress = poolResult;
        }
      }

      if (!poolAddress) {
        console.log("No pool found for token pair");
        return null;
      }

      // Get pool reserves
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const reservesResult = await poolClient.get_reserves();
      let reserves: [bigint, bigint] = [BigInt(0), BigInt(0)];
      
      if (reservesResult && typeof reservesResult === "object" && "result" in reservesResult) {
        const result = reservesResult.result;
        if (Array.isArray(result) && result.length === 2) {
          reserves = [BigInt(result[0]), BigInt(result[1])];
        }
      }

      return {
        poolAddress,
        reserves,
        tokenA: tokenAAddress,
        tokenB: tokenBAddress,
      };
    } catch (error) {
      console.error("Error fetching pool data:", error);
      return null;
    }
  };

  // Format number with hover tooltip
  const formatNumberWithTooltip = (value: number | string, decimals: number = 2): { display: string; fullValue: string } => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(numValue)) {
      return { display: '0.00', fullValue: '0' };
    }

    // Check if number is very large (scientific notation)
    if (Math.abs(numValue) >= 1e6) {
      const fullValue = numValue.toLocaleString('fullwide', { useGrouping: false });
      const display = numValue.toFixed(decimals);
      return { display, fullValue };
    }

    // Regular number formatting
    const display = numValue.toFixed(decimals);
    const fullValue = numValue.toLocaleString('fullwide', { useGrouping: false });
    return { display, fullValue };
  };

  // Calculate swap amount out
  const calculateSwapAmountOut = (amountIn: string, reserves: [bigint, bigint], decimalsIn: number, decimalsOut: number): string => {
    if (!amountIn || !reserves || reserves[0] === BigInt(0) || reserves[1] === BigInt(0)) {
      return "0";
    }

    const amountInBigInt = BigInt(parseFloat(amountIn) * Math.pow(10, decimalsIn));
    const reserveIn = reserves[0];
    const reserveOut = reserves[1];

    // Calculate with 0.3% fee
    const fee = BigInt(30); // 0.3% = 30 basis points
    const feeDenominator = BigInt(10000);
    const amountInWithFee = (amountInBigInt * (feeDenominator - fee)) / feeDenominator;

    // Constant product formula: (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
    const numerator = reserveOut * amountInWithFee;
    const denominator = reserveIn + amountInWithFee;
    const amountOut = numerator / denominator;

    // Convert back to human readable format
    return (Number(amountOut) / Math.pow(10, decimalsOut)).toFixed(6);
  };

  // Handle token selection change
  const handleTokenChange = async (tokenSymbol: string, isFromToken: boolean) => {
    if (isFromToken) {
      setFromToken(tokenSymbol);
    } else {
      setToToken(tokenSymbol);
    }

    // Clear amounts when tokens change
    setFromAmount("");
    setToAmount("");
    setCurrentPool(null);
    setSwapError(null);
  };

  // Handle amount input change
  const handleAmountChange = async (amount: string, isFromAmount: boolean) => {
    if (isFromAmount) {
      setFromAmount(amount);
      
      if (amount && currentPool && fromToken && toToken) {
        const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
        const toTokenData = availableTokens.find(t => t.symbol === toToken);
        
        if (fromTokenData && toTokenData) {
          // Get raw reserves from pool
          const rawReserveA = currentPool.reserves[0];
          const rawReserveB = currentPool.reserves[1];
          
          console.log("Debug - Pool reserves:", {
            rawReserveA: rawReserveA.toString(),
            rawReserveB: rawReserveB.toString(),
            tokenA: currentPool.tokenA,
            tokenB: currentPool.tokenB,
            fromToken: fromToken,
            toToken: toToken,
            fromTokenContract: fromTokenData.contractAddress,
            toTokenContract: toTokenData.contractAddress,
            tokenAIsUSDC: currentPool.tokenA === CONTRACT_ADDRESSES.USDTToken,
            tokenBIsUSDC: currentPool.tokenB === CONTRACT_ADDRESSES.USDTToken,
            reserveAMapping: currentPool.tokenA === CONTRACT_ADDRESSES.USDTToken ? 'USDC' : 'Meme Token',
            reserveBMapping: currentPool.tokenB === CONTRACT_ADDRESSES.USDTToken ? 'USDC' : 'Meme Token'
          });
          
          // Use dynamic reserve mapping
          const { reserveIn, reserveOut, decimalsIn, decimalsOut } = getReserveMapping(fromTokenData, toTokenData, currentPool);
          
          console.log("Debug - Reserve mapping:", {
            reserveIn: reserveIn.toString(),
            reserveOut: reserveOut.toString(),
            decimalsIn,
            decimalsOut,
            fromTokenDecimals: fromTokenData.decimals,
            toTokenDecimals: toTokenData.decimals,
            fromToken: fromToken,
            toToken: toToken,
            swapDirection: `${fromToken} → ${toToken}`,
            rawReserveA: rawReserveA.toString(),
            rawReserveB: rawReserveB.toString(),
            tokenA: currentPool.tokenA,
            tokenB: currentPool.tokenB,
            fromTokenContract: fromTokenData.contractAddress,
            toTokenContract: toTokenData.contractAddress
          });
          
          // Calculate swap amount out using AMM formula
          const amountIn = parseFloat(amount);
          if (amountIn > 0 && reserveIn > BigInt(0) && reserveOut > BigInt(0)) {
            // Convert input amount to BigInt with proper decimals
            const amountInBigInt = BigInt(amountIn * Math.pow(10, decimalsIn));
            
            console.log("Debug - Calculation inputs:", {
              amountIn,
              amountInBigInt: amountInBigInt.toString(),
              reserveIn: reserveIn.toString(),
              reserveOut: reserveOut.toString(),
              calculation: `${amountIn} ${fromToken} (${decimalsIn} decimals) → ${toToken} (${decimalsOut} decimals)`
            });
            
            // Calculate with 0.3% fee
            const fee = BigInt(30); // 0.3% = 30 basis points
            const feeDenominator = BigInt(10000);
            const amountInWithFee = (amountInBigInt * (feeDenominator - fee)) / feeDenominator;
            
            // Constant product formula: (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
            const numerator = reserveOut * amountInWithFee;
            const denominator = reserveIn + amountInWithFee;
            const amountOut = numerator / denominator;
            
            console.log("Debug - AMM calculation:", {
              amountInWithFee: amountInWithFee.toString(),
              numerator: numerator.toString(),
              denominator: denominator.toString(),
              amountOut: amountOut.toString(),
              fee: fee.toString(),
              feeDenominator: feeDenominator.toString()
            });
            
            // Convert back to human readable format
            const amountOutHuman = Number(amountOut) / Math.pow(10, decimalsOut);
            const result = amountOutHuman.toFixed(6);
            
            console.log("Debug - Final result:", {
              amountOutHuman,
              result,
              swapResult: `${amountIn} ${fromToken} → ${result} ${toToken}`,
              conversionFactor: Math.pow(10, decimalsOut),
              amountOutRaw: amountOut.toString()
            });
            
            setToAmount(result);
          } else {
            console.log("Debug - Invalid inputs:", {
              amountIn: parseFloat(amount),
              reserveIn: reserveIn.toString(),
              reserveOut: reserveOut.toString(),
              amountInValid: amountIn > 0,
              reserveInValid: reserveIn > BigInt(0),
              reserveOutValid: reserveOut > BigInt(0)
            });
            setToAmount("0");
          }
        }
      } else {
        setToAmount("");
      }
    }
  };

  // Handle swap tokens button
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
    setCurrentPool(null);
    setSwapError(null);
  };

  // Fetch token balance for a specific token
  const fetchTokenBalance = async (tokenAddress: string, decimals: number): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const tokenClient = new UsdtTokenClient({
        contractId: tokenAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const balanceResult = await tokenClient.balance({
        id: publicKey
      });

      let balance = BigInt(0);
      if (balanceResult && typeof balanceResult === "object" && "result" in balanceResult) {
        balance = BigInt(balanceResult.result || 0);
      } else if (typeof balanceResult === "string" || typeof balanceResult === "number") {
        balance = BigInt(balanceResult);
      }

      // Convert to human readable format with 2 decimal places
      const humanReadableBalance = Number(balance) / Math.pow(10, decimals);
      return humanReadableBalance.toFixed(2);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return "0";
    }
  };

  // Fetch balances for all available tokens
  const fetchAllTokenBalances = async () => {
    if (!publicKey || availableTokens.length === 0) return;

    try {
      setIsLoadingBalances(true);
      const balancePromises = availableTokens.map(async (token) => {
        const balance = await fetchTokenBalance(token.contractAddress, token.decimals);
        return { symbol: token.symbol, balance };
      });

      const balanceResults = await Promise.all(balancePromises);
      const balanceMap: Record<string, string> = {};
      
      balanceResults.forEach(({ symbol, balance }) => {
        balanceMap[symbol] = balance;
      });

      setTokenBalances(balanceMap);
    } catch (error) {
      console.error("Error fetching token balances:", error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  // Execute swap
  const executeSwap = async () => {
    if (!publicKey || !currentPool || !fromAmount || !toAmount) {
      setSwapError("Please connect wallet and enter amounts");
      return;
    }

    try {
      setIsLoadingSwap(true);
      setSwapError(null);

      const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
      if (!fromTokenData) {
        throw new Error("From token not found");
      }

      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const currentLedger = await server.ledgers().order('desc').limit(1).call();
      const expirationLedger = currentLedger.records[0].sequence + 1000;

      // First, approve the pool to spend tokens
      const tokenClient = new UsdtTokenClient({
        contractId: fromTokenData.contractAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        publicKey: publicKey,
        signTransaction: signTransaction,
        allowHttp: true,
      });

      const amountIn = BigInt(parseFloat(fromAmount) * Math.pow(10, fromTokenData.decimals));

      // Approve pool to spend tokens
      const approveTx = await tokenClient.approve({
        from: publicKey,
        spender: currentPool.poolAddress,
        amount: amountIn,
        expiration_ledger: expirationLedger,
      });
      await approveTx.signAndSend();

      // Execute swap
      const poolClient = new PoolClient({
        contractId: currentPool.poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        publicKey: publicKey,
        signTransaction: signTransaction,
        allowHttp: true,
      });

      const swapTx = await poolClient.swap({
        caller: publicKey,
        input_token: fromTokenData.contractAddress,
        amount_in: amountIn,
      });
      
      const result = await swapTx.signAndSend();
      console.log("Swap successful:", result);

      // Clear form
      setFromAmount("");
      setToAmount("");
      
      // Refresh pool data
      const newPoolData = await fetchPoolData(currentPool.tokenA, currentPool.tokenB);
      setCurrentPool(newPoolData);

      // Refresh balances after successful swap
      await fetchAllTokenBalances();

    } catch (error) {
      console.error("Swap failed:", error);
      setSwapError(error instanceof Error ? error.message : "Swap failed");
    } finally {
      setIsLoadingSwap(false);
    }
  };

  // Load tokens on component mount
  useEffect(() => {
    fetchAvailableTokens();
  }, []);

  // Update pool data when tokens change
  useEffect(() => {
    if (fromToken && toToken && availableTokens.length > 0) {
      const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
      const toTokenData = availableTokens.find(t => t.symbol === toToken);
      
      if (fromTokenData && toTokenData) {
        fetchPoolData(fromTokenData.contractAddress, toTokenData.contractAddress)
          .then(setCurrentPool)
          .catch(console.error);
      }
    }
  }, [fromToken, toToken, availableTokens]);

  // Fetch balances when wallet connects or tokens change
  useEffect(() => {
    if (publicKey && availableTokens.length > 0) {
      fetchAllTokenBalances();
    }
  }, [publicKey, availableTokens]);

  // Dynamic reserve mapping function
  const getReserveMapping = (fromTokenData: SwapToken, toTokenData: SwapToken, pool: PoolData): { reserveIn: bigint; reserveOut: bigint; decimalsIn: number; decimalsOut: number } => {
    // Find which reserve contains the fromToken and which contains the toToken
    let fromTokenReserve: bigint;
    let toTokenReserve: bigint;
    let fromTokenDecimals: number;
    let toTokenDecimals: number;
    
    // Check if reserves are stored in reverse order (reserve A = meme token, reserve B = USDC)
    const reserveAIsMemeToken = pool.reserves[0] > pool.reserves[1]; // Meme tokens have larger numbers
    const reserveBIsUSDC = pool.reserves[1] < pool.reserves[0]; // USDC has smaller numbers
    
    console.log("Debug - Reserve analysis:", {
      reserveA: pool.reserves[0].toString(),
      reserveB: pool.reserves[1].toString(),
      reserveAIsMemeToken,
      reserveBIsUSDC,
      fromTokenIsUSDC: fromTokenData.contractAddress === CONTRACT_ADDRESSES.USDTToken,
      toTokenIsUSDC: toTokenData.contractAddress === CONTRACT_ADDRESSES.USDTToken
    });
    
    if (fromTokenData.contractAddress === CONTRACT_ADDRESSES.USDTToken) {
      // From token is USDC - use the smaller reserve (reserve B)
      fromTokenReserve = pool.reserves[1];
      toTokenReserve = pool.reserves[0];
      fromTokenDecimals = fromTokenData.decimals;
      toTokenDecimals = toTokenData.decimals;
      console.log("Debug - From token (USDC) using reserve B (smaller reserve)");
    } else {
      // From token is meme token - use the larger reserve (reserve A)
      fromTokenReserve = pool.reserves[0];
      toTokenReserve = pool.reserves[1];
      fromTokenDecimals = fromTokenData.decimals;
      toTokenDecimals = toTokenData.decimals;
      console.log("Debug - From token (meme) using reserve A (larger reserve)");
    }
    
    // Set the mapping for the swap calculation
    const reserveIn = fromTokenReserve;
    const reserveOut = toTokenReserve;
    const decimalsIn = fromTokenDecimals;
    const decimalsOut = toTokenDecimals;
    
    console.log("Debug - Final reserve mapping:", {
      reserveIn: reserveIn.toString(),
      reserveOut: reserveOut.toString(),
      decimalsIn,
      decimalsOut,
      fromTokenSymbol: fromTokenData.symbol,
      toTokenSymbol: toTokenData.symbol
    });
    
    return { reserveIn, reserveOut, decimalsIn, decimalsOut };
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Swap Tokens
          </h1>
          <p className="text-gray-400 text-lg">Trade meme tokens with minimal slippage and low fees</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8 max-w-2xl mx-auto">
          {/* Swap Interface */}
          <div>
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
                      Balance: {isLoadingBalances ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Loading...
                        </span>
                      ) : (
                        tokenBalances[fromToken] || "0"
                      )} {fromToken}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      placeholder="0.0"
                      value={fromAmount}
                      onChange={(e) => handleAmountChange(e.target.value, true)}
                      className="bg-transparent border-none text-2xl font-semibold p-0 h-auto"
                    />
                    <Select value={fromToken} onValueChange={(value) => handleTokenChange(value, true)}>
                      <SelectTrigger className="w-full sm:w-auto bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {isLoadingTokens ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading tokens...</span>
                            </div>
                          </SelectItem>
                        ) : (
                          availableTokens.map((token) => (
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
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-400 mt-2 sm:hidden">
                    Balance: {isLoadingBalances ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Loading...
                      </span>
                    ) : (
                      tokenBalances[fromToken] || "0"
                    )} {fromToken}
                  </div>
                </div>

                {/* Swap Button */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSwapTokens}
                    className="rounded-full bg-gray-800 hover:bg-gray-700"
                    disabled={!fromToken || !toToken}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* To Token */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">To</span>
                    <span className="text-sm text-gray-400 hidden sm:inline">
                      Balance: {isLoadingBalances ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          Loading...
                        </span>
                      ) : (
                        tokenBalances[toToken] || "0"
                      )} {toToken}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Input
                      placeholder="0.0"
                      value={toAmount}
                      readOnly
                      className="bg-transparent border-none text-2xl font-semibold p-0 h-auto"
                    />
                    <Select value={toToken} onValueChange={(value) => handleTokenChange(value, false)}>
                      <SelectTrigger className="w-full sm:w-auto bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {isLoadingTokens ? (
                          <SelectItem value="loading" disabled>
                            <div className="flex items-center space-x-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading tokens...</span>
                            </div>
                          </SelectItem>
                        ) : (
                          availableTokens.map((token) => (
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
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-400 mt-2 sm:hidden">
                    Balance: {isLoadingBalances ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        Loading...
                      </span>
                    ) : (
                      tokenBalances[toToken] || "0"
                    )} {toToken}
                  </div>
                </div>

                {/* Error Message */}
                {swapError && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-red-400 text-sm">{swapError}</p>
                    </div>
                  </div>
                )}

                {/* Pool Status */}
                {fromToken && toToken && (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Pool Status</span>
                      {currentPool ? (
                        <span className="text-sm text-green-400">✓ Pool Found</span>
                      ) : (
                        <span className="text-sm text-red-400">✗ No Pool Available</span>
                      )}
                    </div>
                    {currentPool && (
                      <div className="mt-2 text-xs text-gray-400">
                        <div>Pool Address: {currentPool.poolAddress.slice(0, 8)}...{currentPool.poolAddress.slice(-8)}</div>
                        
                        
                        {/* <div className="flex items-center space-x-4"> */}
                          {/* <div className="relative group"> */}
                            {/* <span>Reserve A ({currentPool.tokenA === CONTRACT_ADDRESSES.USDTToken ? 'USDT' : 'Meme Token'}): </span>
                            <span className="cursor-help">
                              {formatNumberWithTooltip(Number(currentPool.reserves[0]) / Math.pow(10, currentPool.tokenA === CONTRACT_ADDRESSES.USDTToken ? 6 : 18)).display}
                            </span> */}
                            {/* <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {formatNumberWithTooltip(Number(currentPool.reserves[0]) / Math.pow(10, currentPool.tokenA === CONTRACT_ADDRESSES.USDTToken ? 6 : 18)).fullValue}
                            </div> */}
                          {/* </div> */}
                          {/* <div className="relative group"> */}
                            {/* <span>Reserve B ({currentPool.tokenB === CONTRACT_ADDRESSES.USDTToken ? 'USDT' : 'Meme Token'}): </span>
                            <span className="cursor-help">
                              {formatNumberWithTooltip(Number(currentPool.reserves[1]) / Math.pow(10, currentPool.tokenB === CONTRACT_ADDRESSES.USDTToken ? 6 : 18)).display}
                            </span>
                            <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {formatNumberWithTooltip(Number(currentPool.reserves[1]) / Math.pow(10, currentPool.tokenB === CONTRACT_ADDRESSES.USDTToken ? 6 : 18)).fullValue}
                            </div> */}
                          {/* </div> */}
                        {/* </div> */}
                      </div>
                    )}
                  </div>
                )}

                {/* Swap Details */}
                {fromAmount && toAmount && currentPool && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rate</span>
                      <span>
                        1 {fromToken} = {(() => {
                          const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
                          const toTokenData = availableTokens.find(t => t.symbol === toToken);
                          
                          if (!fromTokenData || !toTokenData || !currentPool) return "0.00";
                          
                          // Calculate rate for exactly 1 unit of fromToken
                          const { reserveIn, reserveOut, decimalsIn, decimalsOut } = getReserveMapping(fromTokenData, toTokenData, currentPool);
                          
                          // Calculate with 0.3% fee for 1 unit
                          const amountInBigInt = BigInt(Math.pow(10, decimalsIn)); // 1 unit in raw format
                          const fee = BigInt(30); // 0.3% = 30 basis points
                          const feeDenominator = BigInt(10000);
                          const amountInWithFee = (amountInBigInt * (feeDenominator - fee)) / feeDenominator;
                          
                          // Constant product formula: (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee)
                          const numerator = reserveOut * amountInWithFee;
                          const denominator = reserveIn + amountInWithFee;
                          const amountOut = numerator / denominator;
                          
                          // Convert back to human readable format
                          const rate = Number(amountOut) / Math.pow(10, decimalsOut);
                          
                          return rate.toFixed(6);
                        })()} {toToken}
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
            
                  </div>
                )}

                {/* Swap Button */}
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold py-3"
                  disabled={!publicKey || !currentPool || !fromAmount || !toAmount || isLoadingSwap}
                  onClick={executeSwap}
                >
                  {isLoadingSwap ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Swapping...</span>
                    </div>
                  ) : !publicKey ? (
                    "Connect Wallet"
                  ) : !currentPool ? (
                    "No Pool Available"
                  ) : !fromAmount || !toAmount ? (
                    "Enter Amount"
                  ) : (
                    `Swap ${fromToken} for ${toToken}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

            {/* Recent Trades */}
          {/* <div>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-blue-500" />
                  Recent Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTrades.map((trade, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${trade.type === "buy" ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-sm">
                          {trade.amount} {trade.from}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{trade.value}</div>
                        <div className="text-xs text-gray-400">{trade.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div> */}
        </div>
      </div>
    </div>
  )
}
