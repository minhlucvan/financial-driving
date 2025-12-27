import React, { useMemo } from 'react';
import { format } from 'd3-time-format';
import { ChartCanvas, Chart } from '@react-financial-charts/core';
import { XAxis, YAxis } from '@react-financial-charts/axes';
import { CandlestickSeries, BarSeries, LineSeries } from '@react-financial-charts/series';
import { CrossHairCursor, MouseCoordinateX, MouseCoordinateY } from '@react-financial-charts/coordinates';
import { OHLCTooltip, MovingAverageTooltip } from '@react-financial-charts/tooltip';
import { discontinuousTimeScaleProvider } from '@react-financial-charts/scales';
import { ema, sma } from '@react-financial-charts/indicators';
import { useGameContext } from '../context/GameContext';
import { ChartCandle } from '../types';

interface FinancialChartProps {
  width: number;
  height: number;
  data?: ChartCandle[];
  showVolume?: boolean;
  showMA?: boolean;
  currentIndex?: number;
  onCandleHover?: (candle: ChartCandle | null) => void;
}

const FinancialChart: React.FC<FinancialChartProps> = ({
  width,
  height,
  data: propData,
  showVolume = true,
  showMA = true,
  currentIndex,
}) => {
  const { chartData: contextData, currentCandleIndex, indicators } = useGameContext();

  const data = propData || contextData;
  const activeIndex = currentIndex !== undefined ? currentIndex : currentCandleIndex;

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
  const xScaleProvider = useMemo(() => discontinuousTimeScaleProvider.inputDateAccessor((d: ChartCandle) => d.date), []);

  const { data: chartData, xScale, xAccessor, displayXAccessor } = useMemo(() => {
    if (calculatedData.length === 0) {
      return { data: [], xScale: undefined, xAccessor: undefined, displayXAccessor: undefined };
    }
    return xScaleProvider(calculatedData);
  }, [calculatedData, xScaleProvider]);

  // Get visible data range based on current index
  const visibleData = useMemo(() => {
    if (chartData.length === 0) return chartData;

    const visibleCount = Math.min(100, chartData.length);
    const endIndex = Math.min(activeIndex + 10, chartData.length);
    const startIndex = Math.max(0, endIndex - visibleCount);

    return chartData.slice(startIndex, endIndex);
  }, [chartData, activeIndex]);

  // Calculate x extent for visible data
  const xExtents = useMemo(() => {
    if (visibleData.length === 0 || !xAccessor) return [0, 100];
    return [xAccessor(visibleData[0]), xAccessor(visibleData[visibleData.length - 1])];
  }, [visibleData, xAccessor]);

  // Get regime color
  const regimeColor = useMemo(() => {
    switch (indicators.regime) {
      case 'BULL':
        return '#00ff00';
      case 'BEAR':
        return '#ff0000';
      case 'CRASH':
        return '#ff00ff';
      case 'RECOVERY':
        return '#00ffff';
      default:
        return '#ffff00';
    }
  }, [indicators.regime]);

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
    <div style={{ position: 'relative' }}>
      {/* Regime indicator */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 12px',
          backgroundColor: regimeColor,
          color: '#000',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 'bold',
          zIndex: 10,
        }}
      >
        {indicators.regime}
      </div>

      <ChartCanvas
        height={height}
        width={width}
        ratio={window.devicePixelRatio || 1}
        margin={{ left: 50, right: 50, top: 10, bottom: 30 }}
        data={chartData}
        xScale={xScale}
        xAccessor={xAccessor}
        displayXAccessor={displayXAccessor}
        xExtents={xExtents}
        seriesName="Financial Drive"
      >
        {/* Main price chart */}
        <Chart id={1} yExtents={(d: any) => [d.high, d.low]} height={chartHeight}>
          <XAxis
            axisAt="bottom"
            orient="bottom"
            ticks={6}
            tickStroke="#666"
            stroke="#444"
          />
          <YAxis
            axisAt="right"
            orient="right"
            ticks={5}
            tickStroke="#666"
            stroke="#444"
          />

          <CandlestickSeries
            wickStroke={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
            fill={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
            stroke={(d: any) => (d.close > d.open ? '#26a69a' : '#ef5350')}
          />

          {showMA && (
            <>
              <LineSeries yAccessor={sma20.accessor()} stroke="#ff7f0e" strokeWidth={1} />
              <LineSeries yAccessor={ema12.accessor()} stroke="#2196f3" strokeWidth={1} />
              <LineSeries yAccessor={ema26.accessor()} stroke="#e91e63" strokeWidth={1} />
            </>
          )}

          <MouseCoordinateY at="right" orient="right" displayFormat={format('.2f')} />

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
              tickFormat={format('.2s')}
              tickStroke="#666"
              stroke="#444"
            />
            <BarSeries
              yAccessor={(d: any) => d.volume}
              fill={(d: any) => (d.close > d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)')}
            />
          </Chart>
        )}

        <CrossHairCursor stroke="#999" />
        <MouseCoordinateX at="bottom" orient="bottom" displayFormat={format('%Y-%m-%d')} />
      </ChartCanvas>

      {/* Current position indicator */}
      {activeIndex > 0 && activeIndex < chartData.length && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '4px 8px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          Day {activeIndex + 1} of {chartData.length}
        </div>
      )}
    </div>
  );
};

export default FinancialChart;
