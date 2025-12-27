import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  UnifiedAppState,
  CurrentMarketState,
  TerrainState,
  PhysicsModifiers,
  TimelineState,
  PlaybackMode,
  ProcessedCandle,
  ChartCandle,
  MarketRegime,
  WealthState,
  VehicleState,
  PositionState,
  ViewMode,
  GameState,
  MarketIndicators,
  PortfolioState,
  Position,
  ClosedPosition,
  PositionDirection,
  BacktestTick,
  BacktestEngineState,
  CarPhysics,
  RoadConditions,
  RoadSegment,
  CandlePattern,
} from '../types';
import {
  LOSS_AVERSION_MULTIPLIER,
  calculateRecoveryNeeded,
} from '../types/game';
import { activateHedge, processHedges, HEDGE_CONFIGS } from '../skills';
import {
  INITIAL_APP_STATE,
  INITIAL_TIMELINE_STATE,
  INITIAL_MARKET_STATE,
  INITIAL_TERRAIN_STATE,
  INITIAL_PHYSICS_MODIFIERS,
  INITIAL_WEALTH_STATE,
  INITIAL_VEHICLE_STATE,
  INITIAL_POSITION_STATE,
  INITIAL_PORTFOLIO_STATE,
  INITIAL_BACKTEST_STATE,
  INITIAL_CAR_PHYSICS,
  INITIAL_ROAD_CONDITIONS,
} from '../types/state';
import type { PlaybackControls } from '../types/timeline';

// ============================================
// ACTION TYPES
// ============================================

