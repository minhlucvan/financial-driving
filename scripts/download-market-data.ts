/**
 * Script to download real market data from Yahoo Finance
 * Run with: npx tsx scripts/download-market-data.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSETS_DIR = join(__dirname, '..', 'assets', 'market');
const SCENARIOS_DIR = join(ASSETS_DIR, 'scenarios');

interface YahooChartResult {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        regularMarketPrice: number;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: number[];
          high: number[];
          low: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketDataFile {
  symbol: string;
  name: string;
  description: string;
  difficulty: string;
  dataSource: string;
  fetchedAt: string;
  dateRange: { start: string; end: string };
  data: OHLCData[];
}

async function fetchYahooFinanceData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<OHLCData[]> {
  const period1 = Math.floor(startDate.getTime() / 1000);
  const period2 = Math.floor(endDate.getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

  console.log(`Fetching ${symbol} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol}: ${response.status} ${response.statusText}`);
  }

  const data: YahooChartResult = await response.json();

  if (data.chart.error) {
    throw new Error(`Yahoo API error: ${data.chart.error.description}`);
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];

  const ohlcData: OHLCData[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    // Skip if any value is null
    if (
      quote.open[i] == null ||
      quote.high[i] == null ||
      quote.low[i] == null ||
      quote.close[i] == null
    ) {
      continue;
    }

    const date = new Date(timestamps[i] * 1000);
    ohlcData.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(quote.open[i] * 100) / 100,
      high: Math.round(quote.high[i] * 100) / 100,
      low: Math.round(quote.low[i] * 100) / 100,
      close: Math.round(quote.close[i] * 100) / 100,
      volume: Math.round(quote.volume[i] || 0)
    });
  }

  console.log(`  Retrieved ${ohlcData.length} data points for ${symbol}`);
  return ohlcData;
}

function saveMarketData(filename: string, data: MarketDataFile): void {
  const filepath = join(ASSETS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  Saved to ${filepath}`);
}

function saveScenarioData(filename: string, data: MarketDataFile): void {
  const filepath = join(SCENARIOS_DIR, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  Saved to ${filepath}`);
}

async function downloadMainDatasets(): Promise<void> {
  console.log('\n=== Downloading Main Market Datasets ===\n');

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  // S&P 500 ETF (SPY) - Last year of data
  try {
    const spyData = await fetchYahooFinanceData('SPY', oneYearAgo, now);
    saveMarketData('sp500.json', {
      symbol: 'SPY',
      name: 'S&P 500 ETF',
      description: 'Real S&P 500 ETF historical data - represents broad US market performance',
      difficulty: 'easy',
      dataSource: 'Yahoo Finance',
      fetchedAt: now.toISOString(),
      dateRange: {
        start: spyData[0]?.date || '',
        end: spyData[spyData.length - 1]?.date || ''
      },
      data: spyData
    });
  } catch (error) {
    console.error('Failed to fetch SPY:', error);
  }

  // Bitcoin (BTC-USD)
  try {
    const btcData = await fetchYahooFinanceData('BTC-USD', oneYearAgo, now);
    saveMarketData('bitcoin.json', {
      symbol: 'BTC-USD',
      name: 'Bitcoin',
      description: 'Real Bitcoin price data - high volatility cryptocurrency',
      difficulty: 'hard',
      dataSource: 'Yahoo Finance',
      fetchedAt: now.toISOString(),
      dateRange: {
        start: btcData[0]?.date || '',
        end: btcData[btcData.length - 1]?.date || ''
      },
      data: btcData
    });
  } catch (error) {
    console.error('Failed to fetch BTC-USD:', error);
  }

  // GameStop (GME) as meme stock
  try {
    const gmeData = await fetchYahooFinanceData('GME', oneYearAgo, now);
    saveMarketData('meme_stock.json', {
      symbol: 'GME',
      name: 'GameStop (Meme Stock)',
      description: 'Real GameStop stock data - famous meme stock with extreme volatility',
      difficulty: 'extreme',
      dataSource: 'Yahoo Finance',
      fetchedAt: now.toISOString(),
      dateRange: {
        start: gmeData[0]?.date || '',
        end: gmeData[gmeData.length - 1]?.date || ''
      },
      data: gmeData
    });
  } catch (error) {
    console.error('Failed to fetch GME:', error);
  }

  // Steady Growth - Berkshire Hathaway B shares
  try {
    const brkData = await fetchYahooFinanceData('BRK-B', oneYearAgo, now);
    saveMarketData('steady_growth.json', {
      symbol: 'BRK-B',
      name: 'Berkshire Hathaway B',
      description: 'Real Berkshire Hathaway B shares - steady blue chip growth stock',
      difficulty: 'easy',
      dataSource: 'Yahoo Finance',
      fetchedAt: now.toISOString(),
      dateRange: {
        start: brkData[0]?.date || '',
        end: brkData[brkData.length - 1]?.date || ''
      },
      data: brkData
    });
  } catch (error) {
    console.error('Failed to fetch BRK-B:', error);
  }
}

async function downloadHistoricalScenarios(): Promise<void> {
  console.log('\n=== Downloading Historical Scenario Data ===\n');

  // 2008 Financial Crisis - Sept 2008 to March 2009
  try {
    const crash2008Data = await fetchYahooFinanceData(
      'SPY',
      new Date('2008-09-01'),
      new Date('2009-04-01')
    );
    saveScenarioData('crash_2008.json', {
      symbol: 'SPY',
      name: '2008 Financial Crisis',
      description: 'Real S&P 500 data during 2008 financial crisis - Lehman Brothers collapse',
      difficulty: 'extreme',
      dataSource: 'Yahoo Finance',
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: crash2008Data[0]?.date || '',
        end: crash2008Data[crash2008Data.length - 1]?.date || ''
      },
      data: crash2008Data
    });
  } catch (error) {
    console.error('Failed to fetch 2008 crash data:', error);
  }

  // COVID-19 Crash - Feb 2020 to June 2020
  try {
    const covid2020Data = await fetchYahooFinanceData(
      'SPY',
      new Date('2020-02-01'),
      new Date('2020-07-01')
    );
    saveScenarioData('covid_2020.json', {
      symbol: 'SPY',
      name: 'COVID-19 Crash & Recovery',
      description: 'Real S&P 500 data during COVID-19 pandemic crash and V-shaped recovery',
      difficulty: 'hard',
      dataSource: 'Yahoo Finance',
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: covid2020Data[0]?.date || '',
        end: covid2020Data[covid2020Data.length - 1]?.date || ''
      },
      data: covid2020Data
    });
  } catch (error) {
    console.error('Failed to fetch COVID-19 data:', error);
  }

  // Dotcom Bubble - March 2000 to Oct 2002
  try {
    const dotcom2000Data = await fetchYahooFinanceData(
      'QQQ',
      new Date('2000-03-01'),
      new Date('2002-10-31')
    );
    saveScenarioData('dotcom_2000.json', {
      symbol: 'QQQ',
      name: 'Dotcom Bubble Burst',
      description: 'Real Nasdaq 100 data during dotcom bubble collapse - multi-year decline',
      difficulty: 'extreme',
      dataSource: 'Yahoo Finance',
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: dotcom2000Data[0]?.date || '',
        end: dotcom2000Data[dotcom2000Data.length - 1]?.date || ''
      },
      data: dotcom2000Data
    });
  } catch (error) {
    console.error('Failed to fetch Dotcom data:', error);
  }

  // Crypto Winter 2022 - Nov 2021 to Dec 2022
  try {
    const cryptoWinter2022Data = await fetchYahooFinanceData(
      'BTC-USD',
      new Date('2021-11-01'),
      new Date('2022-12-31')
    );
    saveScenarioData('crypto_winter_2022.json', {
      symbol: 'BTC-USD',
      name: 'Crypto Winter 2022',
      description: 'Real Bitcoin data during 2022 crypto winter - Terra/Luna collapse, FTX bankruptcy',
      difficulty: 'extreme',
      dataSource: 'Yahoo Finance',
      fetchedAt: new Date().toISOString(),
      dateRange: {
        start: cryptoWinter2022Data[0]?.date || '',
        end: cryptoWinter2022Data[cryptoWinter2022Data.length - 1]?.date || ''
      },
      data: cryptoWinter2022Data
    });
  } catch (error) {
    console.error('Failed to fetch Crypto Winter data:', error);
  }
}

async function updateDatasetsJson(): Promise<void> {
  console.log('\n=== Updating datasets.json ===\n');

  const datasetsConfig = {
    version: '2.0.0',
    description: 'Real market datasets for Financial Drive - downloaded from Yahoo Finance',
    lastUpdated: new Date().toISOString(),
    datasets: [
      {
        key: 'sp500',
        path: './assets/market/sp500.json',
        name: 'S&P 500 ETF',
        symbol: 'SPY',
        difficulty: 'easy',
        category: 'index',
        description: 'Real S&P 500 ETF data - broad market exposure'
      },
      {
        key: 'steady_growth',
        path: './assets/market/steady_growth.json',
        name: 'Berkshire Hathaway B',
        symbol: 'BRK-B',
        difficulty: 'easy',
        category: 'stock',
        description: 'Real Berkshire Hathaway data - steady blue chip'
      },
      {
        key: 'bitcoin',
        path: './assets/market/bitcoin.json',
        name: 'Bitcoin',
        symbol: 'BTC-USD',
        difficulty: 'hard',
        category: 'crypto',
        description: 'Real Bitcoin price data - high volatility'
      },
      {
        key: 'meme_stock',
        path: './assets/market/meme_stock.json',
        name: 'GameStop',
        symbol: 'GME',
        difficulty: 'extreme',
        category: 'stock',
        description: 'Real GameStop data - famous meme stock'
      }
    ],
    scenarios: [
      {
        key: 'crash_2008',
        path: './assets/market/scenarios/crash_2008.json',
        name: '2008 Financial Crisis',
        symbol: 'SPY',
        difficulty: 'extreme',
        category: 'scenario',
        description: 'Real data from 2008 crash - Lehman Brothers collapse',
        historicalEvent: '2008 Financial Crisis',
        dateRange: '2008-09 to 2009-04'
      },
      {
        key: 'covid_2020',
        path: './assets/market/scenarios/covid_2020.json',
        name: 'COVID-19 Crash & Recovery',
        symbol: 'SPY',
        difficulty: 'hard',
        category: 'scenario',
        description: 'Real data from COVID crash - V-shaped recovery',
        historicalEvent: 'COVID-19 Pandemic',
        dateRange: '2020-02 to 2020-07'
      },
      {
        key: 'dotcom_2000',
        path: './assets/market/scenarios/dotcom_2000.json',
        name: 'Dotcom Bubble Burst',
        symbol: 'QQQ',
        difficulty: 'extreme',
        category: 'scenario',
        description: 'Real Nasdaq data from dotcom collapse',
        historicalEvent: 'Dotcom Bubble',
        dateRange: '2000-03 to 2002-10'
      },
      {
        key: 'crypto_winter_2022',
        path: './assets/market/scenarios/crypto_winter_2022.json',
        name: 'Crypto Winter 2022',
        symbol: 'BTC-USD',
        difficulty: 'extreme',
        category: 'scenario',
        description: 'Real Bitcoin data - Terra/Luna, FTX collapse',
        historicalEvent: '2022 Crypto Winter',
        dateRange: '2021-11 to 2022-12'
      }
    ]
  };

  const filepath = join(ASSETS_DIR, 'datasets.json');
  writeFileSync(filepath, JSON.stringify(datasetsConfig, null, 2));
  console.log(`Updated ${filepath}`);
}

async function main(): Promise<void> {
  console.log('========================================');
  console.log('  Financial Drive - Market Data Downloader');
  console.log('========================================');

  // Ensure directories exist
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }
  if (!existsSync(SCENARIOS_DIR)) {
    mkdirSync(SCENARIOS_DIR, { recursive: true });
  }

  try {
    await downloadMainDatasets();
    await downloadHistoricalScenarios();
    await updateDatasetsJson();

    console.log('\n========================================');
    console.log('  Download Complete!');
    console.log('========================================\n');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
