"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUpDown, Settings, TrendingUp, Clock, Loader2, AlertCircle, Coins } from "lucide-react"
import Image from "next/image"
import { Client as TokenFactoryClient } from "@/packages/TokenLauncher/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import { Client as UsdtTokenClient } from "@/packages/USDTToken/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { getPublicKey, signTransaction } from "@/lib/stellar-wallets-kit"
import { useToast } from "@/hooks/use-toast"
import * as Stellar from "@stellar/stellar-sdk"
import { useSearchParams } from "next/navigation"

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
  isNativeXLM?: boolean;
}

// Interface for pool data
interface PoolData {
  poolAddress: string;
  reserves: [bigint, bigint];
  tokenA: string;
  tokenB: string;
  isXlmPool?: boolean;
  xlmTokenIndex?: number;
}

// Interface for XLM price data
interface XlmPriceData {
  price: number;
  lastUpdated: Date;
  source: string;
}

const recentTrades = [
  { from: "PEPE", to: "USDC", amount: "100,000", value: "$1,200", time: "2m ago", type: "buy" },
  { from: "USDC", to: "DMAX", amount: "500", value: "$500", time: "5m ago", type: "sell" },
  { from: "MSHIB", to: "USDC", amount: "25,000", value: "$2,225", time: "8m ago", type: "buy" },
]

