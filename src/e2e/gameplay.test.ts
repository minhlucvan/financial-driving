/**
 * End-to-End Gameplay Tests
 *
 * Tests the complete game flow from start through tick-by-tick progression.
 * Covers common scenarios like opening positions, take profit, stop loss, and hedging.
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
  createBacktestTick,
  calculateIndicators,
  type OpenPositionOptions,
} from '../engine/backtestEngine';
import {
  activateHedge,
  processHedges,
} from '../skills/HedgeSkill';
import type {
  PortfolioState,
  Position,
  ProcessedCandle,
  MarketIndicators,
} from '../types';
import type { CurrentMarketState } from '../types/state';
import {
  INITIAL_PORTFOLIO_STATE,
  INITIAL_MARKET_STATE,
} from '../types/state';

// ============================================
// TEST FIXTURES
// ============================================

/**
 * Generate realistic price data for testing
 */
function generatePriceData(options: {
  startPrice: number;
  numCandles: number;
  trend: 'up' | 'down' | 'flat' | 'volatile';
  volatility?: number;
}): ProcessedCandle[] {
  const { startPrice, numCandles, trend, volatility = 0.02 } = options;
  const candles: ProcessedCandle[] = [];

  let price = startPrice;
  let high = startPrice;

  for (let i = 0; i < numCandles; i++) {
    // Calculate daily return based on trend
    let baseReturn = 0;
    switch (trend) {
      case 'up': baseReturn = 0.01; break;
      case 'down': baseReturn = -0.01; break;
      case 'flat': baseReturn = 0; break;
      case 'volatile': baseReturn = (Math.random() - 0.5) * 0.04; break;
    }

    // Add some randomness
    const noise = (Math.random() - 0.5) * volatility;
    const dailyReturn = baseReturn + noise;

    const open = price;
    price = price * (1 + dailyReturn);
    const close = price;
    const candleHigh = Math.max(open, close) * (1 + Math.random() * volatility);
    const candleLow = Math.min(open, close) * (1 - Math.random() * volatility);

    high = Math.max(high, candleHigh);

    candles.push({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open,
      high: candleHigh,
      low: candleLow,
      close,
      volume: 1000000 + Math.random() * 500000,
      dailyReturn: dailyReturn * 100,
      intradayVolatility: ((candleHigh - candleLow) / open) * 100,
      trueRange: candleHigh - candleLow,
      rollingVolatility: volatility * 100,
      index: i,
    });
  }

  return candles;
}

/**
 * Create a market state from candle data at a specific index
 */
function createMarketFromCandle(
  candles: ProcessedCandle[],
  index: number
): CurrentMarketState {
  const candle = candles[index];
  const indicators = calculateIndicators(candles, index);

  return {
    ...INITIAL_MARKET_STATE,
    currentPrice: candle.close,
    currentCandle: candle,
    indicators,
    regime: indicators.regime,
    roadRoughness: indicators.atr / 5,
  };
}

/**
 * Create a fresh portfolio for testing
 */
function createTestPortfolio(initialCapital: number = 10000): PortfolioState {
  return {
    ...INITIAL_PORTFOLIO_STATE,
    initialCapital,
    cash: initialCapital,
    equity: initialCapital,
    peakEquity: initialCapital,
  };
}

// ============================================
// GAME ENGINE SIMULATOR
// ============================================

/**
 * Simulates the game engine for E2E testing
 */
class GameSimulator {
  portfolio: PortfolioState;
  candles: ProcessedCandle[];
  currentIndex: number;
  tickHistory: any[];

  constructor(candles: ProcessedCandle[], initialCapital: number = 10000) {
    this.portfolio = createTestPortfolio(initialCapital);
    this.candles = candles;
    this.currentIndex = 0;
    this.tickHistory = [];
  }

  get currentPrice(): number {
    return this.candles[this.currentIndex].close;
  }

  get currentCandle(): ProcessedCandle {
    return this.candles[this.currentIndex];
  }

  get market(): CurrentMarketState {
    return createMarketFromCandle(this.candles, this.currentIndex);
  }

  get currentDate(): string {
    return this.candles[this.currentIndex].date;
  }

