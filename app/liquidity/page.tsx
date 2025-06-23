"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Droplets, Plus, Minus, TrendingUp, DollarSign, Loader2, AlertCircle } from "lucide-react"
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

// Interface for liquidity token data
interface LiquidityToken {
  symbol: string;
  name: string;
  image: string;
  contractAddress: string;
  balance: string;
  decimals: number;
}

// Interface for pool data
interface PoolData {
  id: string;
  poolAddress: string;
  tokenA: LiquidityToken;
  tokenB: LiquidityToken;
  reserves: [bigint, bigint];
  tvl: string;
  apr: string;
  volume24h: string;
  myLiquidity: string;
  myShare: string;
  fees24h: string;
  lpTokenBalance: string;
}

export default function LiquidityPage() {
  const [pools, setPools] = useState<PoolData[]>([])
  const [availableTokens, setAvailableTokens] = useState<LiquidityToken[]>([])
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null)
  const [tokenAAmount, setTokenAAmount] = useState("")
  const [tokenBAmount, setTokenBAmount] = useState("")
  const [removePercentage, setRemovePercentage] = useState(25)
  const [isLoadingPools, setIsLoadingPools] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false)
  const [isRemovingLiquidity, setIsRemovingLiquidity] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLiquidity, setIsInitialLiquidity] = useState(false)
  const [lastEditedField, setLastEditedField] = useState<'tokenA' | 'tokenB' | null>(null)

  // Initialize wallet connection
  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  // Get reserve mapping for proportional calculations (similar to swap page)
  const getReserveMapping = (tokenAData: LiquidityToken, tokenBData: LiquidityToken, pool: PoolData): { reserveIn: bigint; reserveOut: bigint; decimalsIn: number; decimalsOut: number } => {
    // Get raw reserves from pool
    const rawReserveA = pool.reserves[0];
    const rawReserveB = pool.reserves[1];
    
    console.log("Debug - Liquidity reserve analysis:", {
      reserveA: rawReserveA.toString(),
      reserveB: rawReserveB.toString(),
      tokenAIsUSDC: tokenAData.contractAddress === CONTRACT_ADDRESSES.USDTToken,
      tokenBIsUSDC: tokenBData.contractAddress === CONTRACT_ADDRESSES.USDTToken,
      tokenASymbol: tokenAData.symbol,
      tokenBSymbol: tokenBData.symbol
    });
    
    // Map reserves based on token types
    let reserveIn: bigint;
    let reserveOut: bigint;
    let decimalsIn: number;
    let decimalsOut: number;
    
    if (tokenAData.contractAddress === CONTRACT_ADDRESSES.USDTToken) {
      // Token A is USDC - use reserve B (USDC reserve)
      reserveIn = rawReserveB;
      reserveOut = rawReserveA;
      decimalsIn = tokenAData.decimals; // 6 for USDC
      decimalsOut = tokenBData.decimals; // 18 for custom token
      console.log("Debug - Token A (USDC) using reserve B");
    } else {
      // Token A is custom token - use reserve A (custom token reserve)
      reserveIn = rawReserveA;
      reserveOut = rawReserveB;
      decimalsIn = tokenAData.decimals; // 18 for custom token
      decimalsOut = tokenBData.decimals; // 6 for USDC
      console.log("Debug - Token A (custom) using reserve A");
    }
    
    console.log("Debug - Final liquidity reserve mapping:", {
      reserveIn: reserveIn.toString(),
      reserveOut: reserveOut.toString(),
      decimalsIn,
      decimalsOut,
      tokenASymbol: tokenAData.symbol,
      tokenBSymbol: tokenBData.symbol
    });
    
    return { reserveIn, reserveOut, decimalsIn, decimalsOut };
  };

  // Calculate proportional amount using AMM logic (similar to swap page)
  const calculateProportionalAmount = (amountIn: number, isTokenA: boolean): number => {
    if (!selectedPool || amountIn <= 0) return 0;
    
    const tokenAData = selectedPool.tokenA;
    const tokenBData = selectedPool.tokenB;
    
    // Get reserve mapping
    const { reserveIn, reserveOut, decimalsIn, decimalsOut } = getReserveMapping(tokenAData, tokenBData, selectedPool);
    
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) return 0;
    
    console.log("Debug - Proportional calculation inputs:", {
      amountIn,
      isTokenA,
      reserveIn: reserveIn.toString(),
      reserveOut: reserveOut.toString(),
      decimalsIn,
      decimalsOut,
      tokenASymbol: tokenAData.symbol,
      tokenBSymbol: tokenBData.symbol
    });
    
    // For proportional liquidity, we use the same ratio as existing reserves
    // amountIn / reserveIn = amountOut / reserveOut
    // amountOut = (amountIn * reserveOut) / reserveIn
    
    // Convert reserves to human readable format for calculation
    const reserveInHuman = Number(reserveIn) / Math.pow(10, decimalsIn);
    const reserveOutHuman = Number(reserveOut) / Math.pow(10, decimalsOut);
    
    console.log("Debug - Human readable reserves:", {
      reserveInHuman,
      reserveOutHuman,
      ratio: reserveOutHuman / reserveInHuman
    });
    
    // Calculate proportional amount using human readable values
    const amountOut = (amountIn * reserveOutHuman) / reserveInHuman;
    
    console.log("Debug - Proportional calculation:", {
      amountIn,
      reserveInHuman,
      reserveOutHuman,
      amountOut,
      calculation: `(${amountIn} * ${reserveOutHuman}) / ${reserveInHuman} = ${amountOut}`
    });
    
    // Round to 6 decimal places to avoid precision issues
    const result = Math.round(amountOut * 1000000) / 1000000;
    
    console.log("Debug - Final proportional result:", {
      amountOut,
      result,
      proportionalResult: `${amountIn} ${isTokenA ? tokenAData.symbol : tokenBData.symbol} → ${result} ${isTokenA ? tokenBData.symbol : tokenAData.symbol}`
    });
    
    return result;
  };

  // Handle token A amount change
  const handleTokenAAmountChange = (value: string) => {
    setTokenAAmount(value);
    setLastEditedField('tokenA');
    
    const amountA = parseFloat(value);
    if (!isNaN(amountA) && amountA > 0 && !isInitialLiquidity) {
      const proportionalAmountB = calculateProportionalAmount(amountA, true);
      setTokenBAmount(proportionalAmountB.toFixed(6));
    }
  };

  // Handle token B amount change
  const handleTokenBAmountChange = (value: string) => {
    setTokenBAmount(value);
    setLastEditedField('tokenB');
    
    const amountB = parseFloat(value);
    if (!isNaN(amountB) && amountB > 0 && !isInitialLiquidity) {
      const proportionalAmountA = calculateProportionalAmount(amountB, false);
      setTokenAAmount(proportionalAmountA.toFixed(6));
    }
  };

  // Update initial liquidity state when selected pool changes
  useEffect(() => {
    if (selectedPool) {
      const reserveA = Number(selectedPool.reserves[0]);
      const reserveB = Number(selectedPool.reserves[1]);
      setIsInitialLiquidity(reserveA === 0 && reserveB === 0);
      setLastEditedField(null);
      setTokenAAmount("");
      setTokenBAmount("");
    }
  }, [selectedPool]);

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

  // Fetch token metadata and create liquidity token
  const fetchTokenMetadata = async (tokenAddress: string): Promise<LiquidityToken | null> => {
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
      const validTokens = tokenResults.filter((token): token is LiquidityToken => token !== null);

      // Add USDC token
      const usdcToken: LiquidityToken = {
        symbol: "USDC",
        name: "USD Coin",
        image: "/usdc.png",
        contractAddress: CONTRACT_ADDRESSES.USDTToken,
        balance: "0",
        decimals: 6,
      };

      const allTokens = [usdcToken, ...validTokens];
      setAvailableTokens(allTokens);
      console.log("Available tokens loaded:", allTokens);
    } catch (error) {
      console.error("Failed to fetch available tokens:", error);
      setError("Failed to load tokens");
    } finally {
      setIsLoadingTokens(false);
    }
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

  // Fetch LP token balance for a pool
  const fetchLPBalance = async (poolAddress: string): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const balanceResult = await poolClient.balance({
        id: publicKey
      });

      let balance = BigInt(0);
      if (balanceResult && typeof balanceResult === "object" && "result" in balanceResult) {
        balance = BigInt(balanceResult.result || 0);
      } else if (typeof balanceResult === "string" || typeof balanceResult === "number") {
        balance = BigInt(balanceResult);
      }

      // Convert to human readable format with 2 decimal places
      const humanReadableBalance = Number(balance) / Math.pow(10, 18); // LP tokens have 18 decimals
      return humanReadableBalance.toFixed(2);
    } catch (error) {
      console.error("Error fetching LP balance:", error);
      return "0";
    }
  };

  // Fetch all pools
  const fetchAllPools = async () => {
    if (availableTokens.length === 0) return;

    try {
      setIsLoadingPools(true);
      const poolFactoryClient = new PoolFactoryClient({
        contractId: CONTRACT_ADDRESSES.PoolFactory,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const pools: PoolData[] = [];

      // Check for pools between USDC and each meme token
      for (const token of availableTokens) {
        if (token.symbol === "USDC") continue;

        try {
          // Try both directions: USDC/token and token/USDC
          let poolResult = await poolFactoryClient.get_pool({
            token_a: CONTRACT_ADDRESSES.USDTToken,
            token_b: token.contractAddress,
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
              token_a: token.contractAddress,
              token_b: CONTRACT_ADDRESSES.USDTToken,
            });

            if (poolResult && typeof poolResult === "object" && "result" in poolResult) {
              poolAddress = poolResult.result || "";
            } else if (typeof poolResult === "string") {
              poolAddress = poolResult;
            }
          }

          if (poolAddress) {
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

            // Get LP token balance
            const lpBalance = await fetchLPBalance(poolAddress);

            // Calculate TVL (simplified calculation)
            const usdcReserve = reserves[1]; // USDC is typically reserve B
            const tokenReserve = reserves[0]; // Meme token is typically reserve A
            const tvl = Number(usdcReserve) / Math.pow(10, 6) * 2; // Simplified TVL calculation

            // Calculate APR (mock calculation for now)
            const apr = "45.2%";

            // Calculate volume (mock for now)
            const volume24h = "$234,567";

            // Calculate fees (mock for now)
            const fees24h = "$12.50";

            // Calculate my liquidity and share
            const myLiquidity = lpBalance !== "0" ? `$${(Number(lpBalance) * tvl / 100).toFixed(2)}` : "$0";
            const myShare = lpBalance !== "0" ? "0.12%" : "0%";

            const poolData: PoolData = {
              id: poolAddress,
              poolAddress,
              tokenA: availableTokens.find(t => t.symbol === "USDC")!,
              tokenB: token,
              reserves,
              tvl: `$${tvl.toLocaleString()}`,
              apr,
              volume24h,
              myLiquidity,
              myShare,
              fees24h,
              lpTokenBalance: lpBalance,
            };

            pools.push(poolData);
          }
        } catch (error) {
          console.error(`Error fetching pool for ${token.symbol}:`, error);
        }
      }

      setPools(pools);
      if (pools.length > 0 && !selectedPool) {
        setSelectedPool(pools[0]);
      }
      console.log("Pools loaded:", pools);
    } catch (error) {
      console.error("Failed to fetch pools:", error);
      setError("Failed to load pools");
    } finally {
      setIsLoadingPools(false);
    }
  };

  // Add liquidity to a pool
  const handleAddLiquidity = async () => {
    if (!selectedPool || !publicKey) {
      setError("Please connect your wallet and select a pool");
      return;
    }

    const amountA = parseFloat(tokenAAmount);
    const amountB = parseFloat(tokenBAmount);

    if (isNaN(amountA) || isNaN(amountB) || amountA <= 0 || amountB <= 0) {
      setError("Please enter valid amounts");
      return;
    }

    // Check for overflow in square root calculation
    const tokenAAmountRaw = BigInt(Math.floor(amountA * Math.pow(10, selectedPool.tokenA.decimals))); // Custom token (18 decimals)
    const tokenBAmountRaw = BigInt(Math.floor(amountB * Math.pow(10, selectedPool.tokenB.decimals))); // USDC (6 decimals)
    
    // Additional validation to prevent overflow
    const maxCustomTokenAmount = 1000000000; // 1 billion tokens max
    const maxUSDCAmount = 1000000; // 1 million USDC max
    
    if (amountA > maxCustomTokenAmount) {
      setError(`Custom token amount too large. Please use a smaller amount (max ${maxCustomTokenAmount.toLocaleString()} tokens).`);
      return;
    }
    
    if (amountB > maxUSDCAmount) {
      setError(`USDC amount too large. Please use a smaller amount (max ${maxUSDCAmount.toLocaleString()} USDC).`);
      return;
    }
    
    // Check if the calculated amounts are reasonable
    if (amountA > 0 && amountB > 0) {
      const ratio = amountA / amountB;
      if (ratio > 1000000 || ratio < 0.000001) {
        setError("Amount ratio is too extreme. Please use more balanced amounts.");
        return;
      }
    }
    
    const product = tokenAAmountRaw * tokenBAmountRaw;
    const maxSafeProduct = BigInt("170141183460469231731687303715884105727"); // Max i128 value (2^127 - 1)

    if (product > maxSafeProduct) {
      setError("Amounts too large for pool calculation. Please reduce the amounts.");
      return;
    }

    try {
      setIsAddingLiquidity(true);
      setError(null);

      // Get current ledger for expiration
      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const currentLedger = await server.ledgers().order('desc').limit(1).call();
      const expirationLedger = currentLedger.records[0].sequence + 1000;

      const clientOptions = {
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        publicKey: publicKey,
        signTransaction: signTransaction,
        allowHttp: true,
      };

      const poolClient = new PoolClient({
        ...clientOptions,
        contractId: selectedPool.poolAddress,
      });

      // First approve token A (Custom token)
      const tokenAClient = new UsdtTokenClient({
        ...clientOptions,
        contractId: selectedPool.tokenA.contractAddress,
      });

      const approveATx = await tokenAClient.approve({
        from: publicKey,
        spender: selectedPool.poolAddress,
        amount: tokenAAmountRaw, // Custom token amount
        expiration_ledger: expirationLedger,
      });
      await approveATx.signAndSend();
      console.log("Custom token approved successfully");

      // Then approve token B (USDC)
      const tokenBClient = new UsdtTokenClient({
        ...clientOptions,
        contractId: selectedPool.tokenB.contractAddress,
      });

      const approveBTx = await tokenBClient.approve({
        from: publicKey,
        spender: selectedPool.poolAddress,
        amount: tokenBAmountRaw, // USDC amount
        expiration_ledger: expirationLedger,
      });
      await approveBTx.signAndSend();
      console.log("USDC approved successfully");

      // Add liquidity - amount_a = USDC, amount_b = Custom token
      const addLiquidityTx = await poolClient.add_liquidity({
        caller: publicKey,
        amount_a: tokenBAmountRaw, // USDC (6 decimals)
        amount_b: tokenAAmountRaw, // Custom token (18 decimals)
      });
      
      console.log("Debug - Add Liquidity Contract Call:", {
        poolAddress: selectedPool.poolAddress,
        caller: publicKey,
        amountA: amountA,
        amountB: amountB,
        tokenAAmountRaw: tokenAAmountRaw.toString(),
        tokenBAmountRaw: tokenBAmountRaw.toString(),
        tokenASymbol: selectedPool.tokenA.symbol,
        tokenBSymbol: selectedPool.tokenB.symbol,
        tokenADecimals: selectedPool.tokenA.decimals,
        tokenBDecimals: selectedPool.tokenB.decimals,
        contractCall: {
          amount_a: tokenBAmountRaw.toString(), // USDC
          amount_b: tokenAAmountRaw.toString()  // Custom token
        }
      });
      
      await addLiquidityTx.signAndSend();
      console.log("Liquidity added successfully");
      
      setTokenAAmount("");
      setTokenBAmount("");
      
      // Refresh pools and balances
      await fetchAllPools();
      await fetchAvailableTokens();
    } catch (error) {
      console.error("Error adding liquidity:", error);
      setError(`Failed to add liquidity: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Remove liquidity from a pool
  const handleRemoveLiquidity = async () => {
    if (!selectedPool || !publicKey) {
      setError("Please connect your wallet and select a pool");
      return;
    }

    const percentage = removePercentage / 100;
    const lpBalance = parseFloat(selectedPool.lpTokenBalance);

    if (lpBalance <= 0) {
      setError("No liquidity to remove");
      return;
    }

    const lpAmountToRemove = lpBalance * percentage;

    if (lpAmountToRemove <= 0) {
      setError("Invalid amount to remove");
      return;
    }

    try {
      setIsRemovingLiquidity(true);
      setError(null);

      const clientOptions = {
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        publicKey: publicKey,
        signTransaction: signTransaction,
        allowHttp: true,
      };

      const poolClient = new PoolClient({
        ...clientOptions,
        contractId: selectedPool.poolAddress,
      });

      const lpAmountRaw = BigInt(Math.floor(lpAmountToRemove * Math.pow(10, 18)));

      const removeLiquidityTx = await poolClient.remove_liquidity({
        caller: publicKey,
        liquidity: lpAmountRaw,
      });
      await removeLiquidityTx.signAndSend();
      console.log("Liquidity removed successfully");
      
      // Refresh pools and balances
      await fetchAllPools();
      await fetchAvailableTokens();
    } catch (error) {
      console.error("Error removing liquidity:", error);
      setError(`Failed to remove liquidity: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchAvailableTokens();
    };
    initializeData();
  }, []);

  // Fetch pools when tokens are available
  useEffect(() => {
    if (availableTokens.length > 0) {
      fetchAllPools();
    }
  }, [availableTokens]);

  // Fetch balances when public key changes
  useEffect(() => {
    if (publicKey && availableTokens.length > 0) {
      const fetchBalances = async () => {
        setIsLoadingBalances(true);
        const updatedTokens = await Promise.all(
          availableTokens.map(async (token) => ({
            ...token,
            balance: await fetchTokenBalance(token.contractAddress, token.decimals),
          }))
        );
        setAvailableTokens(updatedTokens);
        setIsLoadingBalances(false);
      };
      fetchBalances();
    }
  }, [publicKey, availableTokens.length]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Liquidity Management</h1>
          <p className="text-xl text-gray-300">
            Add or remove liquidity from pools to earn trading fees
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Loading States */}
        {(isLoadingPools || isLoadingTokens) && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading pools and tokens...</p>
          </div>
        )}

        {!isLoadingPools && !isLoadingTokens && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Pool Selection */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Select Pool</h2>
              {pools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 mb-4">No pools available</p>
                  <p className="text-sm text-gray-400">
                    Create a pool first by swapping tokens
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pools.map((pool) => (
                    <div
                      key={pool.id}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedPool?.id === pool.id
                          ? "bg-blue-600/50 border-2 border-blue-400"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedPool(pool)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-2">
                            <img
                              src={pool.tokenA.image}
                                    alt={pool.tokenA.symbol}
                              className="w-8 h-8 rounded-full border-2 border-white"
                                  />
                            <img
                              src={pool.tokenB.image}
                                    alt={pool.tokenB.symbol}
                              className="w-8 h-8 rounded-full border-2 border-white"
                                  />
                                </div>
                          <div>
                            <p className="font-semibold">
                                  {pool.tokenA.symbol}/{pool.tokenB.symbol}
                            </p>
                            <p className="text-sm text-gray-300">
                              TVL: {pool.tvl}
                            </p>
                              </div>
                    </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-300">APR: {pool.apr}</p>
                          <p className="text-sm text-gray-300">
                            My Share: {pool.myShare}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Liquidity Management */}
            {selectedPool && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
                <h2 className="text-2xl font-bold mb-4">
                  {selectedPool.tokenA.symbol}/{selectedPool.tokenB.symbol} Pool
                </h2>

                {/* Pool Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300">TVL</p>
                    <p className="font-semibold">{selectedPool.tvl}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300">24h Volume</p>
                    <p className="font-semibold">{selectedPool.volume24h}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300">APR</p>
                    <p className="font-semibold">{selectedPool.apr}</p>
                      </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300">24h Fees</p>
                    <p className="font-semibold">{selectedPool.fees24h}</p>
                        </div>
                      </div>

                {/* Add Liquidity */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Add Liquidity</h3>
                  
                  {/* Initial Liquidity Notice */}
                  {isInitialLiquidity && (
                    <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-300">
                        🎉 First liquidity! You can set any ratio for the initial pool.
                      </p>
                    </div>
                  )}

                  {/* Proportional Liquidity Notice */}
                  {!isInitialLiquidity && (
                    <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-300">
                        ⚖️ Amounts must be proportional to existing reserves. Enter one amount and the other will be calculated automatically.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {selectedPool.tokenA.symbol} Amount
                        {!isInitialLiquidity && lastEditedField === 'tokenA' && (
                          <span className="ml-2 text-xs text-green-400">← Calculating proportional amount</span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={tokenAAmount}
                        onChange={(e) => handleTokenAAmountChange(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Balance: {selectedPool.tokenA.balance}
                        {/* {!isInitialLiquidity && selectedPool.reserves[0] > 0 && (
                          <span className="ml-2">• Pool Reserve: {(Number(selectedPool.reserves[0]) / Math.pow(10, selectedPool.tokenA.decimals)).toFixed(2)}</span>
                        )} */}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {selectedPool.tokenB.symbol} Amount
                        {!isInitialLiquidity && lastEditedField === 'tokenB' && (
                          <span className="ml-2 text-xs text-green-400">← Calculating proportional amount</span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={tokenBAmount}
                        onChange={(e) => handleTokenBAmountChange(e.target.value)}
                        placeholder="0.0"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Balance: {selectedPool.tokenB.balance}
                        {/* {!isInitialLiquidity && selectedPool.reserves[1] > 0 && (
                          <span className="ml-2">• Pool Reserve: {(Number(selectedPool.reserves[1]) / Math.pow(10, selectedPool.tokenB.decimals)).toFixed(2)}</span>
                        )} */}
                      </p>
                    </div>

                    {/* Pool Share Preview */}
                    {(tokenAAmount || tokenBAmount) && (
                      <div className="mt-4 p-3 bg-white/5 rounded-lg">
                        <p className="text-sm text-gray-300 mb-2">Pool Share Preview:</p>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span>Your {selectedPool.tokenA.symbol}:</span>
                            <span>{tokenAAmount || "0"} ({selectedPool.tokenA.symbol})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Your {selectedPool.tokenB.symbol}:</span>
                            <span>{tokenBAmount || "0"} ({selectedPool.tokenB.symbol})</span>
                          </div>
                          {!isInitialLiquidity && tokenAAmount && tokenBAmount && (
                            <div className="flex justify-between text-green-400">
                              <span>Estimated LP tokens:</span>
                              <span>~{Math.sqrt(parseFloat(tokenAAmount) * parseFloat(tokenBAmount)).toFixed(2)}</span>
                          </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleAddLiquidity}
                      disabled={isAddingLiquidity || !publicKey || (!tokenAAmount && !tokenBAmount)}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      {isAddingLiquidity ? "Adding..." : "Add Liquidity"}
                    </button>
                  </div>
                </div>

                {/* Remove Liquidity */}
                {parseFloat(selectedPool.lpTokenBalance) > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Remove Liquidity</h3>
                <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          LP Tokens: {selectedPool.lpTokenBalance}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={removePercentage}
                          onChange={(e) => setRemovePercentage(Number(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-sm text-gray-300">
                          Remove {removePercentage}% of your liquidity
                        </p>
                      </div>
                      <button
                        onClick={handleRemoveLiquidity}
                        disabled={isRemovingLiquidity || !publicKey}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                      >
                        {isRemovingLiquidity ? "Removing..." : "Remove Liquidity"}
                      </button>
          </div>
        </div>
                )}
              </div>
            )}
            </div>
        )}
      </div>
    </div>
  )
}
