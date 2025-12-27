// Game State Types

export type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'bankrupt';

export type ViewMode = 'split' | 'chart_focus' | 'drive_focus' | 'full_immersion';

// ============================================
// FINANCIAL DRIVE CORE CONCEPTS
// ============================================

// Loss Aversion Constant (Prospect Theory)
// Losses are weighted ~2.25× stronger than gains in human utility
export const LOSS_AVERSION_MULTIPLIER = 2.25;

// Calculate recovery needed after a loss (Mathematical Law)
// A loss of L% requires a gain of L/(1-L)% to recover
export function calculateRecoveryNeeded(lossPercent: number): number {
  const loss = Math.abs(lossPercent) / 100;
  if (loss >= 1) return Infinity;
  return (loss / (1 - loss)) * 100;
}

// Car Physics Mapping from Financial State
// Based on Core Mental Model in CONCEPTS.md
export interface CarPhysics {
  // Engine Power = Asset Allocation × Market Trend
  // Position size multiplied by market momentum
  enginePower: number;

  // Brake Strength = Cash %
  // More cash = better braking (control, survival)
  brakeStrength: number;

  // Acceleration Boost = Debt Ratio (Leverage)
  // Higher leverage = more speed but more risk
  accelerationBoost: number;

  // Traction = Based on volatility and diversification
  // Lower volatility = better traction
  traction: number;

  // Durability = Drawdown tolerance
  // How much damage the car can take before failure
  durability: number;

  // Recovery Drag = Extra resistance when in drawdown
  // The deeper the hole, the harder to climb out
  recoveryDrag: number;

  // Engine Temperature = Leverage stress
  // Over-leveraged = overheating
  engineTemperature: number;

  // Fuel Level = Realized P&L
  // Profits refill fuel, losses drain it
  fuelLevel: number;
}

// Road Conditions from Market State
// Based on Market Physics in CONCEPTS.md
export interface RoadConditions {
  // Surface Quality (ATR-based)
  // Higher ATR = rougher road
  roughness: number;

  // Visibility (Volatility-based, like VIX)
  // Higher volatility = more fog
  visibility: number;

  // Slope (MA slope / Daily Return)
  // Positive = uphill, Negative = downhill
  slope: number;

  // Grip Level (RSI-based)
  // Extreme RSI = slippery edges
  grip: number;

  // Road Width (Volume-based)
  // Higher volume = wider road
  width: number;

  // Weather Condition (Market Regime)
  weather: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'foggy';
}

// Candle Pattern for road shape generation
export type CandlePattern =
  | 'bullish_engulfing'
  | 'bearish_engulfing'
  | 'hammer'
  | 'shooting_star'
  | 'doji'
  | 'marubozu_bull'
  | 'marubozu_bear'
  | 'morning_star'
  | 'evening_star'
  | 'neutral';

// Road segment generated from a candle
export interface RoadSegment {
  pattern: CandlePattern;
  slope: number;           // -32 to +32
  roughness: number;       // 0 to 1
  width: number;           // Road width multiplier
  hasObstacle: boolean;    // Long wick = obstacle
  hasBump: boolean;        // Upper wick = bump
  hasPothole: boolean;     // Lower wick = pothole
}

// ============================================
// BACKTESTING ENGINE TYPES
// ============================================

// Re-export skill types for convenience
export type { SkillState, HedgeState, HedgeType } from '../skills/types';
export { INITIAL_SKILL_STATE, HEDGE_CONFIGS } from '../skills/types';

// Direction of a position
export type PositionDirection = 'long' | 'short';

// Instrument type - asset is the main traded instrument, index is for hedging
export type InstrumentType = 'asset' | 'index';

// Individual position in the portfolio
export interface Position {
  id: string;                    // Unique identifier
  direction: PositionDirection;  // long or short
  entryPrice: number;            // Price when opened
  entryIndex: number;            // Bar index when opened
  entryTime: string;             // Date/time when opened
  size: number;                  // Size as fraction of portfolio (0-1)
  sizeInDollars: number;         // Actual dollar value of the position
  currentPrice: number;          // Current market price
  unrealizedPnL: number;         // Current unrealized P&L in dollars
  unrealizedPnLPercent: number;  // Current unrealized P&L in percent
  leverage: number;              // Leverage applied to this position

  // Hedge-related fields
  instrument: InstrumentType;    // 'asset' for regular, 'index' for hedge positions
  isHedge: boolean;              // True if this is a hedge position
  beta?: number;                 // Beta used for hedge sizing (only for hedges)
  hedgesPositionId?: string;     // ID of the position this hedge protects (only for hedges)
}

