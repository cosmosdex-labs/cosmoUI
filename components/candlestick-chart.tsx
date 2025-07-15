"use client"

import { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Volume2, Activity, Zap } from "lucide-react"
import { 
  fetchPoolData, 
  calculateTokenPrice, 
  generateHistoricalCandles,
  type PoolData 
} from "@/lib/blockchain-events"

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface TokenData {
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
}

export interface CandlestickChartHandle {
  addTrade: () => void;
}

interface CandlestickChartProps {
  tokenSymbol: string
  tokenData?: TokenData
  timeframe: string
  onTimeframeChange: (timeframe: string) => void
}

const TIMEFRAMES = ["1h", "4h", "1d", "1w", "1m"] as const;
type TimeframeKey = typeof TIMEFRAMES[number];

const TIMEFRAME_CONFIG: Record<TimeframeKey, { label: string; interval: number; count: number }> = {
  "1h": { label: "1H", interval: 60 * 60 * 1000, count: 100 },
  "4h": { label: "4H", interval: 4 * 60 * 60 * 1000, count: 100 },
  "1d": { label: "1D", interval: 24 * 60 * 60 * 1000, count: 100 },
  "1w": { label: "1W", interval: 7 * 24 * 60 * 60 * 1000, count: 100 },
  "1m": { label: "1M", interval: 30 * 24 * 60 * 60 * 1000, count: 100 },
};

