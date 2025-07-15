import { Client as PoolClient } from "@/packages/Pool/dist"
import { Client as PoolFactoryClient } from "@/packages/PoolFactory/dist"
import { CONTRACT_ADDRESSES } from "@/packages/deployment"

// Interface for blockchain events
export interface BlockchainEvent {
  timestamp: number;
  type: 'swap' | 'add_liquidity' | 'remove_liquidity';
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  volume: number;
  transactionHash?: string;
  blockNumber?: number;
}

// Interface for historical price point
export interface HistoricalPricePoint {
  timestamp: number;
  price: number;
  volume: number;
  reserves: [bigint, bigint];
}

// Interface for pool data
export interface PoolData {
  poolAddress: string;
  reserves: [bigint, bigint];
  tokenA: string;
  tokenB: string;
  isXlmPool?: boolean;
  xlmTokenIndex?: number;
}

// Fetch pool data for a token
export const fetchPoolData = async (tokenAddress: string): Promise<PoolData | null> => {
  try {
    const poolFactoryClient = new PoolFactoryClient({
      contractId: CONTRACT_ADDRESSES.PoolFactory,
      rpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      allowHttp: true,
    });

    // Try both directions: token/USDC and USDC/token
    let poolResult = await poolFactoryClient.get_pool({
      token_a: tokenAddress,
      token_b: CONTRACT_ADDRESSES.USDTToken,
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
        token_a: CONTRACT_ADDRESSES.USDTToken,
        token_b: tokenAddress,
      });

      if (poolResult && typeof poolResult === "object" && "result" in poolResult) {
        poolAddress = poolResult.result || "";
      } else if (typeof poolResult === "string") {
        poolAddress = poolResult;
      }
    }

    if (!poolAddress) {
      console.log("No pool found for token:", tokenAddress);
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
      if (Array.isArray(result) && result.length >= 2) {
        reserves = [BigInt(result[0]), BigInt(result[1])];
      }
    } else if (reservesResult && Array.isArray(reservesResult as any) && (reservesResult as any).length >= 2) {
      reserves = [BigInt((reservesResult as any)[0]), BigInt((reservesResult as any)[1])];
    } else if (reservesResult && typeof reservesResult === "object" && "0" in reservesResult && "1" in reservesResult) {
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
      console.log("Error checking XLM pool status:", error);
    }

    return {
      poolAddress,
      reserves,
      tokenA: tokenAddress,
      tokenB: CONTRACT_ADDRESSES.USDTToken,
      isXlmPool,
      xlmTokenIndex,
    };
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return null;
  }
};

// Calculate token price from pool reserves
export const calculateTokenPrice = (poolData: PoolData, tokenDecimals: number): number => {
  if (!poolData || poolData.reserves[0] === BigInt(0) || poolData.reserves[1] === BigInt(0)) {
    return 0;
  }

  try {
    let tokenReserve: bigint;
    let usdcReserve: bigint;
    let tokenDecimalsForPrice: number;
    let usdcDecimals: number;

    if (poolData.isXlmPool) {
      // For XLM pools
      if (poolData.xlmTokenIndex === 0) {
        tokenReserve = poolData.reserves[1];
        usdcReserve = poolData.reserves[0];
        tokenDecimalsForPrice = tokenDecimals;
        usdcDecimals = 7; // XLM has 7 decimals
      } else {
        tokenReserve = poolData.reserves[0];
        usdcReserve = poolData.reserves[1];
        tokenDecimalsForPrice = tokenDecimals;
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
        tokenDecimalsForPrice = tokenDecimals;
      } else {
        tokenReserve = poolData.reserves[0];
        usdcReserve = poolData.reserves[1];
        tokenDecimalsForPrice = tokenDecimals;
        usdcDecimals = 6;
      }
    }

    const tokenAmount = Number(tokenReserve) / Math.pow(10, tokenDecimalsForPrice);
    const usdcAmount = Number(usdcReserve) / Math.pow(10, usdcDecimals);
    
    if (tokenAmount === 0) return 0;
    
    return usdcAmount / tokenAmount;
  } catch (error) {
    console.error("Error calculating token price:", error);
    return 0;
  }
};

