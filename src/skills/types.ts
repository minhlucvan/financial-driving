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
  coverage: number;      // 0-1 (percentage of losses covered)
  cost: number;          // Percentage of position value
  duration: number;      // Candles the hedge lasts
  cooldown: number;      // Candles before can use again
  unlockLevel: number;   // Player level required
}

export interface HedgeState {
  isActive: boolean;
  type: HedgeType;
  coverage: number;
  costPaid: number;           // Premium paid when activated
  remainingCandles: number;
  triggerPrice: number;       // Price at activation
  payoutAccumulated: number;  // Running payout if triggered
  activatedAt: number;        // Tick when activated
}

export const HEDGE_CONFIGS: Record<HedgeType, HedgeConfig> = {
  basic: {
    type: 'basic',
    name: 'Basic Hedge',
    description: 'Like buying a cheap PUT - 70% coverage',
    coverage: 0.70,
    cost: 0.02,      // 2% of position
    duration: 5,     // 5 candles
    cooldown: 5,     // 5 candles after expiry
    unlockLevel: 1,
  },
  tight: {
    type: 'tight',
    name: 'Tight Hedge',
    description: 'ATM PUT option - expensive but strong',
    coverage: 0.90,
    cost: 0.04,      // 4% of position
    duration: 3,     // 3 candles
    cooldown: 4,
    unlockLevel: 5,
  },
  tail: {
    type: 'tail',
    name: 'Tail Hedge',
    description: 'OTM PUT - cheap crash insurance',
    coverage: 0.50,  // Base coverage, increases for large losses
    cost: 0.01,      // 1% of position
    duration: 10,    // 10 candles
    cooldown: 8,
    unlockLevel: 10,
  },
  dynamic: {
    type: 'dynamic',
    name: 'Dynamic Hedge',
    description: 'Systematic hedging - adjusts to volatility',
    coverage: 0.75,  // Base, scales with VIX
    cost: 0.025,     // Base, scales with VIX
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
  costPaid: number;
  message: string;
}

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
  wasUseful: boolean;  // Did it absorb any losses?
  message: string;
}

export interface HedgeFailedEvent {
  type: 'hedge_failed';
  reason: 'cooldown' | 'max_hedges' | 'no_position' | 'insufficient_funds' | 'locked';
  message: string;
}

export type SkillEvent =
  | HedgeActivatedEvent
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
}
