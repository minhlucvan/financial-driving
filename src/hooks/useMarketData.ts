import { useState, useEffect, useCallback } from 'react';
import { ChartCandle, RawMarketData, MarketDataset, ProcessedCandle } from '../types';

const MARKET_DATASETS = ['sp500', 'bitcoin', 'meme_stock', 'steady_growth', 'crash_2008', 'covid_2020'];

export function useMarketData(initialDataset: string = 'sp500') {
  const [currentDataset, setCurrentDataset] = useState(initialDataset);
  const [chartData, setChartData] = useState<ChartCandle[]>([]);
  const [rawData, setRawData] = useState<MarketDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Process raw market data
  const processData = useCallback((raw: RawMarketData): MarketDataset => {
    const data = raw.data;
    const processed: ProcessedCandle[] = [];

    for (let i = 0; i < data.length; i++) {
      const candle = data[i];
      const prevClose = i > 0 ? data[i - 1].close : candle.open;

      const dailyReturn = ((candle.close - prevClose) / prevClose) * 100;
      const intradayVolatility = ((candle.high - candle.low) / candle.open) * 100;
      const trueRange = Math.max(
        candle.high - candle.low,
        i > 0 ? Math.abs(candle.high - prevClose) : 0,
        i > 0 ? Math.abs(candle.low - prevClose) : 0
      );

      processed.push({
        ...candle,
        dailyReturn,
        intradayVolatility,
        trueRange,
        rollingVolatility: intradayVolatility,
        index: i,
      });
    }

    // Calculate rolling volatility
    const windowSize = 20;
    for (let i = windowSize - 1; i < processed.length; i++) {
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) {
        sum += Math.pow(processed[j].dailyReturn, 2);
      }
      processed[i].rollingVolatility = Math.sqrt(sum / windowSize);
    }

    // Calculate stats
    const returns = processed.map((d) => d.dailyReturn);
    const volatilities = processed.map((d) => d.intradayVolatility);
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const stdDev = (arr: number[]) => {
      const mean = avg(arr);
      return Math.sqrt(avg(arr.map((v) => Math.pow(v - mean, 2))));
    };

    return {
      symbol: raw.symbol,
      name: raw.name,
      description: raw.description,
      startDate: data[0]?.date,
      endDate: data[data.length - 1]?.date,
      totalDays: data.length,
      data: processed,
      stats: {
        avgReturn: avg(returns),
        maxReturn: Math.max(...returns),
        minReturn: Math.min(...returns),
        stdReturn: stdDev(returns),
        avgVolatility: avg(volatilities),
        maxVolatility: Math.max(...volatilities),
        totalReturn: data.length > 0 ? ((data[data.length - 1].close - data[0].open) / data[0].open) * 100 : 0,
      },
    };
  }, []);

  // Convert to chart format
  const toChartFormat = useCallback((data: ProcessedCandle[]): ChartCandle[] => {
    return data.map((candle) => ({
      date: new Date(candle.date),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
  }, []);

  // Load dataset
  const loadDataset = useCallback(
    async (key: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const path = key.includes('crash') || key.includes('covid') ? `/market/scenarios/${key}.json` : `/market/${key}.json`;

        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load dataset: ${key}`);
        }

        const raw: RawMarketData = await response.json();
        const processed = processData(raw);
        setRawData(processed);
        setChartData(toChartFormat(processed.data));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load market data');
        console.error('Error loading market data:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [processData, toChartFormat]
  );

  // Load initial dataset
  useEffect(() => {
    loadDataset(currentDataset);
  }, [currentDataset, loadDataset]);

  // Cycle to next dataset
  const cycleDataset = useCallback(() => {
    const currentIdx = MARKET_DATASETS.indexOf(currentDataset);
    const nextIdx = (currentIdx + 1) % MARKET_DATASETS.length;
    setCurrentDataset(MARKET_DATASETS[nextIdx]);
    return MARKET_DATASETS[nextIdx];
  }, [currentDataset]);

  return {
    currentDataset,
    setCurrentDataset,
    chartData,
    rawData,
    isLoading,
    error,
    cycleDataset,
    availableDatasets: MARKET_DATASETS,
  };
}

export default useMarketData;