  /**
   * Advance one tick and update portfolio
   */
  tick(): boolean {
    if (this.currentIndex >= this.candles.length - 1) {
      return false; // Can't advance further
    }

    this.currentIndex++;
    const market = this.market;
    const prevCandle = this.currentIndex > 0 ? this.candles[this.currentIndex - 1] : null;

    // Update portfolio with new prices
    this.portfolio = updatePortfolio(
      this.portfolio,
      this.currentPrice,
      this.currentIndex,
      this.currentDate,
      market,
      1 // Default leverage
    );

    // Create tick record
    const tick = createBacktestTick(
      this.currentIndex,
      this.currentDate,
      this.currentPrice,
      this.portfolio,
      this.currentCandle,
      prevCandle,
      market.indicators,
      market.regime
    );
    this.tickHistory.push(tick);

    return true;
  }

  /**
   * Advance multiple ticks
   */
  advanceTicks(count: number): number {
    let ticked = 0;
    for (let i = 0; i < count; i++) {
      if (this.tick()) {
        ticked++;
      } else {
        break;
      }
    }
    return ticked;
  }

  /**
   * Open a long position
   */
  openLong(size: number, leverage: number = 1): Position | null {
    const prevPortfolio = this.portfolio;
    this.portfolio = openPosition(
      this.portfolio,
      'long',
      size,
      this.currentPrice,
      this.currentIndex,
      this.currentDate,
      leverage
    );

    // Return the newly opened position
    const newPosition = this.portfolio.positions.find(
      p => !prevPortfolio.positions.some(prev => prev.id === p.id)
    );
    return newPosition || null;
  }

  /**
   * Open a short position
   */
  openShort(size: number, leverage: number = 1): Position | null {
    const prevPortfolio = this.portfolio;
    this.portfolio = openPosition(
      this.portfolio,
      'short',
      size,
      this.currentPrice,
      this.currentIndex,
      this.currentDate,
      leverage
    );

    const newPosition = this.portfolio.positions.find(
      p => !prevPortfolio.positions.some(prev => prev.id === p.id)
    );
    return newPosition || null;
  }

  /**
   * Close a specific position
   */
  closePosition(positionId: string): number {
    const position = this.portfolio.positions.find(p => p.id === positionId);
    if (!position) return 0;

    const unrealizedPnL = position.unrealizedPnL;
    this.portfolio = closePositionById(
      this.portfolio,
      positionId,
      this.currentPrice,
      this.currentIndex
    );

    return unrealizedPnL;
  }

  /**
   * Close all positions
   */
  closeAllPositions(): number {
    const totalUnrealized = this.portfolio.totalUnrealizedPnL;
    this.portfolio = closeAllPositions(
      this.portfolio,
      this.currentPrice,
      this.currentIndex
    );
    return totalUnrealized;
  }

  /**
   * Activate a hedge
   */
  activateHedge(hedgeType: 'basic' | 'tight' | 'tail' | 'dynamic' = 'basic') {
    // Use sizeInDollars for correct position value calculation
    const positionValue = this.portfolio.positions.reduce(
      (sum, p) => sum + p.sizeInDollars,
      0
    );

    const result = activateHedge({
      hedgeType,
      currentPrice: this.currentPrice,
      positionValue,
      portfolioValue: this.portfolio.equity,
      currentTick: this.currentIndex,
      skillState: this.portfolio.skillState,
    });

    if (result.success) {
      this.portfolio = {
        ...this.portfolio,
        skillState: {
          ...this.portfolio.skillState,
          ...result.newState,
        },
        cash: this.portfolio.cash - (result.event as any).costPaid,
      };
    }

    return result;
  }
}

// ============================================
// E2E TESTS
// ============================================