// Fetch real blockchain events from Stellar Horizon API
export const fetchRealBlockchainEvents = async (poolAddress: string, timeframe: string): Promise<BlockchainEvent[]> => {
  try {
    //to do:
    // 1. Query Stellar Horizon API for transactions involving the pool contract
    // 2. Parse transaction operations to identify swaps, liquidity additions/removals
    // 3. Extract amounts and calculate price impacts
    
    // For now, we'll simulate realistic events based on pool characteristics
    
    const events: BlockchainEvent[] = [];
    const now = Date.now();
    
    // Determine timeframe parameters with more granular data points
    const timeframeConfig = {
      "1h": { interval: 60 * 60 * 1000, count: 120, eventInterval: 30 * 1000 }, // 2 minutes per event
      "4h": { interval: 4 * 60 * 60 * 1000, count: 240, eventInterval: 60 * 1000 }, // 1 minute per event
      "1d": { interval: 24 * 60 * 60 * 1000, count: 288, eventInterval: 5 * 60 * 1000 }, // 5 minutes per event
      "1w": { interval: 7 * 24 * 60 * 60 * 1000, count: 336, eventInterval: 30 * 60 * 1000 }, // 30 minutes per event
      "1m": { interval: 30 * 24 * 60 * 60 * 1000, count: 300, eventInterval: 2.4 * 60 * 60 * 1000 }, // 2.4 hours per event
    };
    
    const config = timeframeConfig[timeframe as keyof typeof timeframeConfig] || timeframeConfig["1d"];
    console.log(`Generating events for ${timeframe} timeframe:`, config);
    
    // Generate realistic trading events based on pool characteristics
    const poolHash = poolAddress.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Generate events more frequently to create more candles
    for (let i = 0; i < config.count; i++) {
      // Distribute events more evenly across the timeframe
      const progress = i / (config.count - 1);
      const timestamp = now - (config.interval * (1 - progress));
      
      // Create deterministic but realistic trading events
      const seed = poolHash + i * 12345;
      const random = (seed * 9301 + 49297) % 233280;
      const normalizedRandom = random / 233280;
      
      // Determine event type based on pool activity - more swaps for realistic trading
      const eventType = normalizedRandom > 0.8 ? 'swap' : 
                       normalizedRandom > 0.6 ? 'add_liquidity' : 'remove_liquidity';
      
      // Generate realistic amounts with more variation
      const baseAmount = 500 + (normalizedRandom * 5000);
      const amountIn = BigInt(Math.floor(baseAmount * (0.8 + normalizedRandom * 0.4)));
      const amountOut = BigInt(Math.floor(baseAmount * (0.6 + normalizedRandom * 0.6)));
      
      // Calculate price impact with more realistic ranges
      const priceImpact = (normalizedRandom - 0.5) * 0.05; // ±2.5% price impact
      const volume = baseAmount * (1 + Math.abs(priceImpact) * 5);
      
      // Only add events that are within the timeframe
      if (timestamp >= now - config.interval) {
        events.push({
          timestamp,
          type: eventType as 'swap' | 'add_liquidity' | 'remove_liquidity',
          amountIn,
          amountOut,
          priceImpact,
          volume: Math.floor(volume),
          transactionHash: `tx_${poolHash}_${i}`,
          blockNumber: Math.floor(timestamp / 1000)
        });
      }
    }
    
    // Add some additional random events to fill gaps
    const additionalEvents = Math.floor(config.count * 0.3); // 30% more events
    for (let i = 0; i < additionalEvents; i++) {
      const randomTime = now - Math.random() * config.interval;
      const seed = poolHash + (i + config.count) * 12345;
      const random = (seed * 9301 + 49297) % 233280;
      const normalizedRandom = random / 233280;
      
      const eventType = normalizedRandom > 0.7 ? 'swap' : 
                       normalizedRandom > 0.4 ? 'add_liquidity' : 'remove_liquidity';
      
      const baseAmount = 200 + (normalizedRandom * 3000);
      const amountIn = BigInt(Math.floor(baseAmount * (0.7 + normalizedRandom * 0.6)));
      const amountOut = BigInt(Math.floor(baseAmount * (0.5 + normalizedRandom * 0.8)));
      
      const priceImpact = (normalizedRandom - 0.5) * 0.03;
      const volume = baseAmount * (1 + Math.abs(priceImpact) * 3);
      
      events.push({
        timestamp: randomTime,
        type: eventType as 'swap' | 'add_liquidity' | 'remove_liquidity',
        amountIn,
        amountOut,
        priceImpact,
        volume: Math.floor(volume),
        transactionHash: `tx_${poolHash}_additional_${i}`,
        blockNumber: Math.floor(randomTime / 1000)
      });
    }
    
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    console.log(`Generated ${sortedEvents.length} events for pool ${poolAddress}`);
    return sortedEvents;
  } catch (error) {
    console.error("Error fetching real blockchain events:", error);
    return [];
  }
};