type AppAction =
  // Data loading
  | { type: 'LOAD_DATASET_START'; payload: { key: string } }
  | { type: 'LOAD_DATASET_SUCCESS'; payload: { key: string; name: string; data: ProcessedCandle[] } }
  | { type: 'LOAD_DATASET_ERROR'; payload: { error: string } }
  // Timeline control
  | { type: 'SET_TIMELINE_INDEX'; payload: number }
  | { type: 'SET_PLAYBACK_MODE'; payload: PlaybackMode }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'TICK'; payload: { deltaTime: number } }
  // Backtest engine actions
  | { type: 'BACKTEST_TICK' }  // Advance one tick
  | { type: 'OPEN_LONG'; payload: { size: number; leverage?: number } }
  | { type: 'OPEN_SHORT'; payload: { size: number; leverage?: number } }
  | { type: 'CLOSE_POSITION_BY_ID'; payload: { positionId: string } }
  | { type: 'CLOSE_ALL_POSITIONS' }
  // Wealth updates
  | { type: 'UPDATE_WEALTH'; payload: Partial<WealthState> }
  | { type: 'SET_LEVERAGE'; payload: number }
  | { type: 'SET_CASH_BUFFER'; payload: number }
  // Vehicle updates (from game)
  | { type: 'UPDATE_VEHICLE'; payload: Partial<VehicleState> }
  // Position updates (legacy single position)
  | { type: 'UPDATE_POSITION'; payload: Partial<PositionState> }
  // Trading actions (legacy)
  | { type: 'OPEN_POSITION'; payload: { size: number } }
  | { type: 'CLOSE_POSITION' }
  // UI updates
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  // Reset
  | { type: 'RESET_GAME' }
  | { type: 'RESET_ALL' }
  // Skills
  | { type: 'ACTIVATE_HEDGE'; payload: { hedgeType?: 'basic' | 'tight' | 'tail' | 'dynamic' } };

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateIndicators(
  data: ProcessedCandle[],
  currentIndex: number
): MarketIndicators {
  if (currentIndex < 0 || currentIndex >= data.length) {
    return INITIAL_MARKET_STATE.indicators;
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

// Generate unique ID for positions
function generatePositionId(): string {
  return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate terrain state from portfolio accumulated return
function calculateTerrainState(
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

// Legacy terrain calculation for backwards compatibility
function calculateTerrainStateLegacy(
  market: CurrentMarketState,
  leverage: number,
  exposure: number = 0
): TerrainState {
  const currentSlope = market.terrainSlope * leverage * exposure;
  const currentRoughness = market.roadRoughness * exposure;
  return {
    roadHeight: 0,
    roadHeightDelta: 0,
    currentSlope,
    currentRoughness,
    leverageAmplification: leverage * exposure,
    exposureMultiplier: exposure,
  };
}

// ============================================
// FINANCIAL DRIVE CONCEPTS HELPERS
// ============================================

// Detect candle pattern from a candle and previous candle
function detectCandlePattern(
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

// Calculate road conditions from market indicators
// Based on Market Physics in CONCEPTS.md
function calculateRoadConditions(
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
  // Already calculated elsewhere, but affects road slope
  const slope = indicators.trend;

  // RSI → Grip level
  // Extreme RSI (< 30 or > 70) = slippery edges
  const rsiDeviation = Math.abs(indicators.rsi - 50);
  const grip = rsiDeviation > 20 ? 1 - (rsiDeviation - 20) / 30 : 1;

  // Volume → Road width (would need volume data)
  // For now, use a constant or derive from volatility
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

// Calculate car physics from portfolio state
// Based on Core Mental Model in CONCEPTS.md
function calculateCarPhysics(
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

// Generate a road segment from a candle
function generateRoadSegment(
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

function calculatePhysicsModifiers(
  wealth: WealthState,
  market: CurrentMarketState
): PhysicsModifiers {
  // Torque based on leverage (higher leverage = more power but more risk)
  const torqueMultiplier = 0.8 + wealth.leverage * 0.4;

  // Brake based on cash buffer (more cash = better braking)
  const brakeMultiplier = 0.5 + wealth.cashBuffer * 2.0;

  // Traction based on volatility and RSI
  const volatilityPenalty = market.indicators.volatility * 0.5;
  const rsiPenalty =
    Math.abs(market.indicators.rsi - 50) > 30
      ? (Math.abs(market.indicators.rsi - 50) - 30) * 0.01
      : 0;
  const tractionMultiplier = Math.max(0.3, 1 - volatilityPenalty - rsiPenalty);

  // Recovery drag when in drawdown
  const recoveryDrag = wealth.isInRecovery ? 1 + wealth.drawdown * 2 : 1;

  return { torqueMultiplier, brakeMultiplier, tractionMultiplier, recoveryDrag };
}

// ============================================
// BACKTESTING ENGINE HELPERS
// ============================================

// Update a single position with current market price
function updatePosition(position: Position, currentPrice: number): Position {
  const priceDiff = currentPrice - position.entryPrice;
  const pnlMultiplier = position.direction === 'long' ? 1 : -1;
  const unrealizedPnLPercent = (priceDiff / position.entryPrice) * 100 * pnlMultiplier * position.leverage;
  const positionValue = position.size * position.entryPrice; // Nominal value at entry
  const unrealizedPnL = positionValue * (unrealizedPnLPercent / 100);

  return {
    ...position,
    currentPrice,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

// Update all positions and calculate portfolio metrics
// Includes loss aversion (2.25x) for stress calculation per CONCEPTS.md
function updatePortfolio(
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

  // Calculate equity
  const equity = portfolio.cash + totalUnrealizedPnL;

  // Calculate accumulated return
  const accumulatedReturnDollar = equity - portfolio.initialCapital + portfolio.totalRealizedPnL;
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

// Open a new position
function openPosition(
  portfolio: PortfolioState,
  direction: PositionDirection,
  size: number,
  currentPrice: number,
  currentIndex: number,
  currentDate: string,
  leverage: number = 1
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
    currentPrice,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    leverage,
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

// Close a specific position
function closePositionById(
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
    realizedPnL,
    realizedPnLPercent: updatedPosition.unrealizedPnLPercent,
    holdingPeriod: currentIndex - positionToClose.entryIndex,
  };

  // Return cash + P&L
  const returnedCash = positionToClose.size * positionToClose.entryPrice + realizedPnL;

  return {
    ...portfolio,
    positions: portfolio.positions.filter(p => p.id !== positionId),
    closedPositions: [...portfolio.closedPositions, closedPosition],
    cash: portfolio.cash + returnedCash,
    totalExposure: portfolio.totalExposure - positionToClose.size,
    totalRealizedPnL: portfolio.totalRealizedPnL + realizedPnL,
  };
}

// Close all positions
function closeAllPositions(
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

// Create a backtest tick record with road segment and conditions
function createBacktestTick(
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

function returnToSlope(dailyReturn: number): number {
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

function processedToChartCandle(candle: ProcessedCandle): ChartCandle {
  return {
    date: new Date(candle.date),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

function deriveMarketState(
  data: ProcessedCandle[],
  currentIndex: number
): CurrentMarketState {
  if (data.length === 0 || currentIndex < 0) {
    return INITIAL_MARKET_STATE;
  }

  const safeIndex = Math.min(currentIndex, data.length - 1);
  const currentCandle = data[safeIndex];
  const startPrice = data[0].open;
  const currentPrice = currentCandle.close;
  const currentReturn = ((currentPrice - startPrice) / startPrice) * 100;

  const visibleCandles = data.slice(0, safeIndex + 1).map(processedToChartCandle);
  const indicators = calculateIndicators(data, safeIndex);
  const terrainSlope = returnToSlope(currentCandle.dailyReturn);
  const roadRoughness = Math.min(1, currentCandle.intradayVolatility / 5);
  const tractionMultiplier = Math.max(0.5, 1 - roadRoughness * 0.5);

  return {
    currentCandle,
    currentPrice,
    currentReturn,
    visibleCandles,
    indicators,
    regime: indicators.regime,
    terrainSlope,
    roadRoughness,
    tractionMultiplier,
  };
}

// ============================================
// REDUCER
// ============================================

interface ReducerState extends UnifiedAppState {
  rawData: ProcessedCandle[];
}

const initialReducerState: ReducerState = {
  ...INITIAL_APP_STATE,
  rawData: [],
};

function appReducer(state: ReducerState, action: AppAction): ReducerState {
  switch (action.type) {
    case 'LOAD_DATASET_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        datasetKey: action.payload.key,
      };

    case 'LOAD_DATASET_SUCCESS': {
      const data = action.payload.data;
      const market = deriveMarketState(data, 0);
      // Use new portfolio-based terrain calculation
      const terrain = calculateTerrainState(state.backtest.portfolio, market, 0);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        datasetKey: action.payload.key,
        datasetName: action.payload.name,
        rawData: data,
        timeline: {
          ...INITIAL_TIMELINE_STATE,
          totalBars: data.length,
          canGoForward: data.length > 1,
        },
        market,
        terrain,
        physics,
        backtest: {
          ...state.backtest,
          totalTicks: data.length,
        },
      };
    }

    case 'LOAD_DATASET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case 'SET_TIMELINE_INDEX': {
      const newIndex = Math.max(0, Math.min(action.payload, state.rawData.length - 1));
      const market = deriveMarketState(state.rawData, newIndex);
      const currentDate = market.currentCandle?.date || '';

      // Update portfolio with new price and market data for car physics
      const updatedPortfolio = updatePortfolio(
        state.backtest.portfolio,
        market.currentPrice,
        newIndex,
        currentDate,
        market,
        state.wealth.leverage
      );

      const terrain = calculateTerrainState(updatedPortfolio, market, state.terrain.roadHeight);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: newIndex < state.rawData.length - 1,
        },
        market,
        terrain,
        physics,
        backtest: {
          ...state.backtest,
          currentTick: newIndex,
          portfolio: updatedPortfolio,
        },
      };
    }

    case 'SET_PLAYBACK_MODE':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          mode: action.payload,
          lastUpdateTime: action.payload === 'playing' ? Date.now() : state.timeline.lastUpdateTime,
        },
      };

    case 'SET_PLAYBACK_SPEED':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          playbackSpeed: action.payload,
        },
      };

    case 'TICK': {
      if (state.timeline.mode !== 'playing') return state;

      const elapsed = state.timeline.elapsedTime + action.payload.deltaTime;
      const barsToAdvance = Math.floor(elapsed * state.timeline.playbackSpeed);

      if (barsToAdvance === 0) {
        return {
          ...state,
          timeline: {
            ...state.timeline,
            elapsedTime: elapsed,
          },
        };
      }

      const newIndex = Math.min(
        state.timeline.currentIndex + barsToAdvance,
        state.rawData.length - 1
      );
      const market = deriveMarketState(state.rawData, newIndex);
      const currentDate = market.currentCandle?.date || '';
      const prevCandle = newIndex > 0 ? state.rawData[newIndex - 1] : null;

      // Update portfolio with new prices (new system)
      const updatedPortfolio = updatePortfolio(
        state.backtest.portfolio,
        market.currentPrice,
        newIndex,
        currentDate,
        market,
        state.wealth.leverage
      );

      // Create tick record with road segment and conditions
      const tick = createBacktestTick(
        newIndex,
        currentDate,
        market.currentPrice,
        updatedPortfolio,
        market.currentCandle,
        prevCandle,
        market.indicators,
        market.regime
      );
      const newTickHistory = [...state.backtest.tickHistory, tick];

      // Legacy: Calculate position P&L if position is open (for backward compatibility)
      let newPosition = state.position;
      let newWealth = state.wealth;

      if (state.position.isOpen && state.position.exposure > 0) {
        const currentPrice = market.currentPrice;
        const entryPrice = state.position.entryPrice;
        const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
        const pnlAmount = state.wealth.currentWealth * state.position.exposure * (pnlPercent / 100);

        newPosition = {
          ...state.position,
          currentPrice,
          unrealizedPnL: pnlAmount,
          unrealizedPnLPercent: pnlPercent * state.position.exposure,
        };

        // Update wealth with unrealized P&L
        const newWealthValue = state.wealth.startingWealth + state.position.realizedPnL + pnlAmount;
        const allTimeHigh = Math.max(state.wealth.allTimeHigh, newWealthValue);
        const drawdown = allTimeHigh > 0 ? (allTimeHigh - newWealthValue) / allTimeHigh : 0;

        newWealth = {
          ...state.wealth,
          currentWealth: newWealthValue,
          allTimeHigh,
          drawdown,
          isInRecovery: drawdown > 0.05,
          stressLevel: Math.min(1, drawdown * 2),
        };
      }

      // Use portfolio-based terrain calculation
      const terrain = calculateTerrainState(updatedPortfolio, market, state.terrain.roadHeight);
      const physics = calculatePhysicsModifiers(newWealth, market);

      const shouldPause = newIndex >= state.rawData.length - 1;

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentIndex: newIndex,
          elapsedTime: elapsed - barsToAdvance / state.timeline.playbackSpeed,
          canGoBack: newIndex > 0,
          canGoForward: !shouldPause,
          mode: shouldPause ? 'paused' : state.timeline.mode,
        },
        market,
        terrain,
        physics,
        position: newPosition,
        wealth: newWealth,
        backtest: {
          ...state.backtest,
          currentTick: newIndex,
          portfolio: updatedPortfolio,
          tickHistory: newTickHistory,
        },
      };
    }

    case 'UPDATE_WEALTH': {
      const newWealth = { ...state.wealth, ...action.payload };
      const physics = calculatePhysicsModifiers(newWealth, state.market);
      const terrain = calculateTerrainState(state.backtest.portfolio, state.market, state.terrain.roadHeight);

      return {
        ...state,
        wealth: newWealth,
        physics,
        terrain,
      };
    }

    case 'SET_LEVERAGE': {
      const leverage = Math.max(0.5, Math.min(3.0, action.payload));
      const newWealth = { ...state.wealth, leverage };
      // Use portfolio-based terrain calculation
      const terrain = calculateTerrainState(state.backtest.portfolio, state.market, state.terrain.roadHeight);
      const physics = calculatePhysicsModifiers(newWealth, state.market);

      return {
        ...state,
        wealth: newWealth,
        terrain,
        physics,
      };
    }

    case 'SET_CASH_BUFFER': {
      const cashBuffer = Math.max(0, Math.min(1, action.payload));
      const newWealth = { ...state.wealth, cashBuffer };
      const physics = calculatePhysicsModifiers(newWealth, state.market);

      return {
        ...state,
        wealth: newWealth,
        physics,
      };
    }

    case 'UPDATE_VEHICLE':
      return {
        ...state,
        vehicle: { ...state.vehicle, ...action.payload },
      };

    case 'UPDATE_POSITION':
      return {
        ...state,
        position: { ...state.position, ...action.payload },
      };

    case 'OPEN_POSITION': {
      const size = Math.max(0, Math.min(1, action.payload.size));
      if (size === 0) return state;

      const entryPrice = state.market.currentPrice;
      const newPosition: PositionState = {
        isOpen: true,
        entryPrice,
        entryIndex: state.timeline.currentIndex,
        currentPrice: entryPrice,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: state.position.realizedPnL,
        size,
        exposure: size,
      };

      // Use legacy terrain calculation for backward compatibility
      const terrain = calculateTerrainStateLegacy(state.market, state.wealth.leverage, size);

      return {
        ...state,
        position: newPosition,
        terrain,
      };
    }

    case 'CLOSE_POSITION': {
      if (!state.position.isOpen) return state;

      // Realize the P&L
      const realizedPnL = state.position.realizedPnL + state.position.unrealizedPnL;

      const newPosition: PositionState = {
        isOpen: false,
        entryPrice: 0,
        entryIndex: 0,
        currentPrice: 0,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL,
        size: 0,
        exposure: 0,
      };

      // Terrain goes flat when closing position (exposure = 0)
      const terrain = calculateTerrainStateLegacy(state.market, state.wealth.leverage, 0);

      // Update wealth to reflect realized P&L
      const newWealth: WealthState = {
        ...state.wealth,
        currentWealth: state.wealth.startingWealth + realizedPnL,
      };

      return {
        ...state,
        position: newPosition,
        terrain,
        wealth: newWealth,
      };
    }

    // ============================================
    // NEW MULTI-POSITION TRADING ACTIONS
    // ============================================

    case 'OPEN_LONG': {
      const { size, leverage = 1 } = action.payload;
      const currentDate = state.market.currentCandle?.date || '';
      const newPortfolio = openPosition(
        state.backtest.portfolio,
        'long',
        size,
        state.market.currentPrice,
        state.timeline.currentIndex,
        currentDate,
        leverage
      );

      const terrain = calculateTerrainState(newPortfolio, state.market, state.terrain.roadHeight);

      return {
        ...state,
        backtest: {
          ...state.backtest,
          portfolio: newPortfolio,
        },
        terrain,
      };
    }

    case 'OPEN_SHORT': {
      const { size, leverage = 1 } = action.payload;
      const currentDate = state.market.currentCandle?.date || '';
      const newPortfolio = openPosition(
        state.backtest.portfolio,
        'short',
        size,
        state.market.currentPrice,
        state.timeline.currentIndex,
        currentDate,
        leverage
      );

      const terrain = calculateTerrainState(newPortfolio, state.market, state.terrain.roadHeight);

      return {
        ...state,
        backtest: {
          ...state.backtest,
          portfolio: newPortfolio,
        },
        terrain,
      };
    }

    case 'CLOSE_POSITION_BY_ID': {
      const newPortfolio = closePositionById(
        state.backtest.portfolio,
        action.payload.positionId,
        state.market.currentPrice,
        state.timeline.currentIndex
      );

      const terrain = calculateTerrainState(newPortfolio, state.market, state.terrain.roadHeight);

      return {
        ...state,
        backtest: {
          ...state.backtest,
          portfolio: newPortfolio,
        },
        terrain,
      };
    }

    case 'CLOSE_ALL_POSITIONS': {
      const newPortfolio = closeAllPositions(
        state.backtest.portfolio,
        state.market.currentPrice,
        state.timeline.currentIndex
      );

      const terrain = calculateTerrainState(newPortfolio, state.market, state.terrain.roadHeight);

      return {
        ...state,
        backtest: {
          ...state.backtest,
          portfolio: newPortfolio,
        },
        terrain,
      };
    }

    case 'BACKTEST_TICK': {
      // Advance one tick and update portfolio
      const newIndex = Math.min(state.timeline.currentIndex + 1, state.rawData.length - 1);
      if (newIndex === state.timeline.currentIndex) return state;

      const market = deriveMarketState(state.rawData, newIndex);
      const currentDate = market.currentCandle?.date || '';
      const prevCandle = newIndex > 0 ? state.rawData[newIndex - 1] : null;

      // Update portfolio with new prices and market data for car physics
      const newPortfolio = updatePortfolio(
        state.backtest.portfolio,
        market.currentPrice,
        newIndex,
        currentDate,
        market,
        state.wealth.leverage
      );

      // Create tick record with road segment and conditions
      const tick = createBacktestTick(
        newIndex,
        currentDate,
        market.currentPrice,
        newPortfolio,
        market.currentCandle,
        prevCandle,
        market.indicators,
        market.regime
      );
      const newTickHistory = [...state.backtest.tickHistory, tick];

      // Calculate terrain from portfolio accumulated return
      const terrain = calculateTerrainState(newPortfolio, market, state.terrain.roadHeight);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      const shouldPause = newIndex >= state.rawData.length - 1;

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: !shouldPause,
          mode: shouldPause ? 'paused' : state.timeline.mode,
        },
        market,
        terrain,
        physics,
        backtest: {
          ...state.backtest,
          currentTick: newIndex,
          portfolio: newPortfolio,
          tickHistory: newTickHistory,
        },
      };
    }

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };

    case 'SET_GAME_STATE':
      return {
        ...state,
        gamePlayState: action.payload,
      };

    case 'RESET_GAME': {
      const market = deriveMarketState(state.rawData, 0);
      // Reset backtest portfolio
      const resetPortfolio = { ...INITIAL_PORTFOLIO_STATE };
      // Start with no exposure (flat terrain) until user opens a position
      const terrain = calculateTerrainState(resetPortfolio, market, 0);
      const physics = calculatePhysicsModifiers(INITIAL_WEALTH_STATE, market);

      return {
        ...state,
        timeline: {
          ...INITIAL_TIMELINE_STATE,
          totalBars: state.rawData.length,
          canGoForward: state.rawData.length > 1,
        },
        market,
        terrain,
        physics,
        wealth: INITIAL_WEALTH_STATE,
        vehicle: INITIAL_VEHICLE_STATE,
        position: INITIAL_POSITION_STATE,
        backtest: {
          ...INITIAL_BACKTEST_STATE,
          totalTicks: state.rawData.length,
          portfolio: resetPortfolio,
        },
        gamePlayState: 'playing',
      };
    }

    case 'RESET_ALL':
      return initialReducerState;

    case 'ACTIVATE_HEDGE': {
      const hedgeType = action.payload.hedgeType || 'basic';
      const portfolio = state.backtest.portfolio;

      // Try to activate hedge
      const result = activateHedge({
        portfolio,
        hedgeType,
        currentPrice: state.market.currentPrice,
        currentTick: state.timeline.currentIndex,
      });

      if (!result.success) {
        // Hedge activation failed - update message but no state change
        console.log('Hedge failed:', result.event.message);
        return {
          ...state,
          backtest: {
            ...state.backtest,
            portfolio: {
              ...portfolio,
              skillState: {
                ...portfolio.skillState,
                lastSkillMessage: result.event.message,
                lastSkillMessageTime: Date.now(),
              },
            },
          },
        };
      }

      // Hedge activated successfully
      const newSkillState = {
        ...portfolio.skillState,
        ...result.newState,
      };

      return {
        ...state,
        backtest: {
          ...state.backtest,
          portfolio: {
            ...portfolio,
            skillState: newSkillState,
            // Deduct hedge cost from cash
            cash: portfolio.cash - (result.event as any).costPaid,
          },
        },
      };
    }

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AppStateContextValue extends UnifiedAppState {
  // Playback controls
  playback: PlaybackControls;

  // Data loading
  loadDataset: (key: string) => Promise<void>;

  // Wealth controls
  setLeverage: (leverage: number) => void;
  setCashBuffer: (buffer: number) => void;
  updateWealth: (wealth: Partial<WealthState>) => void;

  // Vehicle updates
  updateVehicle: (vehicle: Partial<VehicleState>) => void;

  // Position updates (legacy single position)
  updatePosition: (position: Partial<PositionState>) => void;

  // Trading controls (legacy)
  openPosition: (size?: number) => void;
  closePosition: () => void;

  // New multi-position trading controls
  openLong: (size: number, leverage?: number) => void;
  openShort: (size: number, leverage?: number) => void;
  closePositionById: (positionId: string) => void;
  closeAllPositions: () => void;

  // UI controls
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => ViewMode;
  setGameState: (state: GameState) => void;

  // Reset
  resetGame: () => void;
  resetAll: () => void;

  // Skills
  activateHedge: (hedgeType?: 'basic' | 'tight' | 'tail' | 'dynamic') => void;

  // Selectors
  getChartData: () => ChartCandle[];
  isPlaying: () => boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface AppStateProviderProps {
  children: ReactNode;
  initialDataset?: string;
}

export function AppStateProvider({
  children,
  initialDataset = 'sp500',
}: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialReducerState);
  const animationFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());

  // Playback animation loop
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const deltaTime = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (state.timeline.mode === 'playing') {
        dispatch({ type: 'TICK', payload: { deltaTime } });
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.timeline.mode]);

  // Load dataset function
  const loadDataset = useCallback(async (key: string) => {
    dispatch({ type: 'LOAD_DATASET_START', payload: { key } });

    try {
      const path =
        key.includes('crash') || key.includes('covid')
          ? `/market/scenarios/${key}.json`
          : `/market/${key}.json`;

      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load dataset: ${key}`);
      }

      const rawData = await response.json();

      // Process raw data
      const data: ProcessedCandle[] = rawData.data.map(
        (candle: any, i: number, arr: any[]) => {
          const prevClose = i > 0 ? arr[i - 1].close : candle.open;
          const dailyReturn = ((candle.close - prevClose) / prevClose) * 100;
          const intradayVolatility =
            ((candle.high - candle.low) / candle.open) * 100;
          const trueRange = Math.max(
            candle.high - candle.low,
            i > 0 ? Math.abs(candle.high - prevClose) : 0,
            i > 0 ? Math.abs(candle.low - prevClose) : 0
          );

          return {
            ...candle,
            dailyReturn,
            intradayVolatility,
            trueRange,
            rollingVolatility: intradayVolatility,
            index: i,
          };
        }
      );

      // Calculate rolling volatility
      const windowSize = 20;
      for (let i = windowSize - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          sum += Math.pow(data[j].dailyReturn, 2);
        }
        data[i].rollingVolatility = Math.sqrt(sum / windowSize);
      }

      dispatch({
        type: 'LOAD_DATASET_SUCCESS',
        payload: {
          key,
          name: rawData.name || key.toUpperCase(),
          data,
        },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_DATASET_ERROR',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }, []);

  // Load initial dataset
  useEffect(() => {
    loadDataset(initialDataset);
  }, [initialDataset, loadDataset]);

  // Playback controls
  const playback: PlaybackControls = {
    play: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'playing' });
    }, []),

    pause: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
    }, []),

    stop: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: 0 });
    }, []),

    nextBar: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.timeline.currentIndex + 1 });
    }, [state.timeline.currentIndex]),

    prevBar: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.timeline.currentIndex - 1 });
    }, [state.timeline.currentIndex]),

    goToBar: useCallback((index: number) => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: index });
    }, []),

    goToStart: useCallback(() => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: 0 });
    }, []),

    goToEnd: useCallback(() => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.rawData.length - 1 });
    }, [state.rawData.length]),

    setSpeed: useCallback((speed: number) => {
      dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),
  };

  // Other controls
  const setLeverage = useCallback((leverage: number) => {
    dispatch({ type: 'SET_LEVERAGE', payload: leverage });
  }, []);

  const setCashBuffer = useCallback((buffer: number) => {
    dispatch({ type: 'SET_CASH_BUFFER', payload: buffer });
  }, []);

  const updateWealth = useCallback((wealth: Partial<WealthState>) => {
    dispatch({ type: 'UPDATE_WEALTH', payload: wealth });
  }, []);

  const updateVehicle = useCallback((vehicle: Partial<VehicleState>) => {
    dispatch({ type: 'UPDATE_VEHICLE', payload: vehicle });
  }, []);

  const updatePosition = useCallback((position: Partial<PositionState>) => {
    dispatch({ type: 'UPDATE_POSITION', payload: position });
  }, []);

  // Trading controls
  const openPosition = useCallback((size: number = 1) => {
    dispatch({ type: 'OPEN_POSITION', payload: { size } });
  }, []);

  const closePosition = useCallback(() => {
    dispatch({ type: 'CLOSE_POSITION' });
  }, []);

  // New multi-position trading controls
  const openLong = useCallback((size: number, leverage: number = 1) => {
    dispatch({ type: 'OPEN_LONG', payload: { size, leverage } });
  }, []);

  const openShort = useCallback((size: number, leverage: number = 1) => {
    dispatch({ type: 'OPEN_SHORT', payload: { size, leverage } });
  }, []);

  const closePositionByIdCallback = useCallback((positionId: string) => {
    dispatch({ type: 'CLOSE_POSITION_BY_ID', payload: { positionId } });
  }, []);

  const closeAllPositionsCallback = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_POSITIONS' });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const cycleViewMode = useCallback(() => {
    const modes: ViewMode[] = ['split', 'chart_focus', 'drive_focus', 'full_immersion'];
    const currentIdx = modes.indexOf(state.viewMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    dispatch({ type: 'SET_VIEW_MODE', payload: nextMode });
    return nextMode;
  }, [state.viewMode]);

  const setGameState = useCallback((gameState: GameState) => {
    dispatch({ type: 'SET_GAME_STATE', payload: gameState });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // Skills
  const activateHedgeCallback = useCallback((hedgeType: 'basic' | 'tight' | 'tail' | 'dynamic' = 'basic') => {
    dispatch({ type: 'ACTIVATE_HEDGE', payload: { hedgeType } });
  }, []);

  // Selectors
  const getChartData = useCallback(() => state.market.visibleCandles, [state.market.visibleCandles]);

  const isPlaying = useCallback(() => state.timeline.mode === 'playing', [state.timeline.mode]);

  const value: AppStateContextValue = {
    // State
    ...state,
    // Exclude rawData from context value
    // Controls
    playback,
    loadDataset,
    setLeverage,
    setCashBuffer,
    updateWealth,
    updateVehicle,
    updatePosition,
    openPosition,
    closePosition,
    // New multi-position trading controls
    openLong,
    openShort,
    closePositionById: closePositionByIdCallback,
    closeAllPositions: closeAllPositionsCallback,
    setViewMode,
    cycleViewMode,
    setGameState,
    resetGame,
    resetAll,
    // Skills
    activateHedge: activateHedgeCallback,
    getChartData,
    isPlaying,
  };

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export default AppStateContext;
