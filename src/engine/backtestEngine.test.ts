/**
 * Backtest Engine Tests
 *
 * Comprehensive tests for the backtesting engine core functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePositionId,
  updatePosition,
  updatePortfolio,
  openPosition,
  closePositionById,
  closeAllPositions,
  calculateTerrainState,
  calculateCarPhysics,
  detectCandlePattern,
  calculateRoadConditions,
  generateRoadSegment,
  createBacktestTick,
  calculateIndicators,
  returnToSlope,
} from './backtestEngine';
import type {
  PortfolioState,
  Position,
  ProcessedCandle,
  MarketIndicators,
} from '../types';
import type { CurrentMarketState } from '../types/state';
import { INITIAL_PORTFOLIO_STATE, INITIAL_MARKET_STATE, INITIAL_CAR_PHYSICS } from '../types/state';
import { INITIAL_SKILL_STATE } from '../skills/types';

// ============================================
// TEST FIXTURES
// ============================================

function createTestPortfolio(overrides: Partial<PortfolioState> = {}): PortfolioState {
  return {
    ...INITIAL_PORTFOLIO_STATE,
    ...overrides,
  };
}

function createTestPosition(overrides: Partial<Position> = {}): Position {
  // Default sizeInDollars based on size and a 10000 portfolio
  const size = overrides.size ?? 0.5;
  const sizeInDollars = overrides.sizeInDollars ?? size * 10000;

  return {
    id: 'test-pos-1',
    direction: 'long',
    entryPrice: 100,
    entryIndex: 0,
    entryTime: '2024-01-01',
    size,
    sizeInDollars,
    currentPrice: 100,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    leverage: 1,
    // New fields for hedge support
    instrument: 'asset',
    isHedge: false,
    ...overrides,
  };
}

function createTestMarket(overrides: Partial<CurrentMarketState> = {}): CurrentMarketState {
  return {
    ...INITIAL_MARKET_STATE,
    currentPrice: 100,
    ...overrides,
  };
}

function createTestCandle(overrides: Partial<ProcessedCandle> = {}): ProcessedCandle {
  return {
    date: '2024-01-01',
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000000,
    dailyReturn: 2,
    intradayVolatility: 1,
    trueRange: 10,
    rollingVolatility: 1.5,
    index: 0,
    ...overrides,
  };
}

// ============================================
// POSITION MANAGEMENT TESTS
// ============================================

describe('Position Management', () => {
  describe('generatePositionId', () => {
    it('should generate unique IDs', () => {
      const id1 = generatePositionId();
      const id2 = generatePositionId();
      expect(id1).not.toBe(id2);
    });

    it('should start with "pos_"', () => {
      const id = generatePositionId();
      expect(id).toMatch(/^pos_/);
    });
  });

  describe('updatePosition', () => {
    it('should calculate profit for long position when price goes up', () => {
      // Position with sizeInDollars = 5000 (50% of 10000 portfolio)
      const position = createTestPosition({ entryPrice: 100, size: 0.5, sizeInDollars: 5000 });
      const updated = updatePosition(position, 110);

      expect(updated.currentPrice).toBe(110);
      expect(updated.unrealizedPnLPercent).toBe(10); // 10% gain
      expect(updated.unrealizedPnL).toBe(500); // 5000 * 10% = 500
    });

    it('should calculate loss for long position when price goes down', () => {
      const position = createTestPosition({ entryPrice: 100, size: 0.5, sizeInDollars: 5000 });
      const updated = updatePosition(position, 90);

      expect(updated.currentPrice).toBe(90);
      expect(updated.unrealizedPnLPercent).toBe(-10); // 10% loss
      expect(updated.unrealizedPnL).toBe(-500); // 5000 * -10% = -500
    });

    it('should calculate profit for short position when price goes down', () => {
      const position = createTestPosition({
        direction: 'short',
        entryPrice: 100,
        size: 0.5,
        sizeInDollars: 5000,
      });
      const updated = updatePosition(position, 90);

      expect(updated.unrealizedPnLPercent).toBe(10); // Short profits from price drop
      expect(updated.unrealizedPnL).toBe(500); // 5000 * 10% = 500
    });

    it('should calculate loss for short position when price goes up', () => {
      const position = createTestPosition({
        direction: 'short',
        entryPrice: 100,
        size: 0.5,
        sizeInDollars: 5000,
      });
      const updated = updatePosition(position, 110);

      expect(updated.unrealizedPnLPercent).toBe(-10); // Short loses when price rises
      expect(updated.unrealizedPnL).toBe(-500); // 5000 * -10% = -500
    });

    it('should apply leverage multiplier', () => {
      const position = createTestPosition({
        entryPrice: 100,
        size: 0.5,
        sizeInDollars: 5000,
        leverage: 2,
      });
      const updated = updatePosition(position, 110);

      expect(updated.unrealizedPnLPercent).toBe(20); // 10% * 2x leverage = 20%
    });
  });
});

// ============================================
// PORTFOLIO TESTS
// ============================================

describe('Portfolio Management', () => {
  describe('openPosition', () => {
    it('should create a new long position', () => {
      const portfolio = createTestPortfolio({ cash: 10000 });
      const updated = openPosition(portfolio, 'long', 0.5, 100, 0, '2024-01-01');

      expect(updated.positions.length).toBe(1);
      expect(updated.positions[0].direction).toBe('long');
      expect(updated.positions[0].size).toBe(0.5);
      expect(updated.cash).toBe(5000); // 10000 - (10000 * 0.5)
      expect(updated.totalExposure).toBe(0.5);
    });

    it('should create a new short position', () => {
      const portfolio = createTestPortfolio({ cash: 10000 });
      const updated = openPosition(portfolio, 'short', 0.3, 100, 0, '2024-01-01');

      expect(updated.positions[0].direction).toBe('short');
      expect(updated.positions[0].size).toBe(0.3);
      expect(updated.cash).toBe(7000);
    });

    it('should apply leverage to position', () => {
      const portfolio = createTestPortfolio({ cash: 10000 });
      const updated = openPosition(portfolio, 'long', 0.5, 100, 0, '2024-01-01', 2);

      expect(updated.positions[0].leverage).toBe(2);
    });

    it('should not create position with zero size', () => {
      const portfolio = createTestPortfolio({ cash: 10000 });
      const updated = openPosition(portfolio, 'long', 0, 100, 0, '2024-01-01');

      expect(updated.positions.length).toBe(0);
      expect(updated.cash).toBe(10000);
    });
  });

  describe('closePositionById', () => {
    it('should close position and realize profit', () => {
      // Position with 5000 sizeInDollars (50% of 10000 portfolio)
      const position = createTestPosition({
        id: 'pos-1',
        entryPrice: 100,
        size: 0.5,
        sizeInDollars: 5000,
      });
      const portfolio = createTestPortfolio({
        positions: [position],
        cash: 5000, // Used 5000 to open position
        totalExposure: 0.5,
      });

      // Closing at 120 = 20% gain
      const updated = closePositionById(portfolio, 'pos-1', 120, 10);

      expect(updated.positions.length).toBe(0);
      expect(updated.closedPositions.length).toBe(1);
      expect(updated.closedPositions[0].realizedPnL).toBe(1000); // 20% of 5000
      expect(updated.cash).toBe(5000 + 5000 + 1000); // Original cash + position value + profit
      expect(updated.totalRealizedPnL).toBe(1000);
      expect(updated.totalExposure).toBe(0);
    });

    it('should close position and realize loss', () => {
      const position = createTestPosition({
        id: 'pos-1',
        entryPrice: 100,
        size: 0.5,
        sizeInDollars: 5000,
      });
      const portfolio = createTestPortfolio({
        positions: [position],
        cash: 5000,
        totalExposure: 0.5,
      });

      // Closing at 80 = 20% loss
      const updated = closePositionById(portfolio, 'pos-1', 80, 10);

      expect(updated.closedPositions[0].realizedPnL).toBe(-1000); // -20% of 5000
      expect(updated.totalRealizedPnL).toBe(-1000);
    });

    it('should track holding period', () => {
      const position = createTestPosition({
        id: 'pos-1',
        entryIndex: 5,
      });
      const portfolio = createTestPortfolio({ positions: [position] });

      const updated = closePositionById(portfolio, 'pos-1', 100, 15);

      expect(updated.closedPositions[0].holdingPeriod).toBe(10);
    });

    it('should return unchanged portfolio if position not found', () => {
      const portfolio = createTestPortfolio();
      const updated = closePositionById(portfolio, 'non-existent', 100, 0);

      expect(updated).toEqual(portfolio);
    });
  });

  describe('closeAllPositions', () => {
    it('should close all open positions', () => {
      const positions = [
        createTestPosition({ id: 'pos-1', size: 0.3 }),
        createTestPosition({ id: 'pos-2', size: 0.2 }),
      ];
      const portfolio = createTestPortfolio({
        positions,
        cash: 5000,
        totalExposure: 0.5,
      });

      const updated = closeAllPositions(portfolio, 110, 10);

      expect(updated.positions.length).toBe(0);
      expect(updated.closedPositions.length).toBe(2);
    });
  });

  describe('updatePortfolio', () => {
    it('should calculate equity correctly', () => {
      // Position with sizeInDollars = 5000
      const position = createTestPosition({ size: 0.5, entryPrice: 100, sizeInDollars: 5000 });
      const portfolio = createTestPortfolio({
        positions: [position],
        cash: 5000, // 5000 remains after opening 5000 position from 10000
        initialCapital: 10000,
      });

      const updated = updatePortfolio(portfolio, 110, 1, '2024-01-01');

      // Unrealized P&L: 5000 * 10% = 500
      // Equity = cash + position value + unrealized P&L = 5000 + 5000 + 500 = 10500
      expect(updated.equity).toBe(10500);
    });

    it('should calculate drawdown correctly', () => {
      const portfolio = createTestPortfolio({
        initialCapital: 10000,
        cash: 8000, // Lost 2000
        peakEquity: 12000, // Was at 12000 at peak
      });

      const updated = updatePortfolio(portfolio, 100, 1, '2024-01-01');

      // Equity is 8000, peak was 12000
      // Drawdown = (12000 - 8000) / 12000 = 33.33%
      expect(updated.drawdown).toBeCloseTo(0.333, 2);
    });

    it('should update peak equity when equity increases', () => {
      const portfolio = createTestPortfolio({
        cash: 15000,
        peakEquity: 10000,
      });

      const updated = updatePortfolio(portfolio, 100, 1, '2024-01-01');

      expect(updated.peakEquity).toBe(15000);
    });

    it('should calculate stress level with loss aversion', () => {
      // Use small exposure and small price drop so rawStress doesn't get capped at 1.0
      const position = createTestPosition({ size: 0.1, entryPrice: 100 });
      const portfolio = createTestPortfolio({
        positions: [position],
        cash: 9900, // Keep total close to initialCapital to avoid large drawdown
        initialCapital: 10000,
        peakEquity: 10000,
      });

      // Price drops - in loss
      const updatedLoss = updatePortfolio(portfolio, 98, 1, '2024-01-01');
      // rawStress should be low enough not to be capped at 1.0
      expect(updatedLoss.rawStress).toBeLessThan(1);
      // Loss aversion (2.25x) should amplify stress
      expect(updatedLoss.stressLevel).toBeGreaterThan(updatedLoss.rawStress);

      // Price rises - in profit
      const updatedProfit = updatePortfolio(portfolio, 102, 1, '2024-01-01');
      expect(updatedProfit.stressLevel).toBe(updatedProfit.rawStress);
    });

    it('should calculate accumulated return', () => {
      const portfolio = createTestPortfolio({
        initialCapital: 10000,
        cash: 11000, // 10% gain
      });

      const updated = updatePortfolio(portfolio, 100, 1, '2024-01-01');

      expect(updated.accumulatedReturn).toBe(10); // 10%
    });
  });
});

// ============================================
// TERRAIN & PHYSICS TESTS
// ============================================

describe('Terrain Calculations', () => {
  describe('calculateTerrainState', () => {
    it('should calculate road height from accumulated return', () => {
      const portfolio = createTestPortfolio({ accumulatedReturn: 5 }); // 5%
      const market = createTestMarket();

      const terrain = calculateTerrainState(portfolio, market, 0);

      expect(terrain.roadHeight).toBe(50); // 5% * 10 pixels per %
    });

    it('should calculate slope from height delta', () => {
      // Must have exposure > 0 for slope to not be zeroed out
      const portfolio = createTestPortfolio({ accumulatedReturn: 2, totalExposure: 1 });
      const market = createTestMarket();

      const terrain = calculateTerrainState(portfolio, market, 0);

      expect(terrain.roadHeightDelta).toBe(20); // From 0 to 20
      expect(terrain.currentSlope).toBeGreaterThan(0);
    });

    it('should have flat terrain with no exposure', () => {
      const portfolio = createTestPortfolio({
        accumulatedReturn: 10,
        totalExposure: 0,
      });
      const market = createTestMarket();

      const terrain = calculateTerrainState(portfolio, market, 0);

      expect(terrain.currentSlope).toBe(0);
      expect(terrain.exposureMultiplier).toBe(0);
    });

    it('should scale roughness by exposure', () => {
      const portfolio = createTestPortfolio({ totalExposure: 0.5 });
      const market = createTestMarket({ roadRoughness: 0.8 });

      const terrain = calculateTerrainState(portfolio, market, 0);

      expect(terrain.currentRoughness).toBe(0.4); // 0.8 * 0.5
    });
  });

  describe('calculateCarPhysics', () => {
    it('should calculate engine power from exposure and trend', () => {
      const portfolio = createTestPortfolio({ totalExposure: 1 });
      const market = createTestMarket({
        indicators: { ...INITIAL_MARKET_STATE.indicators, trend: 10 },
      });

      const physics = calculateCarPhysics(portfolio, market, 1);

      expect(physics.enginePower).toBeGreaterThan(1);
    });

    it('should calculate brake strength from cash ratio', () => {
      const portfolioLowCash = createTestPortfolio({
        cash: 2000,
        initialCapital: 10000,
      });
      const portfolioHighCash = createTestPortfolio({
        cash: 8000,
        initialCapital: 10000,
      });
      const market = createTestMarket();

      const physicsLow = calculateCarPhysics(portfolioLowCash, market, 1);
      const physicsHigh = calculateCarPhysics(portfolioHighCash, market, 1);

      expect(physicsHigh.brakeStrength).toBeGreaterThan(physicsLow.brakeStrength);
    });

    it('should set acceleration boost to leverage value', () => {
      const portfolio = createTestPortfolio();
      const market = createTestMarket();

      const physics = calculateCarPhysics(portfolio, market, 2);

      expect(physics.accelerationBoost).toBe(2);
    });

    it('should reduce traction with high volatility', () => {
      const portfolio = createTestPortfolio();
      const lowVolMarket = createTestMarket({
        indicators: { ...INITIAL_MARKET_STATE.indicators, volatility: 0.1 },
      });
      const highVolMarket = createTestMarket({
        indicators: { ...INITIAL_MARKET_STATE.indicators, volatility: 1.5 },
      });

      const physicsLow = calculateCarPhysics(portfolio, lowVolMarket, 1);
      const physicsHigh = calculateCarPhysics(portfolio, highVolMarket, 1);

      expect(physicsLow.traction).toBeGreaterThan(physicsHigh.traction);
    });

    it('should reduce durability with high drawdown', () => {
      const lowDrawdown = createTestPortfolio({ maxDrawdown: 0.05 });
      const highDrawdown = createTestPortfolio({ maxDrawdown: 0.40 });
      const market = createTestMarket();

      const physicsLow = calculateCarPhysics(lowDrawdown, market, 1);
      const physicsHigh = calculateCarPhysics(highDrawdown, market, 1);

      expect(physicsLow.durability).toBeGreaterThan(physicsHigh.durability);
    });

    it('should increase recovery drag when in drawdown', () => {
      const noDrawdown = createTestPortfolio({ drawdown: 0 });
      const inDrawdown = createTestPortfolio({ drawdown: 0.20 });
      const market = createTestMarket();

      const physicsNo = calculateCarPhysics(noDrawdown, market, 1);
      const physicsIn = calculateCarPhysics(inDrawdown, market, 1);

      expect(physicsNo.recoveryDrag).toBe(1);
      expect(physicsIn.recoveryDrag).toBeGreaterThan(1);
    });

    it('should adjust fuel level based on realized P&L', () => {
      const profit = createTestPortfolio({
        totalRealizedPnL: 2000,
        initialCapital: 10000,
      });
      const loss = createTestPortfolio({
        totalRealizedPnL: -2000,
        initialCapital: 10000,
      });
      const market = createTestMarket();

      const physicsProfit = calculateCarPhysics(profit, market, 1);
      const physicsLoss = calculateCarPhysics(loss, market, 1);

      expect(physicsProfit.fuelLevel).toBeGreaterThan(0.5);
      expect(physicsLoss.fuelLevel).toBeLessThan(0.5);
    });
  });
});

// ============================================
// CANDLE PATTERN DETECTION TESTS
// ============================================

describe('Candle Pattern Detection', () => {
  describe('detectCandlePattern', () => {
    it('should detect doji pattern', () => {
      const candle = createTestCandle({
        open: 100,
        high: 105,
        low: 95,
        close: 100.5, // Very small body
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('doji');
    });

    it('should detect bullish marubozu', () => {
      const candle = createTestCandle({
        open: 100,
        high: 110,
        low: 100,
        close: 110, // No wicks, bullish body
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('marubozu_bull');
    });

    it('should detect bearish marubozu', () => {
      const candle = createTestCandle({
        open: 110,
        high: 110,
        low: 100,
        close: 100, // No wicks, bearish body
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('marubozu_bear');
    });

    it('should detect hammer pattern', () => {
      // Hammer: small body at top, long lower wick, very small upper wick
      // Requirements: lowerWickRatio > 0.6, upperWickRatio < 0.1, bodyRatio >= 0.1 && < 0.3
      // (bodyRatio >= 0.1 to avoid doji detection first)
      const candle = createTestCandle({
        open: 97,
        high: 100, // No upper wick (0 units)
        low: 80, // Long lower wick (17 units)
        close: 100, // Body = 3 units, range = 20
        // bodyRatio = 3/20 = 0.15, lowerWickRatio = 17/20 = 0.85, upperWickRatio = 0/20 = 0
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('hammer');
    });

    it('should detect shooting star pattern', () => {
      // Shooting star: small body at bottom, long upper wick, very small lower wick
      // Requirements: upperWickRatio > 0.6, lowerWickRatio < 0.1, bodyRatio >= 0.1 && < 0.3
      // (bodyRatio >= 0.1 to avoid doji detection first)
      const candle = createTestCandle({
        open: 83,
        high: 100, // Long upper wick (17 units)
        low: 80, // No lower wick (0 units)
        close: 80, // Body = 3 units, range = 20
        // bodyRatio = 3/20 = 0.15, upperWickRatio = 17/20 = 0.85, lowerWickRatio = 0/20 = 0
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('shooting_star');
    });

    it('should detect bullish engulfing', () => {
      const prevCandle = createTestCandle({
        open: 105,
        close: 100, // Bearish
        high: 106,
        low: 99,
      });
      const candle = createTestCandle({
        open: 99,
        close: 106, // Bullish engulfing
        high: 107,
        low: 98,
      });

      const pattern = detectCandlePattern(candle, prevCandle);
      expect(pattern).toBe('bullish_engulfing');
    });

    it('should detect bearish engulfing', () => {
      const prevCandle = createTestCandle({
        open: 100,
        close: 105, // Bullish
        high: 106,
        low: 99,
      });
      const candle = createTestCandle({
        open: 106,
        close: 99, // Bearish engulfing
        high: 107,
        low: 98,
      });

      const pattern = detectCandlePattern(candle, prevCandle);
      expect(pattern).toBe('bearish_engulfing');
    });

    it('should return neutral for unclear patterns', () => {
      const candle = createTestCandle({
        open: 100,
        high: 103,
        low: 97,
        close: 101.5,
      });

      const pattern = detectCandlePattern(candle, null);
      expect(pattern).toBe('neutral');
    });
  });
});

// ============================================
// ROAD CONDITIONS TESTS
// ============================================

describe('Road Conditions', () => {
  describe('calculateRoadConditions', () => {
    it('should calculate roughness from ATR', () => {
      const lowAtr: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        atr: 1,
      };
      const highAtr: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        atr: 4,
      };

      const lowConditions = calculateRoadConditions(lowAtr, null, 'CHOP');
      const highConditions = calculateRoadConditions(highAtr, null, 'CHOP');

      expect(lowConditions.roughness).toBeLessThan(highConditions.roughness);
    });

    it('should reduce visibility with high volatility', () => {
      const lowVol: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        volatility: 0.2,
      };
      const highVol: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        volatility: 1.5,
      };

      const lowConditions = calculateRoadConditions(lowVol, null, 'CHOP');
      const highConditions = calculateRoadConditions(highVol, null, 'CHOP');

      expect(lowConditions.visibility).toBeGreaterThan(highConditions.visibility);
    });

    it('should reduce grip with extreme RSI', () => {
      const normalRsi: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        rsi: 50,
      };
      const extremeRsi: MarketIndicators = {
        ...INITIAL_MARKET_STATE.indicators,
        rsi: 80,
      };

      const normalConditions = calculateRoadConditions(normalRsi, null, 'CHOP');
      const extremeConditions = calculateRoadConditions(extremeRsi, null, 'CHOP');

      expect(normalConditions.grip).toBe(1);
      expect(extremeConditions.grip).toBeLessThan(1);
    });

    it('should set weather based on regime', () => {
      const indicators = INITIAL_MARKET_STATE.indicators;

      expect(calculateRoadConditions(indicators, null, 'BULL').weather).toBe('clear');
      expect(calculateRoadConditions(indicators, null, 'BEAR').weather).toBe('cloudy');
      expect(calculateRoadConditions(indicators, null, 'CRASH').weather).toBe('stormy');
      expect(calculateRoadConditions(indicators, null, 'CHOP').weather).toBe('foggy');
      expect(calculateRoadConditions(indicators, null, 'RECOVERY').weather).toBe('rainy');
    });
  });

  describe('generateRoadSegment', () => {
    it('should calculate slope from daily return', () => {
      const upCandle = createTestCandle({ dailyReturn: 3 });
      const downCandle = createTestCandle({ dailyReturn: -3 });
      const indicators = INITIAL_MARKET_STATE.indicators;

      const upSegment = generateRoadSegment(upCandle, null, indicators);
      const downSegment = generateRoadSegment(downCandle, null, indicators);

      expect(upSegment.slope).toBeGreaterThan(0);
      expect(downSegment.slope).toBeLessThan(0);
    });

    it('should detect obstacles from long wicks', () => {
      const longUpperWick = createTestCandle({
        open: 100,
        high: 120, // Long upper wick (50% of range)
        low: 95,
        close: 98,
      });
      const noWicks = createTestCandle({
        open: 100,
        high: 110,
        low: 100,
        close: 110,
      });

      const wickSegment = generateRoadSegment(longUpperWick, null, INITIAL_MARKET_STATE.indicators);
      const cleanSegment = generateRoadSegment(noWicks, null, INITIAL_MARKET_STATE.indicators);

      expect(wickSegment.hasObstacle).toBe(true);
      expect(wickSegment.hasBump).toBe(true);
      expect(cleanSegment.hasObstacle).toBe(false);
    });

    it('should detect potholes from long lower wicks', () => {
      const longLowerWick = createTestCandle({
        open: 100,
        high: 105,
        low: 80, // Long lower wick
        close: 102,
      });

      const segment = generateRoadSegment(longLowerWick, null, INITIAL_MARKET_STATE.indicators);

      expect(segment.hasPothole).toBe(true);
    });
  });
});

// ============================================
// MARKET INDICATORS TESTS
// ============================================

describe('Market Indicators', () => {
  describe('calculateIndicators', () => {
    it('should calculate RSI correctly', () => {
      const candles = Array.from({ length: 15 }, (_, i) =>
        createTestCandle({
          index: i,
          dailyReturn: i % 2 === 0 ? 1 : -0.5, // Alternating gains/losses
        })
      );

      const indicators = calculateIndicators(candles, 14);

      expect(indicators.rsi).toBeGreaterThan(50); // More gains than losses
    });

    it('should calculate ATR correctly', () => {
      const candles = Array.from({ length: 15 }, (_, i) =>
        createTestCandle({
          index: i,
          trueRange: 5,
        })
      );

      const indicators = calculateIndicators(candles, 14);

      expect(indicators.atr).toBeCloseTo(5, 1);
    });

    it('should detect BULL regime', () => {
      const candles = Array.from({ length: 21 }, (_, i) =>
        createTestCandle({
          index: i,
          close: 100 + i * 2, // Strong uptrend
          dailyReturn: 2,
        })
      );

      const indicators = calculateIndicators(candles, 20);

      expect(indicators.trend).toBeGreaterThan(5);
      expect(indicators.regime).toBe('BULL');
    });

    it('should detect BEAR regime', () => {
      const candles = Array.from({ length: 21 }, (_, i) =>
        createTestCandle({
          index: i,
          close: 200 - i * 3, // Strong downtrend
          dailyReturn: -3,
        })
      );

      const indicators = calculateIndicators(candles, 20);

      expect(indicators.trend).toBeLessThan(-5);
      expect(indicators.regime).toBe('BEAR');
    });

    it('should detect CRASH regime with high drawdown', () => {
      const candles = [
        ...Array.from({ length: 10 }, (_, i) =>
          createTestCandle({
            index: i,
            high: 200, // Peak
            close: 200,
          })
        ),
        ...Array.from({ length: 11 }, (_, i) =>
          createTestCandle({
            index: i + 10,
            high: 200 - i * 5,
            close: 150, // 25% below peak
          })
        ),
      ];

      const indicators = calculateIndicators(candles, 20);

      expect(indicators.drawdown).toBeGreaterThan(20);
      expect(indicators.regime).toBe('CRASH');
    });

    it('should return default indicators for empty data', () => {
      const indicators = calculateIndicators([], 0);

      expect(indicators.rsi).toBe(50);
      expect(indicators.regime).toBe('CHOP');
    });
  });

  describe('returnToSlope', () => {
    it('should map positive return to positive slope', () => {
      expect(returnToSlope(4)).toBe(32);
      expect(returnToSlope(2)).toBe(16);
    });

    it('should map negative return to negative slope', () => {
      expect(returnToSlope(-4)).toBe(-32);
      expect(returnToSlope(-2)).toBe(-16);
    });

    it('should map zero return to zero slope', () => {
      expect(returnToSlope(0)).toBe(0);
    });

    it('should clamp extreme values', () => {
      expect(returnToSlope(10)).toBe(32);
      expect(returnToSlope(-10)).toBe(-32);
    });

    it('should snap to valid slope values', () => {
      const validSlopes = [-32, -16, 0, 16, 32];
      expect(validSlopes).toContain(returnToSlope(1));
      expect(validSlopes).toContain(returnToSlope(3));
    });
  });
});

// ============================================
// BACKTEST TICK TESTS
// ============================================

describe('Backtest Tick', () => {
  describe('createBacktestTick', () => {
    it('should create tick with portfolio data', () => {
      const portfolio = createTestPortfolio({
        equity: 12000,
        accumulatedReturn: 20,
      });
      const candle = createTestCandle();

      const tick = createBacktestTick(
        10,
        '2024-01-15',
        105,
        portfolio,
        candle,
        null,
        INITIAL_MARKET_STATE.indicators,
        'BULL'
      );

      expect(tick.index).toBe(10);
      expect(tick.timestamp).toBe('2024-01-15');
      expect(tick.price).toBe(105);
      expect(tick.portfolioValue).toBe(12000);
      expect(tick.accumulatedReturn).toBe(20);
      expect(tick.roadHeight).toBe(200); // 20% * 10
    });

    it('should include road segment from candle', () => {
      const portfolio = createTestPortfolio();
      const candle = createTestCandle({ dailyReturn: 3 });

      const tick = createBacktestTick(
        0,
        '2024-01-01',
        100,
        portfolio,
        candle,
        null,
        INITIAL_MARKET_STATE.indicators,
        'BULL'
      );

      expect(tick.roadSegment).toBeDefined();
      expect(tick.roadSegment.slope).toBeGreaterThan(0);
    });

    it('should include road conditions', () => {
      const portfolio = createTestPortfolio();

      const tick = createBacktestTick(
        0,
        '2024-01-01',
        100,
        portfolio,
        null,
        null,
        INITIAL_MARKET_STATE.indicators,
        'BULL'
      );

      expect(tick.roadConditions).toBeDefined();
      expect(tick.roadConditions.weather).toBe('clear');
    });

    it('should use default road segment when no candle', () => {
      const portfolio = createTestPortfolio();

      const tick = createBacktestTick(
        0,
        '2024-01-01',
        100,
        portfolio,
        null,
        null,
        INITIAL_MARKET_STATE.indicators,
        'CHOP'
      );

      expect(tick.roadSegment.pattern).toBe('neutral');
      expect(tick.roadSegment.slope).toBe(0);
    });
  });
});
