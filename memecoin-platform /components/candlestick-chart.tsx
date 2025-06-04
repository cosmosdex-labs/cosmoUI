"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Volume2, Activity } from "lucide-react"

interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface CandlestickChartProps {
  tokenSymbol: string
  timeframe: string
  onTimeframeChange: (timeframe: string) => void
}

// Mock data generator for realistic candlestick data
const generateCandleData = (days: number, basePrice = 0.000012): CandleData[] => {
  const data: CandleData[] = []
  let currentPrice = basePrice
  const now = Date.now()
  const interval = (days * 24 * 60 * 60 * 1000) / 100 // 100 candles per timeframe

  for (let i = 0; i < 100; i++) {
    const timestamp = now - (99 - i) * interval
    const volatility = 0.05 + Math.random() * 0.1 // 5-15% volatility

    // Generate realistic price movement
    const trend = Math.sin(i / 10) * 0.02 + (Math.random() - 0.5) * 0.03
    const open = currentPrice

    // Generate high and low based on volatility
    const range = currentPrice * volatility
    const high = open + Math.random() * range
    const low = open - Math.random() * range

    // Close price with trend
    const close = Math.max(low, Math.min(high, open * (1 + trend)))

    // Volume with some correlation to price movement
    const priceChange = Math.abs(close - open) / open
    const baseVolume = 50000 + Math.random() * 100000
    const volume = baseVolume * (1 + priceChange * 5)

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.floor(volume),
    })

    currentPrice = close
  }

  return data
}

export function CandlestickChart({ tokenSymbol, timeframe, onTimeframeChange }: CandlestickChartProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const timeframes = [
    { label: "1H", value: "1h", days: 0.04 },
    { label: "4H", value: "4h", days: 0.17 },
    { label: "1D", value: "1d", days: 1 },
    { label: "1W", value: "1w", days: 7 },
    { label: "1M", value: "1m", days: 30 },
  ]

  // Generate data based on timeframe
  useEffect(() => {
    setIsLoading(true)
    const selectedTimeframe = timeframes.find((tf) => tf.value === timeframe) || timeframes[2]

    // Simulate API call delay
    setTimeout(() => {
      const data = generateCandleData(selectedTimeframe.days)
      setCandleData(data)
      setIsLoading(false)
    }, 500)
  }, [timeframe])

  // Calculate chart dimensions and scaling
  const chartMetrics = useMemo(() => {
    if (candleData.length === 0) return null

    const prices = candleData.flatMap((d) => [d.high, d.low])
    const volumes = candleData.map((d) => d.volume)

    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const maxVolume = Math.max(...volumes)

    const priceRange = maxPrice - minPrice
    const padding = priceRange * 0.1

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
    if (price < 0.001) return price.toFixed(8)
    if (price < 1) return price.toFixed(6)
    return price.toFixed(4)
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

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{tokenSymbol} Price Chart</span>
            <div className="flex space-x-1">
              {timeframes.map((tf) => (
                <Button key={tf.value} variant="ghost" size="sm" className="text-xs px-2">
                  {tf.label}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-400">Loading chart data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!chartMetrics) return null

  const chartHeight = 300
  const volumeHeight = 80
  const chartWidth = 800
  const candleWidth = Math.max(2, chartWidth / candleData.length - 2)

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>{tokenSymbol} Price Chart</span>
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
                  O: ${formatPrice(hoveredCandle.open)} | H: ${formatPrice(hoveredCandle.high)} | L: $
                  {formatPrice(hoveredCandle.low)} | C: ${formatPrice(hoveredCandle.close)} | V:{" "}
                  {formatVolume(hoveredCandle.volume)}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-1">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                variant={timeframe === tf.value ? "default" : "ghost"}
                size="sm"
                onClick={() => onTimeframeChange(tf.value)}
                className={`text-xs px-3 ${timeframe === tf.value ? "bg-green-500 text-black" : ""}`}
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Price Chart */}
          <div className="overflow-x-auto">
            <svg
              width={Math.max(chartWidth, candleData.length * (candleWidth + 2))}
              height={chartHeight + volumeHeight + 40}
              className="bg-gray-800 rounded-lg"
            >
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height={chartHeight} fill="url(#grid)" />

              {/* Price candles */}
              {candleData.map((candle, index) => {
                const x = index * (candleWidth + 2) + candleWidth / 2 + 10
                const isGreen = candle.close >= candle.open

                // Calculate y positions
                const highY =
                  10 + ((chartMetrics.maxPrice - candle.high) / chartMetrics.priceRange) * (chartHeight - 20)
                const lowY = 10 + ((chartMetrics.maxPrice - candle.low) / chartMetrics.priceRange) * (chartHeight - 20)
                const openY =
                  10 + ((chartMetrics.maxPrice - candle.open) / chartMetrics.priceRange) * (chartHeight - 20)
                const closeY =
                  10 + ((chartMetrics.maxPrice - candle.close) / chartMetrics.priceRange) * (chartHeight - 20)

                const bodyTop = Math.min(openY, closeY)
                const bodyHeight = Math.abs(closeY - openY)

                // Volume bar
                const volumeBarHeight = (candle.volume / chartMetrics.maxVolume) * volumeHeight
                const volumeY = chartHeight + 20 + (volumeHeight - volumeBarHeight)

                return (
                  <g key={index}>
                    {/* High-Low line */}
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={isGreen ? "#10b981" : "#ef4444"} strokeWidth="1" />

                    {/* Candle body */}
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={Math.max(bodyHeight, 1)}
                      fill={isGreen ? "#10b981" : "#ef4444"}
                      stroke={isGreen ? "#10b981" : "#ef4444"}
                      strokeWidth="1"
                      className="cursor-pointer hover:opacity-80"
                      onMouseEnter={() => setHoveredCandle(candle)}
                      onMouseLeave={() => setHoveredCandle(null)}
                    />

                    {/* Volume bar */}
                    <rect
                      x={x - candleWidth / 2}
                      y={volumeY}
                      width={candleWidth}
                      height={volumeBarHeight}
                      fill={isGreen ? "#10b981" : "#ef4444"}
                      opacity="0.6"
                    />
                  </g>
                )
              })}

              {/* Price labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const price = chartMetrics.maxPrice - ratio * chartMetrics.priceRange
                const y = 10 + ratio * (chartHeight - 20)

                return (
                  <g key={index}>
                    <line x1="0" y1={y} x2="100%" y2={y} stroke="#374151" strokeWidth="0.5" opacity="0.5" />
                    <text x="5" y={y - 2} fill="#9ca3af" fontSize="10" fontFamily="monospace">
                      ${formatPrice(price)}
                    </text>
                  </g>
                )
              })}

              {/* Volume label */}
              <text x="5" y={chartHeight + 35} fill="#9ca3af" fontSize="10" fontFamily="monospace">
                Volume
              </text>

              {/* Time labels */}
              {candleData
                .filter((_, index) => index % Math.ceil(candleData.length / 6) === 0)
                .map((candle, index) => {
                  const dataIndex = candleData.indexOf(candle)
                  const x = dataIndex * (candleWidth + 2) + candleWidth / 2 + 10

                  return (
                    <text
                      key={index}
                      x={x}
                      y={chartHeight + volumeHeight + 35}
                      fill="#9ca3af"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {formatTime(candle.timestamp)}
                    </text>
                  )
                })}
            </svg>
          </div>

          {/* Chart Legend */}
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
            </div>
            <div className="text-xs">Last updated: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