export const CandlestickChart = forwardRef<CandlestickChartHandle, CandlestickChartProps>(
  function CandlestickChart({ tokenSymbol, tokenData, timeframe, onTimeframeChange }, ref) {
    const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null)
    const [candleData, setCandleData] = useState<CandleData[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLive, setIsLive] = useState(true)
    const [poolData, setPoolData] = useState<PoolData | null>(null)
    const lastUpdateTimeRef = useRef<number>(0)
    const basePrice = tokenData ? parseFloat(tokenData.price.replace('$', '')) : 0.000012

    // Fetch pool data for the token (only once on mount or when token changes)
    useEffect(() => {
      const fetchData = async () => {
        if (!tokenData?.contractAddress) return;
        
        setIsLoading(true);
        try {
          const pool = await fetchPoolData(tokenData.contractAddress);
          setPoolData(pool);
          lastUpdateTimeRef.current = Date.now();
        } catch (error) {
          console.error("Error fetching pool data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchData();
    }, [tokenData?.contractAddress]);

    // Generate historical candles for the selected timeframe
    useEffect(() => {
      const generateCandles = async () => {
        if (!poolData) return;
        
        setIsLoading(true);
        try {
          const candles = await generateHistoricalCandles(poolData, 18, timeframe);
          console.log(`Generated ${candles.length} candles for ${tokenSymbol} on ${timeframe} timeframe`);
          console.log('Candle data:', candles.slice(0, 5)); // Log first 5 candles
          setCandleData(candles);
        } catch (error) {
          console.error("Error generating historical candles:", error);
        } finally {
          setTimeout(() => setIsLoading(false), 300);
        }
      };
      
      generateCandles();
    }, [poolData, timeframe, tokenSymbol]);

    // Real-time updates based on current pool activity
    useEffect(() => {
      if (!isLive || !poolData) return;
      
      const updateInterval = setInterval(async () => {
        const now = Date.now();
        if (now - lastUpdateTimeRef.current < 5000) return; // Update every 5 seconds
        
        try {
          // Fetch current pool data for real-time updates
          const currentPool = await fetchPoolData(tokenData?.contractAddress || "");
          if (currentPool) {
            const currentPrice = calculateTokenPrice(currentPool, 18);
            
            setCandleData(prev => {
              if (prev.length === 0) return prev;
              
              const last = prev[prev.length - 1];
              if (!last) return prev;
              
              // Update the last candle with current price
              const updatedCandles = [...prev];
              const lastCandle = { ...last };
              
              lastCandle.close = currentPrice;
              lastCandle.high = Math.max(lastCandle.high, currentPrice);
              lastCandle.low = Math.min(lastCandle.low, currentPrice);
              lastCandle.timestamp = now;
              
              updatedCandles[updatedCandles.length - 1] = lastCandle;
              
              return updatedCandles;
            });
          }
        } catch (error) {
          console.error("Error updating real-time data:", error);
        }
        
        lastUpdateTimeRef.current = now;
      }, 5000);
      
      return () => clearInterval(updateInterval);
    }, [isLive, poolData, tokenData?.contractAddress]);

    // Expose addTrade method to parent
    useImperativeHandle(ref, () => ({
      addTrade: () => {
        if (!poolData) return;
        
        setCandleData(prev => {
          if (prev.length === 0) return prev;
          
          const last = prev[prev.length - 1];
          if (!last) return prev;
          
          // Simulate a new trade impact
          const priceVariation = (Math.random() - 0.5) * 0.02; // ±1% price change
          const newPrice = Math.max(0.000001, last.close * (1 + priceVariation));
          
          const newCandle: CandleData = {
            timestamp: Date.now(),
            open: last.close,
            high: Math.max(last.close, newPrice),
            low: Math.min(last.close, newPrice),
            close: newPrice,
            volume: Math.floor(1000 + Math.random() * 5000),
          };
          
          return [...prev.slice(1), newCandle];
        });
      }
    }), [poolData]);

    const chartMetrics = useMemo(() => {
      if (candleData.length === 0) return null
      
      const prices = candleData.flatMap((d) => [d.high, d.low])
      const volumes = candleData.map((d) => d.volume)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const maxVolume = Math.max(...volumes)
      const priceRange = maxPrice - minPrice
      const padding = priceRange * 0.05
      
      return {
        minPrice: minPrice - padding,
        maxPrice: maxPrice + padding,
        priceRange: priceRange + padding * 2,
        maxVolume,
        currentPrice: candleData[candleData.length - 1]?.close || 0,
        priceChange:
          candleData.length > 1
            ? ((candleData[candleData.length - 1].close - candleData[0].open) / candleData[0].open) * 100
            : 0,
      }
    }, [candleData])

    const formatPrice = (price: number) => {
      if (price < 0.0001) return price.toFixed(8)
      if (price < 0.01) return price.toFixed(6)
      if (price < 1) return price.toFixed(4)
      return price.toFixed(2)
    }
    
    const formatVolume = (volume: number) => {
      if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`
      if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`
      return volume.toString()
    }
    
    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp)
      if (timeframe === "1h" || timeframe === "4h") {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }

    if (isLoading || !chartMetrics) {
      return (
        <Card className="bg-gray-900 border-gray-800 w-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{tokenSymbol} Price Chart</span>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  {Object.entries(TIMEFRAME_CONFIG).map(([key, tf]) => (
                    <Button key={key} variant="ghost" size="sm" className="text-xs px-2">
                      {tf.label}
                    </Button>
                  ))}
                </div>
                <Badge className="bg-green-500 text-black animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center w-full">
              <div className="text-center">
                <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2 animate-pulse" />
                <p className="text-gray-400">Loading historical data...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="bg-gray-900 border-gray-800 w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{tokenSymbol} Price Chart</span>
                <Badge className="bg-green-500 text-black animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  LIVE
                </Badge>
                <Badge
                  className={`${chartMetrics.priceChange >= 0 ? "bg-green-500 text-black" : "bg-red-500 text-white"}`}
                >
                  {chartMetrics.priceChange >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {chartMetrics.priceChange.toFixed(2)}%
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-2xl font-bold">${formatPrice(chartMetrics.currentPrice)}</span>
                {hoveredCandle && (
                  <div className="text-sm text-gray-400">
                    O: ${formatPrice(hoveredCandle.open)} | H: ${formatPrice(hoveredCandle.high)} | L: ${formatPrice(hoveredCandle.low)} | C: ${formatPrice(hoveredCandle.close)} | V: {formatVolume(hoveredCandle.volume)}
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-1">
              {TIMEFRAMES.map((key) => (
                <Button
                  key={key}
                  variant={timeframe === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTimeframeChange(key)}
                  className={`text-xs px-3 ${timeframe === key ? "bg-green-500 text-black" : ""}`}
                >
                  {TIMEFRAME_CONFIG[key].label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full">
            <div className="overflow-x-auto w-full">
              <svg
                viewBox={`0 0 900 400`}
                width="100%"
                height="400"
                className="bg-gray-800 rounded-lg w-full h-auto"
                preserveAspectRatio="none"
              >
                <defs>
                  <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.15" />
                  </pattern>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1f2937" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#111827" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <rect width="100%" height={320} fill="url(#chartGradient)" />
                <rect width="100%" height={320} fill="url(#grid)" />
                
                {candleData.map((candle, index) => {
                  const chartWidth = 880
                  const chartHeight = 320
                  const volumeHeight = 60
                  const candleWidth = Math.max(3, chartWidth / candleData.length - 2) // Increased minimum width
                  const x = index * (candleWidth + 2) + candleWidth / 2 + 10 // Increased spacing
                  const isGreen = candle.close >= candle.open
                  
                  const highY = 10 + ((chartMetrics.maxPrice - candle.high) / chartMetrics.priceRange) * (chartHeight - 20)
                  const lowY = 10 + ((chartMetrics.maxPrice - candle.low) / chartMetrics.priceRange) * (chartHeight - 20)
                  const openY = 10 + ((chartMetrics.maxPrice - candle.open) / chartMetrics.priceRange) * (chartHeight - 20)
                  const closeY = 10 + ((chartMetrics.maxPrice - candle.close) / chartMetrics.priceRange) * (chartHeight - 20)
                  const bodyTop = Math.min(openY, closeY)
                  const bodyHeight = Math.max(Math.abs(closeY - openY), 1) // Minimum body height
                  
                  const volumeBarHeight = (candle.volume / chartMetrics.maxVolume) * volumeHeight
                  const volumeY = chartHeight + 20 + (volumeHeight - volumeBarHeight)
                  
                  // Wick (high-low line)
                  const wickWidth = 0.5
                  
                  return (
                    <g key={`${candle.timestamp}-${index}`}>
                      {/* Wick (high-low line) */}
                      <line 
                        x1={x} 
                        y1={highY} 
                        x2={x} 
                        y2={lowY} 
                        stroke={isGreen ? "#16a34a" : "#dc2626"} 
                        strokeWidth={wickWidth}
                        strokeLinecap="round"
                      />
                      
                      {/* Candle body */}
                      <rect
                        x={x - candleWidth / 2}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={isGreen ? "#22c55e" : "#ef4444"}
                        stroke={isGreen ? "#16a34a" : "#dc2626"}
                        strokeWidth="0.5"
                        rx="1" // Rounded corners
                        className="cursor-pointer transition-all duration-300 ease-out"
                        onMouseEnter={() => setHoveredCandle(candle)}
                        onMouseLeave={() => setHoveredCandle(null)}
                        style={{ 
                          opacity: hoveredCandle === candle ? 0.9 : 1,
                          filter: hoveredCandle === candle ? 'brightness(1.1)' : 'none'
                        }}
                      />
                      
                      {/* Volume bar */}
                      <rect
                        x={x - candleWidth / 2}
                        y={volumeY}
                        width={candleWidth}
                        height={volumeBarHeight}
                        fill={isGreen ? "#22c55e" : "#ef4444"}
                        opacity="0.3"
                        rx="1" // Rounded corners
                        className="transition-all duration-300 ease-out"
                      />
                    </g>
                  )
                })}
                
                {/* Simple Moving Average Line */}
                {candleData.length > 5 && (
                  <g>
                    <path
                      d={candleData.map((candle, index) => {
                        if (index < 4) return null; // Skip first 4 candles for SMA calculation
                        
                        const chartWidth = 880
                        const candleWidth = Math.max(3, chartWidth / candleData.length - 2)
                        const x = index * (candleWidth + 2) + candleWidth / 2 + 10
                        
                        // Calculate 5-period simple moving average
                        const sma = candleData
                          .slice(index - 4, index + 1)
                          .reduce((sum, c) => sum + c.close, 0) / 5;
                        
                        const y = 10 + ((chartMetrics.maxPrice - sma) / chartMetrics.priceRange) * (320 - 20);
                        
                        return index === 4 ? `M ${x} ${y}` : `L ${x} ${y}`;
                      }).filter(Boolean).join(' ')}
                      stroke="#3b82f6"
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
                
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                  const price = chartMetrics.maxPrice - ratio * chartMetrics.priceRange
                  const y = 10 + ratio * (320 - 20)
                  return (
                    <g key={index}>
                      <line x1="0" y1={y} x2="100%" y2={y} stroke="#374151" strokeWidth="0.5" opacity="0.2" />
                      <text x="5" y={y - 2} fill="#9ca3af" fontSize="11" fontFamily="system-ui" fontWeight="500">
                        ${formatPrice(price)}
                      </text>
                    </g>
                  )
                })}
                
                <text x="5" y={320 + 35} fill="#9ca3af" fontSize="11" fontFamily="system-ui" fontWeight="500">
                  Volume
                </text>
                
                {candleData
                  .filter((_, index) => index % Math.ceil(candleData.length / 6) === 0)
                  .map((candle, index) => {
                    const chartWidth = 880
                    const candleWidth = Math.max(3, chartWidth / candleData.length - 2)
                    const dataIndex = candleData.indexOf(candle)
                    const x = dataIndex * (candleWidth + 2) + candleWidth / 2 + 10
                    return (
                      <text
                        key={index}
                        x={x}
                        y={320 + 60 + 35}
                        fill="#9ca3af"
                        fontSize="10"
                        fontFamily="system-ui"
                        fontWeight="400"
                        textAnchor="middle"
                      >
                        {formatTime(candle.timestamp)}
                      </text>
                    )
                  })}
              </svg>
            </div>
            
            <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Bullish</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Bearish</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Volume2 className="h-3 w-3" />
                  <span>Volume</span>
                </div>
                {candleData.length > 5 && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
                    <span>SMA(5)</span>
                  </div>
                )}
              </div>
              <div className="text-xs">Last updated: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
