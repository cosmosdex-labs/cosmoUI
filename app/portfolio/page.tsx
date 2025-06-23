"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Wallet, Droplets, BarChart3, ArrowUpDown, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Client as TokenFactoryClient } from "@/packages/TokenLauncher/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { Client as PoolClient } from "@/packages/Pool/dist"
import { Client as UsdtTokenClient } from "@/packages/USDTToken/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"
import { getPublicKey } from "@/lib/stellar-wallets-kit"

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

// Interface for portfolio token data
interface PortfolioToken {
  symbol: string;
  name: string;
  image: string;
  contractAddress: string;
  balance: string;
  decimals: number;
  value: string;
  change: string;
  price: string;
}

// Interface for liquidity position data
interface LiquidityPosition {
  pool: string;
  poolAddress: string;
  tokenA: { symbol: string; image: string; contractAddress: string };
  tokenB: { symbol: string; image: string; contractAddress: string };
  value: string;
  share: string;
  apr: string;
  fees24h: string;
  feesTotal: string;
  lpTokenBalance: string;
  reserves: [bigint, bigint];
}

// Interface for transaction data
interface Transaction {
  type: "swap" | "add_liquidity" | "remove_liquidity";
  from?: string;
  to?: string;
  pool?: string;
  amount: string;
  value: string;
  time: string;
  status: "completed" | "pending" | "failed";
}

// Interface for portfolio overview data
interface PortfolioOverview {
  totalValue: string;
  totalChange: string;
  totalChangePercent: string;
  liquidityValue: string;
  totalFeesEarned: string;
}

