// Unified State Types - Single Source of Truth

import type { ProcessedCandle, MarketIndicators, MarketRegime, ChartCandle } from './market';
import type { TimelineState, PlaybackMode } from './timeline';
import type { WealthState, VehicleState, PositionState, ViewMode, GameState as GamePlayState } from './game';

// ============================================
// MARKET STATE - Derived from timeline position
// ============================================

export interface CurrentMarketState {
  // Current bar data
  currentCandle: ProcessedCandle | null;
  currentPrice: number;
  currentReturn: number; // cumulative return from start

  // Historical data for chart (up to current index)
  visibleCandles: ChartCandle[];

  // Technical indicators at current position
  indicators: MarketIndicators;

  // Market regime
  regime: MarketRegime;

  // Derived terrain data
  terrainSlope: number;       // -32 to +32
  roadRoughness: number;      // 0 to 1
  tractionMultiplier: number; // 0.5 to 1
}

// ============================================
// GAME PHYSICS STATE - Vehicle and terrain
// ============================================

export interface TerrainState {
  currentSlope: number;
  currentRoughness: number;
  leverageAmplification: number; // How much leverage affects slope
}

export interface PhysicsModifiers {
  torqueMultiplier: number;     // Based on leverage
  brakeMultiplier: number;      // Based on cash buffer
  tractionMultiplier: number;   // Based on volatility/RSI
  recoveryDrag: number;         // Based on drawdown
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

  // Terrain state (derived from market)
  terrain: TerrainState;

  // Wealth/Financial state
  wealth: WealthState;

  // Trading position
  position: PositionState;

  // Vehicle physics state
  vehicle: VehicleState;

  // Physics modifiers (derived from wealth + market)
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
  currentSlope: 0,
  currentRoughness: 0,
  leverageAmplification: 1,
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
  currentPrice: 0,
  unrealizedPnL: 0,
  realizedPnL: 0,
  size: 0,
};

export const INITIAL_APP_STATE: UnifiedAppState = {
  datasetKey: 'sp500',
  datasetName: 'S&P 500',
  timeline: INITIAL_TIMELINE_STATE,
  market: INITIAL_MARKET_STATE,
  terrain: INITIAL_TERRAIN_STATE,
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