export default function SwapPage() {
  const searchParams = useSearchParams();
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
  const [xlmBalance, setXlmBalance] = useState<string>("0")
  const [xlmPrice, setXlmPrice] = useState<XlmPriceData | null>(null)
  const [isLoadingXlmPrice, setIsLoadingXlmPrice] = useState(false)

  const { toast } = useToast()

  // Initialize wallet connection
  useEffect(() => {
    getPublicKey().then(setPublicKey);
  }, []);

  // On mount, check for ?from= and ?to= query params and set tokens
  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from) setFromToken(from);
    if (to) setToToken(to);
  }, [searchParams]);

  // Apply query params after tokens are loaded
  useEffect(() => {
    if (availableTokens.length > 0) {
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      
      // Check if the tokens from query params exist in available tokens
      if (from && availableTokens.find(t => t.symbol === from)) {
        setFromToken(from);
      }
      if (to && availableTokens.find(t => t.symbol === to)) {
        setToToken(to);
      }
    }
  }, [availableTokens, searchParams]);

  // Fetch XLM price from external oracle
  const fetchXlmPrice = async () => {
    try {
      setIsLoadingXlmPrice(true);
      
      // Try multiple price sources for redundancy
      const priceSources = [
        'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
        'https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT',
        'https://api.kraken.com/0/public/Ticker?pair=XXLMZUSD'
      ];

      let price = 0;
      let source = '';

      for (const sourceUrl of priceSources) {
        try {
          const response = await fetch(sourceUrl);
          if (response.ok) {
            const data = await response.json();
            
            if (sourceUrl.includes('coingecko')) {
              price = data.stellar?.usd || 0;
              source = 'CoinGecko';
            } else if (sourceUrl.includes('binance')) {
              price = parseFloat(data.price) || 0;
              source = 'Binance';
            } else if (sourceUrl.includes('kraken')) {
              const pairKey = Object.keys(data.result)[0];
              price = parseFloat(data.result[pairKey]?.c?.[0]) || 0;
              source = 'Kraken';
            }

            if (price > 0) {
              break;
            }
          }
        } catch (error) {
          console.error(`Error fetching from ${sourceUrl}:`, error);
          continue;
        }
      }

      if (price > 0) {
        setXlmPrice({
          price,
          lastUpdated: new Date(),
          source
        });
      } else {
        // Fallback to a reasonable default price if all sources fail
        setXlmPrice({
          price: 0.12, // Default XLM price
          lastUpdated: new Date(),
          source: 'Default'
        });
      }
    } catch (error) {
      console.error("Error fetching XLM price:", error);
      // Set default price as fallback
      setXlmPrice({
        price: 0.12,
        lastUpdated: new Date(),
        source: 'Default'
      });
    } finally {
      setIsLoadingXlmPrice(false);
    }
  };

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

      // Add XLM token
      const xlmToken: SwapToken = {
        symbol: "XLM",
        name: "Stellar Lumens",
        image: "/xlm.svg", // Updated to use SVG icon
        contractAddress: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // Use the correct native XLM contract address
        balance: "0",
        decimals: 7,
        isNativeXLM: true,
      };

      const allTokens = [usdcToken, xlmToken, ...validTokens];
      setAvailableTokens(allTokens);
      
      // Set initial toToken if not set (but only if no query param is provided)
      const toFromQuery = searchParams.get("to");
      if (!toToken && !toFromQuery && allTokens.length > 1) {
        setToToken(allTokens[1].symbol);
      }

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

      // Get pool reserves and check if it's an XLM pool
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
        if (Array.isArray(result) && result.length >= 2) {
          reserves = [BigInt(result[0]), BigInt(result[1])];
        }
      } else if (reservesResult && Array.isArray(reservesResult as any) && (reservesResult as any).length >= 2) {
        reserves = [BigInt((reservesResult as any)[0]), BigInt((reservesResult as any)[1])];
      } else if (reservesResult && typeof reservesResult === "object" && "0" in reservesResult && "1" in reservesResult) {
        // Handle tuple-like object
        reserves = [BigInt(reservesResult[0]), BigInt(reservesResult[1])];
      }

      // Check if this is an XLM pool
      let isXlmPool = false;
      let xlmTokenIndex: number | undefined;
      
      try {
        const isXlmPoolResult = await poolClient.is_xlm_pool();
        if (isXlmPoolResult && typeof isXlmPoolResult === "object" && "result" in isXlmPoolResult) {
          isXlmPool = isXlmPoolResult.result || false;
        } else if (typeof isXlmPoolResult === "boolean") {
          isXlmPool = isXlmPoolResult;
        }

        if (isXlmPool) {
          const xlmTokenIndexResult = await poolClient.get_xlm_token_index();
          if (xlmTokenIndexResult && typeof xlmTokenIndexResult === "object" && "result" in xlmTokenIndexResult) {
            xlmTokenIndex = xlmTokenIndexResult.result;
          } else if (typeof xlmTokenIndexResult === "number") {
            xlmTokenIndex = xlmTokenIndexResult;
          }
        }
      } catch (error) {
        console.log("Could not determine if pool is XLM pool:", error);
      }

      return {
        poolAddress,
        reserves,
        tokenA: tokenAAddress,
        tokenB: tokenBAddress,
        isXlmPool,
        xlmTokenIndex,
      };
    } catch (error) {
      console.error("Error fetching pool data:", error);
      return null;
    }
  };

  // Fetch pool volume data for swap analytics
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

  // Fetch pool TVL for better price calculations
  const fetchPoolTVL = async (poolAddress: string): Promise<string> => {
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
      const humanReadableTVL = Number(tvl) / Math.pow(10, 6);
      return `$${humanReadableTVL.toFixed(2)}`;
    } catch (error) {
      console.error("Error fetching pool TVL:", error);
      return "$0";
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
            toTokenContract: toTokenData.contractAddress
          });
          
          // Determine which reserve corresponds to which token
          let reserveIn: bigint;
          let reserveOut: bigint;
          let decimalsIn: number;
          let decimalsOut: number;
          
          // Create a dynamic mapping of token addresses to their reserves
          const tokenReserveMap = new Map<string, bigint>();
          tokenReserveMap.set(currentPool.tokenA, rawReserveA);
          tokenReserveMap.set(currentPool.tokenB, rawReserveB);
          
          console.log("Debug - Token to reserve mapping:", {
            tokenA: currentPool.tokenA,
            tokenB: currentPool.tokenB,
            tokenAReserve: rawReserveA.toString(),
            tokenBReserve: rawReserveB.toString(),
            fromTokenContract: fromTokenData.contractAddress,
            toTokenContract: toTokenData.contractAddress,
            fromToken: fromToken,
            toToken: toToken,
            swapDirection: `${fromToken} → ${toToken}`,
            tokenAMatchesFromToken: currentPool.tokenA === fromTokenData.contractAddress,
            tokenBMatchesFromToken: currentPool.tokenB === fromTokenData.contractAddress,
            tokenAMatchesToToken: currentPool.tokenA === toTokenData.contractAddress,
            tokenBMatchesToToken: currentPool.tokenB === toTokenData.contractAddress
          });
          
          // Identify which reserve corresponds to which token type based on magnitude
          const reserveAMagnitude = rawReserveA.toString().length;
          const reserveBMagnitude = rawReserveB.toString().length;
          
          // USDC has 6 decimals (smaller magnitude), Custom tokens have 18 decimals (larger magnitude)
          const reserveAIsUSDC = reserveAMagnitude < reserveBMagnitude;
          const reserveBIsUSDC = reserveBMagnitude < reserveAMagnitude;
          
          console.log("Debug - Reserve type identification:", {
            reserveAMagnitude,
            reserveBMagnitude,
            reserveAIsUSDC,
            reserveBIsUSDC,
            fromTokenDecimals: fromTokenData.decimals,
            toTokenDecimals: toTokenData.decimals
          });
          
          // Map reserves to their correct token types
          let usdcReserve: bigint;
          let customTokenReserve: bigint;
          
          if (reserveAIsUSDC) {
            usdcReserve = rawReserveA;
            customTokenReserve = rawReserveB;
          } else {
            usdcReserve = rawReserveB;
            customTokenReserve = rawReserveA;
          }
          
          // Now map based on the actual tokens being swapped
          if (fromTokenData.decimals === 6 && toTokenData.decimals === 18) {
            // USDC → Custom Token
            reserveIn = usdcReserve;
            reserveOut = customTokenReserve;
            decimalsIn = 6;
            decimalsOut = 18;
          } else if (fromTokenData.decimals === 18 && toTokenData.decimals === 6) {
            // Custom Token → USDC
            reserveIn = customTokenReserve;
            reserveOut = usdcReserve;
            decimalsIn = 18;
            decimalsOut = 6;
          } else {
            // Fallback: use direct mapping
            const fromTokenReserve = tokenReserveMap.get(fromTokenData.contractAddress);
            const toTokenReserve = tokenReserveMap.get(toTokenData.contractAddress);
            
            if (fromTokenReserve !== undefined && toTokenReserve !== undefined) {
              reserveIn = fromTokenReserve;
              reserveOut = toTokenReserve;
              decimalsIn = fromTokenData.decimals;
              decimalsOut = toTokenData.decimals;
            } else {
              // Final fallback
              reserveIn = rawReserveA;
              reserveOut = rawReserveB;
              decimalsIn = fromTokenData.decimals;
              decimalsOut = toTokenData.decimals;
            }
          }
          
          console.log("Debug - Final reserve mapping:", {
            reserveIn: reserveIn.toString(),
            reserveOut: reserveOut.toString(),
            decimalsIn,
            decimalsOut,
            fromToken: fromToken,
            toToken: toToken,
            usdcReserve: usdcReserve.toString(),
            customTokenReserve: customTokenReserve.toString()
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
  const fetchTokenBalance = async (tokenAddress: string, decimals: number, isNativeXLM: boolean = false): Promise<string> => {
    if (!publicKey) return "0";

    try {
      if (isNativeXLM) {
        // For native XLM, use the stored balance
        return xlmBalance;
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

  // Fetch balances for all available tokens
  const fetchAllTokenBalances = async () => {
    if (!publicKey || availableTokens.length === 0) return;

    try {
      setIsLoadingBalances(true);
      
      // Fetch XLM balance first
      await fetchXlmBalance();
      
      const balancePromises = availableTokens.map(async (token) => {
        if (token.isNativeXLM) {
          // For XLM, use the already fetched balance
          return { symbol: token.symbol, balance: xlmBalance };
        } else {
          const balance = await fetchTokenBalance(token.contractAddress, token.decimals, token.isNativeXLM);
          return { symbol: token.symbol, balance };
        }
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
      toast({
        title: "Error",
        description: "Please connect wallet and enter amounts",
        variant: "destructive",
      });
      return;
    }

    // Validate swap amounts
    const fromTokenData = availableTokens.find(t => t.symbol === fromToken);
    if (!fromTokenData) {
      toast({
        title: "Error",
        description: "From token not found",
        variant: "destructive",
      });
      return;
    }

    const balance = tokenBalances[fromToken] || "0";
    const amount = parseFloat(fromAmount);
    const userBalance = parseFloat(balance);

    if (amount > userBalance) {
      toast({
        title: "Error",
        description: `Insufficient ${fromToken} balance`,
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingSwap(true);
      setSwapError(null);

      const server = new Stellar.Horizon.Server('https://horizon-testnet.stellar.org');
      const currentLedger = await server.ledgers().order('desc').limit(1).call();
      const expirationLedger = currentLedger.records[0].sequence + 1000;

      const amountIn = BigInt(parseFloat(fromAmount) * Math.pow(10, fromTokenData.decimals));

      // Check if this is an XLM swap
      if (currentPool.isXlmPool && fromTokenData.isNativeXLM) {
        // Native XLM swap - no approval needed, XLM is transferred directly
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
          input_token: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // Use the correct native XLM contract address
          amount_in: amountIn,
        });
        
        const result = await swapTx.signAndSend();
        console.log("XLM swap successful:", result);

        toast({
          title: "Swap Successful",
          description: `Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
        });

      } else if (currentPool.isXlmPool && toToken === "XLM") {
        // Swapping to XLM - need approval for input token
        const tokenClient = new UsdtTokenClient({
          contractId: fromTokenData.contractAddress,
          rpcUrl: "https://soroban-testnet.stellar.org",
          networkPassphrase: "Test SDF Network ; September 2015",
          publicKey: publicKey,
          signTransaction: signTransaction,
          allowHttp: true,
        });

        // Approve pool to spend tokens
        const approveTx = await tokenClient.approve({
          from: publicKey,
          spender: currentPool.poolAddress,
          amount: amountIn,
          expiration_ledger: expirationLedger,
        });
        await approveTx.signAndSend();

        // Execute swap to XLM
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
        console.log("Swap to XLM successful:", result);

        toast({
          title: "Swap Successful",
          description: `Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
        });

      } else {
        // Standard token swap - need approval
        const tokenClient = new UsdtTokenClient({
          contractId: fromTokenData.contractAddress,
          rpcUrl: "https://soroban-testnet.stellar.org",
          networkPassphrase: "Test SDF Network ; September 2015",
          publicKey: publicKey,
          signTransaction: signTransaction,
          allowHttp: true,
        });

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

        toast({
          title: "Swap Successful",
          description: `Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
        });
      }

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
      const errorMessage = error instanceof Error ? error.message : "Swap failed";
      setSwapError(errorMessage);
      toast({
        title: "Swap Failed",
        description: errorMessage,
        variant: "destructive",
      });
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

  // Fetch XLM balance when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchXlmBalance();
    }
  }, [publicKey]);

  // Fetch XLM price when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchXlmPrice();
      
      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchXlmPrice, 30000);
      
      return () => clearInterval(interval);
    }
  }, [publicKey]);

  // Recalculate amount when pool data changes
  useEffect(() => {
    if (fromAmount && currentPool && fromToken && toToken) {
      // Trigger recalculation when pool data is available
      handleAmountChange(fromAmount, true);
    }
  }, [currentPool, fromToken, toToken, fromAmount, availableTokens]);

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
                              {token.isNativeXLM ? (
                                <Coins className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <Image
                                  src={token.image || "/placeholder.svg"}
                                  alt={token.symbol}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              )}
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
                              {token.isNativeXLM ? (
                                <Coins className="w-4 h-4 text-yellow-400" />
                              ) : (
                                <Image
                                  src={token.image || "/placeholder.svg"}
                                  alt={token.symbol}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              )}
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
                        {currentPool.isXlmPool && (
                          <div className="text-yellow-400">✓ Native XLM Pool</div>
                        )}
                        
                        {/* XLM Price Display */}
                        {(fromToken === "XLM" || toToken === "XLM") && xlmPrice && (
                          <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                            <div className="flex items-center justify-between">
                              <span className="text-yellow-400 text-xs">XLM Price</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-yellow-300 text-xs font-medium">
                                  ${xlmPrice.price.toFixed(4)}
                                </span>
                                <button
                                  onClick={fetchXlmPrice}
                                  disabled={isLoadingXlmPrice}
                                  className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                  title="Refresh XLM price"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="text-yellow-400/70 text-xs mt-1">
                              Source: {xlmPrice.source} • Updated: {xlmPrice.lastUpdated.toLocaleTimeString()}
                            </div>
                            {isLoadingXlmPrice && (
                              <div className="flex items-center space-x-1 mt-1">
                                <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />
                                <span className="text-yellow-400/70 text-xs">Updating price...</span>
                              </div>
                            )}
                          </div>
                        )}
                        
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
                          
                          // Determine which reserve corresponds to which token
                          let reserveIn: bigint;
                          let reserveOut: bigint;
                          let decimalsIn: number;
                          let decimalsOut: number;
                          
                          // Create a dynamic mapping of token addresses to their reserves
                          const tokenReserveMap = new Map<string, bigint>();
                          tokenReserveMap.set(currentPool.tokenA, currentPool.reserves[0]);
                          tokenReserveMap.set(currentPool.tokenB, currentPool.reserves[1]);
                          
                          // Identify which reserve corresponds to which token type based on magnitude
                          const reserveAMagnitude = currentPool.reserves[0].toString().length;
                          const reserveBMagnitude = currentPool.reserves[1].toString().length;
                          
                          // USDC has 6 decimals (smaller magnitude), Custom tokens have 18 decimals (larger magnitude)
                          const reserveAIsUSDC = reserveAMagnitude < reserveBMagnitude;
                          const reserveBIsUSDC = reserveBMagnitude < reserveAMagnitude;
                          
                          // Map reserves to their correct token types
                          let usdcReserve: bigint;
                          let customTokenReserve: bigint;
                          
                          if (reserveAIsUSDC) {
                            usdcReserve = currentPool.reserves[0];
                            customTokenReserve = currentPool.reserves[1];
                          } else {
                            usdcReserve = currentPool.reserves[1];
                            customTokenReserve = currentPool.reserves[0];
                          }
                          
                          // Now map based on the actual tokens being swapped
                          if (fromTokenData.decimals === 6 && toTokenData.decimals === 18) {
                            // USDC → Custom Token
                            reserveIn = usdcReserve;
                            reserveOut = customTokenReserve;
                            decimalsIn = 6;
                            decimalsOut = 18;
                          } else if (fromTokenData.decimals === 18 && toTokenData.decimals === 6) {
                            // Custom Token → USDC
                            reserveIn = customTokenReserve;
                            reserveOut = usdcReserve;
                            decimalsIn = 18;
                            decimalsOut = 6;
                          } else {
                            // Fallback: use direct mapping
                            const fromTokenReserve = tokenReserveMap.get(fromTokenData.contractAddress);
                            const toTokenReserve = tokenReserveMap.get(toTokenData.contractAddress);
                            
                            if (fromTokenReserve !== undefined && toTokenReserve !== undefined) {
                              reserveIn = fromTokenReserve;
                              reserveOut = toTokenReserve;
                              decimalsIn = fromTokenData.decimals;
                              decimalsOut = toTokenData.decimals;
                            } else {
                              // Final fallback
                              reserveIn = currentPool.reserves[0];
                              reserveOut = currentPool.reserves[1];
                              decimalsIn = fromTokenData.decimals;
                              decimalsOut = toTokenData.decimals;
                            }
                          }
                          
                          // Calculate rate for exactly 1 unit of fromToken
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
                    
                    {/* XLM Value in USD */}
                    {(fromToken === "XLM" || toToken === "XLM") && xlmPrice && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Value in USD</span>
                        <span className="text-yellow-300">
                          ${(() => {
                            if (fromToken === "XLM") {
                              return (parseFloat(fromAmount) * xlmPrice.price).toFixed(2);
                            } else if (toToken === "XLM") {
                              return (parseFloat(toAmount) * xlmPrice.price).toFixed(2);
                            }
                            return "0.00";
                          })()}
                        </span>
                      </div>
                    )}
                    
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
        </div>
      </div>
    </div>
  )
}