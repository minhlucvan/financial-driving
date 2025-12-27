import React, { useMemo } from 'react';
import { timeFormat } from 'd3-time-format';
import { format as d3Format } from 'd3-format';
import { ChartCanvas, Chart } from '@react-financial-charts/core';
import { XAxis, YAxis } from '@react-financial-charts/axes';
import { CandlestickSeries, BarSeries, LineSeries } from '@react-financial-charts/series';
import { CrossHairCursor, MouseCoordinateX, MouseCoordinateY } from '@react-financial-charts/coordinates';
import { OHLCTooltip, MovingAverageTooltip } from '@react-financial-charts/tooltip';
import { discontinuousTimeScaleProvider } from '@react-financial-charts/scales';
import { ema, sma } from '@react-financial-charts/indicators';
import { useAppState } from '../context/AppStateProvider';
import type { ChartCandle } from '../types';

interface FinancialChartProps {
  width: number;
  height: number;
  showVolume?: boolean;
  showMA?: boolean;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  width,
  height,
  showVolume = true,
  showMA = true,
}) => {
  // Get state from unified provider - single source of truth
  const { market, timeline, playback } = useAppState();

  // Use visible candles from state (already computed up to current index)
  const data = market.visibleCandles;
  const activeIndex = timeline.currentIndex;

  // Calculate moving averages
  const ema12 = useMemo(
    () =>
      ema()
        .id(1)
        .options({ windowSize: 12 })
        .merge((d: any, c: any) => {
          d.ema12 = c;
        })
        .accessor((d: any) => d.ema12),
    []
  );

  const ema26 = useMemo(
    () =>
      ema()
        .id(2)
        .options({ windowSize: 26 })
        .merge((d: any, c: any) => {
          d.ema26 = c;
        })
        .accessor((d: any) => d.ema26),
    []
  );

  const sma20 = useMemo(
    () =>
      sma()
        .id(3)
        .options({ windowSize: 20 })
        .merge((d: any, c: any) => {
          d.sma20 = c;
        })
        .accessor((d: any) => d.sma20),
    []
  );

  // Process data with indicators
  const calculatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let processedData = [...data];
    if (showMA) {
      processedData = ema12(sma20(ema26(processedData)));
    }
    return processedData;
  }, [data, showMA, ema12, ema26, sma20]);

  // Create scale provider
  const xScaleProvider = useMemo(
    () => discontinuousTimeScaleProvider.inputDateAccessor((d: ChartCandle) => d.date),
    []
  );

  const { data: chartData, xScale, xAccessor, displayXAccessor } = useMemo(() => {
    if (calculatedData.length === 0) {
      return { data: [], xScale: undefined, xAccessor: undefined, displayXAccessor: undefined };
    }
    return xScaleProvider(calculatedData);
  }, [calculatedData, xScaleProvider]);

  // Calculate x extent to show recent data with some lookahead
  const xExtents = useMemo(() => {
    if (chartData.length === 0 || !xAccessor) return [0, 100];

    const visibleCount = Math.min(80, chartData.length);
    const endIdx = chartData.length - 1;
    const startIdx = Math.max(0, endIdx - visibleCount + 1);

    return [xAccessor(chartData[startIdx]), xAccessor(chartData[endIdx])];
  }, [chartData, xAccessor]);

  // Get regime color
  const regimeColor = useMemo(() => {
    switch (market.regime) {
      case 'BULL':
        return '#10b981';
      case 'BEAR':
        return '#ef4444';
      case 'CRASH':
        return '#dc2626';
      case 'RECOVERY':
        return '#06b6d4';
      default:
        return '#f59e0b';
    }
  }, [market.regime]);

  // Handle click on chart to navigate
  const handleChartClick = (e: React.MouseEvent) => {
    // Could implement click-to-navigate functionality here
  };

  if (!chartData || chartData.length === 0 || !xScale) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a2e',
          color: '#666',
        }}
      >
        Loading chart data...
      </div>
    );
  }

  const chartHeight = showVolume ? height * 0.7 : height - 50;
  const volumeHeight = showVolume ? height * 0.25 : 0;

  return (
    <div style={{ position: 'relative' }} onClick={handleChartClick}>
      {/* Top info bar */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Left: Current return */}
        <div
          style={{
            padding: '4px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <span style={{ color: '#888' }}>Return: </span>
          <span
            style={{
              color: market.currentReturn >= 0 ? '#10b981' : '#ef4444',
              fontWeight: 'bold',
            }}
          >
            {market.currentReturn >= 0 ? '+' : ''}
            {market.currentReturn.toFixed(2)}%
          </span>
        </div>

        {/* Right: Regime indicator */}
        <div
          style={{
            padding: '4px 12px',
            backgroundColor: regimeColor,
            color: '#fff',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {market.regime}
        </div>
      </div>

      <ChartCanvas
        height={height}
        width={width}
        ratio={window.devicePixelRatio || 1}
        margin={{ left: 50, right: 50, top: 40, bottom: 30 }}
        data={chartData}
        xScale={xScale}
        xAccessor={xAccessor}
        displayXAccessor={displayXAccessor}
        xExtents={xExtents}
        seriesName="Financial Drive"
      >
        {/* Main price chart */}
        <Chart id={1} yExtents={(d: any) => [d.high, d.low]} height={chartHeight}>
          <XAxis axisAt="bottom" orient="bottom" ticks={6} strokeStyle="#444" />
          <YAxis axisAt="right" orient="right" ticks={5} strokeStyle="#444" />

          <CandlestickSeries
            wickStroke={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
            fill={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
            stroke={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
          />

          {showMA && (
            <>
              <LineSeries yAccessor={sma20.accessor()} strokeStyle="#ff7f0e" strokeWidth={1} />
              <LineSeries yAccessor={ema12.accessor()} strokeStyle="#2196f3" strokeWidth={1} />
              <LineSeries yAccessor={ema26.accessor()} strokeStyle="#e91e63" strokeWidth={1} />
            </>
          )}

          <MouseCoordinateY at="right" orient="right" displayFormat={d3Format('.2f')} />

          <OHLCTooltip origin={[-40, 0]} />

          {showMA && (
            <MovingAverageTooltip
              origin={[-38, 15]}
              options={[
                { yAccessor: sma20.accessor(), type: 'SMA', stroke: '#ff7f0e', windowSize: 20 },
                { yAccessor: ema12.accessor(), type: 'EMA', stroke: '#2196f3', windowSize: 12 },
                { yAccessor: ema26.accessor(), type: 'EMA', stroke: '#e91e63', windowSize: 26 },
              ]}
            />
          )}
        </Chart>

        {/* Volume chart */}
        {showVolume && (
          <Chart
            id={2}
            yExtents={(d: any) => d.volume}
            height={volumeHeight}
            origin={(w: number, h: number) => [0, h - volumeHeight - 30]}
          >
            <YAxis
              axisAt="left"
              orient="left"
              ticks={3}
              tickFormat={d3Format('.2s')}
              strokeStyle="#444"
            />
            <BarSeries
              yAccessor={(d: any) => d.volume}
              fillStyle={(d: any) =>
                d.close > d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
              }
            />
          </Chart>
        )}

        <CrossHairCursor strokeStyle="#999" />
        <MouseCoordinateX at="bottom" orient="bottom" displayFormat={timeFormat('%Y-%m-%d')} />
      </ChartCanvas>

      {/* Bottom info bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Left: Bar info */}
        <div
          style={{
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          Bar {activeIndex + 1} / {timeline.totalBars}
          {market.currentCandle && ` | ${market.currentCandle.date}`}
        </div>

        {/* Right: Indicators */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 10,
          }}
        >
          <div
            style={{
              padding: '3px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 3,
              color: market.indicators.rsi > 70 ? '#ef4444' : market.indicators.rsi < 30 ? '#10b981' : '#888',
            }}
          >
            RSI: {market.indicators.rsi.toFixed(0)}
          </div>
          <div
            style={{
              padding: '3px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 3,
              color: '#888',
            }}
          >
            Vol: {market.indicators.volatility.toFixed(2)}%
          </div>
          <div
            style={{
              padding: '3px 6px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              borderRadius: 3,
              color: market.indicators.drawdown > 10 ? '#ef4444' : '#888',
            }}
          >
            DD: {market.indicators.drawdown.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialChart;
