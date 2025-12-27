/**
 * Hedge Skill Implementation
 *
 * A hedge is a SHORT position on the index instrument.
 * The position size is calculated based on current holdings and beta.
 * When the market goes down, the short position profits, offsetting losses.
 */

import type {
  HedgeState,
  HedgeType,
  HedgeConfig,
  HedgeResult,
  SkillState,
  HedgeActivatedEvent,
  HedgeExpiredEvent,
  HedgeFailedEvent,
} from './types';
import { HEDGE_CONFIGS, INITIAL_SKILL_STATE } from './types';

// ============================================
// HEDGE POSITION ID GENERATION
// ============================================

function generateHedgePositionId(): string {
  return `hedge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// HEDGE ACTIVATION
// ============================================

export interface ActivateHedgeParams {
  hedgeType: HedgeType;
  currentPrice: number;
  positionValue: number;      // Current total position value in $
  portfolioValue: number;     // Total portfolio value
  currentTick: number;
  skillState: SkillState;
}

/**
 * Activate a hedge by opening a SHORT position on the index.
 *
 * The hedge size is calculated as: hedgeSize = positionValue * beta
 *
 * For example, with beta = 0.7 and $10,000 in positions:
 * - Hedge size = $10,000 * 0.7 = $7,000 SHORT on index
 * - If market drops 10%, long positions lose $1,000
 * - But short hedge gains $700, net loss = $300 (70% protection)
 */
export function activateHedge(params: ActivateHedgeParams): HedgeResult {
  const {
    hedgeType,
    currentPrice,
    positionValue,
    portfolioValue,
    currentTick,
    skillState,
  } = params;

  const config = HEDGE_CONFIGS[hedgeType];

  // Check if hedge type is unlocked
  if (skillState.playerLevel < config.unlockLevel) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'locked',
        message: `${config.name} unlocks at level ${config.unlockLevel}`,
      },
      newState: {},
    };
  }

  // Check cooldown
  if (skillState.hedgeCooldown > 0) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'cooldown',
        message: `Hedge on cooldown: ${skillState.hedgeCooldown} candles remaining`,
      },
      newState: {},
    };
  }

  // Check max hedges
  if (skillState.activeHedges.length >= skillState.maxHedges) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'max_hedges',
        message: `Maximum ${skillState.maxHedges} hedges active`,
      },
      newState: {},
    };
  }

  // Check if there's a position to hedge
  if (Math.abs(positionValue) < 100) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'no_position',
        message: 'No significant position to hedge',
      },
      newState: {},
    };
  }

  // Calculate hedge size based on position value and beta
  const hedgeSize = Math.abs(positionValue) * config.beta;
  const hedgeSizeAsFraction = hedgeSize / portfolioValue;

  // Calculate transaction cost
  const effectiveCost = Math.max(0.001, config.cost - skillState.hedgeCostReduction);
  const costPaid = hedgeSize * effectiveCost;

  // Check if player can afford the transaction cost
  if (costPaid > portfolioValue * 0.05) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'insufficient_funds',
        message: `Hedge cost $${costPaid.toFixed(0)} exceeds 5% of portfolio`,
      },
      newState: {},
    };
  }

  // Generate position ID for the short index position
  const positionId = generateHedgePositionId();

  // Create hedge state that tracks the position
  const newHedge: HedgeState = {
    isActive: true,
    type: hedgeType,
    positionId,
    beta: config.beta,
    hedgeSize,
    entryPrice: currentPrice,
    costPaid,
    remainingCandles: config.duration,
    activatedAt: currentTick,
    // Legacy fields
    coverage: config.beta,
    triggerPrice: currentPrice,
    payoutAccumulated: 0,
  };

  const event: HedgeActivatedEvent = {
    type: 'hedge_activated',
    hedge: newHedge,
    position: {
      id: positionId,
      direction: 'short',
      size: hedgeSizeAsFraction,
      sizeInDollars: hedgeSize,
      entryPrice: currentPrice,
      beta: config.beta,
    },
    costPaid,
    message: `${config.name} activated! SHORT $${hedgeSize.toFixed(0)} on index (β=${config.beta}) | Cost: $${costPaid.toFixed(0)} | Duration: ${config.duration} candles`,
  };

  return {
    success: true,
    event,
    newState: {
      activeHedges: [...skillState.activeHedges, newHedge],
      lastSkillMessage: event.message,
      lastSkillMessageTime: Date.now(),
    },
    // Position to be created by AppStateProvider
    newPosition: {
      id: positionId,
      direction: 'short',
      instrument: 'index',
      size: hedgeSizeAsFraction,
      sizeInDollars: hedgeSize,
      entryPrice: currentPrice,
      beta: config.beta,
      isHedge: true,
    },
  };
}

// ============================================
// HEDGE PROCESSING (Per Tick)
// ============================================

export interface ProcessHedgeParams {
  currentPrice: number;
  currentTick: number;
  skillState: SkillState;
  // Callback to get position P&L
  getPositionPnL?: (positionId: string) => number;
}

export interface ProcessHedgeResult {
  hedgesToClose: string[];      // Position IDs to close
  hedgesExpired: HedgeState[];
  events: HedgeExpiredEvent[];
  newState: Partial<SkillState>;
}

/**
 * Process hedges each tick.
 *
 * The hedge position P&L is handled automatically by the position system.
 * This function only manages the duration countdown and triggers auto-close.
 */
export function processHedges(params: ProcessHedgeParams): ProcessHedgeResult {
  const {
    currentPrice,
    currentTick,
    skillState,
    getPositionPnL,
  } = params;

  const hedgesToClose: string[] = [];
  const hedgesExpired: HedgeState[] = [];
  const events: HedgeExpiredEvent[] = [];
  const updatedHedges: HedgeState[] = [];

  for (const hedge of skillState.activeHedges) {
    // Decrement remaining candles
    const updatedHedge: HedgeState = {
      ...hedge,
      remainingCandles: hedge.remainingCandles - 1,
    };

    // Check if hedge expired (duration ended)
    if (updatedHedge.remainingCandles <= 0) {
      updatedHedge.isActive = false;
      hedgesExpired.push(updatedHedge);
      hedgesToClose.push(hedge.positionId);

      // Get realized P&L from the position if available
      const realizedPnL = getPositionPnL ? getPositionPnL(hedge.positionId) : 0;
      const wasUseful = realizedPnL > 0;

      events.push({
        type: 'hedge_expired',
        hedge: updatedHedge,
        positionId: hedge.positionId,
        realizedPnL,
        wasUseful,
        message: wasUseful
          ? `Hedge closed with profit: $${realizedPnL.toFixed(0)} | Cost: $${hedge.costPaid.toFixed(0)} | Net: $${(realizedPnL - hedge.costPaid).toFixed(0)}`
          : `Hedge closed with loss: $${realizedPnL.toFixed(0)} | Cost: $${hedge.costPaid.toFixed(0)} | Total cost: $${(hedge.costPaid - realizedPnL).toFixed(0)}`,
      });
    } else {
      updatedHedges.push(updatedHedge);
    }
  }

  // Update cooldown
  let newCooldown = skillState.hedgeCooldown;
  if (hedgesExpired.length > 0) {
    // Set cooldown based on expired hedge type
    const expiredConfig = HEDGE_CONFIGS[hedgesExpired[0].type];
    const effectiveCooldown = Math.max(1, expiredConfig.cooldown - skillState.hedgeCooldownReduction);
    newCooldown = Math.max(newCooldown, effectiveCooldown);
  } else if (newCooldown > 0) {
    newCooldown -= 1;
  }

  return {
    hedgesToClose,
    hedgesExpired,
    events,
    newState: {
      activeHedges: updatedHedges,
      hedgeCooldown: newCooldown,
      lastSkillMessage: events.length > 0 ? events[events.length - 1].message : skillState.lastSkillMessage,
      lastSkillMessageTime: events.length > 0 ? Date.now() : skillState.lastSkillMessageTime,
    },
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export function getAvailableHedgeTypes(playerLevel: number): HedgeConfig[] {
  return Object.values(HEDGE_CONFIGS).filter(
    config => config.unlockLevel <= playerLevel
  );
}

export function canActivateHedge(skillState: SkillState): boolean {
  return (
    skillState.hedgeCooldown <= 0 &&
    skillState.activeHedges.length < skillState.maxHedges
  );
}

export function getHedgeCooldownRemaining(skillState: SkillState): number {
  return skillState.hedgeCooldown;
}

export function getActiveHedgeCoverage(skillState: SkillState): number {
  if (skillState.activeHedges.length === 0) return 0;

  // Return max beta from active hedges
  return Math.max(...skillState.activeHedges.map(h => h.beta));
}

export function getTotalHedgeSize(skillState: SkillState): number {
  return skillState.activeHedges.reduce((sum, h) => sum + h.hedgeSize, 0);
}

export function getTotalHedgeCost(skillState: SkillState): number {
  return skillState.activeHedges.reduce((sum, h) => sum + h.costPaid, 0);
}

/**
 * Calculate the effective hedge ratio for display
 * This shows how much of the position is protected
 */
export function getEffectiveHedgeRatio(skillState: SkillState): number {
  if (skillState.activeHedges.length === 0) return 0;

  // Sum of all betas (can exceed 1 if over-hedged)
  return skillState.activeHedges.reduce((sum, h) => sum + h.beta, 0);
}