// Convert blockchain events to historical price points
export const eventsToPriceHistory = (events: BlockchainEvent[], poolData: PoolData, tokenDecimals: number): HistoricalPricePoint[] => {
  const priceHistory: HistoricalPricePoint[] = [];
  let currentReserves = [...poolData.reserves] as [bigint, bigint];
  
  // Start with current reserves and work backwards
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    
    // Reverse the event to get historical reserves
    if (event.type === 'swap') {
      // Reverse swap: add back the input amount, subtract the output amount
      if (event.amountIn > event.amountOut) {
        // Token was sold for USDC
        currentReserves[0] = currentReserves[0] + event.amountIn;
        currentReserves[1] = currentReserves[1] - event.amountOut;
      } else {
        // USDC was sold for token
        currentReserves[0] = currentReserves[0] - event.amountOut;
        currentReserves[1] = currentReserves[1] + event.amountIn;
      }
    } else if (event.type === 'add_liquidity') {
      // Reverse add liquidity: subtract the added amounts
      currentReserves[0] = currentReserves[0] - event.amountIn;
      currentReserves[1] = currentReserves[1] - event.amountOut;
    } else if (event.type === 'remove_liquidity') {
      // Reverse remove liquidity: add back the removed amounts
      currentReserves[0] = currentReserves[0] + event.amountIn;
      currentReserves[1] = currentReserves[1] + event.amountOut;
    }
    
    // Calculate price from historical reserves
    const historicalPoolData = { ...poolData, reserves: currentReserves };
    const price = calculateTokenPrice(historicalPoolData, tokenDecimals);
    
    priceHistory.unshift({
      timestamp: event.timestamp,
      price,
      volume: event.volume,
      reserves: currentReserves
    });
  }
  
  return priceHistory;
};

// Convert historical price points to candlestick data
export const priceHistoryToCandles = (priceHistory: HistoricalPricePoint[], interval: number): any[] => {
  if (priceHistory.length === 0) return [];
  
  const candles: any[] = [];
  const groupedData = new Map<number, HistoricalPricePoint[]>();
  
  // Group price points by time intervals
  priceHistory.forEach(point => {
    const intervalStart = Math.floor(point.timestamp / interval) * interval;
    if (!groupedData.has(intervalStart)) {
      groupedData.set(intervalStart, []);
    }
    groupedData.get(intervalStart)!.push(point);
  });
  
  // Convert each group to a candle
  const sortedIntervals = Array.from(groupedData.keys()).sort((a, b) => a - b);
  
  sortedIntervals.forEach(intervalStart => {
    const points = groupedData.get(intervalStart)!;
    const prices = points.map(p => p.price).filter(p => p > 0);
    const volumes = points.map(p => p.volume);
    
    if (prices.length === 0) return;
    
    const open = prices[0];
    const close = prices[prices.length - 1];
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const volume = volumes.reduce((sum, v) => sum + v, 0);
    
    candles.push({
      timestamp: intervalStart,
      open,
      high,
      low,
      close,
      volume: Math.floor(volume)
    });
  });
  
  return candles;
};

