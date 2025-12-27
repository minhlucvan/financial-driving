// Game State Types

export type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'bankrupt';

export type ViewMode = 'split' | 'chart_focus' | 'drive_focus' | 'full_immersion';

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

export interface PositionState {
  isOpen: boolean;
  entryPrice: number;
  entryIndex: number;  // Bar index when position was opened
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  size: number;  // 0 to 1 (percentage of wealth invested)
  exposure: number;  // 0 = all cash (flat road), 1 = fully invested
}

// Trading actions
export type TradeAction = 'buy' | 'sell' | 'close';

export interface TradeOrder {
  action: TradeAction;
  size: number;  // 0-1 as percentage
  price: number;
  index: number;
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
