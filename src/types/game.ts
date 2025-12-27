// Game State Types

export type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'bankrupt';

export type ViewMode = 'split' | 'chart_focus' | 'drive_focus' | 'full_immersion';

// ============================================
// BACKTESTING ENGINE TYPES
// ============================================

// Direction of a position
export type PositionDirection = 'long' | 'short';

// Individual position in the portfolio
export interface Position {
  id: string;                    // Unique identifier
  direction: PositionDirection;  // long or short
  entryPrice: number;            // Price when opened
  entryIndex: number;            // Bar index when opened
  entryTime: string;             // Date/time when opened
  size: number;                  // Size as fraction of portfolio (0-1)
  currentPrice: number;          // Current market price
  unrealizedPnL: number;         // Current unrealized P&L in dollars
  unrealizedPnLPercent: number;  // Current unrealized P&L in percent
  leverage: number;              // Leverage applied to this position
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

  // Stress indicators
  marginUsage: number;           // How much margin is being used
  stressLevel: number;           // 0-1 stress indicator
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
  realizedPnL: number;
  realizedPnLPercent: number;
  holdingPeriod: number;         // Number of bars held
}

// Backtesting tick - represents one unit of time
export interface BacktestTick {
  index: number;                 // Current bar index
  timestamp: string;             // Current time
  price: number;                 // Current price
  portfolioValue: number;        // Portfolio value at this tick
  accumulatedReturn: number;     // Accumulated return at this tick
  roadHeight: number;            // Road height derived from accumulated return
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
