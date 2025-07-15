
import { Client as PoolClient } from "../../packages/Pool/dist";
import { Client as PoolFactoryClient } from "../../packages/PoolFactory/dist";

// Contract addresses
const CONTRACT_ADDRESSES = {
  PoolFactory: "your_pool_factory_address_here",
  USDTToken: "your_usdt_token_address_here",
};

// Enhanced interfaces for liquidity and fee tracking
export interface PoolStats {
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  reserves: [bigint, bigint];
  totalSupply: bigint;
  tvl: string;
  volume24h: string;
  volume7d: string;
  volumeAllTime: string;
  totalFeesEarned: string;
  feesPerLPToken: string;
}

export interface UserLiquidityPosition {
  poolAddress: string;
  tokenA: { symbol: string; image: string; contractAddress: string };
  tokenB: { symbol: string; image: string; contractAddress: string };
  lpTokenBalance: string;
  userTokenAAmount: string;
  userTokenBAmount: string;
  userShare: string;
  positionValue: string;
  unclaimedFees: string;
  totalFeesEarned: string;
  apr: string;
}

export interface GlobalStats {
  totalLiquidityValue: string;
  totalFeesEarned: string;
  totalVolume24h: string;
  totalVolume7d: string;
  totalPools: number;
  activePools: number;
}

// Fetch all pool statistics
export const fetchAllPoolStats = async (): Promise<PoolStats[]> => {
  try {
    const poolFactoryClient = new PoolFactoryClient({
      contractId: CONTRACT_ADDRESSES.PoolFactory,
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      allowHttp: true,
    });

    // Get all pools
    const allPoolsResult = await poolFactoryClient.get_all_pools();
    let poolAddresses: string[] = [];
    
    if (allPoolsResult && typeof allPoolsResult === "object" && "result" in allPoolsResult) {
      poolAddresses = allPoolsResult.result || [];
    } else if (Array.isArray(allPoolsResult)) {
      poolAddresses = allPoolsResult;
    }

    const poolStats: PoolStats[] = [];

    for (const poolAddress of poolAddresses) {
      try {
        const poolClient = new PoolClient({
          contractId: poolAddress,
          rpcUrl: "https://soroban-testnet.stellar.org",
          networkPassphrase: "Test SDF Network ; September 2015",
          allowHttp: true,
        });

        // Get basic pool info
        const [tokenA, tokenB] = await Promise.all([
          poolClient.get_token_a(),
          poolClient.get_token_b()
        ]);

        const reservesResult = await poolClient.get_reserves();
        let reserves: [bigint, bigint] = [BigInt(0), BigInt(0)];
        
        if (reservesResult && typeof reservesResult === "object" && "result" in reservesResult) {
          const result = reservesResult.result;
          if (Array.isArray(result) && result.length === 2) {
            reserves = [BigInt(result[0]), BigInt(result[1])];
          }
        }

        const totalSupplyResult = await poolClient.supply();
        let totalSupply = BigInt(0);
        if (totalSupplyResult && typeof totalSupplyResult === "object" && "result" in totalSupplyResult) {
          totalSupply = BigInt(totalSupplyResult.result || 0);
        }

        // Get fee and volume data
        const [totalFeesResult, feesPerLPTokenResult, volume24hResult, volume7dResult, volumeAllTimeResult] = await Promise.all([
          poolClient.get_total_fees_earned(),
          poolClient.get_fees_per_lp_token(),
          poolClient.get_total_volume_24h(),
          poolClient.get_total_volume_7d(),
          poolClient.get_total_volume_all_time()
        ]);

        let totalFeesEarned = "0";
        let feesPerLPToken = "0";
        let volume24h = "0";
        let volume7d = "0";
        let volumeAllTime = "0";

        if (totalFeesResult && typeof totalFeesResult === "object" && "result" in totalFeesResult) {
          totalFeesEarned = (Number(totalFeesResult.result) / Math.pow(10, 6)).toFixed(2);
        }

        if (feesPerLPTokenResult && typeof feesPerLPTokenResult === "object" && "result" in feesPerLPTokenResult) {
          feesPerLPToken = (Number(feesPerLPTokenResult.result) / Math.pow(10, 6)).toFixed(6);
        }

        if (volume24hResult && typeof volume24hResult === "object" && "result" in volume24hResult) {
          volume24h = (Number(volume24hResult.result) / Math.pow(10, 6)).toFixed(2);
        }

        if (volume7dResult && typeof volume7dResult === "object" && "result" in volume7dResult) {
          volume7d = (Number(volume7dResult.result) / Math.pow(10, 6)).toFixed(2);
        }

        if (volumeAllTimeResult && typeof volumeAllTimeResult === "object" && "result" in volumeAllTimeResult) {
          volumeAllTime = (Number(volumeAllTimeResult.result) / Math.pow(10, 6)).toFixed(2);
        }

        // Calculate TVL (simplified)
        const tvl = (Number(reserves[0]) + Number(reserves[1])) / Math.pow(10, 6);

        const stats: PoolStats = {
          poolAddress,
          tokenA: tokenA.toString(),
          tokenB: tokenB.toString(),
          reserves,
          totalSupply,
          tvl: `$${tvl.toFixed(2)}`,
          volume24h: `$${volume24h}`,
          volume7d: `$${volume7d}`,
          volumeAllTime: `$${volumeAllTime}`,
          totalFeesEarned: `$${totalFeesEarned}`,
          feesPerLPToken: `$${feesPerLPToken}`,
        };

        poolStats.push(stats);
      } catch (error) {
        console.error(`Error fetching stats for pool ${poolAddress}:`, error);
      }
    }

    return poolStats;
  } catch (error) {
    console.error("Failed to fetch pool stats:", error);
    return [];
  }
};

