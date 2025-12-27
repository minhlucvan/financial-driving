// Unified State Types - Single Source of Truth

import type { ProcessedCandle, MarketIndicators, MarketRegime, ChartCandle } from './market';
import type { TimelineState, PlaybackMode } from './timeline';
import type {
  WealthState,
  VehicleState,
  PositionState,
  ViewMode,
  GameState as GamePlayState,
  PortfolioState,
  BacktestTick,
  CarPhysics,
  RoadConditions,
  SkillState,
} from './game';
import { INITIAL_SKILL_STATE } from '../skills/types';

// ============================================
// MARKET STATE - Derived from timeline position
// ============================================

export interface CurrentMarketState {
  // Current bar data
  currentCandle: ProcessedCandle | null;
  currentPrice: number;
  currentReturn: number; // cumulative return from start (market return, not portfolio)

  // Historical data for chart (up to current index)
  visibleCandles: ChartCandle[];

  // Technical indicators at current position
  indicators: MarketIndicators;

  // Market regime
  regime: MarketRegime;

  // Derived terrain data (from market)
  terrainSlope: number;       // -32 to +32
  roadRoughness: number;      // 0 to 1
  tractionMultiplier: number; // 0.5 to 1
}

// ============================================
// GAME PHYSICS STATE - Vehicle and terrain
// ============================================

export interface TerrainState {
  // Road geometry based on accumulated return
  roadHeight: number;         // Y position of road based on accumulated return
  roadHeightDelta: number;    // Change in height from last tick (for slope)
  currentSlope: number;       // Derived slope from height delta
  currentRoughness: number;   // Road roughness (volatility)

  // Modifiers
  leverageAmplification: number; // How much leverage affects terrain
  exposureMultiplier: number;    // How much exposure affects terrain (0 when flat)
}

export interface PhysicsModifiers {
  torqueMultiplier: number;     // Based on leverage
  brakeMultiplier: number;      // Based on cash buffer
  tractionMultiplier: number;   // Based on volatility/RSI
  recoveryDrag: number;         // Based on drawdown
}

// ============================================
// BACKTEST ENGINE STATE
// ============================================

export interface BacktestEngineState {
  // Current tick
  currentTick: number;
  totalTicks: number;

  // Portfolio state
  portfolio: PortfolioState;

  // Tick history for road generation
  tickHistory: BacktestTick[];

  // Engine settings
  tickDuration: number;       // How long each tick represents (in days)
  maxLeverage: number;        // Maximum allowed leverage
  marginCallLevel: number;    // Equity level that triggers margin call

  // Flags
  isRunning: boolean;
  isPaused: boolean;
  isMarginCalled: boolean;
}

// ============================================
// UNIFIED APP STATE - Single Source of Truth
// ============================================

export interface UnifiedAppState {
  // Data source
  datasetKey: string;
  datasetName: string;

  // Timeline control (playback)
  timeline: TimelineState;

  // Market state (derived from timeline)
  market: CurrentMarketState;

  // Terrain state (derived from portfolio accumulated return)
  terrain: TerrainState;

  // Backtest engine (new)
  backtest: BacktestEngineState;

  // Legacy: Wealth/Financial state (kept for compatibility)
  wealth: WealthState;

  // Legacy: Trading position (single position - kept for compatibility)
  position: PositionState;

  // Vehicle physics state
  vehicle: VehicleState;

  // Physics modifiers (derived from portfolio + market)
  physics: PhysicsModifiers;

  // UI state
  viewMode: ViewMode;
  gamePlayState: GamePlayState;

  // Flags
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// STATE SELECTORS - Compute derived values
// ============================================

export interface StateSelectors {
  // Chart data
  getChartData: () => ChartCandle[];
  getCurrentCandle: () => ProcessedCandle | null;

  // Game data
  getTerrainSlope: () => number;
  getPhysicsModifiers: () => PhysicsModifiers;

  // Wealth data
  getWealthProgress: () => number; // 0 to 1
  getDrawdownPercent: () => number;

