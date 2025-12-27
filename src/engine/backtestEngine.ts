/**
 * Backtest Engine - Core financial calculations
 *
 * This module contains pure functions for backtesting portfolio management.
 * All functions are deterministic and side-effect free for easy testing.
 */

import type {
  PortfolioState,
  Position,
  ClosedPosition,
  PositionDirection,
  CarPhysics,
  MarketIndicators,
  MarketRegime,
  RoadConditions,
  RoadSegment,
  CandlePattern,
  ProcessedCandle,
  BacktestTick,
} from '../types';
import type { CurrentMarketState, TerrainState } from '../types/state';
import {
  LOSS_AVERSION_MULTIPLIER,
  calculateRecoveryNeeded,
} from '../types/game';
import { INITIAL_CAR_PHYSICS, INITIAL_PORTFOLIO_STATE } from '../types/state';

// ============================================
// POSITION MANAGEMENT
// ============================================

/**
 * Generate unique ID for positions
 */
export function generatePositionId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Update a single position with current market price
 */
export function updatePosition(position: Position, currentPrice: number): Position {
  const priceDiff = currentPrice - position.entryPrice;
  const pnlMultiplier = position.direction === 'long' ? 1 : -1;
  const unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100 * pnlMultiplier * position.leverage;
  // Use sizeInDollars for actual position value
  const unrealizedPnL = position.sizeInDollars * (unrealizedPnLPercent / 100);

  return {
    ...position,
    currentPrice,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

/**
 * Update all positions and calculate portfolio metrics
 * Includes loss aversion (2.25x) for stress calculation per CONCEPTS.md
 */
export function updatePortfolio(
  portfolio: PortfolioState,
  currentPrice: number,
  currentIndex: number,
  currentDate: string,
  market?: CurrentMarketState,
  leverage: number = 1
): PortfolioState {
  // Update all positions
  const updatedPositions = portfolio.positions.map(pos => updatePosition(pos, currentPrice));

  // Calculate aggregate metrics
  const totalUnrealizedPnL = updatedPositions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalExposure = updatedPositions.reduce((sum, pos) => sum + pos.size, 0);
  const totalPositionValue = updatedPositions.reduce((sum, pos) => sum + pos.sizeInDollars, 0);

  // Calculate equity (cash + position value + unrealized P&L)
  // Note: cash was reduced by sizeInDollars when opening positions
  const equity = portfolio.cash + totalPositionValue + totalUnrealizedPnL;

  // Calculate accumulated return
  // Note: totalRealizedPnL is already reflected in cash (no need to add again)
  const accumulatedReturnDollar = equity - portfolio.initialCapital;
  const accumulatedReturn = (accumulatedReturnDollar / portfolio.initialCapital) * 100;

  // Update peak and drawdown
  const peakEquity = Math.max(portfolio.peakEquity, equity);
  const drawdown = peakEquity > 0 ? (peakEquity - equity) / peakEquity : 0;
  const maxDrawdown = Math.max(portfolio.maxDrawdown, drawdown);

  // Calculate recovery needed (Mathematical Law from CONCEPTS.md)
  // A loss of L% requires a gain of L/(1-L)% to recover
  const recoveryNeeded = drawdown > 0 ? calculateRecoveryNeeded(drawdown * 100) : 0;

  // Calculate stress with Loss Aversion (Psychological Law from CONCEPTS.md)
  // Losses are weighted ~2.25× stronger than gains in human utility
  const rawStress = Math.min(1, (totalExposure * 0.3) + (drawdown * 2));

  // Apply loss aversion: stress accumulates 2.25× faster on losses
  // If we're in a loss position, stress is amplified
  const isInLoss = totalUnrealizedPnL < 0;
  const stressLevel = isInLoss
    ? Math.min(1, rawStress * LOSS_AVERSION_MULTIPLIER)
    : rawStress;

  // Margin usage (simplified: exposure / max leverage)
  const marginUsage = totalExposure / 3; // Assuming max 3x leverage

  // Calculate car physics if market data available
  const carPhysics = market
    ? calculateCarPhysics({ ...portfolio, totalExposure, drawdown, maxDrawdown, marginUsage }, market, leverage)
    : portfolio.carPhysics;

  return {
    ...portfolio,
    positions: updatedPositions,
    equity,
    totalExposure,
    totalUnrealizedPnL,
    accumulatedReturn,
    accumulatedReturnDollar,
    peakEquity,
    drawdown,
    maxDrawdown,
    recoveryNeeded,
    marginUsage,
    rawStress,
    stressLevel,
    carPhysics,
  };
}

/**
 * Options for opening a position
 */
export interface OpenPositionOptions {
  isHedge?: boolean;
  instrument?: 'asset' | 'index';
  beta?: number;
  hedgesPositionId?: string;
}

/**
 * Open a new position
 */
export function openPosition(
  portfolio: PortfolioState,
  direction: PositionDirection,
  size: number,
  currentPrice: number,
  currentIndex: number,
  currentDate: string,
  leverage: number = 1,
  options: OpenPositionOptions = {}
): PortfolioState {
  // Calculate position size in dollars
  const availableCash = portfolio.cash;
  const positionValue = availableCash * size;

  if (positionValue <= 0) return portfolio;

  const newPosition: Position = {
    id: generatePositionId(),
    direction,
    entryPrice: currentPrice,
    entryIndex: currentIndex,
    entryTime: currentDate,
    size,
    sizeInDollars: positionValue,
    currentPrice,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    leverage,
    // New fields for hedge support
    instrument: options.instrument ?? 'asset',
    isHedge: options.isHedge ?? false,
    beta: options.beta,
    hedgesPositionId: options.hedgesPositionId,
  };

  // Reduce cash by position value (for margin)
  const newCash = availableCash - positionValue;

  return {
    ...portfolio,
    positions: [...portfolio.positions, newPosition],
    cash: newCash,
    totalExposure: portfolio.totalExposure + size,
  };
}

/**
 * Close a specific position
 */
export function closePositionById(
  portfolio: PortfolioState,
  positionId: string,
  currentPrice: number,
  currentIndex: number
): PortfolioState {
  const positionToClose = portfolio.positions.find(p => p.id === positionId);
  if (!positionToClose) return portfolio;

  // Calculate realized P&L
  const updatedPosition = updatePosition(positionToClose, currentPrice);
  const realizedPnL = updatedPosition.unrealizedPnL;

  // Create closed position record
  const closedPosition: ClosedPosition = {
    id: positionToClose.id,
    direction: positionToClose.direction,
    entryPrice: positionToClose.entryPrice,
    entryIndex: positionToClose.entryIndex,
    exitPrice: currentPrice,
    exitIndex: currentIndex,
    size: positionToClose.size,
    sizeInDollars: positionToClose.sizeInDollars,
    realizedPnL,
    realizedPnLPercent: updatedPosition.unrealizedPnLPercent,
    holdingPeriod: currentIndex - positionToClose.entryIndex,
    // Preserve hedge info
    instrument: positionToClose.instrument,
    isHedge: positionToClose.isHedge,
  };

  // Return cash (sizeInDollars) + P&L
  const returnedCash = positionToClose.sizeInDollars + realizedPnL;

  return {
    ...portfolio,
    positions: portfolio.positions.filter(p => p.id !== positionId),
    closedPositions: [...portfolio.closedPositions, closedPosition],
    cash: portfolio.cash + returnedCash,
    totalExposure: portfolio.totalExposure - positionToClose.size,
    totalRealizedPnL: portfolio.totalRealizedPnL + realizedPnL,
  };
}

/**
 * Close all positions
 */
export function closeAllPositions(
  portfolio: PortfolioState,
  currentPrice: number,
  currentIndex: number
): PortfolioState {
  let updatedPortfolio = { ...portfolio };

  for (const position of portfolio.positions) {
    updatedPortfolio = closePositionById(updatedPortfolio, position.id, currentPrice, currentIndex);
  }

  return updatedPortfolio;
}

// ============================================
// TERRAIN & PHYSICS CALCULATIONS
// ============================================

/**
 * Calculate terrain state from portfolio accumulated return
 */
export function calculateTerrainState(
  portfolio: PortfolioState,
  market: CurrentMarketState,
  prevRoadHeight: number = 0
): TerrainState {
  // Road height is based on portfolio's accumulated return
  // Scale: 1% return = 10 pixels of height
  const RETURN_TO_HEIGHT_SCALE = 10;
  const roadHeight = portfolio.accumulatedReturn * RETURN_TO_HEIGHT_SCALE;
  const roadHeightDelta = roadHeight - prevRoadHeight;

  // Convert height delta to slope (-32 to +32 range)
  // Larger delta = steeper slope
  const maxDelta = 5; // 5 pixels per tick max change
  const normalizedDelta = Math.max(-1, Math.min(1, roadHeightDelta / maxDelta));
  const currentSlope = Math.round(normalizedDelta * 32);

  // Roughness based on market volatility
  const currentRoughness = Math.min(1, market.roadRoughness);

  // Exposure multiplier - terrain is flat when no positions
  const exposureMultiplier = portfolio.totalExposure;

  // When no exposure, terrain is flat
  const effectiveSlope = currentSlope * Math.min(1, exposureMultiplier);

  return {
    roadHeight,
    roadHeightDelta,
    currentSlope: effectiveSlope,
    currentRoughness: currentRoughness * exposureMultiplier,
    leverageAmplification: exposureMultiplier,
    exposureMultiplier,
  };
}

/**
 * Calculate car physics from portfolio state
 * Based on Core Mental Model in CONCEPTS.md
 */
export function calculateCarPhysics(
  portfolio: PortfolioState,
  market: CurrentMarketState,
  leverage: number
): CarPhysics {
  // Engine Power = Asset Allocation × Market Trend
  // Position size multiplied by market momentum
  const marketMomentum = 1 + market.indicators.trend / 20; // Trend as multiplier
  const enginePower = Math.max(0.1, portfolio.totalExposure * marketMomentum);

  // Brake Strength = Cash %
  // More cash = better braking
  const cashRatio = portfolio.cash / portfolio.initialCapital;
  const brakeStrength = 0.5 + cashRatio * 1.5; // 0.5 to 2.0 range

  // Acceleration Boost = Debt Ratio (Leverage)
  // Higher leverage = more acceleration but more risk
  const accelerationBoost = leverage;

  // Traction = Based on volatility (lower = better)
  const volatilityPenalty = market.indicators.volatility * 0.3;
  const rsiPenalty = Math.abs(market.indicators.rsi - 50) > 20 ? 0.2 : 0;
  const traction = Math.max(0.3, 1 - volatilityPenalty - rsiPenalty);

  // Durability = Inverse of max drawdown experienced
  // More drawdown = less durability remaining
  const durability = Math.max(0.1, 1 - portfolio.maxDrawdown * 2);

  // Recovery Drag = Extra resistance when in drawdown
  // The deeper the hole, the harder to climb out
  // Uses the mathematical law: recovery of L% requires L/(1-L)% gain
  let recoveryDrag = 1;
  if (portfolio.drawdown > 0) {
    const recoveryNeeded = calculateRecoveryNeeded(portfolio.drawdown * 100);
    // Drag increases as recovery needed increases
    recoveryDrag = 1 + Math.min(2, recoveryNeeded / 100);
  }

  // Engine Temperature = Leverage stress
  // Over-leveraged = overheating
  const engineTemperature = Math.min(1, (leverage - 1) * 0.5 + portfolio.marginUsage);

  // Fuel Level = Realized P&L as ratio
  // Profits refill, losses drain
  const fuelLevel = Math.max(0, Math.min(1,
    0.5 + (portfolio.totalRealizedPnL / portfolio.initialCapital) * 2
  ));

  return {
    enginePower,
    brakeStrength,
    accelerationBoost,
    traction,
    durability,
    recoveryDrag,
    engineTemperature,
    fuelLevel,
  };
}

// ============================================
// ROAD SEGMENT GENERATION
// ============================================

/**
 * Detect candle pattern from a candle and previous candle
 */
export function detectCandlePattern(
  candle: ProcessedCandle,
  prevCandle: ProcessedCandle | null
): CandlePattern {
  const body = candle.close - candle.open;
  const bodySize = Math.abs(body);
  const range = candle.high - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  // Avoid division by zero
  if (range === 0) return 'neutral';

  const bodyRatio = bodySize / range;
  const upperWickRatio = upperWick / range;
  const lowerWickRatio = lowerWick / range;

  // Doji: very small body
  if (bodyRatio < 0.1) return 'doji';

  // Marubozu: no or very small wicks
  if (upperWickRatio < 0.05 && lowerWickRatio < 0.05) {
    return body > 0 ? 'marubozu_bull' : 'marubozu_bear';
  }

  // Hammer: small body at top, long lower wick
  if (lowerWickRatio > 0.6 && upperWickRatio < 0.1 && bodyRatio < 0.3) {
    return 'hammer';
  }

  // Shooting star: small body at bottom, long upper wick
  if (upperWickRatio > 0.6 && lowerWickRatio < 0.1 && bodyRatio < 0.3) {
    return 'shooting_star';
  }

  // Engulfing patterns require previous candle
  if (prevCandle) {
    const prevBody = prevCandle.close - prevCandle.open;
    // Bullish engulfing
    if (prevBody < 0 && body > 0 && candle.open < prevCandle.close && candle.close > prevCandle.open) {
      return 'bullish_engulfing';
    }
    // Bearish engulfing
    if (prevBody > 0 && body < 0 && candle.open > prevCandle.close && candle.close < prevCandle.open) {
      return 'bearish_engulfing';
    }
  }

  return 'neutral';
}

/**
 * Calculate road conditions from market indicators
 * Based on Market Physics in CONCEPTS.md
 */
export function calculateRoadConditions(
  indicators: MarketIndicators,
  candle: ProcessedCandle | null,
  regime: MarketRegime
): RoadConditions {
  // ATR → Road roughness (normalized 0-1)
  // Higher ATR = rougher road
  const atrNormalized = Math.min(1, indicators.atr / 5); // Assuming ATR of 5 is very rough
  const roughness = atrNormalized;

  // Volatility → Visibility (inverted)
  // Higher volatility = less visibility (more fog)
  const visibility = Math.max(0.2, 1 - indicators.volatility * 0.5);

  // Trend → Slope
  const slope = indicators.trend;

  // RSI → Grip level
  // Extreme RSI (< 30 or > 70) = slippery edges
  const rsiDeviation = Math.abs(indicators.rsi - 50);
  const grip = rsiDeviation > 20 ? 1 - (rsiDeviation - 20) / 30 : 1;

  // Volume → Road width (would need volume data)
  const width = candle ? Math.min(2, Math.max(0.5, candle.volume / 1000000)) : 1;

  // Weather from regime
  let weather: RoadConditions['weather'] = 'clear';
  switch (regime) {
    case 'BULL': weather = 'clear'; break;
    case 'BEAR': weather = 'cloudy'; break;
    case 'CRASH': weather = 'stormy'; break;
    case 'CHOP': weather = 'foggy'; break;
    case 'RECOVERY': weather = 'rainy'; break;
  }

  return { roughness, visibility, slope, grip, width, weather };
}

/**
 * Generate a road segment from a candle
 */
export function generateRoadSegment(
  candle: ProcessedCandle,
  prevCandle: ProcessedCandle | null,
  indicators: MarketIndicators
): RoadSegment {
  const pattern = detectCandlePattern(candle, prevCandle);

  // Slope from daily return (-32 to +32)
  const maxReturn = 4;
  const normalized = Math.max(-1, Math.min(1, candle.dailyReturn / maxReturn));
  const slope = Math.round(normalized * 32);

  // Roughness from intraday volatility
  const roughness = Math.min(1, candle.intradayVolatility / 5);

  // Width from volume (normalized)
  const width = Math.min(2, Math.max(0.5, candle.volume / 1000000));

  // Wick analysis for obstacles
  const range = candle.high - candle.low;
  const upperWick = candle.high - Math.max(candle.open, candle.close);
  const lowerWick = Math.min(candle.open, candle.close) - candle.low;

  // Long wicks create obstacles
  const hasObstacle = range > 0 && (upperWick / range > 0.4 || lowerWick / range > 0.4);
  const hasBump = range > 0 && upperWick / range > 0.4; // Upper wick = bump then drop
  const hasPothole = range > 0 && lowerWick / range > 0.4; // Lower wick = dip then recovery

  return { pattern, slope, roughness, width, hasObstacle, hasBump, hasPothole };
}

/**
 * Create a backtest tick record with road segment and conditions
 */
export function createBacktestTick(
  index: number,
  timestamp: string,
  price: number,
  portfolio: PortfolioState,
  candle: ProcessedCandle | null,
  prevCandle: ProcessedCandle | null,
  indicators: MarketIndicators,
  regime: MarketRegime
): BacktestTick {
  // Road height based on accumulated return (1% = 10 pixels)
  const RETURN_TO_HEIGHT_SCALE = 10;

  // Generate road segment from candle
  const roadSegment: RoadSegment = candle
    ? generateRoadSegment(candle, prevCandle, indicators)
    : { pattern: 'neutral', slope: 0, roughness: 0, width: 1, hasObstacle: false, hasBump: false, hasPothole: false };

  // Calculate road conditions from indicators
  const roadConditions = calculateRoadConditions(indicators, candle, regime);

  return {
    index,
    timestamp,
    price,
    portfolioValue: portfolio.equity,
    accumulatedReturn: portfolio.accumulatedReturn,
    roadHeight: portfolio.accumulatedReturn * RETURN_TO_HEIGHT_SCALE,
    roadSegment,
    roadConditions,
  };
}

// ============================================
// MARKET INDICATORS
// ============================================

/**
 * Calculate market indicators from candle data
 */
export function calculateIndicators(
  data: ProcessedCandle[],
  currentIndex: number
): MarketIndicators {
  if (currentIndex < 0 || currentIndex >= data.length) {
    return {
      rsi: 50,
      atr: 0,
      volatility: 0,
      trend: 0,
      drawdown: 0,
      regime: 'CHOP',
    };
  }

  const candle = data[currentIndex];
  const lookback = Math.min(14, currentIndex + 1);
  const recentCandles = data.slice(Math.max(0, currentIndex - lookback + 1), currentIndex + 1);

  // Calculate RSI (simplified)
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recentCandles.length; i++) {
    const change = recentCandles[i].dailyReturn;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // ATR
  const atr =
    recentCandles.reduce((sum, c) => sum + c.trueRange, 0) / recentCandles.length;

  // Volatility
  const volatility = candle.rollingVolatility;

  // Trend (simple: positive if price above 20-day MA)
  const maLookback = Math.min(20, currentIndex + 1);
  const maCandles = data.slice(Math.max(0, currentIndex - maLookback + 1), currentIndex + 1);
  const ma = maCandles.reduce((sum, c) => sum + c.close, 0) / maCandles.length;
  const trend = ((candle.close - ma) / ma) * 100;

  // Drawdown
  const maxPrice = Math.max(...data.slice(0, currentIndex + 1).map((c) => c.high));
  const drawdown = ((maxPrice - candle.close) / maxPrice) * 100;

  // Regime detection
  let regime: MarketRegime = 'CHOP';
  if (trend > 5 && rsi > 50) regime = 'BULL';
  else if (trend < -5 && rsi < 50) regime = 'BEAR';
  else if (drawdown > 20) regime = 'CRASH';
  else if (trend > 0 && drawdown > 10) regime = 'RECOVERY';

  return { rsi, atr, volatility, trend, drawdown, regime };
}

/**
 * Convert daily return to terrain slope
 */
export function returnToSlope(dailyReturn: number): number {
  const maxReturn = 4;
  const normalized = Math.max(-1, Math.min(1, dailyReturn / maxReturn));
  const slope = Math.round(normalized * 32);
  const validSlopes = [-32, -16, 0, 16, 32];
  let closest = validSlopes[0];
  for (const s of validSlopes) {
    if (Math.abs(slope - s) < Math.abs(slope - closest)) {
      closest = s;
    }
  }
  return closest;
}
