import React, { useEffect, useRef, useState } from 'react';
import { Asset, PricePoint, Trade, ChartUserLine } from '../types';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, ColorType, LineStyle, IPriceLine, createSeriesMarkers, SeriesMarker, PriceScaleMode, CrosshairMode } from 'lightweight-charts';
import { ASSET_DETAILS } from './AssetLogo';
import { TrendingUp, TrendingDown, Clock, MoveVertical, X } from 'lucide-react';
import { soundManager } from '../lib/sound';
import { 
  formatTickMark, 
  formatCrosshairTime, 
  getResolvedTimeZone, 
  getSavedTimeZoneMode, 
  saveTimeZoneMode 
} from '../lib/timezone';
import { TimeZoneSelector } from './TimeZoneSelector';

interface ChartProps {
  activeAsset?: Asset;
  historyRef: React.MutableRefObject<PricePoint[]>;
  trades: Trade[];
  userLines?: ChartUserLine[];
  onUpdateLinePrice?: (id: string, newPrice: number) => void;
  onRemoveLine?: (id: string) => void;
  activeDraggingId?: string | null;
  onDraggingChange?: (id: string | null) => void;
  timeZoneMode?: string;
  onTimeZoneChange?: (mode: string) => void;
}

const ActiveTradeHUDItem: React.FC<{ 
  trade: Trade; 
  currentPrice: number;
}> = ({ trade, currentPrice }) => {
  const isProfit = trade.action === 'CALL' ? currentPrice >= trade.entryPrice : currentPrice <= trade.entryPrice;
  const payoutRate = ASSET_DETAILS[trade.asset]?.payout ?? 82;
  const potentialProfit = (trade.amount * payoutRate) / 100;
  const totalReturn = trade.amount + potentialProfit;

  const [remainingSec, setRemainingSec] = useState<number>(() => {
    return Math.max(0, Math.ceil((trade.expiryTime - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const sec = Math.max(0, Math.ceil((trade.expiryTime - Date.now()) / 1000));
      setRemainingSec(prev => {
        if (prev !== sec && sec > 0) {
          soundManager.playTick(sec <= 5);
        }
        return sec;
      });
    }, 250);
    return () => clearInterval(timer);
  }, [trade.expiryTime]);

  return (
    <div className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 sm:p-2.5 w-full shadow-xl transition-all duration-200 border backdrop-blur-md ${
      isProfit 
        ? 'bg-[#0B1510]/90 border-emerald-500/80 shadow-emerald-950/40' 
        : 'bg-[#180B0D]/90 border-rose-500/80 shadow-rose-950/40'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`p-1 sm:p-1.5 rounded-lg shrink-0 ${trade.action === 'CALL' ? 'bg-emerald-500 text-black font-black' : 'bg-rose-500 text-white font-black'}`}>
          {trade.action === 'CALL' ? <TrendingUp className="w-3.5 h-3.5 stroke-[3]" /> : <TrendingDown className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">{trade.asset}</span>
            <span className="text-[9px] sm:text-[10px] font-black text-amber-300 bg-amber-400/20 px-1 py-0.2 rounded border border-amber-400/30">${trade.amount}</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-gray-300 mt-0.5">
            Entry: <span className="text-white font-mono font-bold">{trade.entryPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end pl-2">
        <div className="flex items-center space-x-1">
          <span className={`text-[8px] sm:text-[10px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${
            isProfit ? 'bg-emerald-500 text-black' : 'bg-rose-500/30 text-rose-300 border border-rose-500/50'
          }`}>
            {isProfit ? 'WIN' : 'LOSS'}
          </span>
          <span className={`text-xs sm:text-sm font-black tabular-nums font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? `+$${totalReturn.toFixed(2)}` : `-$${trade.amount.toFixed(2)}`}
          </span>
        </div>
        <div className="flex items-center space-x-1 text-amber-300 mt-0.5 font-mono text-[9px] sm:text-[10px] font-black bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/30 animate-pulse">
          <Clock className="w-3 h-3 text-amber-300" />
          <span>{remainingSec}s left</span>
        </div>
      </div>
    </div>
  );
};

const CANDLE_DURATION_MS = 5000;

function buildCandlesFromPoints(points: PricePoint[], durationMs: number = 5000): CandlestickData<Time>[] {
  if (!points || points.length === 0) return [];
  const candles: CandlestickData<Time>[] = [];
  let currentCandle: CandlestickData<Time> | null = null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const bucketTimeSec = (Math.floor(p.time / durationMs) * (durationMs / 1000)) as Time;

    if (!currentCandle || currentCandle.time !== bucketTimeSec) {
      currentCandle = {
        time: bucketTimeSec,
        open: p.price,
        high: p.price,
        low: p.price,
        close: p.price,
      };
      candles.push(currentCandle);
    } else {
      if (p.price > currentCandle.high) currentCandle.high = p.price;
      if (p.price < currentCandle.low) currentCandle.low = p.price;
      currentCandle.close = p.price;
    }
  }

  return candles;
}

function findNearestCandleTime(targetSec: number, candleTimes: number[]): Time | null {
  if (!candleTimes || candleTimes.length === 0) return null;
  if (targetSec <= candleTimes[0]) return candleTimes[0] as Time;
  if (targetSec >= candleTimes[candleTimes.length - 1]) return candleTimes[candleTimes.length - 1] as Time;

  let low = 0;
  let high = candleTimes.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (candleTimes[mid] === targetSec) return candleTimes[mid] as Time;
    if (candleTimes[mid] < targetSec) low = mid + 1;
    else high = mid - 1;
  }
  const prev = candleTimes[Math.max(0, high)];
  const next = candleTimes[Math.min(candleTimes.length - 1, low)];
  return (Math.abs(targetSec - prev) <= Math.abs(targetSec - next) ? prev : next) as Time;
}

const ChartComponent: React.FC<ChartProps> = ({ 
  activeAsset, 
  historyRef, 
  trades = [], 
  userLines = [],
  onUpdateLinePrice,
  onRemoveLine,
  activeDraggingId,
  onDraggingChange,
  timeZoneMode,
  onTimeZoneChange,
}) => {
  const candleDurationMs = 5000;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersPluginRef = useRef<any>(null);
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const userPriceLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  const candleTimesRef = useRef<number[]>([]);

  // Time zone management: defaults to local browser auto-detection via Intl
  const [internalTimeZone, setInternalTimeZone] = useState<string>(() => getSavedTimeZoneMode());
  const effectiveTimeZone = timeZoneMode !== undefined ? timeZoneMode : internalTimeZone;

  const handleTimeZoneChange = (newMode: string) => {
    setInternalTimeZone(newMode);
    saveTimeZoneMode(newMode);
    onTimeZoneChange?.(newMode);
  };

  const activeZoneRef = useRef<string>(getResolvedTimeZone(effectiveTimeZone));
  useEffect(() => {
    activeZoneRef.current = getResolvedTimeZone(effectiveTimeZone);
  }, [effectiveTimeZone]);

  const draggingRef = useRef<{ lineId: string; pointerId: number; target: HTMLElement } | null>(null);
  const [localDraggingId, setLocalDraggingId] = useState<string | null>(null);
  const [lineCoords, setLineCoords] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    const chartOptions = { 
      layout: { 
        attributionLogo: false,
        textColor: '#9CA3AF', 
        background: { type: ColorType.Solid, color: '#0E1318' } 
      }, 
      localization: {
        locale,
        timeFormatter: (time: Time | number) => {
          return formatCrosshairTime(time, activeZoneRef.current, locale);
        },
      },
      grid: { 
        vertLines: { color: '#1F2937', style: LineStyle.SparseDotted }, 
        horzLines: { color: '#1F2937', style: LineStyle.SparseDotted } 
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#1F2937',
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 0.1,
        shiftVisibleRangeOnNewBar: false, // Prevents snapping visible range when new candle forms during drag!
        tickMarkFormatter: (time: Time, tickMarkType: number, tickLocale: string) => {
          return formatTickMark(time, tickMarkType, tickLocale || locale, activeZoneRef.current);
        },
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      rightPriceScale: {
        autoScale: true,
        mode: PriceScaleMode.Normal,
        borderVisible: true,
        borderColor: '#1F2937',
        scaleMargins: {
          top: 0.25,
          bottom: 0.25,
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#3B82F6',
          style: LineStyle.Solid,
          labelBackgroundColor: '#3B82F6',
        },
        horzLine: {
          color: '#3B82F6',
          style: LineStyle.Solid,
          labelBackgroundColor: '#3B82F6',
        },
      },
    };
    
    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, { 
      upColor: '#10B981', 
      downColor: '#EF4444', 
      borderVisible: false, 
      wickUpColor: '#10B981', 
      wickDownColor: '#EF4444' 
    });
    seriesRef.current = candlestickSeries;
    
    try {
      markersPluginRef.current = createSeriesMarkers(candlestickSeries, []);
    } catch (e) {}

    // Load initial full historical dataset
    const initialPoints = historyRef.current;
    if (initialPoints.length > 0) {
      const initialCandles = buildCandlesFromPoints(initialPoints, candleDurationMs);
      candleTimesRef.current = initialCandles.map(c => Number(c.time));
      candlestickSeries.setData(initialCandles);
      chart.timeScale().scrollToRealTime();
    }

    // Handle Resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Re-sync full chart on tab re-activation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && seriesRef.current && chartRef.current) {
        const points = historyRef.current;
        if (points && points.length > 0) {
          const fullCandles = buildCandlesFromPoints(points, candleDurationMs);
          candleTimesRef.current = fullCandles.map(c => Number(c.time));
          seriesRef.current.setData(fullCandles);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Incremental live update (smooth, non-flickering, zero-stutter)
    const updateLiveCandle = () => {
      const points = historyRef.current;
      if (!points || points.length === 0 || !seriesRef.current) return;

      const lastPoint = points[points.length - 1];
      if (!lastPoint || typeof lastPoint.price !== 'number' || isNaN(lastPoint.price)) return;

      const currentBucketTimeSec = Math.floor(lastPoint.time / candleDurationMs) * (candleDurationMs / 1000);

      if (!candleTimesRef.current.includes(currentBucketTimeSec)) {
        candleTimesRef.current.push(currentBucketTimeSec);
        candleTimesRef.current.sort((a, b) => a - b);
      }

      try {
        let open = lastPoint.price;
        let high = lastPoint.price;
        let low = lastPoint.price;
        const close = lastPoint.price;

        for (let i = points.length - 1; i >= 0; i--) {
          const p = points[i];
          const bucket = Math.floor(p.time / candleDurationMs) * (candleDurationMs / 1000);
          if (bucket !== currentBucketTimeSec) break;
          open = p.price;
          high = Math.max(high, p.price);
          low = Math.min(low, p.price);
        }

        seriesRef.current.update({
          time: currentBucketTimeSec as Time,
          open,
          high,
          low,
          close,
        });
      } catch (err) {
        console.warn("Chart live update error:", err);
      }
    };

    // Run interval for smooth real-time incremental updates
    const interval = setInterval(updateLiveCandle, 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      chart.remove();
    };
  }, [historyRef]);

  const lastRenderedBucketRef = useRef<number>(0);

  // Handle Asset Switch
  const prevAssetRef = useRef<Asset | undefined>(activeAsset);
  useEffect(() => {
    if (prevAssetRef.current !== activeAsset) {
      prevAssetRef.current = activeAsset;
      lastRenderedBucketRef.current = 0; // Reset bucket tracker for new asset!

      if (seriesRef.current && chartRef.current) {
        try {
          // Clear all price lines when switching assets
          for (const [id, priceLine] of priceLinesRef.current.entries()) {
            try {
              seriesRef.current.removePriceLine(priceLine);
            } catch (e) {}
          }
          priceLinesRef.current.clear();

          for (const [id, userLine] of userPriceLinesRef.current.entries()) {
            try {
              seriesRef.current.removePriceLine(userLine);
            } catch (e) {
              // ignore
            }
          }
          userPriceLinesRef.current.clear();
          
          try {
             if (markersPluginRef.current) markersPluginRef.current.setMarkers([]);
          } catch(e) {}

          // Immediately update candlestick chart data for new asset with full history
          const points = historyRef.current;
          if (points && points.length > 0) {
            const fullCandles = buildCandlesFromPoints(points, candleDurationMs);
            candleTimesRef.current = fullCandles.map(c => Number(c.time));
            seriesRef.current.setData(fullCandles);
            chartRef.current.timeScale().scrollToRealTime();
            chartRef.current.priceScale('right').applyOptions({ autoScale: true });
          }
        } catch (err) {
          console.warn("Asset switch chart error:", err);
        }
      }
    }
  }, [activeAsset, historyRef, candleDurationMs]);

  // Handle Trade Price Lines & Candle Markers
  useEffect(() => {
    if (!seriesRef.current) return;
    
    const now = Date.now();
    const payoutRate = activeAsset ? (ASSET_DETAILS[activeAsset]?.payout ?? 82) : 82;
    
    // STRICTLY filter ONLY active trades for the currently active asset
    const activeTradesOnAsset = trades.filter(t => t.asset === activeAsset && t.status === 'ACTIVE');
    const activeTradeIds = new Set(activeTradesOnAsset.map(t => t.id));
    
    // Remove price lines for trades that are no longer active or belong to another asset
    for (const [id, priceLine] of priceLinesRef.current.entries()) {
      if (!activeTradeIds.has(id)) {
        try {
          seriesRef.current.removePriceLine(priceLine);
        } catch(e) {}
        priceLinesRef.current.delete(id);
      }
    }
    
    // Create/Update price lines for active trades only
    activeTradesOnAsset.forEach(trade => {
      const remainingSec = Math.max(0, Math.ceil((trade.expiryTime - now) / 1000));
      const potentialPayout = trade.amount + (trade.amount * (payoutRate / 100));

      const lineTitle = `${trade.action} $${trade.amount} → Return $${potentialPayout.toFixed(2)} (${remainingSec}s)`;
      const lineColor = trade.action === 'CALL' ? '#10B981' : '#EF4444';
      const lineStyle = LineStyle.Dashed;

      if (!priceLinesRef.current.has(trade.id) && seriesRef.current) {
        const priceLine = seriesRef.current.createPriceLine({
          price: trade.entryPrice,
          color: lineColor,
          lineWidth: 2,
          lineStyle,
          axisLabelVisible: true,
          title: lineTitle,
        });
        priceLinesRef.current.set(trade.id, priceLine);
      } else {
        const existingLine = priceLinesRef.current.get(trade.id);
        if (existingLine) {
          existingLine.applyOptions({
            title: lineTitle,
            color: lineColor,
            lineStyle,
          });
        }
      }
    });

    // Render Candle Markers for Active & Completed (WIN/LOSS) Trades on the Chart
    if (seriesRef.current) {
      const markers: SeriesMarker<Time>[] = [];
      const assetTrades = trades.filter(t => t.asset === activeAsset);

      // Ensure candleTimesRef has data if available
      if (candleTimesRef.current.length === 0 && historyRef.current.length > 0) {
        const candles = buildCandlesFromPoints(historyRef.current, candleDurationMs);
        candleTimesRef.current = candles.map(c => Number(c.time));
      }

      const availableCandleTimes = candleTimesRef.current;

      assetTrades.forEach(trade => {
        const rawEntrySec = Math.floor(trade.createdAt / candleDurationMs) * (candleDurationMs / 1000);
        const rawExpirySec = Math.floor(trade.expiryTime / candleDurationMs) * (candleDurationMs / 1000);

        const entryTime = findNearestCandleTime(rawEntrySec, availableCandleTimes);
        const expiryTime = findNearestCandleTime(rawExpirySec, availableCandleTimes);

        if (trade.status === 'ACTIVE') {
          if (entryTime) {
            markers.push({
              time: entryTime,
              position: trade.action === 'CALL' ? 'belowBar' : 'aboveBar',
              color: trade.action === 'CALL' ? '#10B981' : '#EF4444',
              shape: trade.action === 'CALL' ? 'arrowUp' : 'arrowDown',
              text: `${trade.action} $${trade.amount}`,
            });
          }
        } else if (trade.status === 'WIN') {
          const profitAmount = trade.profit ?? (trade.amount * (payoutRate / 100));
          if (entryTime) {
            markers.push({
              time: entryTime,
              position: trade.action === 'CALL' ? 'belowBar' : 'aboveBar',
              color: '#10B981',
              shape: trade.action === 'CALL' ? 'arrowUp' : 'arrowDown',
              text: `$${trade.amount}`,
            });
          }
          if (expiryTime) {
            markers.push({
              time: expiryTime,
              position: 'aboveBar',
              color: '#10B981',
              shape: 'circle',
              text: `✓ WIN +$${profitAmount.toFixed(0)}`,
            });
          }
        } else if (trade.status === 'LOSS') {
          if (entryTime) {
            markers.push({
              time: entryTime,
              position: trade.action === 'CALL' ? 'belowBar' : 'aboveBar',
              color: '#EF4444',
              shape: trade.action === 'CALL' ? 'arrowUp' : 'arrowDown',
              text: `$${trade.amount}`,
            });
          }
          if (expiryTime) {
            markers.push({
              time: expiryTime,
              position: 'belowBar',
              color: '#EF4444',
              shape: 'circle',
              text: `✗ LOSS -$${trade.amount.toFixed(0)}`,
            });
          }
        }
      });

      // Deduplicate markers that might share the exact same time, position, and text
      const uniqueMarkers: SeriesMarker<Time>[] = [];
      const seen = new Set<string>();
      markers.forEach(m => {
        const key = `${m.time}_${m.position}_${m.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMarkers.push(m);
        }
      });

      // Sort markers strictly ascending by time (required by Lightweight Charts)
      uniqueMarkers.sort((a, b) => (a.time as number) - (b.time as number));

      try {
        if (markersPluginRef.current) {
          markersPluginRef.current.setMarkers(uniqueMarkers);
        }
      } catch (err) {
        console.warn("Error setting candle markers:", err);
      }
    }
  }, [trades, activeAsset, historyRef]);

  // Handle User Trader Drawn Lines (Resistance, Support, Levels)
  useEffect(() => {
    if (!seriesRef.current) return;

    const currentLineIds = new Set(userLines.map(l => l.id));

    // Remove deleted user lines
    for (const [id, priceLine] of userPriceLinesRef.current.entries()) {
      if (!currentLineIds.has(id)) {
        try {
          seriesRef.current.removePriceLine(priceLine);
        } catch (e) {
          // ignore
        }
        userPriceLinesRef.current.delete(id);
      }
    }

    // Format precision according to asset
    const isForex = activeAsset?.includes('/');
    const decimals = isForex ? 5 : 2;

    // Create or update user lines
    userLines.forEach(line => {
      const lineStyle = line.lineStyle === 'solid' ? LineStyle.Solid : LineStyle.Dashed;
      const title = `${line.label} (${line.price.toFixed(decimals)})`;

      if (!userPriceLinesRef.current.has(line.id)) {
        try {
          const priceLine = seriesRef.current.createPriceLine({
            price: line.price,
            color: line.color,
            lineWidth: 2,
            lineStyle,
            axisLabelVisible: true,
            title,
          });
          userPriceLinesRef.current.set(line.id, priceLine);
        } catch (err) {
          console.warn("Error creating user price line:", err);
        }
      } else {
        const existing = userPriceLinesRef.current.get(line.id);
        if (existing) {
          try {
            existing.applyOptions({
              price: line.price,
              color: line.color,
              lineStyle,
              title,
            });
          } catch (err) {
            console.warn("Error updating user price line:", err);
          }
        }
      }
    });
  }, [userLines, activeAsset]);

  // Keep line coordinates synchronized with chart scale & scroll
  useEffect(() => {
    let animId: number;

    const syncCoords = () => {
      if (seriesRef.current && userLines.length > 0 && !draggingRef.current) {
        setLineCoords(prev => {
          let changed = false;
          const next: Record<string, number | null> = {};

          for (const line of userLines) {
            const y = seriesRef.current?.priceToCoordinate(line.price) ?? null;
            next[line.id] = y;
            if (prev[line.id] !== y) {
              changed = true;
            }
          }

          if (!changed && Object.keys(prev).length === userLines.length) {
            return prev;
          }
          return next;
        });
      } else if (userLines.length === 0 && Object.keys(lineCoords).length > 0) {
        setLineCoords({});
      }
      animId = requestAnimationFrame(syncCoords);
    };

    animId = requestAnimationFrame(syncCoords);
    return () => cancelAnimationFrame(animId);
  }, [userLines, activeAsset]);

  // Dynamically update time zone formatting across chart axis & crosshair whenever timezone changes
  useEffect(() => {
    if (!chartRef.current) return;
    const resolvedZone = getResolvedTimeZone(effectiveTimeZone);
    activeZoneRef.current = resolvedZone;
    const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    try {
      chartRef.current.applyOptions({
        localization: {
          locale,
          timeFormatter: (time: Time | number) => {
            return formatCrosshairTime(time, resolvedZone, locale);
          },
        },
        timeScale: {
          tickMarkFormatter: (time: Time, tickMarkType: number, tickLocale: string) => {
            return formatTickMark(time, tickMarkType, tickLocale || locale, resolvedZone);
          },
        },
      });

      // Force timeScale to recalculate marks immediately with new timezone
      chartRef.current.timeScale().applyOptions({});
    } catch (err) {
      console.warn("Error updating chart timezone:", err);
    }
  }, [effectiveTimeZone]);

  // Pointer event handlers for click, hold, and drag directly on canvas
  const handlePointerDown = (lineId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
    draggingRef.current = {
      lineId,
      pointerId: e.pointerId,
      target,
    };
    setLocalDraggingId(lineId);
    onDraggingChange?.(lineId);
  };

  const handlePointerMove = (lineId: string, e: React.PointerEvent) => {
    if (draggingRef.current?.lineId !== lineId) return;
    if (!chartContainerRef.current || !seriesRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const clientY = e.clientY;
    const relativeY = Math.max(10, Math.min(rect.height - 10, clientY - rect.top));

    // Instantly update visual position
    setLineCoords(prev => ({
      ...prev,
      [lineId]: relativeY,
    }));

    const newPrice = seriesRef.current.coordinateToPrice(relativeY);
    if (newPrice !== null && !isNaN(newPrice)) {
      const isForex = activeAsset?.includes('/');
      const decimals = isForex ? 5 : 2;
      const roundedPrice = Number(newPrice.toFixed(decimals));

      // Update parent state -> updates all bound price input boxes in real-time
      onUpdateLinePrice?.(lineId, roundedPrice);

      // Instantly update Lightweight Charts price line
      const priceLine = userPriceLinesRef.current.get(lineId);
      if (priceLine) {
        const line = userLines.find(l => l.id === lineId);
        priceLine.applyOptions({
          price: roundedPrice,
          title: `${line?.label || 'Level'} (${roundedPrice.toFixed(decimals)})`,
        });
      }
    }
  };

  const handlePointerUp = (lineId: string, e: React.PointerEvent) => {
    if (draggingRef.current?.lineId === lineId) {
      try {
        draggingRef.current.target.releasePointerCapture(draggingRef.current.pointerId);
      } catch (err) {
        // ignore
      }
      draggingRef.current = null;
      setLocalDraggingId(null);
      onDraggingChange?.(null);
    }
  };

  const activeAssetTrades = activeAsset 
    ? trades.filter(t => t.asset === activeAsset && t.status === 'ACTIVE')
    : [];

  const currentPrice = historyRef.current.length > 0 
    ? historyRef.current[historyRef.current.length - 1].price 
    : 0;

  const isForex = activeAsset?.includes('/');
  const decimals = isForex ? 5 : 2;

  return (
    <div className="w-full h-full relative group overflow-hidden bg-[#0E1318]">
      <div 
        ref={chartContainerRef} 
        className="absolute inset-0 w-full h-full touch-none" 
      />

      {/* Interactive User Trader Support/Resistance Lines & Drag Handles */}
      {userLines.length > 0 && (
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {userLines.map(line => {
              const y = lineCoords[line.id];
              if (y === null || y === undefined) return null;
              const isDragging = (localDraggingId || activeDraggingId) === line.id;
              return (
                <g key={`svg-line-${line.id}`}>
                  {isDragging && (
                    <line
                      x1="0"
                      y1={y}
                      x2="100%"
                      y2={y}
                      stroke={line.color}
                      strokeWidth="6"
                      strokeOpacity="0.3"
                    />
                  )}
                  <line
                    x1="0"
                    y1={y}
                    x2="100%"
                    y2={y}
                    stroke={line.color}
                    strokeWidth={isDragging ? 2.5 : 1.5}
                    strokeDasharray={line.lineStyle === 'solid' ? 'none' : '6,4'}
                    strokeOpacity={isDragging ? 1 : 0.85}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Drag Hit-Areas & Handles */}
          {userLines.map(line => {
            const y = lineCoords[line.id];
            if (y === null || y === undefined) return null;
            const isDragging = (localDraggingId || activeDraggingId) === line.id;

            return (
              <React.Fragment key={`interactive-${line.id}`}>
                {/* Full-width drag strip so user can click anywhere on the line */}
                <div
                  style={{
                    top: `${y - 14}px`,
                    height: '28px',
                  }}
                  className="absolute left-0 right-16 cursor-ns-resize pointer-events-auto touch-none group select-none"
                  onPointerDown={(e) => handlePointerDown(line.id, e)}
                  onPointerMove={(e) => handlePointerMove(line.id, e)}
                  onPointerUp={(e) => handlePointerUp(line.id, e)}
                  onPointerCancel={(e) => handlePointerUp(line.id, e)}
                  title={`Drag ${line.label} up or down (${line.price.toFixed(decimals)})`}
                >
                  <div 
                    className={`w-full h-0.5 mt-[13px] transition-opacity duration-150 ${
                      isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                    }`}
                    style={{ backgroundColor: line.color, boxShadow: `0 0 10px ${line.color}` }}
                  />
                </div>

                {/* Draggable Handle Pill with Real-time Price Input Box */}
                <div
                  style={{
                    top: `${y}px`,
                    left: '16px',
                    transform: 'translateY(-50%)',
                    borderColor: isDragging ? '#60A5FA' : `${line.color}90`,
                  }}
                  className={`absolute pointer-events-auto cursor-ns-resize touch-none flex items-center space-x-1.5 px-2.5 py-1 rounded-full shadow-2xl backdrop-blur-md select-none transition-all duration-75 z-30 ${
                    isDragging 
                      ? 'bg-[#151D28] border-2 shadow-blue-500/40 ring-4 ring-blue-500/30 scale-105' 
                      : 'bg-[#0E1318]/95 border hover:border-white/80 hover:bg-[#161F2A] hover:scale-102'
                  }`}
                  onPointerDown={(e) => handlePointerDown(line.id, e)}
                  onPointerMove={(e) => handlePointerMove(line.id, e)}
                  onPointerUp={(e) => handlePointerUp(line.id, e)}
                  onPointerCancel={(e) => handlePointerUp(line.id, e)}
                >
                  <div className={`flex items-center ${isDragging ? 'text-blue-400' : 'text-gray-400'}`}>
                    <MoveVertical className="w-3.5 h-3.5" />
                  </div>

                  <span 
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: line.color }}
                  >
                    {line.label.split(' ')[0]}
                  </span>

                  {/* Real-time Dynamic Price Input Box */}
                  <div className="flex items-center space-x-1 bg-black/70 border border-gray-700/80 rounded px-1.5 py-0.5">
                    <input
                      type="number"
                      step="any"
                      value={line.price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) onUpdateLinePrice?.(line.id, val);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Click & drag handle, or type price directly"
                      className="w-20 bg-transparent text-white font-mono text-[11px] font-black text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  {onRemoveLine && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveLine(line.id);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Delete this line"
                      className="p-1 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Floating Active Trade HUD Overlay (Centered Horizontally at Top of Chart) */}
      {activeAssetTrades.length > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center space-y-2.5 max-w-[300px] sm:max-w-sm w-[calc(100%-2rem)] pointer-events-none">
          {activeAssetTrades.map(trade => (
            <ActiveTradeHUDItem key={trade.id} trade={trade} currentPrice={currentPrice} />
          ))}
        </div>
      )}

      {/* Floating Time Zone Control in Bottom Right Corner (TradingView Style) */}
      <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-3 z-30 pointer-events-auto">
        <TimeZoneSelector
          timeZoneMode={effectiveTimeZone}
          onSelectTimeZone={handleTimeZoneChange}
          variant="chart-overlay"
        />
      </div>
    </div>
  );
};

export const Chart = React.memo(ChartComponent, (prevProps, nextProps) => {
  return (
    prevProps.activeAsset === nextProps.activeAsset &&
    prevProps.timeZoneMode === nextProps.timeZoneMode &&
    prevProps.activeDraggingId === nextProps.activeDraggingId &&
    prevProps.trades.length === nextProps.trades.length &&
    prevProps.trades.every((t, i) => t.id === nextProps.trades[i]?.id && t.status === nextProps.trades[i]?.status) &&
    (prevProps.userLines?.length ?? 0) === (nextProps.userLines?.length ?? 0) &&
    (prevProps.userLines ?? []).every((l, i) => 
      l.id === nextProps.userLines?.[i]?.id && 
      l.price === nextProps.userLines?.[i]?.price &&
      l.color === nextProps.userLines?.[i]?.color &&
      l.label === nextProps.userLines?.[i]?.label
    )
  );
});
