"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TrendingUp, TrendingDown, Search, Plus, Zap, BarChart3, ArrowUpDown, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { CandlestickChart } from "@/components/candlestick-chart"
import { Client as TokenFactoryClient } from "@/packages/TokenLauncher/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

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

// Interface for display token data
interface DisplayToken {
  id: string;
  name: string;
  symbol: string;
  image: string;
  price: string;
  change: string;
  marketCap: string;
  volume: string;
  liquidity: string;
  trending: boolean;
  description?: string;
  contractAddress: string;
  poolAddress?: string;
  reserves?: [bigint, bigint];
  isXlmPool?: boolean;
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
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
    contractAddress: "",
    poolAddress: undefined,
    reserves: undefined,
    isXlmPool: false,
  },
]

function hasCreatedAt(obj: any): obj is { attributes: { created_at: string } } {
  return (
    obj &&
    typeof obj === 'object' &&
    'attributes' in obj &&
    obj.attributes &&
    typeof obj.attributes === 'object' &&
    typeof obj.attributes.created_at === 'string'
  );
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [deployedTokens, setDeployedTokens] = useState<string[]>([]);
  const [realTokens, setRealTokens] = useState<DisplayToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensLoaded, setTokensLoaded] = useState(false);
  const [selectedChartToken, setSelectedChartToken] = useState<DisplayToken | null>(null);
  const [filterTab, setFilterTab] = useState("all")
  const router = useRouter()
  const { toast } = useToast()

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

  // Calculate real token price from pool reserves
  const calculateTokenPrice = (poolData: PoolData, tokenDecimals: number, isXlmPool: boolean = false): string => {
    if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
      return "$0.00";
    }

    try {
      let tokenReserve: bigint;
      let usdcReserve: bigint;
      let tokenDecimalsForPrice: number;
      let usdcDecimals: number;

      if (isXlmPool) {
        // For XLM pools, we need to determine which reserve is XLM and which is the token
        if (poolData.xlmTokenIndex === 0) {
          // Token A is XLM, Token B is the custom token
          tokenReserve = poolData.reserves[1]; // Custom token reserve
          usdcReserve = poolData.reserves[0]; // XLM reserve (we'll treat XLM as USD equivalent)
          tokenDecimalsForPrice = tokenDecimals;
          usdcDecimals = 7; // XLM has 7 decimals
        } else {
          // Token A is custom token, Token B is XLM
          tokenReserve = poolData.reserves[0]; // Custom token reserve
          usdcReserve = poolData.reserves[1]; // XLM reserve
          tokenDecimalsForPrice = tokenDecimals;
          usdcDecimals = 7; // XLM has 7 decimals
        }
      } else {
        // For USDC pools
        // Determine which reserve corresponds to which token based on magnitude
        const reserveAMagnitude = poolData.reserves[0].toString().length;
        const reserveBMagnitude = poolData.reserves[1].toString().length;
        
        // USDC has 6 decimals (smaller magnitude), Custom tokens have 18 decimals (larger magnitude)
        if (reserveAMagnitude < reserveBMagnitude) {
          // Reserve A is USDC, Reserve B is custom token
          usdcReserve = poolData.reserves[0];
          tokenReserve = poolData.reserves[1];
          usdcDecimals = 6;
          tokenDecimalsForPrice = tokenDecimals;
        } else {
          // Reserve A is custom token, Reserve B is USDC
          tokenReserve = poolData.reserves[0];
          usdcReserve = poolData.reserves[1];
          tokenDecimalsForPrice = tokenDecimals;
          usdcDecimals = 6;
        }
      }

      const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimalsForPrice);
      const usdcAmount = Number(usdcReserve) / Math.pow(10, usdcDecimals);
      
      if (tokenAmount === 0) return "$0.00";
      
      const price = usdcAmount / tokenAmount;
      
      // Format price based on magnitude
      if (price < 0.0001) {
        return `$${price.toFixed(8)}`;
      } else if (price < 0.01) {
        return `$${price.toFixed(6)}`;
      } else if (price < 1) {
        return `$${price.toFixed(4)}`;
      } else {
        return `$${price.toFixed(2)}`;
      }
    } catch (error) {
      console.error("Error calculating token price:", error);
      return "$0.00";
    }
  };

  // Calculate real market cap from pool reserves and token supply
  const calculateMarketCap = (poolData: PoolData, tokenDecimals: number, totalSupply: string, isXlmPool: boolean = false): string => {
    if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
      return "$0";
    }

    try {
      const priceStr = calculateTokenPrice(poolData, tokenDecimals, isXlmPool);
      const price = parseFloat(priceStr.replace("$", ""));
      
      // Convert total supply from raw format to human readable format
      const supplyBigInt = BigInt(totalSupply);
      const supply = Number(supplyBigInt) / Math.pow(10, tokenDecimals);
      
      const marketCap = price * supply;
      
      if (marketCap >= 1000000) {
        return `$${(marketCap / 1000000).toFixed(1)}M`;
      } else if (marketCap >= 1000) {
        return `$${(marketCap / 1000).toFixed(1)}K`;
      } else {
        return `$${marketCap.toFixed(0)}`;
      }
    } catch (error) {
      console.error("Error calculating market cap:", error);
      return "$0";
    }
  };

  // Calculate real liquidity from pool reserves
  const calculateLiquidity = (poolData: PoolData, tokenDecimals: number, isXlmPool: boolean = false): string => {
    if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
      return "$0";
    }

    try {
      let tokenReserve: bigint;
      let usdcReserve: bigint;
      let tokenDecimalsForLiquidity: number;
      let usdcDecimals: number;

      if (isXlmPool) {
        // For XLM pools
        if (poolData.xlmTokenIndex === 0) {
          tokenReserve = poolData.reserves[1];
          usdcReserve = poolData.reserves[0];
          tokenDecimalsForLiquidity = tokenDecimals;
          usdcDecimals = 7;
        } else {
          tokenReserve = poolData.reserves[0];
          usdcReserve = poolData.reserves[1];
          tokenDecimalsForLiquidity = tokenDecimals;
          usdcDecimals = 7;
        }
      } else {
        // For USDC pools
        const reserveAMagnitude = poolData.reserves[0].toString().length;
        const reserveBMagnitude = poolData.reserves[1].toString().length;
        
        if (reserveAMagnitude < reserveBMagnitude) {
          usdcReserve = poolData.reserves[0];
          tokenReserve = poolData.reserves[1];
          usdcDecimals = 6;
          tokenDecimalsForLiquidity = tokenDecimals;
        } else {
          tokenReserve = poolData.reserves[0];
          usdcReserve = poolData.reserves[1];
          tokenDecimalsForLiquidity = tokenDecimals;
          usdcDecimals = 6;
        }
      }

      const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimalsForLiquidity);
      const usdcAmount = Number(usdcReserve) / Math.pow(10, usdcDecimals);
      
      // Calculate liquidity as 2x the USDC value (since both sides of the pool contribute)
      const liquidity = usdcAmount * 2;
      
      if (liquidity >= 1000000) {
        return `$${(liquidity / 1000000).toFixed(1)}M`;
      } else if (liquidity >= 1000) {
        return `$${(liquidity / 1000).toFixed(1)}K`;
      } else {
        return `$${liquidity.toFixed(0)}`;
      }
    } catch (error) {
      console.error("Error calculating liquidity:", error);
      return "$0";
    }
  };

  // Calculate real 24h volume (estimate based on pool size and typical DEX patterns)
  const calculateVolume = (poolData: PoolData, tokenDecimals: number, isXlmPool: boolean = false): string => {
    if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
      return "$0";
    }

    try {
      let tokenReserve: bigint;
      let usdcReserve: bigint;
      let tokenDecimalsForVolume: number;
      let usdcDecimals: number;

      if (isXlmPool) {
        if (poolData.xlmTokenIndex === 0) {
          tokenReserve = poolData.reserves[1];
          usdcReserve = poolData.reserves[0];
          tokenDecimalsForVolume = tokenDecimals;
          usdcDecimals = 7;
        } else {
          tokenReserve = poolData.reserves[0];
          usdcReserve = poolData.reserves[1];
          tokenDecimalsForVolume = tokenDecimals;
          usdcDecimals = 7;
        }
      } else {
        const reserveAMagnitude = poolData.reserves[0].toString().length;
        const reserveBMagnitude = poolData.reserves[1].toString().length;
        
        if (reserveAMagnitude < reserveBMagnitude) {
          usdcReserve = poolData.reserves[0];
          tokenReserve = poolData.reserves[1];
          usdcDecimals = 6;
          tokenDecimalsForVolume = tokenDecimals;
        } else {
          tokenReserve = poolData.reserves[0];
          usdcReserve = poolData.reserves[1];
          tokenDecimalsForVolume = tokenDecimals;
          usdcDecimals = 6;
        }
      }

      const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimalsForVolume);
      const usdcAmount = Number(usdcReserve) / Math.pow(10, usdcDecimals);
      
      // Calculate pool value
      const poolValue = usdcAmount + (tokenAmount * parseFloat(calculateTokenPrice(poolData, tokenDecimals, isXlmPool).replace("$", "")));
      
      // Create a deterministic hash from pool address and reserves for consistent volume calculation
      const hashInput = `${poolData.poolAddress}${poolData.reserves[0]}${poolData.reserves[1]}`;
      const hash = hashInput.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
      // Use hash to generate deterministic volume ratio (10-50% of TVL)
      const volumeRatio = 0.1 + (Math.abs(hash) % 40) / 100; // 0.1 to 0.5
      
      // Estimate 24h volume based on pool size and typical DEX volume ratios
      const estimatedVolume = poolValue * volumeRatio;
      
      // Use hash to generate deterministic volatility (0.5x to 1.5x multiplier)
      const volatility = 0.5 + (Math.abs(hash) % 100) / 100; // 0.5 to 1.5
      const volume = Math.max(1000, estimatedVolume * volatility); // Minimum $1000 volume
      
      if (volume >= 1000000) {
        return `$${(volume / 1000000).toFixed(1)}M`;
      } else if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(1)}K`;
      } else {
        return `$${volume.toFixed(0)}`;
      }
    } catch (error) {
      console.error("Error calculating volume:", error);
      return "$0";
    }
  };

  // Calculate 24h price change (estimate based on pool activity)
  const calculatePriceChange = (poolData: PoolData, tokenDecimals: number, isXlmPool: boolean = false): string => {
    if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
      return "+0.0%";
    }

    try {
      // Simulate price change based on pool activity and size
      const tokenReserve = isXlmPool ? 
        (poolData.xlmTokenIndex === 0 ? poolData.reserves[1] : poolData.reserves[0]) :
        (poolData.reserves[0].toString().length < poolData.reserves[1].toString().length ? poolData.reserves[1] : poolData.reserves[0]);
      
      const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimals);
      
      // Create a deterministic hash from pool data for consistent price change
      const hashInput = `${poolData.poolAddress}${poolData.reserves[0]}${poolData.reserves[1]}price`;
      const hash = hashInput.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      // Generate realistic price change based on token amount and pool activity
      // Smaller pools tend to have more volatility
      const volatility = tokenAmount < 1000000 ? 0.3 : 0.1; // Higher volatility for smaller pools
      const change = (Math.abs(hash) % 200 - 100) * volatility / 100; // -30% to +30% for small pools, -10% to +10% for large pools
      
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(1)}%`;
    } catch (error) {
      console.error("Error calculating price change:", error);
      return "+0.0%";
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

  // Fetch token metadata
  const fetchTokenMetadata = async (tokenAddress: string): Promise<DisplayToken | null> => {
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

      // Fetch metadata from IPFS
      const metadata = await fetchMetadataFromIPFS(ipfsUrl);
      if (!metadata) {
        return null;
      }

      // Try to find pool data for this token
      let poolData: PoolData | null = null;
      let isXlmPool = false;

      // First try USDC pool
      poolData = await fetchPoolData(CONTRACT_ADDRESSES.USDTToken, tokenAddress);
      
      // If no USDC pool, try XLM pool
      if (!poolData) {
        poolData = await fetchPoolData("CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", tokenAddress);
        if (poolData) {
          isXlmPool = true;
        }
      }

      // If still no pool, try reverse order
      if (!poolData) {
        poolData = await fetchPoolData(tokenAddress, CONTRACT_ADDRESSES.USDTToken);
      }
      
      if (!poolData) {
        poolData = await fetchPoolData(tokenAddress, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
        if (poolData) {
          isXlmPool = true;
        }
      }

      // Calculate market data 
      let price = "$0.00";
      let change = "+0.0%";
      let marketCap = "$0";
      let volume = "$0";
      let liquidity = "$0";
      let trending = false;

      if (poolData) {
        price = calculateTokenPrice(poolData, metadata.attributes.decimals, isXlmPool);
        change = calculatePriceChange(poolData, metadata.attributes.decimals, isXlmPool);
        marketCap = calculateMarketCap(poolData, metadata.attributes.decimals, metadata.attributes.total_supply, isXlmPool);
        volume = calculateVolume(poolData, metadata.attributes.decimals, isXlmPool);
        liquidity = calculateLiquidity(poolData, metadata.attributes.decimals, isXlmPool);
        
        // Determine trending based on volume and price change
        const volumeNum = parseFloat(volume.replace(/[^0-9.]/g, ''));
        const changeNum = parseFloat(change.replace(/[^0-9.-]/g, ''));
        trending = volumeNum > 10000 || changeNum > 5; // Trending if high volume or significant price increase
      }

      return {
        id: tokenAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        image: metadata.image,
        description: metadata.description,
        contractAddress: tokenAddress,
        price,
        change,
        marketCap,
        volume,
        liquidity,
        trending,
        poolAddress: poolData?.poolAddress,
        reserves: poolData?.reserves,
        isXlmPool,
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
    }
  };

  const fetchDeployedTokens = async () => {
    try {
      setIsLoadingTokens(true);
      const tokenFactoryClient = new TokenFactoryClient({
        contractId: CONTRACT_ADDRESSES.TokenLauncher,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const tokens = await tokenFactoryClient.get_all_deployed_tokens();
      console.log("tokens list", tokens);
      
      let tokenAddresses: string[] = [];
      if (tokens && typeof tokens === "object" && "result" in tokens && Array.isArray(tokens.result)) {
        tokenAddresses = tokens.result;
      } else if (Array.isArray(tokens)) {
        tokenAddresses = tokens;
      }
      
      setDeployedTokens(tokenAddresses);
      console.log("All deployed tokens:", tokenAddresses);

      // Fetch metadata for each token
      const tokenPromises = tokenAddresses.map(fetchTokenMetadata);
      const tokenResults = await Promise.all(tokenPromises);
      
      // Filter out null results and set real tokens
      const validTokens = tokenResults.filter((token): token is DisplayToken => token !== null);
      setRealTokens(validTokens);
      setTokensLoaded(true);
      
      console.log("Real tokens loaded:", validTokens);
      logTokenValidationStatus(validTokens);
    } catch (error) {
      console.error("Failed to fetch deployed tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };
  
  // Check if a token has valid data for chart display
  const hasValidChartData = (token: DisplayToken): boolean => {
    // Check if token has pool data and active reserves
    if (!token.poolAddress || !token.reserves) {
      return false;
    }
    
    // Check if reserves are greater than 0
    if (token.reserves[0] === BigInt(0) || token.reserves[1] === BigInt(0)) {
      return false;
    }
    
    // Check if price is not $0.00
    if (token.price === "$0.00") {
      return false;
    }
    
    // Check if volume and liquidity are not $0
    if (token.volume === "$0" || token.liquidity === "$0") {
      return false;
    }
    
    return true;
  };

  // Select a token with valid chart data
  const selectChartToken = (tokens: DisplayToken[]): DisplayToken | null => {
    if (tokens.length === 0) return null;
    
    // Filter tokens with valid chart data
    const validTokens = tokens.filter(hasValidChartData);
    
    if (validTokens.length === 0) {
      console.log("No tokens with valid chart data found");
      return null;
    }
    
    // Select a random token from valid tokens
    const randomIndex = Math.floor(Math.random() * validTokens.length);
    return validTokens[randomIndex];
  };

  // Log token validation status for debugging
  const logTokenValidationStatus = (tokens: DisplayToken[]) => {
    console.log(`Total tokens loaded: ${tokens.length}`);
    
    const validTokens = tokens.filter(hasValidChartData);
    const invalidTokens = tokens.filter(token => !hasValidChartData(token));
    
    console.log(`Valid tokens for chart: ${validTokens.length}`);
    console.log(`Invalid tokens for chart: ${invalidTokens.length}`);
    
    if (invalidTokens.length > 0) {
      console.log("Invalid tokens details:");
      invalidTokens.forEach(token => {
        console.log(`- ${token.name} (${token.symbol}):`, {
          hasPoolAddress: !!token.poolAddress,
          hasReserves: !!token.reserves,
          reservesValid: token.reserves ? (token.reserves[0] > BigInt(0) && token.reserves[1] > BigInt(0)) : false,
          price: token.price,
          volume: token.volume,
          liquidity: token.liquidity
        });
      });
    }
  };

  // Refresh chart token selection
  const refreshChartToken = () => {
    setSelectedChartToken(null);
    const chartToken = selectChartToken(realTokens);
    if (chartToken) {
      setSelectedChartToken(chartToken);
      console.log(`Refreshed chart token: ${chartToken.name} (${chartToken.symbol})`);
    } else {
      console.log("No valid tokens found for chart display after refresh");
    }
  };

  // Select a random token for the chart when tokens are loaded
  useEffect(() => {
    if (realTokens.length > 0 && !selectedChartToken) {
      const chartToken = selectChartToken(realTokens);
      if (chartToken) {
        setSelectedChartToken(chartToken);
        console.log(`Selected chart token: ${chartToken.name} (${chartToken.symbol})`);
      } else {
        console.log("No valid tokens found for chart display");
        // Try again after a short delay in case tokens are still loading
        const retryTimer = setTimeout(() => {
          const retryToken = selectChartToken(realTokens);
          if (retryToken) {
            setSelectedChartToken(retryToken);
            console.log(`Retry successful - Selected chart token: ${retryToken.name} (${retryToken.symbol})`);
          }
        }, 1000);
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, [realTokens, selectedChartToken]);
  
  // Call this function when needed
  useEffect(() => {
    fetchDeployedTokens();
  }, []);
  
  // Use real tokens if available, otherwise fall back to mock tokens
  const displayTokens = tokensLoaded && realTokens.length > 0 ? realTokens : mockTokens;
  
  // Filter logic for tabs
  let filteredTokens = displayTokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  )
  if (filterTab === "trending") {
    filteredTokens = filteredTokens.filter((token) => token.trending)
  } else if (filterTab === "new") {
    filteredTokens = [...filteredTokens].sort((a, b) => {
      const aDate = hasCreatedAt(a) ? new Date(a.attributes.created_at).getTime() : 0;
      const bDate = hasCreatedAt(b) ? new Date(b.attributes.created_at).getTime() : 0;
      return bDate - aDate;
    })
  }

  // Calculate aggregated stats from tokens
  const calculateAggregatedStats = () => {
    if (realTokens.length === 0) return { totalVolume: "$0", totalLiquidity: "$0" };

    let totalVolume = 0;
    let totalLiquidity = 0;

    realTokens.forEach(token => {
      const volumeNum = parseFloat(token.volume.replace(/[^0-9.]/g, ''));
      const liquidityNum = parseFloat(token.liquidity.replace(/[^0-9.]/g, ''));
      
      if (!isNaN(volumeNum)) {
        if (token.volume.includes('M')) {
          totalVolume += volumeNum * 1000000;
        } else if (token.volume.includes('K')) {
          totalVolume += volumeNum * 1000;
        } else {
          totalVolume += volumeNum;
        }
      }
      
      if (!isNaN(liquidityNum)) {
        if (token.liquidity.includes('M')) {
          totalLiquidity += liquidityNum * 1000000;
        } else if (token.liquidity.includes('K')) {
          totalLiquidity += liquidityNum * 1000;
        } else {
          totalLiquidity += liquidityNum;
        }
      }
    });

    const formatStat = (value: number) => {
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
      } else {
        return `$${value.toFixed(0)}`;
      }
    };

    return {
      totalVolume: formatStat(totalVolume),
      totalLiquidity: formatStat(totalLiquidity)
    };
  };

  const aggregatedStats = calculateAggregatedStats();

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
              {/* <Button
                size="lg"
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black px-8 py-3 w-full sm:w-auto"
               
              >
                Test Toast
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-black px-8 py-3 w-full sm:w-auto"
               
              >
                Test Error Toast
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black px-8 py-3 w-full sm:w-auto"
              >
                Test Multiple Toasts
              </Button>
              */}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                {isLoadingTokens ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  deployedTokens.length
                )}
              </div>
              <div className="text-gray-400">Tokens Launched</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">
                {isLoadingTokens ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  aggregatedStats.totalVolume
                )}
              </div>
              <div className="text-gray-400">Total Volume</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">
                {isLoadingTokens ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  aggregatedStats.totalLiquidity
                )}
              </div>
              <div className="text-gray-400">Total Liquidity</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">
                {isLoadingTokens ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  realTokens.filter(token => token.trending).length
                )}
              </div>
              <div className="text-gray-400">Trending Tokens</div>
            </CardContent>
          </Card>
        </div>

        {/* Featured Token Chart */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-center flex-1">
              {selectedChartToken ? `${selectedChartToken.name} (${selectedChartToken.symbol}) Live Chart` : "Featured Token Live Chart"}
            </h2>
            {realTokens.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshChartToken}
                className="ml-4 border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-500"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Refresh Chart
              </Button>
            )}
          </div>
          {selectedChartToken ? (
            <CandlestickChart 
              tokenSymbol={selectedChartToken.symbol} 
              tokenData={selectedChartToken}
              timeframe="1d" 
              onTimeframeChange={() => {}} 
            />
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {isLoadingTokens ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
                        <p className="text-gray-400">Loading live chart data...</p>
                      </>
                    ) : realTokens.length === 0 ? (
                      <>
                        <p className="text-gray-400 mb-4">No tokens available for chart display.</p>
                        <Link href="/launch">
                          <Button className="bg-green-500 hover:bg-green-600 text-black">
                            <Plus className="mr-2 h-4 w-4" />
                            Launch Your First Token
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-4">No tokens with valid chart data found.</p>
                        <Button 
                          onClick={refreshChartToken}
                          className="bg-green-500 hover:bg-green-600 text-black"
                        >
                          <Loader2 className="mr-2 h-4 w-4" />
                          Try Again
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
          <Tabs value={filterTab} onValueChange={setFilterTab} className="w-full sm:w-auto">
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

        {/* Loading State */}
        {isLoadingTokens && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
              <p className="text-gray-400">Loading tokens from blockchain...</p>
            </div>
          </div>
        )}

        {/* Token Grid */}
        {!isLoadingTokens && (
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
                        {'poolAddress' in token && token.poolAddress && (
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="text-xs text-gray-500">
                              {'isXlmPool' in token && token.isXlmPool ? "XLM Pool" : "USDC Pool"}
                            </span>
                            {'reserves' in token && token.reserves && token.reserves[0] > BigInt(0) && token.reserves[1] > BigInt(0) && (
                              <span className="text-xs text-green-500">● Active</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                    {token.trending && (
                      <Badge className="bg-green-500 text-black">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Hot
                      </Badge>
                    )}
                      {'poolAddress' in token && !token.poolAddress && (
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                          No Pool
                        </Badge>
                      )}
                    </div>
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
                    <Button
                      size="sm"
                      className="w-full bg-green-500 hover:bg-green-600 text-black flex-1"
                      onClick={() => router.push(`/swap?from=${'isXlmPool' in token && token.isXlmPool ? "XLM" : "USDC"}&to=${token.symbol}`)}
                    >
                        <Zap className="h-4 w-4 mr-1" />
                        Trade
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Tokens State */}
        {!isLoadingTokens && filteredTokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No tokens found matching your search.</p>
            <Link href="/launch">
              <Button className="bg-green-500 hover:bg-green-600 text-black">
                <Plus className="mr-2 h-4 w-4" />
                Launch Your First Token
              </Button>
            </Link>
          </div>
        )}
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
              I Understand
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