describe('E2E Gameplay', () => {
  describe('Scenario: No Position Opened', () => {
    it('should maintain initial capital when no trades are made', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
      });

      const game = new GameSimulator(candles, 10000);

      // Advance through all ticks without opening any positions
      game.advanceTicks(19);

      // Portfolio should remain at initial capital
      expect(game.portfolio.cash).toBe(10000);
      expect(game.portfolio.equity).toBe(10000);
      expect(game.portfolio.positions).toHaveLength(0);
      expect(game.portfolio.totalRealizedPnL).toBe(0);
      expect(game.portfolio.accumulatedReturn).toBe(0);
    });

    it('should track tick history even without positions', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'flat',
      });

      const game = new GameSimulator(candles);
      game.advanceTicks(9);

      expect(game.tickHistory).toHaveLength(9);
      expect(game.tickHistory[0].index).toBe(1);
      expect(game.tickHistory[8].index).toBe(9);
    });

    it('should have flat terrain when no exposure', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'up',
      });

      const game = new GameSimulator(candles);
      game.advanceTicks(5);

      const terrain = calculateTerrainState(game.portfolio, game.market, 0);

      // No exposure = flat terrain (slope multiplied by 0)
      expect(terrain.currentSlope).toBe(0);
      expect(terrain.exposureMultiplier).toBe(0);
    });
  });

  describe('Scenario: Open 1 Position and Hold', () => {
    it('should open a long position correctly', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'up',
      });

      const game = new GameSimulator(candles, 10000);

      // Open a 50% long position at the start
      const position = game.openLong(0.5);

      expect(position).not.toBeNull();
      expect(position!.direction).toBe('long');
      expect(position!.size).toBe(0.5);
      expect(position!.entryPrice).toBe(candles[0].close);
      expect(game.portfolio.cash).toBe(5000); // Half used for position
    });

    it('should track unrealized P&L as price moves up', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'up',
        volatility: 0.01, // Low volatility for predictable test
      });

      const game = new GameSimulator(candles, 10000);
      const position = game.openLong(0.5);
      const entryPrice = position!.entryPrice;

      // Advance a few ticks
      game.advanceTicks(5);

      const currentPosition = game.portfolio.positions[0];
      const priceDiff = game.currentPrice - entryPrice;

      // For a long position, profit when price goes up
      if (priceDiff > 0) {
        expect(currentPosition.unrealizedPnL).toBeGreaterThan(0);
      } else if (priceDiff < 0) {
        expect(currentPosition.unrealizedPnL).toBeLessThan(0);
      }
    });

    it('should track unrealized P&L as price moves down', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'down',
        volatility: 0.005,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);

      game.advanceTicks(5);

      const currentPosition = game.portfolio.positions[0];

      // Downtrend should cause losses for long
      expect(currentPosition.unrealizedPnL).toBeLessThan(0);
      expect(game.portfolio.totalUnrealizedPnL).toBeLessThan(0);
    });

    it('should update drawdown when in loss', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'down',
        volatility: 0.01,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);

      game.advanceTicks(5);

      // Portfolio should show drawdown
      expect(game.portfolio.drawdown).toBeGreaterThan(0);
      expect(game.portfolio.equity).toBeLessThan(game.portfolio.peakEquity);
    });

    it('should have non-zero terrain slope with exposure', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'up',
        volatility: 0.02,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);
      game.advanceTicks(5);

      const terrain = calculateTerrainState(game.portfolio, game.market, 0);

      // With exposure, terrain should have meaningful values
      expect(terrain.exposureMultiplier).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Take Profit (TP)', () => {
    it('should realize profit when closing a winning long position', () => {
      // Create strongly uptrending data
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
        volatility: 0.005, // Low volatility for consistent up
      });

      const game = new GameSimulator(candles, 10000);

      // Open long at start
      const position = game.openLong(0.5);
      const entryPrice = position!.entryPrice;

      // Advance until price is significantly higher
      game.advanceTicks(15);

      // Verify we're in profit
      const unrealizedBefore = game.portfolio.positions[0].unrealizedPnL;
      expect(unrealizedBefore).toBeGreaterThan(0);

      // Close position (take profit)
      const realizedPnL = game.closePosition(position!.id);

      // Verify profit was realized
      expect(game.portfolio.positions).toHaveLength(0);
      expect(game.portfolio.totalRealizedPnL).toBeGreaterThan(0);
      expect(game.portfolio.closedPositions).toHaveLength(1);
      expect(game.portfolio.closedPositions[0].realizedPnL).toBeGreaterThan(0);

      // Cash should be higher than initial (profit realized)
      expect(game.portfolio.cash).toBeGreaterThan(10000);
    });

    it('should track correct holding period', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
      });

      const game = new GameSimulator(candles, 10000);
      const position = game.openLong(0.5);
      const entryIndex = game.currentIndex;

      // Advance 10 ticks
      game.advanceTicks(10);

      game.closePosition(position!.id);

      const closedPosition = game.portfolio.closedPositions[0];
      expect(closedPosition.holdingPeriod).toBe(10);
    });
  });

  describe('Scenario: Stop Loss (SL)', () => {
    it('should realize loss when closing a losing long position', () => {
      // Create strongly downtrending data
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'down',
        volatility: 0.005,
      });

      const game = new GameSimulator(candles, 10000);

      // Open long at start (will lose in downtrend)
      const position = game.openLong(0.5);

      // Advance until significant loss
      game.advanceTicks(10);

      // Verify we're in loss
      const unrealizedBefore = game.portfolio.positions[0].unrealizedPnL;
      expect(unrealizedBefore).toBeLessThan(0);

      // Close position (stop loss)
      game.closePosition(position!.id);

      // Verify loss was realized
      expect(game.portfolio.positions).toHaveLength(0);
      expect(game.portfolio.totalRealizedPnL).toBeLessThan(0);
      expect(game.portfolio.closedPositions[0].realizedPnL).toBeLessThan(0);

      // Cash should be lower than initial
      expect(game.portfolio.cash).toBeLessThan(10000);
    });

    it('should track max drawdown correctly', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'down',
        volatility: 0.01,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);

      // Track max drawdown through ticks
      let maxDrawdownSeen = 0;
      for (let i = 0; i < 15; i++) {
        game.tick();
        maxDrawdownSeen = Math.max(maxDrawdownSeen, game.portfolio.drawdown);
      }

      // Max drawdown should be recorded
      expect(game.portfolio.maxDrawdown).toBeGreaterThanOrEqual(maxDrawdownSeen * 0.99); // Allow small rounding
    });

    it('should apply loss aversion to stress level', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'down',
        volatility: 0.01,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.3); // Smaller position so stress doesn't cap at 1

      game.advanceTicks(5);

      // When in loss, stress level should be amplified
      if (game.portfolio.totalUnrealizedPnL < 0) {
        // Loss aversion multiplier is 2.25x
        expect(game.portfolio.stressLevel).toBeGreaterThan(game.portfolio.rawStress);
      }
    });
  });

  describe('Scenario: Short Position', () => {
    it('should profit from a short position when price drops', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'down',
        volatility: 0.005,
      });

      const game = new GameSimulator(candles, 10000);

      // Open short at start
      const position = game.openShort(0.5);
      expect(position!.direction).toBe('short');

      // Advance while price drops
      game.advanceTicks(10);

      // Short should be profitable in downtrend
      const currentPosition = game.portfolio.positions[0];
      expect(currentPosition.unrealizedPnL).toBeGreaterThan(0);

      // Close position
      game.closePosition(position!.id);
      expect(game.portfolio.totalRealizedPnL).toBeGreaterThan(0);
    });

    it('should lose from a short position when price rises', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
        volatility: 0.005,
      });

      const game = new GameSimulator(candles, 10000);
      const position = game.openShort(0.5);

      game.advanceTicks(10);

      // Short should lose in uptrend
      const currentPosition = game.portfolio.positions[0];
      expect(currentPosition.unrealizedPnL).toBeLessThan(0);
    });
  });

  describe('Scenario: Multiple Positions', () => {
    it('should handle multiple positions simultaneously', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'flat',
        volatility: 0.02,
      });

      const game = new GameSimulator(candles, 10000);

      // Open first position
      const pos1 = game.openLong(0.3);
      game.advanceTicks(3);

      // Open second position at different price
      const pos2 = game.openLong(0.2);

      expect(game.portfolio.positions).toHaveLength(2);

      game.advanceTicks(5);

      // Close first position
      game.closePosition(pos1!.id);
      expect(game.portfolio.positions).toHaveLength(1);
      expect(game.portfolio.closedPositions).toHaveLength(1);

      // Second position should still be tracked
      expect(game.portfolio.positions[0].id).toBe(pos2!.id);
    });

    it('should close all positions at once', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
      });

      const game = new GameSimulator(candles, 10000);

      game.openLong(0.2);
      game.advanceTicks(2);
      game.openLong(0.2);
      game.advanceTicks(2);
      game.openShort(0.1);

      expect(game.portfolio.positions).toHaveLength(3);

      game.advanceTicks(5);
      game.closeAllPositions();

      expect(game.portfolio.positions).toHaveLength(0);
      expect(game.portfolio.closedPositions).toHaveLength(3);
    });
  });

  describe('Scenario: Hedge Activation', () => {
    it('should activate a basic hedge when holding a position', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'flat',
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);
      game.advanceTicks(2);

      const result = game.activateHedge('basic');

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('hedge_activated');
      expect(game.portfolio.skillState.activeHedges).toHaveLength(1);
      expect(game.portfolio.skillState.activeHedges[0].beta).toBe(0.7);
    });

    it('should fail to hedge when no position exists', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'flat',
      });

      const game = new GameSimulator(candles, 10000);
      // No position opened

      const result = game.activateHedge('basic');

      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('no_position');
    });

    it('should fail when on cooldown', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'flat',
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);

      // Activate first hedge
      game.activateHedge('basic');

      // Expire the hedge by processing
      for (let i = 0; i < 6; i++) {
        game.tick();
        const processResult = processHedges({
          currentPrice: game.currentPrice,
          currentTick: game.currentIndex,
          skillState: game.portfolio.skillState,
        });
        game.portfolio = {
          ...game.portfolio,
          skillState: {
            ...game.portfolio.skillState,
            ...processResult.newState,
          },
        };
      }

      // Should be on cooldown now
      expect(game.portfolio.skillState.hedgeCooldown).toBeGreaterThan(0);

      // Try to activate another hedge
      const result = game.activateHedge('basic');
      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('cooldown');
    });

    it('should calculate hedge size based on position value and beta', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 10,
        trend: 'flat',
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5); // 5000 position

      const result = game.activateHedge('basic');

      expect(result.success).toBe(true);
      const hedge = game.portfolio.skillState.activeHedges[0];
      // Hedge size = positionValue * beta = 5000 * 0.7 = 3500
      expect(hedge.hedgeSize).toBe(3500);
    });
  });

  describe('Scenario: Full Trading Session', () => {
    it('should handle a complete trading session with multiple trades', () => {
      // Create volatile market data
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 50,
        trend: 'volatile',
        volatility: 0.02,
      });

      const game = new GameSimulator(candles, 10000);

      // === Trade 1: Quick scalp ===
      game.advanceTicks(2);
      const trade1 = game.openLong(0.3);
      game.advanceTicks(3);
      game.closePosition(trade1!.id);

      // === Trade 2: Hold through volatility ===
      game.advanceTicks(5);
      const trade2 = game.openLong(0.4);
      game.advanceTicks(10);
      game.closePosition(trade2!.id);

      // === Trade 3: Short position ===
      game.advanceTicks(5);
      const trade3 = game.openShort(0.3);
      game.advanceTicks(5);
      game.closePosition(trade3!.id);

      // === Verify final state ===
      expect(game.portfolio.closedPositions).toHaveLength(3);
      expect(game.portfolio.positions).toHaveLength(0);

      // Should have some realized P&L (could be positive or negative)
      expect(game.portfolio.totalRealizedPnL).not.toBe(0);

      // Should have tick history
      expect(game.tickHistory.length).toBeGreaterThan(20);
    });

    it('should track accumulated return correctly over multiple trades', () => {
      // Use zero volatility for deterministic uptrend (1% per candle)
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 30,
        trend: 'up',
        volatility: 0, // No randomness for predictable results
      });

      const game = new GameSimulator(candles, 10000);

      // Make a few trades
      for (let i = 0; i < 3; i++) {
        const pos = game.openLong(0.3);
        game.advanceTicks(5);
        game.closePosition(pos!.id);
      }

      // With zero volatility in an uptrend, each 5-candle hold gains ~5%
      // Position size is 30%, so each trade should profit
      // After 3 trades, we should have positive returns
      expect(game.portfolio.totalRealizedPnL).toBeGreaterThan(0);
      expect(game.portfolio.equity).toBeGreaterThan(10000);
    });
  });

  describe('Scenario: Car Physics Integration', () => {
    it('should calculate car physics based on portfolio state', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'up',
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);
      game.advanceTicks(5);

      const physics = calculateCarPhysics(game.portfolio, game.market, 1);

      // Verify physics values are calculated
      expect(physics.enginePower).toBeGreaterThan(0);
      expect(physics.brakeStrength).toBeGreaterThan(0);
      expect(physics.traction).toBeGreaterThan(0);
      expect(physics.durability).toBeGreaterThan(0);
    });

    it('should reduce durability with drawdown', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'down',
        volatility: 0.02,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);
      game.advanceTicks(10);

      const physics = calculateCarPhysics(game.portfolio, game.market, 1);

      // With drawdown, durability should be reduced
      if (game.portfolio.maxDrawdown > 0) {
        expect(physics.durability).toBeLessThan(1);
      }
    });

    it('should increase recovery drag when in drawdown', () => {
      const candles = generatePriceData({
        startPrice: 100,
        numCandles: 20,
        trend: 'down',
        volatility: 0.02,
      });

      const game = new GameSimulator(candles, 10000);
      game.openLong(0.5);
      game.advanceTicks(10);

      const physics = calculateCarPhysics(game.portfolio, game.market, 1);

      // With drawdown, recovery drag should be > 1
      if (game.portfolio.drawdown > 0) {
        expect(physics.recoveryDrag).toBeGreaterThan(1);
      }
    });
  });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('E2E Edge Cases', () => {
  it('should handle position at max size', () => {
    const candles = generatePriceData({
      startPrice: 100,
      numCandles: 10,
      trend: 'flat',
    });

    const game = new GameSimulator(candles, 10000);
    const position = game.openLong(1.0); // 100% of portfolio

    expect(position).not.toBeNull();
    expect(game.portfolio.cash).toBe(0);
    expect(game.portfolio.totalExposure).toBe(1.0);
  });

  it('should handle zero-size position gracefully', () => {
    const candles = generatePriceData({
      startPrice: 100,
      numCandles: 10,
      trend: 'flat',
    });

    const game = new GameSimulator(candles, 10000);
    const position = game.openLong(0);

    // Position value <= 0 should not create a position
    expect(game.portfolio.positions).toHaveLength(0);
  });

  it('should not advance past end of data', () => {
    const candles = generatePriceData({
      startPrice: 100,
      numCandles: 5,
      trend: 'flat',
    });

    const game = new GameSimulator(candles, 10000);
    const ticked = game.advanceTicks(10); // Try to advance past end

    expect(ticked).toBe(4); // Only 4 ticks possible (5 candles, start at 0)
    expect(game.currentIndex).toBe(4);
  });

  it('should handle closing non-existent position', () => {
    const candles = generatePriceData({
      startPrice: 100,
      numCandles: 10,
      trend: 'flat',
    });

    const game = new GameSimulator(candles, 10000);
    game.openLong(0.5);

    // Try to close a position that doesn't exist
    const result = game.closePosition('non-existent-id');

    expect(result).toBe(0);
    expect(game.portfolio.positions).toHaveLength(1); // Original position still there
  });

  it('should handle rapid open/close cycles', () => {
    const candles = generatePriceData({
      startPrice: 100,
      numCandles: 30,
      trend: 'volatile',
    });

    const game = new GameSimulator(candles, 10000);

    // Rapid trading
    for (let i = 0; i < 10; i++) {
      const pos = game.openLong(0.2);
      game.tick();
      game.closePosition(pos!.id);
    }

    expect(game.portfolio.closedPositions).toHaveLength(10);
    expect(game.portfolio.positions).toHaveLength(0);
  });
});