// Portfolio state - tracks all positions and accumulated returns
export interface PortfolioState {
  // Capital
  initialCapital: number;        // Starting capital
  cash: number;                  // Available cash
  equity: number;                // Total portfolio value (cash + positions)

  // Positions
  positions: Position[];         // Array of open positions
  closedPositions: ClosedPosition[]; // History of closed positions

  // Aggregate metrics
  totalExposure: number;         // Sum of all position sizes (0-1+)
  totalUnrealizedPnL: number;    // Sum of all unrealized P&L
  totalRealizedPnL: number;      // Sum of all realized P&L

  // Performance tracking
  accumulatedReturn: number;     // Total return since start (percent)
  accumulatedReturnDollar: number; // Total return since start (dollars)

  // Risk metrics
  drawdown: number;              // Current drawdown from peak
  maxDrawdown: number;           // Maximum drawdown seen
  peakEquity: number;            // Highest equity achieved
  recoveryNeeded: number;        // Percentage gain needed to recover from drawdown

  // Stress indicators (with loss aversion)
  marginUsage: number;           // How much margin is being used
  stressLevel: number;           // 0-1 stress indicator (includes 2.25x loss aversion)
  rawStress: number;             // Raw stress before loss aversion applied

  // Car Physics State (derived from portfolio)
  carPhysics: CarPhysics;

  // Skills State
  skillState: import('../skills/types').SkillState;
}

// Closed position record
export interface ClosedPosition {
  id: string;
  direction: PositionDirection;
  entryPrice: number;
  entryIndex: number;
  exitPrice: number;
  exitIndex: number;
  size: number;
  sizeInDollars: number;         // Actual dollar value of the position
  realizedPnL: number;
  realizedPnLPercent: number;
  holdingPeriod: number;         // Number of bars held

  // Hedge-related fields
  instrument: InstrumentType;    // 'asset' for regular, 'index' for hedge positions
  isHedge: boolean;              // True if this was a hedge position
}

// Backtesting tick - represents one unit of time
export interface BacktestTick {
  index: number;                 // Current bar index
  timestamp: string;             // Current time
  price: number;                 // Current price
  portfolioValue: number;        // Portfolio value at this tick
  accumulatedReturn: number;     // Accumulated return at this tick
  roadHeight: number;            // Road height derived from accumulated return

  // Road segment for this tick
  roadSegment: RoadSegment;

  // Road conditions at this tick
  roadConditions: RoadConditions;
}

// Backtest results summary
export interface BacktestSummary {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
}

// Legacy single position state (for backwards compatibility)
export interface PositionState {
  isOpen: boolean;
  entryPrice: number;
  entryIndex: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  size: number;
  exposure: number;
}

export interface WealthState {
  currentWealth: number;
  startingWealth: number;
  targetWealth: number;
  leverage: number;
  cashBuffer: number;
  stressLevel: number;
  drawdown: number;
  allTimeHigh: number;
  isInRecovery: boolean;
}

export interface VehicleState {
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  isOnGround: boolean;
  isFlipped: boolean;
}

// Trading actions
export type TradeAction = 'buy' | 'sell' | 'close' | 'close_all';

export interface TradeOrder {
  action: TradeAction;
  direction?: PositionDirection;  // For buy/sell
  size: number;                   // 0-1 as percentage of available capital
  price: number;
  index: number;
  positionId?: string;            // For closing specific position
  leverage?: number;              // Optional leverage for this trade
}

export interface GameSettings {
  selectedVehicle: string;
  selectedDataset: string;
  viewMode: ViewMode;
  showFogOfWar: boolean;
  soundEnabled: boolean;
}

export interface StrategyPreset {
  name: string;
  emoji: string;
  description: string;
  leverage: number;
  cashBuffer: number;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    name: 'Conservative',
    emoji: '🐢',
    description: 'Low risk, steady growth',
    leverage: 1.0,
    cashBuffer: 0.3,
  },
  {
    name: 'Balanced',
    emoji: '⚖️',
    description: 'Moderate risk and reward',
    leverage: 1.5,
    cashBuffer: 0.2,
  },
  {
    name: 'Aggressive',
    emoji: '🚀',
    description: 'Higher risk, higher potential',
    leverage: 2.0,
    cashBuffer: 0.1,
  },
  {
    name: 'YOLO',
    emoji: '🎰',
    description: 'Maximum risk, maximum potential',
    leverage: 3.0,
    cashBuffer: 0.0,
  },
];
