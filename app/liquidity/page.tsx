"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Droplets, Plus, Minus, TrendingUp, DollarSign, Loader2, AlertCircle, Coins } from "lucide-react"
import Image from "next/image"
import { Client as TokenFactoryClient } from "@/packages/TokenLauncher/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import { Client as UsdtTokenClient } from "@/packages/USDTToken/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { getPublicKey, signTransaction } from "@/lib/stellar-wallets-kit"
import { useToast } from "@/hooks/use-toast"
import * as Stellar from "@stellar/stellar-sdk"

// Add custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
`;

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
  isNativeXLM?: boolean;
}

// Interface for pool data
interface PoolData {
  id: string;
  poolAddress: string;
  tokenA: LiquidityToken;
  tokenB: LiquidityToken;
  reserves: [bigint, bigint];
  tvl: number;
  apr: string;
  volume24h: string;
  myLiquidity: string;
  myShare: string;
  fees24h: string;
  unclaimedFees: string;
  lpTokenBalance: string;
  isXlmPool?: boolean;
  xlmTokenIndex?: number;
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
  const [xlmBalance, setXlmBalance] = useState<string>("0")
  const poolsLoadedRef = useRef(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  const { toast } = useToast()

  // Helper function to format large numbers
  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    } else if (num >= 1) {
      return `$${num.toFixed(2)}`;
    } else if (num >= 0.01) {
      return `$${num.toFixed(4)}`;
    } else {
      return `$${num.toFixed(6)}`;
    }
  };

  // Helper function to format balances nicely
  const formatBalance = (balance: string, decimals: number = 6): string => {
    const num = parseFloat(balance);
    if (isNaN(num)) return "0.00";
    
    if (num === 0) return "0.00";
    if (num < 0.01) return num.toFixed(decimals);
    if (num < 1) return num.toFixed(4);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + "K";
    return (num / 1000000).toFixed(2) + "M";
  };

  // Initialize wallet connection
  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  // Fetch XLM balance from Horizon
  const fetchXlmBalance = async (): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await server.loadAccount(publicKey);
      const xlmBalance = account.balances.find(balance => balance.asset_type === 'native');
      const balance = xlmBalance ? parseFloat(xlmBalance.balance) : 0;
      setXlmBalance(balance.toFixed(6));
      return balance.toFixed(6);
    } catch (error) {
      console.error("Error fetching XLM balance:", error);
      setXlmBalance("0");
      return "0";
    }
  };

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
      tokenAIsXLM: tokenAData.isNativeXLM,
      tokenBIsXLM: tokenBData.isNativeXLM,
      tokenASymbol: tokenAData.symbol,
      tokenBSymbol: tokenBData.symbol
    });
    
    // The pool contract stores reserves as [reserve_a, reserve_b] where:
    // - reserve_a corresponds to token_a (first token in pool)
    // - reserve_b corresponds to token_b (second token in pool)
    // We need to map these correctly based on which token we're calculating for
    
    let reserveIn: bigint;
    let reserveOut: bigint;
    let decimalsIn: number;
    let decimalsOut: number;
    
    // For proportional calculations, we map based on the token being calculated for
    // If calculating for token A, use reserve A as input, reserve B as output
    // If calculating for token B, use reserve B as input, reserve A as output
    
    if (tokenAData.isNativeXLM) {
      // Token A is XLM (7 decimals), Token B is custom token (18 decimals)
      reserveIn = rawReserveA; // XLM reserve
      reserveOut = rawReserveB; // Custom token reserve
      decimalsIn = 7; // XLM decimals
      decimalsOut = 18; // Custom token decimals
      console.log("Debug - Token A (XLM) using reserve A");
    } else if (tokenBData.isNativeXLM) {
      // Token A is custom token (18 decimals), Token B is XLM (7 decimals)
      reserveIn = rawReserveB; // XLM reserve
      reserveOut = rawReserveA; // Custom token reserve
      decimalsIn = 7; // XLM decimals
      decimalsOut = 18; // Custom token decimals
      console.log("Debug - Token B (XLM) using reserve B");
    } else if (tokenAData.contractAddress === CONTRACT_ADDRESSES.USDTToken) {
      // Token A is USDC (6 decimals), Token B is custom token (18 decimals)
      reserveIn = rawReserveA; // USDC reserve
      reserveOut = rawReserveB; // Custom token reserve
      decimalsIn = 6; // USDC decimals
      decimalsOut = 18; // Custom token decimals
      console.log("Debug - Token A (USDC) using reserve A");
    } else if (tokenBData.contractAddress === CONTRACT_ADDRESSES.USDTToken) {
      // Token A is custom token (18 decimals), Token B is USDC (6 decimals)
      reserveIn = rawReserveB; // USDC reserve
      reserveOut = rawReserveA; // Custom token reserve
      decimalsIn = 6; // USDC decimals
      decimalsOut = 18; // Custom token decimals
      console.log("Debug - Token B (USDC) using reserve B");
    } else {
      // Both are custom tokens (18 decimals each)
      reserveIn = rawReserveA; // Custom token A reserve
      reserveOut = rawReserveB; // Custom token B reserve
      decimalsIn = 18; // Custom token decimals
      decimalsOut = 18; // Custom token decimals
      console.log("Debug - Both custom tokens using reserve A/B");
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
    
    // Get raw reserves from pool
    const rawReserveA = selectedPool.reserves[0];
    const rawReserveB = selectedPool.reserves[1];
    
    if (rawReserveA === BigInt(0) || rawReserveB === BigInt(0)) {
      console.log("Debug - No existing liquidity, cannot calculate proportional amount");
      return 0;
    }
    
    console.log("Debug - Proportional calculation inputs:", {
      amountIn,
      isTokenA,
      reserveA: rawReserveA.toString(),
      reserveB: rawReserveB.toString(),
      tokenASymbol: tokenAData.symbol,
      tokenBSymbol: tokenBData.symbol
    });
    
    // Determine which reserves and decimals to use based on which token we're calculating for
    let reserveIn: bigint;
    let reserveOut: bigint;
    let decimalsIn: number;
    let decimalsOut: number;
    
    if (isTokenA) {
      // Calculating for token A, so we want to find the proportional amount of token B
      reserveIn = rawReserveA; // Token A reserve
      reserveOut = rawReserveB; // Token B reserve
      decimalsIn = tokenAData.decimals; // Token A decimals
      decimalsOut = tokenBData.decimals; // Token B decimals
    } else {
      // Calculating for token B, so we want to find the proportional amount of token A
      reserveIn = rawReserveB; // Token B reserve
      reserveOut = rawReserveA; // Token A reserve
      decimalsIn = tokenBData.decimals; // Token B decimals
      decimalsOut = tokenAData.decimals; // Token A decimals
    }
    
    console.log("Debug - Reserve mapping for calculation:", {
      reserveIn: reserveIn.toString(),
      reserveOut: reserveOut.toString(),
      decimalsIn,
      decimalsOut,
      calculatingFor: isTokenA ? tokenAData.symbol : tokenBData.symbol,
      calculatingTo: isTokenA ? tokenBData.symbol : tokenAData.symbol
    });
    
    // For proportional liquidity, we use the same ratio as existing reserves
    // amountIn / reserveIn = amountOut / reserveOut
    // amountOut = (amountIn * reserveOut) / reserveIn
    
    // Convert input amount to raw format using integer arithmetic to avoid floating-point errors
    const amountInRaw = BigInt(Math.round(amountIn * Math.pow(10, decimalsIn)));
    
    // Calculate proportional amount using raw values (matching contract logic exactly)
    const amountOutRaw = (amountInRaw * reserveOut) / reserveIn;
    
    console.log("Debug - Raw proportional calculation:", {
      amountInRaw: amountInRaw.toString(),
      reserveIn: reserveIn.toString(),
      reserveOut: reserveOut.toString(),
      amountOutRaw: amountOutRaw.toString(),
      calculation: `(${amountInRaw} * ${reserveOut}) / ${reserveIn} = ${amountOutRaw}`
    });
    
    // Convert back to human readable format using integer arithmetic
    const result = Number(amountOutRaw) / Math.pow(10, decimalsOut);
    
    console.log("Debug - Final proportional result:", {
      amountOutRaw: amountOutRaw.toString(),
      result,
      decimalsOut,
      proportionalResult: `${amountIn} ${isTokenA ? tokenAData.symbol : tokenBData.symbol} → ${result} ${isTokenA ? tokenBData.symbol : tokenAData.symbol}`
    });
    
    return result;
  };

  // Validate proportional amounts match the contract's expectation
  const validateProportionalAmounts = (amountA: number, amountB: number): boolean => {
    if (!selectedPool) return false;
    
    const rawReserveA = selectedPool.reserves[0];
    const rawReserveB = selectedPool.reserves[1];
    
    if (rawReserveA === BigInt(0) || rawReserveB === BigInt(0)) {
      return true; // Initial liquidity, no validation needed
    }
    
    const tokenAAmountRaw = BigInt(Math.round(amountA * Math.pow(10, selectedPool.tokenA.decimals)));
    const tokenBAmountRaw = BigInt(Math.round(amountB * Math.pow(10, selectedPool.tokenB.decimals)));
    
    // Calculate the same way the contract does
    const leftSide = tokenAAmountRaw * rawReserveB;
    const rightSide = tokenBAmountRaw * rawReserveA;
    
    // Calculate the expected proportional amount for comparison
    const expectedAmountB = getExactProportionalAmount(amountA, true);
    const expectedAmountBRaw = BigInt(Math.round(expectedAmountB * Math.pow(10, selectedPool.tokenB.decimals)));
    const expectedLeftSide = tokenAAmountRaw * rawReserveB;
    const expectedRightSide = expectedAmountBRaw * rawReserveA;
    
    // Allow for small rounding differences (tolerance of 1 unit)
    const difference = leftSide > rightSide ? leftSide - rightSide : rightSide - leftSide;
    
    // Calculate percentage difference for better tolerance
    const percentageDifference = Number(difference) / Number(leftSide) * 100;
    
    console.log("Debug - Proportional validation:", {
      amountA,
      amountB,
      expectedAmountB,
      tokenAAmountRaw: tokenAAmountRaw.toString(),
      tokenBAmountRaw: tokenBAmountRaw.toString(),
      expectedAmountBRaw: expectedAmountBRaw.toString(),
      reserveA: rawReserveA.toString(),
      reserveB: rawReserveB.toString(),
      leftSide: leftSide.toString(),
      rightSide: rightSide.toString(),
      expectedLeftSide: expectedLeftSide.toString(),
      expectedRightSide: expectedRightSide.toString(),
      difference: difference.toString(),
      percentageDifference: percentageDifference.toFixed(6) + "%",
      isValid: difference <= BigInt(1) || percentageDifference < 0.001 // Allow 0.001% tolerance
    });
    
    // Allow tolerance of 1 unit OR 0.001% difference
    return difference <= BigInt(1) || percentageDifference < 0.001;
  };

  // Calculate the exact proportional amount for a given input amount
  const getExactProportionalAmount = (amountIn: number, isTokenA: boolean): number => {
    if (!selectedPool) return 0;
    
    const rawReserveA = selectedPool.reserves[0];
    const rawReserveB = selectedPool.reserves[1];
    
    if (rawReserveA === BigInt(0) || rawReserveB === BigInt(0)) {
      return 0; // No existing liquidity
    }
    
    const tokenAData = selectedPool.tokenA;
    const tokenBData = selectedPool.tokenB;
    
    let reserveIn: bigint;
    let reserveOut: bigint;
    let decimalsIn: number;
    let decimalsOut: number;
    
    if (isTokenA) {
      reserveIn = rawReserveA;
      reserveOut = rawReserveB;
      decimalsIn = tokenAData.decimals;
      decimalsOut = tokenBData.decimals;
    } else {
      reserveIn = rawReserveB;
      reserveOut = rawReserveA;
      decimalsIn = tokenBData.decimals;
      decimalsOut = tokenAData.decimals;
    }
    
    const amountInRaw = BigInt(Math.round(amountIn * Math.pow(10, decimalsIn)));
    const amountOutRaw = (amountInRaw * reserveOut) / reserveIn;
    const result = Number(amountOutRaw) / Math.pow(10, decimalsOut);
    
    return result;
  };

  // Get the correct proportional amounts for display
  const getProportionalAmounts = (): { amountA: number; amountB: number } => {
    if (!selectedPool || isInitialLiquidity) {
      return { amountA: 0, amountB: 0 };
    }
    
    const amountA = parseFloat(tokenAAmount);
    const amountB = parseFloat(tokenBAmount);
    
    if (isNaN(amountA) && isNaN(amountB)) {
      return { amountA: 0, amountB: 0 };
    }
    
    if (!isNaN(amountA) && amountA > 0) {
      const proportionalB = getExactProportionalAmount(amountA, true);
      return { amountA, amountB: proportionalB };
    } else if (!isNaN(amountB) && amountB > 0) {
      const proportionalA = getExactProportionalAmount(amountB, false);
      return { amountA: proportionalA, amountB };
    }
    
    return { amountA: 0, amountB: 0 };
  };

  // Handle token A amount change
  const handleTokenAAmountChange = (value: string) => {
    setTokenAAmount(value);
    setLastEditedField('tokenA');
    
    const amountA = parseFloat(value);
    if (!isNaN(amountA) && amountA > 0 && !isInitialLiquidity) {
      const proportionalAmount = calculateProportionalAmount(amountA, true);
      if (proportionalAmount > 0) {
        setTokenBAmount(proportionalAmount.toString());
      } else {
        // If no proportional amount calculated, clear the other field
        setTokenBAmount("");
      }
    }
    // For initial liquidity, don't modify the other field - let user input freely
  };

  // Handle token B amount change
  const handleTokenBAmountChange = (value: string) => {
    setTokenBAmount(value);
    setLastEditedField('tokenB');
    
    const amountB = parseFloat(value);
    if (!isNaN(amountB) && amountB > 0 && !isInitialLiquidity) {
      const proportionalAmount = calculateProportionalAmount(amountB, false);
      if (proportionalAmount > 0) {
        setTokenAAmount(proportionalAmount.toString());
      } else {
        // If no proportional amount calculated, clear the other field
        setTokenAAmount("");
      }
    }
    // For initial liquidity, don't modify the other field - let user input freely
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
        isNativeXLM: false,
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
    }
  };

  // Fetch all available tokens (always include XLM as native)
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
      const validTokens = tokenResults.filter((token): token is LiquidityToken => token !== null);

      // Add USDC token
      const usdcToken: LiquidityToken = {
        symbol: "USDC",
        name: "USD Coin",
        image: "/usdc.png",
        contractAddress: CONTRACT_ADDRESSES.USDTToken,
        balance: "0",
        decimals: 6,
        isNativeXLM: false,
      };

      // Add XLM token (always present)
      const xlmToken: LiquidityToken = {
        symbol: "XLM",
        name: "Stellar Lumens",
        image: "/xlm.svg",
        contractAddress: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // Use consistent address
        balance: (xlmBalance ?? '0') as string,
        decimals: 7,
        isNativeXLM: true,
      };

      const allTokens = [usdcToken, xlmToken, ...validTokens];
      setAvailableTokens(allTokens);
      console.log("Available tokens loaded:", allTokens);
    } catch (error) {
      console.error("Failed to fetch available tokens:", error);
      toast({
        title: "Error",
        description: "Failed to load available tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Fetch token balance for a specific token
  const fetchTokenBalance = async (tokenAddress: string, decimals: number, isNativeXLM: boolean = false): Promise<string> => {
    if (!publicKey) return "0";

    try {
      if (isNativeXLM) {
        // For native XLM, use the stored balance
        return await fetchXlmBalance();
      }

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

  // Fetch LP token balance for a specific pool
  const fetchLPBalance = async (poolAddress: string): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const balanceResult = await poolClient.balance_of({
        id: publicKey
      });

      let balance = BigInt(0);
      if (balanceResult && typeof balanceResult === "object" && "result" in balanceResult) {
        balance = BigInt(balanceResult.result || 0);
      } else if (typeof balanceResult === "string" || typeof balanceResult === "number") {
        balance = BigInt(balanceResult);
      }

      // Convert to human readable format with 6 decimal places for better precision
      const humanReadableBalance = Number(balance) / Math.pow(10, 18); // LP tokens have 18 decimals
      return humanReadableBalance.toFixed(6);
    } catch (error) {
      console.error("Error fetching LP balance:", error);
      return "0";
    }
  };

  // Fetch all pools
  const fetchAllPools = async () => {
    if (isLoadingPools) return; // Prevent concurrent calls
    
    setIsLoadingPools(true);
    setError(null);

    try {
      const poolFactoryClient = new PoolFactoryClient({
        contractId: CONTRACT_ADDRESSES.PoolFactory,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const pools: PoolData[] = [];

      // Check for pools between USDC and each token, and XLM and each token
      for (const token of availableTokens) {
        if (token.symbol === "USDC" || token.symbol === "XLM") continue;

        try {
          // Check for USDC pools first
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

            // Check if this is an XLM pool
            const isXlmPoolResult = await poolClient.is_xlm_pool();
            const isXlmPool = isXlmPoolResult && typeof isXlmPoolResult === "object" && "result" in isXlmPoolResult 
              ? isXlmPoolResult.result 
              : false;

            const xlmTokenIndexResult = await poolClient.get_xlm_token_index();
            const xlmTokenIndex = xlmTokenIndexResult && typeof xlmTokenIndexResult === "object" && "result" in xlmTokenIndexResult 
              ? xlmTokenIndexResult.result 
              : undefined;

            // Fetch real pool data using new contract methods
            const [poolTVL, volumeData, userPosition, unclaimedFees] = await Promise.all([
              fetchPoolTVL(poolAddress),
              fetchPoolVolume(poolAddress),
              fetchUserLiquidityPosition(poolAddress),
              fetchUnclaimedFees(poolAddress)
            ]);

            // Calculate APR based on volume and fees
            const volume24hNum = parseFloat(volumeData.volume24h.replace('$', ''));
            const tvlNum = poolTVL; // poolTVL is already a number
            const feeRate = 0.003; // 0.3% fee
            const dailyFees = volume24hNum * feeRate;
            const apr = tvlNum > 0 ? ((dailyFees * 365) / tvlNum) * 100 : 0;

            // Calculate user's position value using BigInt arithmetic to avoid precision issues
            const lpBalanceRaw = BigInt(Math.round(parseFloat(userPosition.lpTokenBalance) * Math.pow(10, 18)));
            const totalSupply = await poolClient.supply();
            let totalSupplyRaw = BigInt(0);
            if (totalSupply && typeof totalSupply === "object" && "result" in totalSupply) {
              totalSupplyRaw = BigInt(totalSupply.result);
            }
            
            // Calculate share using BigInt arithmetic: (lpBalance * 10000) / totalSupply (in basis points)
            const shareBasisPoints = totalSupplyRaw > 0 ? Number((lpBalanceRaw * BigInt(10000)) / totalSupplyRaw) : 0;
            const share = shareBasisPoints / 100; // Convert from basis points to percentage
            
            const positionValue = totalSupplyRaw > 0 ? (Number(lpBalanceRaw) / Number(totalSupplyRaw)) * tvlNum : 0;

            // Calculate fees earned (24h estimate)
            const userShare = share / 100;
            const fees24h = dailyFees * userShare;

            // Format share with better precision for small amounts
            let shareDisplay = "0.00%";
            if (share > 0) {
              if (share >= 0.01) {
                shareDisplay = `${share.toFixed(2)}%`;
              } else if (share >= 0.0001) {
                shareDisplay = `${share.toFixed(4)}%`;
              } else if (share >= 0.000001) {
                shareDisplay = `${share.toFixed(6)}%`;
              } else {
                shareDisplay = `< 0.000001%`;
              }
            }

            const usdcToken = availableTokens.find(t => t.symbol === "USDC")!;

            const pool: PoolData = {
              id: `${token.symbol}/USDC`,
              poolAddress,
              tokenA: token,
              tokenB: usdcToken,
              reserves,
              tvl: tvlNum,
              apr: `${apr.toFixed(2)}%`,
              volume24h: volumeData.volume24h,
              myLiquidity: `$${positionValue.toFixed(2)}`,
              myShare: shareDisplay,
              fees24h: `$${fees24h.toFixed(2)}`,
              unclaimedFees: `$${parseFloat(unclaimedFees).toFixed(6)}`,
              lpTokenBalance: userPosition.lpTokenBalance,
              isXlmPool,
              xlmTokenIndex
            };

            pools.push(pool);
          }

          // Now check for XLM pools
          poolResult = await poolFactoryClient.get_pool({
            token_a: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // XLM contract address
            token_b: token.contractAddress,
          });

          poolAddress = "";
          if (poolResult && typeof poolResult === "object" && "result" in poolResult) {
            poolAddress = poolResult.result || "";
          } else if (typeof poolResult === "string") {
            poolAddress = poolResult;
          }

          // If first direction didn't work, try the reverse
          if (!poolAddress) {
            poolResult = await poolFactoryClient.get_pool({
              token_a: token.contractAddress,
              token_b: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // XLM contract address
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

            // Check if this is an XLM pool
            const isXlmPoolResult = await poolClient.is_xlm_pool();
            const isXlmPool = isXlmPoolResult && typeof isXlmPoolResult === "object" && "result" in isXlmPoolResult 
              ? isXlmPoolResult.result 
              : false;

            const xlmTokenIndexResult = await poolClient.get_xlm_token_index();
            const xlmTokenIndex = xlmTokenIndexResult && typeof xlmTokenIndexResult === "object" && "result" in xlmTokenIndexResult 
              ? xlmTokenIndexResult.result 
              : undefined;

            // Fetch real pool data using new contract methods
            const [poolTVL, volumeData, userPosition, unclaimedFees] = await Promise.all([
              fetchPoolTVL(poolAddress),
              fetchPoolVolume(poolAddress),
              fetchUserLiquidityPosition(poolAddress),
              fetchUnclaimedFees(poolAddress)
            ]);

            // Calculate APR based on volume and fees
            const volume24hNum = parseFloat(volumeData.volume24h.replace('$', ''));
            const tvlNum = poolTVL; // poolTVL is already a number
            const feeRate = 0.003; // 0.3% fee
            const dailyFees = volume24hNum * feeRate;
            const apr = tvlNum > 0 ? ((dailyFees * 365) / tvlNum) * 100 : 0;

            // Calculate user's position value using BigInt arithmetic to avoid precision issues
            const lpBalanceRaw = BigInt(Math.round(parseFloat(userPosition.lpTokenBalance) * Math.pow(10, 18)));
            const totalSupply = await poolClient.supply();
            let totalSupplyRaw = BigInt(0);
            if (totalSupply && typeof totalSupply === "object" && "result" in totalSupply) {
              totalSupplyRaw = BigInt(totalSupply.result);
            }
            
            // Calculate share using BigInt arithmetic: (lpBalance * 10000) / totalSupply (in basis points)
            const shareBasisPoints = totalSupplyRaw > 0 ? Number((lpBalanceRaw * BigInt(10000)) / totalSupplyRaw) : 0;
            const share = shareBasisPoints / 100; // Convert from basis points to percentage
            
            const positionValue = totalSupplyRaw > 0 ? (Number(lpBalanceRaw) / Number(totalSupplyRaw)) * tvlNum : 0;

            // Calculate fees earned (24h estimate)
            const userShare = share / 100;
            const fees24h = dailyFees * userShare;

            // Format share with better precision for small amounts
            let shareDisplay = "0.00%";
            if (share > 0) {
              if (share >= 0.01) {
                shareDisplay = `${share.toFixed(2)}%`;
              } else if (share >= 0.0001) {
                shareDisplay = `${share.toFixed(4)}%`;
              } else if (share >= 0.000001) {
                shareDisplay = `${share.toFixed(6)}%`;
              } else {
                shareDisplay = `< 0.000001%`;
              }
            }

            const xlmToken = availableTokens.find(t => t.symbol === "XLM")!;

            const pool: PoolData = {
              id: `${token.symbol}/XLM`,
              poolAddress,
              tokenA: token,
              tokenB: xlmToken,
              reserves,
              tvl: tvlNum,
              apr: `${apr.toFixed(2)}%`,
              volume24h: volumeData.volume24h,
              myLiquidity: `$${positionValue.toFixed(2)}`,
              myShare: shareDisplay,
              fees24h: `$${fees24h.toFixed(2)}`,
              unclaimedFees: `$${parseFloat(unclaimedFees).toFixed(6)}`,
              lpTokenBalance: userPosition.lpTokenBalance,
              isXlmPool,
              xlmTokenIndex
            };

            pools.push(pool);
          }
        } catch (error) {
          console.error(`Error fetching pool for ${token.symbol}:`, error);
        }
      }

      setPools(pools);
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
      toast({
        title: "Error",
        description: "Please connect your wallet and select a pool to add liquidity",
        variant: "destructive",
      });
      return;
    }

    const amountA = parseFloat(tokenAAmount);
    const amountB = parseFloat(tokenBAmount);

    if (isNaN(amountA) || isNaN(amountB) || amountA <= 0 || amountB <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid amounts greater than 0 for both tokens",
        variant: "destructive",
      });
      return;
    }

    // Validate proportional amounts for subsequent liquidity
    if (!isInitialLiquidity && !validateProportionalAmounts(amountA, amountB)) {
      // Calculate the correct proportional amounts
      const correctAmountB = getExactProportionalAmount(amountA, true);
      const correctAmountA = getExactProportionalAmount(amountB, false);
      
      console.log("Debug - Non-proportional amounts detected:", {
        userAmountA: amountA,
        userAmountB: amountB,
        correctAmountA,
        correctAmountB
      });
      
      // Auto-correct the amounts to be proportional
      if (lastEditedField === 'tokenA') {
        setTokenBAmount(correctAmountB.toFixed(6));
        toast({
          title: "Amounts Adjusted",
          description: `Adjusted ${selectedPool.tokenB.symbol} amount to ${correctAmountB.toFixed(6)} to maintain pool proportions.`,
        });
      } else if (lastEditedField === 'tokenB') {
        setTokenAAmount(correctAmountA.toFixed(6));
        toast({
          title: "Amounts Adjusted",
          description: `Adjusted ${selectedPool.tokenA.symbol} amount to ${correctAmountA.toFixed(6)} to maintain pool proportions.`,
        });
      } else {
        // If neither field was edited, use the first amount as reference
        setTokenBAmount(correctAmountB.toFixed(6));
        toast({
          title: "Amounts Adjusted",
          description: `Adjusted ${selectedPool.tokenB.symbol} amount to ${correctAmountB.toFixed(6)} to maintain pool proportions.`,
        });
      }
      
      return; // Don't proceed with the transaction, let user review the corrected amounts
    }

    // Check for overflow in square root calculation
    const tokenAAmountRaw = BigInt(Math.round(amountA * Math.pow(10, selectedPool.tokenA.decimals)));
    const tokenBAmountRaw = BigInt(Math.round(amountB * Math.pow(10, selectedPool.tokenB.decimals)));
    
    // Additional validation to prevent overflow
    const maxCustomTokenAmount = 1000000000; // 1 billion tokens max
    const maxUSDCAmount = 1000000; // 1 million USDC max
    const maxXLMAmount = 1000000; // 1 million XLM max
    
    if (amountA > maxCustomTokenAmount) {
      toast({
        title: "Error",
        description: `Custom token amount too large. Please use a smaller amount (max ${maxCustomTokenAmount.toLocaleString()} tokens).`,
        variant: "destructive",
      });
      return;
    }
    
    if (amountB > maxUSDCAmount) {
      toast({
        title: "Error",
        description: `USDC amount too large. Please use a smaller amount (max ${maxUSDCAmount.toLocaleString()} USDC).`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if the calculated amounts are reasonable
    if (amountA > 0 && amountB > 0) {
      const ratio = amountA / amountB;
      if (ratio > 1000000 || ratio < 0.000001) {
        toast({
          title: "Error",
          description: "Amount ratio is too extreme. Please use more balanced amounts.",
          variant: "destructive",
        });
        return;
      }
    }
    
    const product = tokenAAmountRaw * tokenBAmountRaw;
    const maxSafeProduct = BigInt("170141183460469231731687303715884105727"); // Max i128 value (2^127 - 1)

    if (product > maxSafeProduct) {
      toast({
        title: "Error",
        description: "Amounts too large for pool calculation. Please reduce the amounts.",
        variant: "destructive",
      });
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

      // Debug: Check current pool state
      try {
        const reserves = await poolClient.get_reserves();
        console.log("Debug - Current pool reserves:", {
          reserveA: reserves.result[0].toString(),
          reserveB: reserves.result[1].toString(),
          isInitialLiquidity: reserves.result[0] === BigInt(0) && reserves.result[1] === BigInt(0)
        });
      } catch (error) {
        console.error("Error getting pool reserves:", error);
      }

      // Check if this is an XLM pool
      if (selectedPool.isXlmPool) {
        // XLM pool - handle native XLM transfers
        if (selectedPool.tokenA.isNativeXLM) {
          // Token A is XLM, Token B is contract token
          const tokenBClient = new UsdtTokenClient({
            ...clientOptions,
            contractId: selectedPool.tokenB.contractAddress,
          });

          // Approve token B (contract token)
          const approveBTx = await tokenBClient.approve({
            from: publicKey,
            spender: selectedPool.poolAddress,
            amount: tokenBAmountRaw,
            expiration_ledger: expirationLedger,
          });
          await approveBTx.signAndSend();

          // Add liquidity with XLM - amount_a = XLM, amount_b = contract token
          const addLiquidityTx = await poolClient.add_liquidity({
            caller: publicKey,
            amount_a: tokenAAmountRaw, // XLM amount
            amount_b: tokenBAmountRaw, // Contract token amount
          });
          
          await addLiquidityTx.signAndSend();

        } else if (selectedPool.tokenB.isNativeXLM) {
          // Token B is XLM, Token A is contract token
          const tokenAClient = new UsdtTokenClient({
            ...clientOptions,
            contractId: selectedPool.tokenA.contractAddress,
          });

          // Approve token A (contract token)
          const approveATx = await tokenAClient.approve({
            from: publicKey,
            spender: selectedPool.poolAddress,
            amount: tokenAAmountRaw,
            expiration_ledger: expirationLedger,
          });
          await approveATx.signAndSend();

          // Add liquidity with XLM - amount_a = contract token, amount_b = XLM
          const addLiquidityTx = await poolClient.add_liquidity({
            caller: publicKey,
            amount_a: tokenAAmountRaw, // Contract token amount
            amount_b: tokenBAmountRaw, // XLM amount
          });
          
          await addLiquidityTx.signAndSend();
        }

        toast({
          title: "Success",
          description: `Successfully added ${tokenAAmount} ${selectedPool.tokenA.symbol} and ${tokenBAmount} ${selectedPool.tokenB.symbol} to the pool!`,
        });

      } else {
        // Standard pool - both tokens are contract tokens
        // Determine the correct order based on pool structure
        // The pool contract expects amount_a and amount_b in the order the pool was created
        
        // First approve both tokens
        const tokenAClient = new UsdtTokenClient({
          ...clientOptions,
          contractId: selectedPool.tokenA.contractAddress,
        });

        const tokenBClient = new UsdtTokenClient({
          ...clientOptions,
          contractId: selectedPool.tokenB.contractAddress,
        });

        const approveATx = await tokenAClient.approve({
          from: publicKey,
          spender: selectedPool.poolAddress,
          amount: tokenAAmountRaw,
          expiration_ledger: expirationLedger,
        });
        await approveATx.signAndSend();

        const approveBTx = await tokenBClient.approve({
          from: publicKey,
          spender: selectedPool.poolAddress,
          amount: tokenBAmountRaw,
          expiration_ledger: expirationLedger,
        });
        await approveBTx.signAndSend();

        // Add liquidity - send amounts in the order they appear in the pool
        // amount_a corresponds to token_a (first token in pool)
        // amount_b corresponds to token_b (second token in pool)
        const addLiquidityTx = await poolClient.add_liquidity({
          caller: publicKey,
          amount_a: tokenAAmountRaw, // Token A amount
          amount_b: tokenBAmountRaw, // Token B amount
        });
        
        await addLiquidityTx.signAndSend();

        toast({
          title: "Success",
          description: `Successfully added ${tokenAAmount} ${selectedPool.tokenA.symbol} and ${tokenBAmount} ${selectedPool.tokenB.symbol} to the pool!`,
        });
      }
      
      setTokenAAmount("");
      setTokenBAmount("");
      
      // Refresh pools and balances
      await fetchAllPools();
      await fetchAvailableTokens();
    } catch (error) {
      console.error("Error adding liquidity:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to add liquidity: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Remove liquidity from a pool
  const handleRemoveLiquidity = async () => {
    if (!selectedPool || !publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet and select a pool to remove liquidity",
        variant: "destructive",
      });
      return;
    }

    const percentage = removePercentage / 100;
    const lpBalance = parseFloat(selectedPool.lpTokenBalance);

    if (lpBalance <= 0) {
      toast({
        title: "Error",
        description: "You don't have any liquidity to remove from this pool",
        variant: "destructive",
      });
      return;
    }

    const lpAmountToRemove = lpBalance * percentage;

    if (lpAmountToRemove <= 0) {
      toast({
        title: "Error",
        description: "Please select a valid percentage to remove",
        variant: "destructive",
      });
      return;
    }

    // Check for minimum LP token amount to prevent precision issues
    const minLpAmount = 0.000001; // Minimum 0.000001 LP tokens
    if (lpAmountToRemove < minLpAmount) {
      toast({
        title: "Error",
        description: `Amount too small. Minimum amount is ${minLpAmount} LP tokens`,
        variant: "destructive",
      });
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

      // Debug: Check current pool state before removal
      let reserves: any;
      let totalSupply: any;
      let userBalance: any;
      
      try {
        reserves = await poolClient.get_reserves();
        totalSupply = await poolClient.supply();
        userBalance = await poolClient.balance_of({ id: publicKey });
        
        console.log("Debug - Remove liquidity pool state:", {
          reserveA: reserves.result[0].toString(),
          reserveB: reserves.result[1].toString(),
          totalSupply: totalSupply.result.toString(),
          userBalance: userBalance.result.toString(),
          lpBalance: lpBalance,
          lpAmountToRemove: lpAmountToRemove,
          percentage: percentage
        });

        // Validate that user has sufficient LP tokens
        const actualUserBalance = Number(userBalance.result) / Math.pow(10, 18);
        if (actualUserBalance < lpAmountToRemove) {
          throw new Error(`Insufficient LP tokens. You have ${actualUserBalance.toFixed(6)} LP tokens but trying to remove ${lpAmountToRemove.toFixed(6)}`);
        }

        // Check if pool has sufficient reserves
        const reserveA = Number(reserves.result[0]);
        const reserveB = Number(reserves.result[1]);
        if (reserveA === 0 && reserveB === 0) {
          throw new Error("Pool has no reserves");
        }

        // Additional validation: ensure total supply is not zero
        const totalSupplyNum = Number(totalSupply.result);
        if (totalSupplyNum === 0) {
          throw new Error("Pool has no total supply");
        }

      } catch (error) {
        console.error("Error getting pool state:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to get pool state");
      }

      // Calculate LP token amount using the actual user balance from the contract
      // This ensures we're using the exact balance as stored in the contract
      const actualUserBalanceRaw = BigInt(userBalance.result);
      const percentageRaw = BigInt(removePercentage);
      const percentageDenominator = BigInt(100);
      
      // Calculate amount using integer arithmetic: (userBalance * percentage) / 100
      const lpAmountRaw = (actualUserBalanceRaw * percentageRaw) / percentageDenominator;

      // Additional validation to prevent overflow and ensure positive amounts
      if (lpAmountRaw <= BigInt(0)) {
        throw new Error("Invalid LP token amount - must be greater than 0");
      }

      // Check if amount is too large (more than user's balance)
      if (lpAmountRaw > actualUserBalanceRaw) {
        throw new Error(`Cannot remove more LP tokens than you own. You have ${lpBalance} LP tokens.`);
      }

      // Ensure the amount is reasonable (at least 1 LP token in raw format)
      const minLpAmountRaw = BigInt(Math.pow(10, 18) * 0.000001); // Minimum 0.000001 LP tokens
      if (lpAmountRaw < minLpAmountRaw) {
        throw new Error("Amount too small. Minimum amount is 0.000001 LP tokens");
      }

      // Additional validation: ensure the amount is at least 1% of user's balance to prevent dust
      const userBalancePercentage = Number(lpAmountRaw) / Number(actualUserBalanceRaw);
      if (userBalancePercentage < 0.01) { // Less than 1%
        throw new Error("Amount too small relative to your balance. Please remove at least 1% of your liquidity.");
      }

      // Calculate expected amounts using BigInt arithmetic to avoid precision issues
      const reserveARaw = BigInt(reserves.result[0]);
      const reserveBRaw = BigInt(reserves.result[1]);
      const totalSupplyRaw = BigInt(totalSupply.result);
      
      // Calculate expected amounts using BigInt arithmetic: (lpAmount * reserve) / totalSupply
      const expectedAmountARaw = (lpAmountRaw * reserveARaw) / totalSupplyRaw;
      const expectedAmountBRaw = (lpAmountRaw * reserveBRaw) / totalSupplyRaw;
      
      // Convert to numbers for validation (but keep precision)
      const expectedAmountA = Number(expectedAmountARaw);
      const expectedAmountB = Number(expectedAmountBRaw);
      
      // If both amounts would be zero, that's a problem
      if (expectedAmountA === 0 && expectedAmountB === 0) {
        throw new Error("Amount too small - would result in zero tokens returned");
      }

      // Additional validation: ensure the amount is not too small relative to total supply
      // This prevents precision issues that could cause zero amounts
      const userShareOfTotal = Number(lpAmountRaw) / Number(totalSupply.result);
      if (userShareOfTotal < 0.000001) { // Less than 0.0001% of total supply
        throw new Error("Amount too small relative to total supply. Please remove a larger percentage.");
      }

      // For very small amounts, try to use a minimum amount that will result in at least 1 token unit
      // This prevents the contract from calculating zero amounts
      let finalLpAmountRaw = lpAmountRaw;
      if (expectedAmountA < 1 && expectedAmountB < 1) {
        // Calculate the minimum amount needed to get at least 1 unit of each token
        // Use multiplication instead of division to avoid zero results
        let minAmountNeeded = BigInt(0);
        
        if (reserveARaw > 0) {
          // Calculate minimum LP tokens needed for token A: (1 * totalSupply) / reserveA
          const minForTokenA = (BigInt(1) * totalSupplyRaw) / reserveARaw;
          minAmountNeeded = minForTokenA;
        }
        
        if (reserveBRaw > 0) {
          // Calculate minimum LP tokens needed for token B: (1 * totalSupply) / reserveB
          const minForTokenB = (BigInt(1) * totalSupplyRaw) / reserveBRaw;
          // Use the larger of the two minimums to ensure both tokens get at least 1 unit
          if (minForTokenB > minAmountNeeded) {
            minAmountNeeded = minForTokenB;
          }
        }
        
        // Ensure we don't exceed user's balance
        if (minAmountNeeded > actualUserBalanceRaw) {
          throw new Error("Your balance is too small to remove any meaningful amount of liquidity.");
        }
        
        // Use the minimum amount needed, but don't exceed user's balance
        finalLpAmountRaw = minAmountNeeded > actualUserBalanceRaw ? actualUserBalanceRaw : minAmountNeeded;
        
        console.log("Debug - Adjusted LP amount for minimum token return:", {
          originalAmount: lpAmountRaw.toString(),
          adjustedAmount: finalLpAmountRaw.toString(),
          minAmountNeeded: minAmountNeeded.toString(),
          userBalance: actualUserBalanceRaw.toString(),
          reserveA: reserveARaw.toString(),
          reserveB: reserveBRaw.toString(),
          totalSupply: totalSupplyRaw.toString()
        });
      }

      console.log("Debug - Remove liquidity:", {
        poolAddress: selectedPool.poolAddress,
        finalLpAmountRaw: finalLpAmountRaw.toString(),
        percentage: removePercentage,
        isXlmPool: selectedPool.isXlmPool,
        userPublicKey: publicKey,
        poolTokenA: selectedPool.tokenA.symbol,
        poolTokenB: selectedPool.tokenB.symbol,
        actualUserBalanceRaw: actualUserBalanceRaw.toString(),
        minLpAmountRaw: minLpAmountRaw.toString(),
        userBalancePercentage: (userBalancePercentage * 100).toFixed(2) + "%",
        userShareOfTotal: (userShareOfTotal * 100).toFixed(6) + "%",
        expectedAmountARaw: expectedAmountARaw.toString(),
        expectedAmountBRaw: expectedAmountBRaw.toString(),
        expectedAmountA,
        expectedAmountB,
        calculation: `(${actualUserBalanceRaw} * ${percentageRaw}) / ${percentageDenominator} = ${finalLpAmountRaw}`
      });

      const removeLiquidityTx = await poolClient.remove_liquidity({
        caller: publicKey,
        liquidity: finalLpAmountRaw,
      });
      await removeLiquidityTx.signAndSend();

      // Calculate expected token amounts for better user feedback
      const expectedTokenAAmount = (Number(selectedPool.reserves[0]) * percentage) / Math.pow(10, selectedPool.tokenA.decimals);
      const expectedTokenBAmount = (Number(selectedPool.reserves[1]) * percentage) / Math.pow(10, selectedPool.tokenB.decimals);

      toast({
        title: "Success",
        description: `Successfully removed ${removePercentage}% of your liquidity! You received approximately ${expectedTokenAAmount.toFixed(6)} ${selectedPool.tokenA.symbol} and ${expectedTokenBAmount.toFixed(6)} ${selectedPool.tokenB.symbol}`,
      });
      
      // Refresh pools and balances
      await fetchAllPools();
      await fetchAvailableTokens();
    } catch (error) {
      console.error("Error removing liquidity:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "Error",
        description: `Failed to remove liquidity: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setIsLoadingTokens(true);
      try {
        await fetchAvailableTokens();
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoadingTokens(false);
      }
    };
    initializeData();
  }, []);

  // Fetch pools when tokens are available and when public key changes
  useEffect(() => {
    if (availableTokens.length > 0 && publicKey && !isLoadingPools && !poolsLoadedRef.current && !initialLoadComplete) {
      poolsLoadedRef.current = true;
      setInitialLoadComplete(true);
      fetchAllPools();
    }
  }, [availableTokens.length, publicKey, initialLoadComplete]);

  // Reset pools loaded ref when public key changes
  useEffect(() => {
    if (publicKey) {
      poolsLoadedRef.current = false;
      setInitialLoadComplete(false);
    }
  }, [publicKey]);

  // Fetch balances when public key changes
  useEffect(() => {
    if (publicKey && availableTokens.length > 0) {
      const fetchBalances = async () => {
        setIsLoadingBalances(true);
        
        // Fetch XLM balance first
        await fetchXlmBalance();
        
        const updatedTokens = await Promise.all(
          availableTokens.map(async (token) => ({
            ...token,
            balance: await fetchTokenBalance(token.contractAddress, token.decimals, token.isNativeXLM),
          }))
        );
        setAvailableTokens(updatedTokens);
        
        // Update pool balances if a pool is selected
        if (selectedPool) {
          const updatedPool = {
            ...selectedPool,
            tokenA: {
              ...selectedPool.tokenA,
              balance: await fetchTokenBalance(selectedPool.tokenA.contractAddress, selectedPool.tokenA.decimals, selectedPool.tokenA.isNativeXLM),
            },
            tokenB: {
              ...selectedPool.tokenB,
              balance: await fetchTokenBalance(selectedPool.tokenB.contractAddress, selectedPool.tokenB.decimals, selectedPool.tokenB.isNativeXLM),
            },
            lpTokenBalance: await fetchLPBalance(selectedPool.poolAddress),
          };
          setSelectedPool(updatedPool);
        }
        
        setIsLoadingBalances(false);
      };
      fetchBalances();
    }
  }, [publicKey, availableTokens.length]);

  // Update pool balances when a pool is selected
  useEffect(() => {
    if (selectedPool && publicKey && !isLoadingBalances) {
      const updatePoolBalances = async () => {
        const updatedPool = {
          ...selectedPool,
          tokenA: {
            ...selectedPool.tokenA,
            balance: await fetchTokenBalance(selectedPool.tokenA.contractAddress, selectedPool.tokenA.decimals, selectedPool.tokenA.isNativeXLM),
          },
          tokenB: {
            ...selectedPool.tokenB,
            balance: await fetchTokenBalance(selectedPool.tokenB.contractAddress, selectedPool.tokenB.decimals, selectedPool.tokenB.isNativeXLM),
          },
          lpTokenBalance: await fetchLPBalance(selectedPool.poolAddress),
        };
        setSelectedPool(updatedPool);
      };
      updatePoolBalances();
    }
  }, [selectedPool?.id, publicKey]);

  // Fetch user's unclaimed fees for a pool
  const fetchUnclaimedFees = async (poolAddress: string): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const feesResult = await poolClient.get_user_unclaimed_fees({
        user: publicKey
      });

      let fees = BigInt(0);
      if (feesResult && typeof feesResult === "object" && "result" in feesResult) {
        fees = BigInt(feesResult.result || 0);
      } else if (typeof feesResult === "string" || typeof feesResult === "number") {
        fees = BigInt(feesResult);
      }

      // Convert to human readable format with 6 decimal places (USDC decimals)
      const humanReadableFees = Number(fees) / Math.pow(10, 6);
      return humanReadableFees.toFixed(6);
    } catch (error) {
      console.error("Error fetching unclaimed fees:", error);
      return "0";
    }
  };

  // Claim fees from a pool
  const claimFees = async (poolAddress: string): Promise<string> => {
    if (!publicKey) return "0";

    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const claimResult = await poolClient.claim_fees({
        caller: publicKey
      });

      let claimedAmount = BigInt(0);
      if (claimResult && typeof claimResult === "object" && "result" in claimResult) {
        claimedAmount = BigInt(claimResult.result || 0);
      } else if (typeof claimResult === "string" || typeof claimResult === "number") {
        claimedAmount = BigInt(claimResult);
      }

      // Convert to human readable format with 6 decimal places (USDC decimals)
      const humanReadableAmount = Number(claimedAmount) / Math.pow(10, 6);
      return humanReadableAmount.toFixed(6);
    } catch (error) {
      console.error("Error claiming fees:", error);
      throw error;
    }
  };

  // Fetch user's detailed liquidity position
  const fetchUserLiquidityPosition = async (poolAddress: string): Promise<{ tokenABalance: string; tokenBBalance: string; lpTokenBalance: string }> => {
    if (!publicKey) return { tokenABalance: "0", tokenBBalance: "0", lpTokenBalance: "0" };

    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const positionResult = await poolClient.get_user_liquidity_position({
        user: publicKey
      });

      let tokenABalance = BigInt(0);
      let tokenBBalance = BigInt(0);
      let lpTokenBalance = BigInt(0);

      if (positionResult && typeof positionResult === "object" && "result" in positionResult) {
        const result = positionResult.result;
        if (Array.isArray(result) && result.length === 3) {
          tokenABalance = BigInt(result[0]);
          tokenBBalance = BigInt(result[1]);
          lpTokenBalance = BigInt(result[2]);
        }
      }

      return {
        tokenABalance: (Number(tokenABalance) / Math.pow(10, 18)).toFixed(6),
        tokenBBalance: (Number(tokenBBalance) / Math.pow(10, 6)).toFixed(6), // Assuming token B is USDC
        lpTokenBalance: (Number(lpTokenBalance) / Math.pow(10, 18)).toFixed(6)
      };
    } catch (error) {
      console.error("Error fetching user liquidity position:", error);
      return { tokenABalance: "0", tokenBBalance: "0", lpTokenBalance: "0" };
    }
  };

  // Fetch pool volume data
  const fetchPoolVolume = async (poolAddress: string): Promise<{ volume24h: string; volume7d: string; volumeAllTime: string }> => {
    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const [volume24hResult, volume7dResult, volumeAllTimeResult] = await Promise.all([
        poolClient.get_total_volume_24h(),
        poolClient.get_total_volume_7d(),
        poolClient.get_total_volume_all_time()
      ]);

      const volume24h = volume24hResult && typeof volume24hResult === "object" && "result" in volume24hResult 
        ? Number(volume24hResult.result) / Math.pow(10, 6) 
        : 0;
      const volume7d = volume7dResult && typeof volume7dResult === "object" && "result" in volume7dResult 
        ? Number(volume7dResult.result) / Math.pow(10, 6) 
        : 0;
      const volumeAllTime = volumeAllTimeResult && typeof volumeAllTimeResult === "object" && "result" in volumeAllTimeResult 
        ? Number(volumeAllTimeResult.result) / Math.pow(10, 6) 
        : 0;

      return {
        volume24h: `$${volume24h.toFixed(2)}`,
        volume7d: `$${volume7d.toFixed(2)}`,
        volumeAllTime: `$${volumeAllTime.toFixed(2)}`
      };
    } catch (error) {
      console.error("Error fetching pool volume:", error);
      return {
        volume24h: "$0",
        volume7d: "$0",
        volumeAllTime: "$0"
      };
    }
  };

  // Fetch pool TVL
  const fetchPoolTVL = async (poolAddress: string): Promise<number> => {
    try {
      const poolClient = new PoolClient({
        contractId: poolAddress,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const tvlResult = await poolClient.get_pool_tvl();

      let tvl = BigInt(0);
      if (tvlResult && typeof tvlResult === "object" && "result" in tvlResult) {
        tvl = BigInt(tvlResult.result || 0);
      } else if (typeof tvlResult === "string" || typeof tvlResult === "number") {
        tvl = BigInt(tvlResult);
      }

      // Convert to human readable format with 6 decimal places (USDC decimals)
      return Number(tvl) / Math.pow(10, 6);
    } catch (error) {
      console.error("Error fetching pool TVL:", error);
      return 0;
    }
  };

  // Handle fee claiming
  const handleClaimFees = async (poolAddress: string) => {
    if (!publicKey) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRemovingLiquidity(true);
      
      const claimedAmount = await claimFees(poolAddress);
      
      toast({
        title: "Success",
        description: `Successfully claimed $${claimedAmount} in fees`,
        variant: "default",
      });

      // Refresh pool data
      await fetchAllPools();
    } catch (error) {
      console.error("Error claiming fees:", error);
      toast({
        title: "Error",
        description: "Failed to claim fees. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingLiquidity(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <style>{customScrollbarStyles}</style>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="flex items-center justify-center mb-4">
            <Droplets className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400 mr-2 lg:mr-3" />
            <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Liquidity Management
            </h1>
          </div>
          <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto px-4">
            Add or remove liquidity from pools to earn trading fees and participate in the ecosystem
          </p>
          
          {/* Wallet Connection Status */}
          <div className="mt-6 flex items-center justify-center">
            {publicKey ? (
              <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 lg:px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs lg:text-sm font-medium">Wallet Connected</span>
                <span className="text-gray-400 text-xs font-mono hidden sm:inline">
                  {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-3 lg:px-4 py-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-yellow-400 text-xs lg:text-sm font-medium">Connect Wallet to Continue</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading States */}
        {(isLoadingPools || isLoadingTokens) && (
          <div className="text-center py-12">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Droplets className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            <p className="text-gray-300 text-lg">
              {isLoadingTokens ? "Loading tokens..." : "Loading pools and user data..."}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {isLoadingTokens ? "Fetching available tokens from the network" : "This may take a few moments"}
            </p>
          </div>
        )}

        {!isLoadingPools && !isLoadingTokens && !publicKey && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-300 mb-2 font-medium">Connect your wallet to view pools</p>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              Your wallet needs to be connected to load your liquidity positions and pool data.
            </p>
          </div>
        )}

        {!isLoadingPools && !isLoadingTokens && publicKey && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {/* Pool Selection */}
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Available Pools</h2>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {pools.length} Pools
                    </Badge>
                    <Button
                      onClick={() => {
                        poolsLoadedRef.current = false;
                        fetchAllPools();
                        fetchAvailableTokens();
                      }}
                      disabled={isLoadingPools || isLoadingTokens}
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      <Loader2 className={`w-4 h-4 mr-2 ${isLoadingPools || isLoadingTokens ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
                
                {pools.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Droplets className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-300 mb-2 font-medium">No pools available</p>
                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                      Create a pool first by swapping tokens or launching a new token. Pools will appear here once they're created.
                    </p>
                    <div className="flex items-center justify-center space-x-4">
                      <Button 
                        onClick={() => window.location.href = '/swap'}
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Go to Swap
                      </Button>
                      <Button 
                        onClick={() => window.location.href = '/launch'}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Launch Token
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {pools.map((pool) => (
                      <div
                        key={pool.id}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                          selectedPool?.id === pool.id
                            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/50 shadow-lg scale-[1.02]"
                            : "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20"
                        }`}
                        onClick={() => setSelectedPool(pool)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 lg:space-x-4">
                            <div className="flex -space-x-2">
                              {pool.tokenA.isNativeXLM ? (
                                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-white/20">
                                  <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                                </div>
                              ) : (
                                <img
                                  src={pool.tokenA.image}
                                  alt={pool.tokenA.symbol}
                                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white/20"
                                />
                              )}
                              {pool.tokenB.isNativeXLM ? (
                                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center border-2 border-white/20">
                                  <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                                </div>
                              ) : (
                                <img
                                  src={pool.tokenB.image}
                                  alt={pool.tokenB.symbol}
                                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border-2 border-white/20"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-base lg:text-lg">
                                {pool.tokenA.symbol}/{pool.tokenB.symbol}
                              </div>
                              <div className="text-xs lg:text-sm text-gray-400 flex items-center space-x-2">
                                <span>{formatLargeNumber(pool.tvl)}</span>
                                <span>•</span>
                                <span className="text-green-400">{pool.apr} APR</span>
                                {Number(pool.reserves[0]) === 0 && Number(pool.reserves[1]) === 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-yellow-400">No Liquidity</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs lg:text-sm text-gray-400">Volume 24h</div>
                            <div className="font-semibold text-green-400 text-sm lg:text-base">{pool.volume24h}</div>
                          </div>
                        </div>
                        
                        {/* XLM Pool Indicator */}
                        {pool.isXlmPool && (
                          <div className="mt-3 flex items-center space-x-2">
                            <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30 text-xs">
                              <Coins className="w-3 h-3 mr-1" />
                              Native XLM Pool
                            </Badge>
                          </div>
                        )}

                        {/* Your Liquidity Info */}
                        {parseFloat(pool.lpTokenBalance) > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Your LP Tokens:</span>
                              <span className="text-blue-400 font-medium">{formatBalance(pool.lpTokenBalance, 18)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Your Share:</span>
                              <span className="text-green-400 font-medium">{pool.myShare}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Pool Reserves:</span>
                              <span className="text-purple-400 font-medium">
                                {formatBalance((Number(pool.reserves[0]) / Math.pow(10, pool.tokenA.decimals)).toString(), pool.tokenA.decimals)} {pool.tokenA.symbol} / {formatBalance((Number(pool.reserves[1]) / Math.pow(10, pool.tokenB.decimals)).toString(), pool.tokenB.decimals)} {pool.tokenB.symbol}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Liquidity Management */}
            <div className="space-y-6">
              {/* Pool Info Card */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-xl font-bold">Pool Information</span>
                    {selectedPool?.isXlmPool && (
                      <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30">
                        <Coins className="w-3 h-3 mr-1" />
                        XLM Pool
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPool ? (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Pool Address</span>
                            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded">
                              {selectedPool.poolAddress.slice(0, 8)}...{selectedPool.poolAddress.slice(-8)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">LP Token Contract</span>
                            <span className="text-xs font-mono bg-gray-800 px-2 py-1 rounded">
                              {selectedPool.poolAddress.slice(0, 8)}...{selectedPool.poolAddress.slice(-8)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">TVL</span>
                            <span className="font-semibold text-green-400">
                              {selectedPool ? formatLargeNumber(selectedPool.tvl) : "$0"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">APR</span>
                            <span className="font-semibold text-blue-400">{selectedPool.apr}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Volume 24h</span>
                            <span className="font-semibold text-purple-400">{selectedPool.volume24h}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Your LP Tokens</span>
                            <span className="font-semibold text-purple-400">{formatBalance(selectedPool.lpTokenBalance, 18)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Your Share</span>
                            <span className="font-semibold text-green-400">{selectedPool.myShare}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Fees 24h</span>
                            <span className="font-semibold text-yellow-400">{selectedPool.fees24h}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Unclaimed Fees</span>
                            <span className="font-semibold text-green-400">
                              {isLoadingBalances ? (
                                <div className="flex items-center space-x-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>Loading...</span>
                                </div>
                              ) : selectedPool ? (
                                selectedPool.unclaimedFees
                              ) : (
                                "$0.00"
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">LP Token Supply</span>
                            <span className="font-semibold text-blue-400">{formatBalance(selectedPool.lpTokenBalance, 18)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Token Balances Section */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Pool Reserves</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {selectedPool.tokenA.isNativeXLM ? (
                                <Coins className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <img
                                  src={selectedPool.tokenA.image}
                                  alt={selectedPool.tokenA.symbol}
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span className="text-sm text-gray-300">{selectedPool.tokenA.symbol}</span>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {formatBalance((Number(selectedPool.reserves[0]) / Math.pow(10, selectedPool.tokenA.decimals)).toString(), selectedPool.tokenA.decimals)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {selectedPool.tokenB.isNativeXLM ? (
                                <Coins className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <img
                                  src={selectedPool.tokenB.image}
                                  alt={selectedPool.tokenB.symbol}
                                  className="w-4 h-4 rounded-full"
                                />
                              )}
                              <span className="text-sm text-gray-300">{selectedPool.tokenB.symbol}</span>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {formatBalance((Number(selectedPool.reserves[1]) / Math.pow(10, selectedPool.tokenB.decimals)).toString(), selectedPool.tokenB.decimals)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Droplets className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-300 mb-2 font-medium">Select a Pool</p>
                      <p className="text-sm text-gray-500">
                        Choose a pool from the list to view detailed information and manage your liquidity
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add Liquidity Card */}
              {selectedPool && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-xl font-bold">
                      <Plus className="mr-3 h-6 w-6 text-green-400" />
                      Add Liquidity
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      {isInitialLiquidity ? (
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          Initial Liquidity
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                          Proportional Liquidity
                        </Badge>
                      )}
                      {selectedPool.isXlmPool && (
                        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30">
                          <Coins className="w-3 h-3 mr-1" />
                          XLM Pool
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Token A Input */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">
                          {selectedPool.tokenA.symbol} Amount
                        </label>
                        <div className="text-sm text-gray-400">
                          {isLoadingBalances ? (
                            <div className="flex items-center space-x-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </div>
                          ) : (
                            `Balance: ${formatBalance(selectedPool.tokenA.balance, selectedPool.tokenA.decimals)} ${selectedPool.tokenA.symbol}`
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 lg:space-x-3">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenAAmount}
                          onChange={(e) => handleTokenAAmountChange(e.target.value)}
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl"
                        />
                        <div className="flex items-center space-x-2 bg-gray-800/50 px-3 lg:px-4 rounded-xl border border-gray-600 min-w-fit">
                          {selectedPool.tokenA.isNativeXLM ? (
                            <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                          ) : (
                            <img
                              src={selectedPool.tokenA.image}
                              alt={selectedPool.tokenA.symbol}
                              className="w-4 h-4 lg:w-5 lg:h-5 rounded-full"
                            />
                          )}
                          <span className="text-xs lg:text-sm font-medium text-white">{selectedPool.tokenA.symbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Token B Input */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-gray-300">
                          {selectedPool.tokenB.symbol} Amount
                        </label>
                        <div className="text-sm text-gray-400">
                          {isLoadingBalances ? (
                            <div className="flex items-center space-x-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Loading...</span>
                            </div>
                          ) : (
                            `Balance: ${formatBalance(selectedPool.tokenB.balance, selectedPool.tokenB.decimals)} ${selectedPool.tokenB.symbol}`
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2 lg:space-x-3">
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={tokenBAmount}
                          onChange={(e) => handleTokenBAmountChange(e.target.value)}
                          className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl"
                        />
                        <div className="flex items-center space-x-2 bg-gray-800/50 px-3 lg:px-4 rounded-xl border border-gray-600 min-w-fit">
                          {selectedPool.tokenB.isNativeXLM ? (
                            <Coins className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-400" />
                          ) : (
                            <img
                              src={selectedPool.tokenB.image}
                              alt={selectedPool.tokenB.symbol}
                              className="w-4 h-4 lg:w-5 lg:h-5 rounded-full"
                            />
                          )}
                          <span className="text-xs lg:text-sm font-medium text-white">{selectedPool.tokenB.symbol}</span>
                        </div>
                      </div>
                    </div>

                    {/* Pool Share Preview */}
                    {(tokenAAmount || tokenBAmount) && (
                      <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                        <p className="text-sm text-blue-300 mb-3 font-medium">Pool Share Preview:</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-300">Your {selectedPool.tokenA.symbol}:</span>
                            <span className="text-white font-medium">{tokenAAmount || "0"} {selectedPool.tokenA.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-300">Your {selectedPool.tokenB.symbol}:</span>
                            <span className="text-white font-medium">{tokenBAmount || "0"} {selectedPool.tokenB.symbol}</span>
                          </div>
                          {!isInitialLiquidity && tokenAAmount && tokenBAmount && (
                            <div className="flex justify-between text-green-400 font-medium pt-2 border-t border-blue-500/20">
                              <span>Estimated LP tokens:</span>
                              <span>~{Math.sqrt(parseFloat(tokenAAmount) * parseFloat(tokenBAmount)).toFixed(2)}</span>
                            </div>
                          )}
                          {isInitialLiquidity && tokenAAmount && tokenBAmount && (
                            <div className="flex justify-between text-yellow-400 font-medium pt-2 border-t border-blue-500/20">
                              <span>Initial LP tokens:</span>
                              <span>~{Math.sqrt(parseFloat(tokenAAmount) * parseFloat(tokenBAmount)).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleAddLiquidity}
                      disabled={isAddingLiquidity || !publicKey || (!tokenAAmount && !tokenBAmount)}
                      className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
                    >
                      {isAddingLiquidity ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Adding Liquidity...</span>
                        </div>
                      ) : (
                        "Add Liquidity"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Claim Fees Button */}
              {selectedPool && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Button
                    onClick={() => handleClaimFees(selectedPool.poolAddress)}
                    disabled={isRemovingLiquidity || isLoadingBalances}
                    className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold rounded-xl"
                  >
                    {isRemovingLiquidity ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Claiming Fees...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4 mr-2" />
                        Claim Unclaimed Fees
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Remove Liquidity Card */}
              {selectedPool && parseFloat(selectedPool.lpTokenBalance) > 0 && (
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-xl font-bold">
                      <Minus className="mr-3 h-6 w-6 text-red-400" />
                      Remove Liquidity
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                        Your LP Tokens: {formatBalance(selectedPool.lpTokenBalance, 18)}
                      </Badge>
                      {selectedPool.isXlmPool && (
                        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30">
                          <Coins className="w-3 h-3 mr-1" />
                          XLM Pool
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-300">Remove Percentage</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[25, 50, 75, 100].map((percentage) => (
                          <button
                            key={percentage}
                            onClick={() => setRemovePercentage(percentage)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                              removePercentage === percentage
                                ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                                : "bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600"
                            }`}
                          >
                            {percentage}%
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 rounded-xl border border-red-500/20">
                      <p className="text-sm text-red-300 mb-3 font-medium">You will receive:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">{selectedPool.tokenA.symbol}:</span>
                          <span className="text-white font-medium">
                            ~{((Number(selectedPool.reserves[0]) * removePercentage / 100) / Math.pow(10, selectedPool.tokenA.decimals)).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">{selectedPool.tokenB.symbol}:</span>
                          <span className="text-white font-medium">
                            ~{((Number(selectedPool.reserves[1]) * removePercentage / 100) / Math.pow(10, selectedPool.tokenB.decimals)).toFixed(6)}
                          </span>
                        </div>
                        <div className="flex justify-between text-yellow-400 font-medium pt-2 border-t border-red-500/20">
                          <span>LP Tokens to burn:</span>
                          <span>~{(parseFloat(selectedPool.lpTokenBalance) * removePercentage / 100).toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between text-blue-400 font-medium pt-2 border-t border-red-500/20">
                          <span>Raw LP amount:</span>
                          <span className="text-xs font-mono">
                            {BigInt(Math.round(parseFloat(selectedPool.lpTokenBalance) * removePercentage / 100 * Math.pow(10, 18))).toString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleRemoveLiquidity}
                      disabled={isRemovingLiquidity || !publicKey}
                      className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
                    >
                      {isRemovingLiquidity ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Removing Liquidity...</span>
                        </div>
                      ) : (
                        "Remove Liquidity"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