  // Status
  isPlaying: () => boolean;
  canAdvance: () => boolean;
  canRewind: () => boolean;
}

// ============================================
// INITIAL STATE
// ============================================

export const INITIAL_TIMELINE_STATE: TimelineState = {
  currentIndex: 0,
  totalBars: 0,
  mode: 'paused',
  playbackSpeed: 1,
  canGoBack: false,
  canGoForward: false,
  lastUpdateTime: 0,
  elapsedTime: 0,
};

export const INITIAL_MARKET_STATE: CurrentMarketState = {
  currentCandle: null,
  currentPrice: 0,
  currentReturn: 0,
  visibleCandles: [],
  indicators: {
    rsi: 50,
    atr: 0,
    volatility: 0,
    trend: 0,
    drawdown: 0,
    regime: 'CHOP',
  },
  regime: 'CHOP',
  terrainSlope: 0,
  roadRoughness: 0,
  tractionMultiplier: 1,
};

export const INITIAL_TERRAIN_STATE: TerrainState = {
  roadHeight: 0,
  roadHeightDelta: 0,
  currentSlope: 0,
  currentRoughness: 0,
  leverageAmplification: 1,
  exposureMultiplier: 0,  // No exposure = flat terrain
};

// Initial Car Physics - balanced neutral state
export const INITIAL_CAR_PHYSICS: CarPhysics = {
  enginePower: 1.0,         // Neutral engine power
  brakeStrength: 1.0,       // Neutral braking
  accelerationBoost: 1.0,   // No leverage boost
  traction: 1.0,            // Full traction
  durability: 1.0,          // Full durability
  recoveryDrag: 1.0,        // No recovery drag (not in drawdown)
  engineTemperature: 0.0,   // Cool engine
  fuelLevel: 1.0,           // Full fuel (no realized losses)
};

// Initial Road Conditions - clear and smooth
export const INITIAL_ROAD_CONDITIONS: RoadConditions = {
  roughness: 0.0,           // Smooth road
  visibility: 1.0,          // Full visibility
  slope: 0,                 // Flat
  grip: 1.0,                // Full grip
  width: 1.0,               // Normal width
  weather: 'clear',         // Clear weather
};

export const INITIAL_PORTFOLIO_STATE: PortfolioState = {
  initialCapital: 10000,
  cash: 10000,
  equity: 10000,
  positions: [],
  closedPositions: [],
  totalExposure: 0,
  totalUnrealizedPnL: 0,
  totalRealizedPnL: 0,
  accumulatedReturn: 0,
  accumulatedReturnDollar: 0,
  drawdown: 0,
  maxDrawdown: 0,
  peakEquity: 10000,
  recoveryNeeded: 0,        // No recovery needed
  marginUsage: 0,
  stressLevel: 0,
  rawStress: 0,
  carPhysics: INITIAL_CAR_PHYSICS,
  skillState: INITIAL_SKILL_STATE,
};

export const INITIAL_BACKTEST_STATE: BacktestEngineState = {
  currentTick: 0,
  totalTicks: 0,
  portfolio: INITIAL_PORTFOLIO_STATE,
  tickHistory: [],
  tickDuration: 1,      // 1 day per tick
  maxLeverage: 3,       // Max 3x leverage
  marginCallLevel: 0.2, // Margin call at 20% equity
  isRunning: false,
  isPaused: true,
  isMarginCalled: false,
};

export const INITIAL_PHYSICS_MODIFIERS: PhysicsModifiers = {
  torqueMultiplier: 1,
  brakeMultiplier: 1,
  tractionMultiplier: 1,
  recoveryDrag: 1,
};

export const INITIAL_WEALTH_STATE: WealthState = {
  currentWealth: 10000,
  startingWealth: 10000,
  targetWealth: 1000000,
  leverage: 1.0,
  cashBuffer: 0.2,
  stressLevel: 0,
  drawdown: 0,
  allTimeHigh: 10000,
  isInRecovery: false,
};

export const INITIAL_VEHICLE_STATE: VehicleState = {
  velocityX: 0,
  velocityY: 0,
  angularVelocity: 0,
  isOnGround: false,
  isFlipped: false,
};

export const INITIAL_POSITION_STATE: PositionState = {
  isOpen: false,
  entryPrice: 0,
  entryIndex: 0,
  currentPrice: 0,
  unrealizedPnL: 0,
  unrealizedPnLPercent: 0,
  realizedPnL: 0,
  size: 0,
  exposure: 0,  // Start with no exposure - flat road until user buys
};

export const INITIAL_APP_STATE: UnifiedAppState = {
  datasetKey: 'sp500',
  datasetName: 'S&P 500',
  timeline: INITIAL_TIMELINE_STATE,
  market: INITIAL_MARKET_STATE,
  terrain: INITIAL_TERRAIN_STATE,
  backtest: INITIAL_BACKTEST_STATE,
  wealth: INITIAL_WEALTH_STATE,
  position: INITIAL_POSITION_STATE,
  vehicle: INITIAL_VEHICLE_STATE,
  physics: INITIAL_PHYSICS_MODIFIERS,
  viewMode: 'split',
  gamePlayState: 'menu',
  isInitialized: false,
  isLoading: true,
  error: null,
};