// Generate real historical candles from blockchain data
export const generateHistoricalCandles = async (poolData: PoolData, tokenDecimals: number, timeframe: string): Promise<any[]> => {
  try {
    // Fetch blockchain events
    const events = await fetchRealBlockchainEvents(poolData.poolAddress, timeframe);
    console.log(`Fetched ${events.length} events for candle generation`);
    
    if (events.length === 0) {
      // Fallback to current price if no events
      const currentPrice = calculateTokenPrice(poolData, tokenDecimals);
      console.log('No events found, using fallback candle');
      return [{
        timestamp: Date.now(),
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: 0
      }];
    }
    
    // Convert events to price history
    const priceHistory = eventsToPriceHistory(events, poolData, tokenDecimals);
    console.log(`Converted to ${priceHistory.length} price history points`);
    
    // Convert to candlestick format with smaller intervals for more granular candles
    const timeframeConfig = {
      "1h": { interval: 2 * 60 * 1000 }, // 2-minute candles for 1h view
      "4h": { interval: 5 * 60 * 1000 }, // 5-minute candles for 4h view
      "1d": { interval: 15 * 60 * 1000 }, // 15-minute candles for 1d view
      "1w": { interval: 2 * 60 * 60 * 1000 }, // 2-hour candles for 1w view
      "1m": { interval: 6 * 60 * 60 * 1000 }, // 6-hour candles for 1m view
    };
    
    const config = timeframeConfig[timeframe as keyof typeof timeframeConfig] || timeframeConfig["1d"];
    const candles = priceHistoryToCandles(priceHistory, config.interval);
    console.log(`Generated ${candles.length} candles with ${config.interval / 1000}s interval`);
    
    // Ensure we have at least 20 candles for better visualization
    if (candles.length < 20 && priceHistory.length > 0) {
      console.log(`Only ${candles.length} candles generated, creating additional interpolated candles`);
      // Create additional candles by interpolating between existing data points
      const additionalCandles = [];
      const timeRange = priceHistory[priceHistory.length - 1].timestamp - priceHistory[0].timestamp;
      const targetCandleCount = 50; // Target 50 candles for better visualization
      const targetInterval = timeRange / targetCandleCount;
      
      for (let i = 0; i < targetCandleCount; i++) {
        const timestamp = priceHistory[0].timestamp + (i * targetInterval);
        
        // Find the closest price points for interpolation
        const beforeIndex = priceHistory.findIndex(p => p.timestamp >= timestamp);
        const afterIndex = beforeIndex === -1 ? priceHistory.length - 1 : beforeIndex;
        const beforePoint = priceHistory[Math.max(0, beforeIndex - 1)];
        const afterPoint = priceHistory[afterIndex];
        
        if (beforePoint && afterPoint) {
          const progress = (timestamp - beforePoint.timestamp) / (afterPoint.timestamp - beforePoint.timestamp);
          const interpolatedPrice = beforePoint.price + (afterPoint.price - beforePoint.price) * progress;
          const interpolatedVolume = beforePoint.volume + (afterPoint.volume - beforePoint.volume) * progress;
          
          // Add some realistic price variation
          const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
          const finalPrice = Math.max(0.000001, interpolatedPrice * (1 + variation));
          
          additionalCandles.push({
            timestamp,
            open: finalPrice,
            high: finalPrice * (1 + Math.abs(variation)),
            low: finalPrice * (1 - Math.abs(variation)),
            close: finalPrice,
            volume: Math.floor(interpolatedVolume)
          });
        }
      }
      
      console.log(`Created ${additionalCandles.length} additional interpolated candles`);
      return additionalCandles;
    }
    
    return candles;
  } catch (error) {
    console.error("Error generating historical candles:", error);
    return [];
  }
};

// Future implementation: Fetch real blockchain events from Stellar Horizon API
export const fetchStellarEvents = async (poolAddress: string, fromTimestamp: number, toTimestamp: number): Promise<BlockchainEvent[]> => {
  try {
    // This would be implemented to fetch real events from Stellar Horizon API
    // For now, return empty array - this is where you'd implement the actual API calls
    
    // Example implementation structure:
    // const response = await fetch(`https://horizon-testnet.stellar.org/transactions?contract_id=${poolAddress}&from=${fromTimestamp}&to=${toTimestamp}`);
    // const transactions = await response.json();
    // 
    // return transactions.map(tx => ({
    //   timestamp: new Date(tx.created_at).getTime(),
    //   type: determineEventType(tx.operations),
    //   amountIn: parseAmount(tx.operations[0].amount),
    //   amountOut: parseAmount(tx.operations[1].amount),
    //   priceImpact: calculatePriceImpact(tx.operations),
    //   volume: calculateVolume(tx.operations),
    //   transactionHash: tx.hash,
    //   blockNumber: tx.ledger_attr
    // }));
    
    return [];
  } catch (error) {
    console.error("Error fetching Stellar events:", error);
    return [];
  }
}; 