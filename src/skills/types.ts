/**
 * Skill System Types
 *
 * Skills are active abilities that apply real financial strategies.
 * Each skill has costs, timing, and visual feedback.
 */

// ============================================
// HEDGE SKILL TYPES
// ============================================

export type HedgeType = 'basic' | 'tight' | 'tail' | 'dynamic';

export interface HedgeConfig {
  type: HedgeType;
  name: string;
  description: string;
  beta: number;          // Beta for hedge sizing (hedge_size = position_value * beta)
  cost: number;          // Transaction cost as percentage of hedge value
  duration: number;      // Candles the hedge lasts (position auto-closes)
  cooldown: number;      // Candles before can use again
  unlockLevel: number;   // Player level required
  // Legacy field for backward compatibility
  coverage: number;      // Approximate coverage (same as beta for display)
}

/**
 * HedgeState now tracks a SHORT position on the index
 * The hedge is a real position, not an abstract insurance
 */
export interface HedgeState {
  isActive: boolean;
  type: HedgeType;
  positionId: string;         // ID of the short index position
  beta: number;               // Beta used for sizing
  hedgeSize: number;          // Size of the short position (in $)
  entryPrice: number;         // Price when hedge position opened
  costPaid: number;           // Transaction cost paid
  remainingCandles: number;   // Candles until auto-close
  activatedAt: number;        // Tick when activated
  hedgesPositionId?: string;  // ID of the position being hedged (if specific)
  // Legacy fields for backward compatibility
  coverage: number;
  triggerPrice: number;
  payoutAccumulated: number;
}

export const HEDGE_CONFIGS: Record<HedgeType, HedgeConfig> = {
  basic: {
    type: 'basic',
    name: 'Basic Hedge',
    description: 'Short index at 70% of position - moderate protection',
    beta: 0.70,          // 70% hedge ratio
    coverage: 0.70,      // Same as beta for display
    cost: 0.005,         // 0.5% transaction cost
    duration: 5,         // 5 candles
    cooldown: 5,         // 5 candles after close
    unlockLevel: 1,
  },
  tight: {
    type: 'tight',
    name: 'Tight Hedge',
    description: 'Short index at 90% - near-full protection',
    beta: 0.90,          // 90% hedge ratio
    coverage: 0.90,
    cost: 0.008,         // 0.8% transaction cost
    duration: 3,         // 3 candles
    cooldown: 4,
    unlockLevel: 5,
  },
  tail: {
    type: 'tail',
    name: 'Tail Hedge',
    description: 'Short index at 50% - cheap partial protection',
    beta: 0.50,          // 50% hedge ratio
    coverage: 0.50,
    cost: 0.003,         // 0.3% transaction cost
    duration: 10,        // 10 candles
    cooldown: 8,
    unlockLevel: 10,
  },
  dynamic: {
    type: 'dynamic',
    name: 'Dynamic Hedge',
    description: 'Short index at 75% - balanced protection',
    beta: 0.75,          // 75% hedge ratio
    coverage: 0.75,
    cost: 0.006,         // 0.6% transaction cost
    duration: 7,
    cooldown: 3,
    unlockLevel: 15,
  },
};

// ============================================
// SKILL STATE
// ============================================

export interface SkillState {
  // Hedging
  activeHedges: HedgeState[];
  hedgeCooldown: number;      // Candles until hedge available
  maxHedges: number;          // Max simultaneous hedges (default 2)

  // Player progression
  playerLevel: number;
  skillPoints: number;

  // Skill upgrades
  hedgeCostReduction: number;     // 0-0.5% reduction
  hedgeCooldownReduction: number; // 0-2 candles reduction

  // Messages for UI
  lastSkillMessage: string | null;
  lastSkillMessageTime: number;
}

export const INITIAL_SKILL_STATE: SkillState = {
  activeHedges: [],
  hedgeCooldown: 0,
  maxHedges: 2,
  playerLevel: 1,
  skillPoints: 0,
  hedgeCostReduction: 0,
  hedgeCooldownReduction: 0,
  lastSkillMessage: null,
  lastSkillMessageTime: 0,
};

// ============================================
// SKILL EVENTS
// ============================================

export interface HedgeActivatedEvent {
  type: 'hedge_activated';
  hedge: HedgeState;
  position: {
    id: string;
    direction: 'short';
    size: number;        // Size as fraction of portfolio
    sizeInDollars: number;
    entryPrice: number;
    beta: number;
  };
  costPaid: number;
  message: string;
}

export interface HedgeClosedEvent {
  type: 'hedge_closed';
  hedge: HedgeState;
  positionId: string;
  realizedPnL: number;
  message: string;
}

// Legacy event - kept for backward compatibility
export interface HedgeTriggeredEvent {
  type: 'hedge_triggered';
  hedge: HedgeState;
  lossAbsorbed: number;
  netLoss: number;
  message: string;
}

export interface HedgeExpiredEvent {
  type: 'hedge_expired';
  hedge: HedgeState;
  positionId: string;
  realizedPnL: number;
  wasUseful: boolean;  // Did the hedge profit?
  message: string;
}

export interface HedgeFailedEvent {
  type: 'hedge_failed';
  reason: 'cooldown' | 'max_hedges' | 'no_position' | 'insufficient_funds' | 'locked';
  message: string;
}

export type SkillEvent =
  | HedgeActivatedEvent
  | HedgeClosedEvent
  | HedgeTriggeredEvent
  | HedgeExpiredEvent
  | HedgeFailedEvent;

// ============================================
// SKILL RESULT
// ============================================

export interface HedgeResult {
  success: boolean;
  event: SkillEvent;
  newState: Partial<SkillState>;
  // Position to be created (if hedge activated)
  newPosition?: {
    id: string;
    direction: 'short';
    instrument: 'index';
    size: number;
    sizeInDollars: number;
    entryPrice: number;
    beta: number;
    isHedge: true;
    hedgesPositionId?: string;
  };
}