// Fetch user's liquidity positions with enhanced data
export const fetchUserLiquidityPositions = async (publicKey: string): Promise<UserLiquidityPosition[]> => {
  try {
    const poolFactoryClient = new PoolFactoryClient({
      contractId: CONTRACT_ADDRESSES.PoolFactory,
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      allowHttp: true,
    });

    // Get all pools
    const allPoolsResult = await poolFactoryClient.get_all_pools();
    let poolAddresses: string[] = [];
    
    if (allPoolsResult && typeof allPoolsResult === "object" && "result" in allPoolsResult) {
      poolAddresses = allPoolsResult.result || [];
    } else if (Array.isArray(allPoolsResult)) {
      poolAddresses = allPoolsResult;
    }

    const positions: UserLiquidityPosition[] = [];

    for (const poolAddress of poolAddresses) {
      try {
        const poolClient = new PoolClient({
          contractId: poolAddress,
          rpcUrl: "https://soroban-testnet.stellar.org",
          networkPassphrase: "Test SDF Network ; September 2015",
          allowHttp: true,
        });

        // Get user's liquidity position
        const positionResult = await poolClient.get_user_liquidity_position({
          user: publicKey
        });

        let userBalance = BigInt(0);
        let userTokenA = BigInt(0);
        let userTokenB = BigInt(0);

        if (positionResult && typeof positionResult === "object" && "result" in positionResult) {
          const result = positionResult.result;
          if (Array.isArray(result) && result.length === 3) {
            userBalance = BigInt(result[0]);
            userTokenA = BigInt(result[1]);
            userTokenB = BigInt(result[2]);
          }
        }

        // Only include positions with LP tokens
        if (userBalance > BigInt(0)) {
          // Get pool info
          const [tokenA, tokenB, reservesResult, totalSupplyResult] = await Promise.all([
            poolClient.get_token_a(),
            poolClient.get_token_b(),
            poolClient.get_reserves(),
            poolClient.supply()
          ]);

          let reserves: [bigint, bigint] = [BigInt(0), BigInt(0)];
          let totalSupply = BigInt(0);

          if (reservesResult && typeof reservesResult === "object" && "result" in reservesResult) {
            const result = reservesResult.result;
            if (Array.isArray(result) && result.length === 2) {
              reserves = [BigInt(result[0]), BigInt(result[1])];
            }
          }

          if (totalSupplyResult && typeof totalSupplyResult === "object" && "result" in totalSupplyResult) {
            totalSupply = BigInt(totalSupplyResult.result || 0);
          }

          // Get fee data
          const [unclaimedFeesResult, totalFeesResult] = await Promise.all([
            poolClient.get_user_unclaimed_fees({ user: publicKey }),
            poolClient.get_total_fees_earned()
          ]);

          let unclaimedFees = "0";
          let totalFeesEarned = "0";

          if (unclaimedFeesResult && typeof unclaimedFeesResult === "object" && "result" in unclaimedFeesResult) {
            unclaimedFees = (Number(unclaimedFeesResult.result) / Math.pow(10, 6)).toFixed(2);
          }

          if (totalFeesResult && typeof totalFeesResult === "object" && "result" in totalFeesResult) {
            totalFeesEarned = (Number(totalFeesResult.result) / Math.pow(10, 6)).toFixed(2);
          }

          // Calculate position metrics
          const userShare = totalSupply > BigInt(0) ? (Number(userBalance) / Number(totalSupply)) * 100 : 0;
          const positionValue = (Number(userTokenA) + Number(userTokenB)) / Math.pow(10, 6);

          // Mock APR calculation (in real app, this would be based on historical data)
          const apr = "12.5%";

          const position: UserLiquidityPosition = {
            poolAddress,
            tokenA: { 
              symbol: "TOKEN_A", // You'd get this from token metadata
              image: "/tokens/token-a.png",
              contractAddress: tokenA.toString()
            },
            tokenB: { 
              symbol: "TOKEN_B", // You'd get this from token metadata
              image: "/tokens/token-b.png",
              contractAddress: tokenB.toString()
            },
            lpTokenBalance: (Number(userBalance) / Math.pow(10, 18)).toFixed(6),
            userTokenAAmount: (Number(userTokenA) / Math.pow(10, 6)).toFixed(6),
            userTokenBAmount: (Number(userTokenB) / Math.pow(10, 6)).toFixed(6),
            userShare: userShare.toFixed(2),
            positionValue: `$${positionValue.toFixed(2)}`,
            unclaimedFees: `$${unclaimedFees}`,
            totalFeesEarned: `$${totalFeesEarned}`,
            apr,
          };

          positions.push(position);
        }
      } catch (error) {
        console.error(`Error fetching position for pool ${poolAddress}:`, error);
      }
    }

    return positions;
  } catch (error) {
    console.error("Failed to fetch user liquidity positions:", error);
    return [];
  }
};