export default function PortfolioPage() {
  const [timeframe, setTimeframe] = useState("24h")
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Portfolio data states
  const [tokens, setTokens] = useState<PortfolioToken[]>([])
  const [liquidityPositions, setLiquidityPositions] = useState<LiquidityPosition[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [portfolioOverview, setPortfolioOverview] = useState<PortfolioOverview>({
    totalValue: "$0",
    totalChange: "$0",
    totalChangePercent: "0%",
    liquidityValue: "$0",
    totalFeesEarned: "$0"
  })

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

  // Fetch token metadata and create portfolio token
  const fetchTokenMetadata = async (tokenAddress: string): Promise<PortfolioToken | null> => {
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
        balance: "0",
        decimals: metadata.attributes.decimals,
        value: "$0",
        change: "0%",
        price: "$0"
      };
    } catch (error) {
      console.error("Error fetching token metadata:", error);
      return null;
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

  // Calculate token price based on pool reserves (simplified)
  const calculateTokenPrice = (tokenReserve: bigint, usdcReserve: bigint, tokenDecimals: number): string => {
    if (tokenReserve === BigInt(0) || usdcReserve === BigInt(0)) return "$0";
    
    const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimals);
    const usdcAmount = Number(usdcReserve) / Math.pow(10, 6); // USDC has 6 decimals
    
    const price = usdcAmount / tokenAmount;
    return `$${price.toFixed(8)}`;
  };

  // Calculate token value
  const calculateTokenValue = (balance: string, price: string): string => {
    const balanceNum = parseFloat(balance);
    const priceNum = parseFloat(price.replace("$", ""));
    const value = balanceNum * priceNum;
    return `$${value.toFixed(2)}`;
  };

  // Fetch all available tokens with balances
  const fetchAvailableTokens = async (): Promise<PortfolioToken[]> => {
    try {
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
      const validTokens = tokenResults.filter((token): token is PortfolioToken => token !== null);

      // Add USDC token
      const usdcToken: PortfolioToken = {
        symbol: "USDC",
        name: "USD Coin",
        image: "/usdc.png",
        contractAddress: CONTRACT_ADDRESSES.USDTToken,
        balance: "0",
        decimals: 6,
        value: "$0",
        change: "0%",
        price: "$1.00"
      };

      const allTokens = [usdcToken, ...validTokens];

      // Fetch balances for all tokens
      if (publicKey) {
        const tokensWithBalances = await Promise.all(
          allTokens.map(async (token) => {
            const balance = await fetchTokenBalance(token.contractAddress, token.decimals);
            return { ...token, balance };
          })
        );

        // Filter out tokens with zero balance (except USDC)
        const tokensWithValue = tokensWithBalances.filter(token => 
          token.symbol === "USDC" || parseFloat(token.balance) > 0
        );

        return tokensWithValue;
      }

      return allTokens;
    } catch (error) {
      console.error("Failed to fetch available tokens:", error);
      return [];
    }
  };

  // Fetch all liquidity positions
  const fetchLiquidityPositions = async (availableTokens: PortfolioToken[]): Promise<LiquidityPosition[]> => {
    if (!publicKey || availableTokens.length === 0) return [];

    try {
      const poolFactoryClient = new PoolFactoryClient({
        contractId: CONTRACT_ADDRESSES.PoolFactory,
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
        allowHttp: true,
      });

      const positions: LiquidityPosition[] = [];

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

            // Only include positions with LP tokens
            if (parseFloat(lpBalance) > 0) {
              // Calculate TVL (simplified calculation)
              const usdcReserve = reserves[1]; // USDC is typically reserve B
              const tokenReserve = reserves[0]; // Meme token is typically reserve A
              const tvl = Number(usdcReserve) / Math.pow(10, 6) * 2; // Simplified TVL calculation

              // Calculate position value
              const lpBalanceNum = parseFloat(lpBalance);
              const positionValue = (lpBalanceNum * tvl / 100).toFixed(2);

              // Calculate pool share (simplified)
              const totalSupply = await poolClient.supply();
              let totalSupplyNum = 0;
              if (totalSupply && typeof totalSupply === "object" && "result" in totalSupply) {
                totalSupplyNum = Number(totalSupply.result) / Math.pow(10, 18);
              }
              const share = totalSupplyNum > 0 ? ((lpBalanceNum / totalSupplyNum) * 100).toFixed(2) : "0";

              // Calculate APR (mock calculation for now)
              const apr = "45.2%";

              // Calculate fees (mock for now)
              const fees24h = "$12.50";
              const feesTotal = "$156.75";

              const usdcToken = availableTokens.find(t => t.symbol === "USDC")!;

              const position: LiquidityPosition = {
                pool: `${token.symbol}/USDC`,
                poolAddress,
                tokenA: { 
                  symbol: token.symbol, 
                  image: token.image, 
                  contractAddress: token.contractAddress 
                },
                tokenB: { 
                  symbol: "USDC", 
                  image: usdcToken.image, 
                  contractAddress: usdcToken.contractAddress 
                },
                value: `$${positionValue}`,
                share: `${share}%`,
                apr,
                fees24h,
                feesTotal,
                lpTokenBalance: lpBalance,
                reserves
              };

              positions.push(position);
            }
          }
        } catch (error) {
          console.error(`Error fetching pool for ${token.symbol}:`, error);
        }
      }

      return positions;
    } catch (error) {
      console.error("Failed to fetch liquidity positions:", error);
      return [];
    }
  };

  // Generate mock transaction history (since we don't have real transaction tracking yet)
  const generateMockTransactions = (): Transaction[] => {
    return [
      {
        type: "swap",
        from: "USDC",
        to: "PEPE",
        amount: "500 USDC",
        value: "$500",
        time: "2 hours ago",
        status: "completed",
      },
      {
        type: "add_liquidity",
        pool: "MSHIB/USDC",
        amount: "$1,000",
        value: "$1,000",
        time: "1 day ago",
        status: "completed",
      },
      {
        type: "remove_liquidity",
        pool: "PEPE/USDC",
        amount: "$250",
        value: "$275",
        time: "3 days ago",
        status: "completed",
      },
    ];
  };

  // Calculate portfolio overview
  const calculatePortfolioOverview = (
    tokens: PortfolioToken[], 
    liquidityPositions: LiquidityPosition[]
  ): PortfolioOverview => {
    let totalValue = 0;
    let liquidityValue = 0;
    let totalFeesEarned = 0;

    // Calculate token values
    tokens.forEach(token => {
      const value = parseFloat(token.value.replace("$", "").replace(",", ""));
      totalValue += value;
    });

    // Calculate liquidity values
    liquidityPositions.forEach(position => {
      const value = parseFloat(position.value.replace("$", "").replace(",", ""));
      liquidityValue += value;
      totalValue += value;

      const fees = parseFloat(position.feesTotal.replace("$", "").replace(",", ""));
      totalFeesEarned += fees;
    });

    // Mock change calculation (in real app, this would track historical data)
    const change = totalValue * 0.11; // 11% increase for demo
    const changePercent = totalValue > 0 ? (change / totalValue) * 100 : 0;

    return {
      totalValue: `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalChange: `+$${change.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalChangePercent: `+${changePercent.toFixed(2)}%`,
      liquidityValue: `$${liquidityValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalFeesEarned: `$${totalFeesEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    };
  };

  // Fetch all portfolio data
  const fetchPortfolioData = async (): Promise<void> => {
    if (!publicKey) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch tokens with balances
      const availableTokens = await fetchAvailableTokens();
      
      // Calculate token prices and values
      const tokensWithValues = await Promise.all(
        availableTokens.map(async (token) => {
          if (token.symbol === "USDC") {
            return {
              ...token,
              value: calculateTokenValue(token.balance, "$1.00"),
              change: "0%"
            };
          }

          // For other tokens, we'll use a simplified price calculation
          // In a real app, you'd fetch this from price feeds or calculate from pools
          const mockPrice = `$${(Math.random() * 0.01).toFixed(8)}`;
          const value = calculateTokenValue(token.balance, mockPrice);
          const change = `${(Math.random() * 100 - 50).toFixed(1)}%`;

          return {
            ...token,
            price: mockPrice,
            value,
            change
          };
        })
      );

      setTokens(tokensWithValues);

      // Fetch liquidity positions
      const positions = await fetchLiquidityPositions(availableTokens);
      setLiquidityPositions(positions);

      // Generate mock transactions
      const mockTransactions = generateMockTransactions();
      setTransactions(mockTransactions);

      // Calculate portfolio overview
      const overview = calculatePortfolioOverview(tokensWithValues, positions);
      setPortfolioOverview(overview);

    } catch (error) {
      console.error("Failed to fetch portfolio data:", error);
      setError("Failed to load portfolio data");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchPortfolioData();
    }
  }, [publicKey]);

  return (
    <div className="min-h-screen bg-gray-950 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            Portfolio
          </h1>
          <p className="text-gray-400 text-lg">Track your tokens, liquidity positions, and trading performance</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500 text-white p-4 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Loading portfolio data...</p>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
              <Card className="bg-gray-900 border-gray-800 md:col-span-2">
                <CardContent className="p-4 md:p-6">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold mb-2">{portfolioOverview.totalValue}</div>
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-green-500 font-semibold">{portfolioOverview.totalChange}</span>
                      <span className="text-green-500 font-semibold">({portfolioOverview.totalChangePercent})</span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Total Portfolio Value</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-xl md:text-2xl font-bold text-blue-500 mb-2">{portfolioOverview.liquidityValue}</div>
                  <div className="text-gray-400 text-sm">Liquidity Value</div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 md:p-6 text-center">
                  <div className="text-xl md:text-2xl font-bold text-green-500 mb-2">{portfolioOverview.totalFeesEarned}</div>
                  <div className="text-gray-400 text-sm">Total Fees Earned</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="tokens" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-900">
                <TabsTrigger
                  value="tokens"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-black text-xs sm:text-sm"
                >
                  <Wallet className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Tokens</span>
                </TabsTrigger>
                <TabsTrigger
                  value="liquidity"
                  className="data-[state=active]:bg-blue-500 data-[state=active]:text-black text-xs sm:text-sm"
                >
                  <Droplets className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Liquidity</span>
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="data-[state=active]:bg-purple-500 data-[state=active]:text-black text-xs sm:text-sm"
                >
                  <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">History</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tokens">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Token Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tokens.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-300 mb-4">No tokens found</p>
                        <p className="text-sm text-gray-400">
                          Connect your wallet and start trading to see your tokens here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {tokens.map((token, index) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors gap-4"
                          >
                            <div className="flex items-center space-x-4">
                              <Image
                                src={token.image || "/placeholder.svg"}
                                alt={token.symbol}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                              <div>
                                <div className="font-semibold">{token.name}</div>
                                <div className="text-gray-400 text-sm">{token.symbol}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 w-full sm:w-auto">
                              <div className="text-center">
                                <div className="font-semibold">{parseFloat(token.balance).toLocaleString()}</div>
                                <div className="text-gray-400 text-xs">Balance</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">{token.price}</div>
                                <div className="text-gray-400 text-xs">Price</div>
                              </div>
                              <div className="text-center">
                                <div className="font-semibold">
                                  {token.value.startsWith('$') 
                                    ? `$${parseFloat(token.value.replace('$', '').replace(',', '')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                    : token.value
                                  }
                                </div>
                                <div className="text-gray-400 text-xs">Value</div>
                              </div>
                            </div>
                            <div className="flex justify-center sm:justify-end w-full sm:w-auto">
                              <Link href="/swap">
                                <Button size="sm" className="bg-green-500 hover:bg-green-600 text-black w-full sm:w-auto">
                                  <ArrowUpDown className="h-3 w-3 mr-1" />
                                  Trade
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="liquidity">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Liquidity Positions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {liquidityPositions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-300 mb-4">No liquidity positions found</p>
                        <p className="text-sm text-gray-400">
                          Add liquidity to pools to start earning fees
                        </p>
                        <Link href="/liquidity">
                          <Button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white">
                            <Droplets className="mr-2 h-4 w-4" />
                            Add Liquidity
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {liquidityPositions.map((position, index) => (
                          <div key={index} className="p-4 bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex -space-x-1">
                                  <Image
                                    src={position.tokenA.image || "/placeholder.svg"}
                                    alt={position.tokenA.symbol}
                                    width={24}
                                    height={24}
                                    className="rounded-full border border-gray-600"
                                  />
                                  <Image
                                    src={position.tokenB.image || "/placeholder.svg"}
                                    alt={position.tokenB.symbol}
                                    width={24}
                                    height={24}
                                    className="rounded-full border border-gray-600"
                                  />
                                </div>
                                <span className="font-semibold">{position.pool}</span>
                              </div>
                              <Badge className="bg-green-500 text-black">{position.apr} APR</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-400">Value</div>
                                <div className="font-semibold">{position.value}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Pool Share</div>
                                <div className="font-semibold">{position.share}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Fees (24h)</div>
                                <div className="font-semibold text-green-500">{position.fees24h}</div>
                              </div>
                              <div>
                                <div className="text-gray-400">Total Fees</div>
                                <div className="font-semibold text-green-500">{position.feesTotal}</div>
                              </div>
                            </div>
                            <div className="flex space-x-2 mt-3">
                              <Link href="/liquidity">
                                <Button size="sm" variant="outline" className="border-gray-700 hover:border-green-500">
                                  Add More
                                </Button>
                              </Link>
                              <Link href="/liquidity">
                                <Button size="sm" variant="outline" className="border-gray-700 hover:border-red-500">
                                  Remove
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-300 mb-4">No transactions found</p>
                        <p className="text-sm text-gray-400">
                          Start trading to see your transaction history
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((tx, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  tx.type === "swap"
                                    ? "bg-blue-500"
                                    : tx.type === "add_liquidity"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                }`}
                              >
                                {tx.type === "swap" ? (
                                  <ArrowUpDown className="h-4 w-4 text-white" />
                                ) : tx.type === "add_liquidity" ? (
                                  <Droplets className="h-4 w-4 text-white" />
                                ) : (
                                  <Droplets className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div>
                                <div className="font-semibold">
                                  {tx.type === "swap"
                                    ? `Swap ${tx.from} → ${tx.to}`
                                    : tx.type === "add_liquidity"
                                      ? `Add Liquidity to ${tx.pool}`
                                      : `Remove Liquidity from ${tx.pool}`}
                                </div>
                                <div className="text-gray-400 text-sm">{tx.amount}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{tx.value}</div>
                              <div className="text-gray-400 text-sm">{tx.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