// Calculate global statistics
export const calculateGlobalStats = async (): Promise<GlobalStats> => {
  try {
    const poolStats = await fetchAllPoolStats();
    
    let totalLiquidityValue = 0;
    let totalFeesEarned = 0;
    let totalVolume24h = 0;
    let totalVolume7d = 0;
    let activePools = 0;

    poolStats.forEach(stats => {
      const liquidity = parseFloat(stats.tvl.replace("$", ""));
      const fees = parseFloat(stats.totalFeesEarned.replace("$", ""));
      const volume24h = parseFloat(stats.volume24h.replace("$", ""));
      const volume7d = parseFloat(stats.volume7d.replace("$", ""));

      totalLiquidityValue += liquidity;
      totalFeesEarned += fees;
      totalVolume24h += volume24h;
      totalVolume7d += volume7d;

      if (liquidity > 0) {
        activePools++;
      }
    });

    return {
      totalLiquidityValue: `$${totalLiquidityValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalFeesEarned: `$${totalFeesEarned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalVolume24h: `$${totalVolume24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalVolume7d: `$${totalVolume7d.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalPools: poolStats.length,
      activePools,
    };
  } catch (error) {
    console.error("Failed to calculate global stats:", error);
    return {
      totalLiquidityValue: "$0",
      totalFeesEarned: "$0",
      totalVolume24h: "$0",
      totalVolume7d: "$0",
      totalPools: 0,
      activePools: 0,
    };
  }
};

// Claim fees for a user
export const claimUserFees = async (poolAddress: string, publicKey: string): Promise<string> => {
  try {
    const poolClient = new PoolClient({
      contractId: poolAddress,
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      allowHttp: true,
    });

    const result = await poolClient.claim_fees({
      caller: publicKey
    });

    let claimedAmount = "0";
    if (result && typeof result === "object" && "result" in result) {
      claimedAmount = (Number(result.result) / Math.pow(10, 6)).toFixed(2);
    }

    return claimedAmount;
  } catch (error) {
    console.error("Failed to claim fees:", error);
    throw error;
  }
}; 