/**
 * Hedge Skill Implementation
 *
 * Allows players to protect against losses by paying a premium.
 * If price moves against position, hedge absorbs percentage of loss.
 * If price moves with position, hedge premium is lost.
 */

import type {
  HedgeState,
  HedgeType,
  HedgeConfig,
  HedgeResult,
  SkillState,
  HedgeActivatedEvent,
  HedgeTriggeredEvent,
  HedgeExpiredEvent,
  HedgeFailedEvent,
} from './types';
import { HEDGE_CONFIGS, INITIAL_SKILL_STATE } from './types';

// ============================================
// HEDGE ACTIVATION
// ============================================

export interface ActivateHedgeParams {
  hedgeType: HedgeType;
  currentPrice: number;
  positionValue: number;      // Current position size in $
  portfolioValue: number;     // Total portfolio value
  currentTick: number;
  skillState: SkillState;
}

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

  // Calculate cost (with player upgrades)
  const effectiveCost = Math.max(0.005, config.cost - skillState.hedgeCostReduction);
  const costPaid = Math.abs(positionValue) * effectiveCost;

  // Check if player can afford
  if (costPaid > portfolioValue * 0.1) {
    return {
      success: false,
      event: {
        type: 'hedge_failed',
        reason: 'insufficient_funds',
        message: `Hedge cost $${costPaid.toFixed(0)} exceeds 10% of portfolio`,
      },
      newState: {},
    };
  }

  // Create hedge state
  const newHedge: HedgeState = {
    isActive: true,
    type: hedgeType,
    coverage: config.coverage,
    costPaid,
    remainingCandles: config.duration,
    triggerPrice: currentPrice,
    payoutAccumulated: 0,
    activatedAt: currentTick,
  };

  const event: HedgeActivatedEvent = {
    type: 'hedge_activated',
    hedge: newHedge,
    costPaid,
    message: `${config.name} activated! Cost: $${costPaid.toFixed(0)} | Coverage: ${(config.coverage * 100).toFixed(0)}% | Duration: ${config.duration} candles`,
  };

  return {
    success: true,
    event,
    newState: {
      activeHedges: [...skillState.activeHedges, newHedge],
      lastSkillMessage: event.message,
      lastSkillMessageTime: Date.now(),
    },
  };
}

// ============================================
// HEDGE PROCESSING (Per Tick)
// ============================================

export interface ProcessHedgeParams {
  priceChange: number;        // Percentage change this tick (-0.05 = -5%)
  positionValue: number;      // Current position value
  positionDirection: 'long' | 'short' | 'none';
  currentTick: number;
  skillState: SkillState;
}

export interface ProcessHedgeResult {
  lossAbsorbed: number;       // Amount of loss absorbed by hedges
  hedgesTriggered: HedgeState[];
  hedgesExpired: HedgeState[];
  events: (HedgeTriggeredEvent | HedgeExpiredEvent)[];
  newState: Partial<SkillState>;
}

export function processHedges(params: ProcessHedgeParams): ProcessHedgeResult {
  const {
    priceChange,
    positionValue,
    positionDirection,
    currentTick,
    skillState,
  } = params;

  let totalLossAbsorbed = 0;
  const hedgesTriggered: HedgeState[] = [];
  const hedgesExpired: HedgeState[] = [];
  const events: (HedgeTriggeredEvent | HedgeExpiredEvent)[] = [];
  const updatedHedges: HedgeState[] = [];

  // Determine if this tick is a loss for the position
  const isLoss = (positionDirection === 'long' && priceChange < 0) ||
                 (positionDirection === 'short' && priceChange > 0);
  const rawLoss = isLoss ? Math.abs(positionValue * priceChange) : 0;

  for (const hedge of skillState.activeHedges) {
    // Decrement remaining candles
    const updatedHedge: HedgeState = {
      ...hedge,
      remainingCandles: hedge.remainingCandles - 1,
    };

    // Check if hedge should trigger (absorb loss)
    if (isLoss && rawLoss > 0 && hedge.isActive) {
      let coverage = hedge.coverage;

      // Tail hedge: extra coverage for large losses
      if (hedge.type === 'tail' && Math.abs(priceChange) > 0.20) {
        coverage = 1.50; // 150% coverage on crashes > 20%
      }

      const lossAbsorbed = rawLoss * coverage;
      totalLossAbsorbed += lossAbsorbed;
      updatedHedge.payoutAccumulated += lossAbsorbed;

      hedgesTriggered.push(updatedHedge);

      events.push({
        type: 'hedge_triggered',
        hedge: updatedHedge,
        lossAbsorbed,
        netLoss: rawLoss - lossAbsorbed,
        message: `Hedge absorbed $${lossAbsorbed.toFixed(0)}! Net loss: $${(rawLoss - lossAbsorbed).toFixed(0)} (saved ${(coverage * 100).toFixed(0)}%)`,
      });
    }

    // Check if hedge expired
    if (updatedHedge.remainingCandles <= 0) {
      updatedHedge.isActive = false;
      hedgesExpired.push(updatedHedge);

      const wasUseful = updatedHedge.payoutAccumulated > 0;
      events.push({
        type: 'hedge_expired',
        hedge: updatedHedge,
        wasUseful,
        message: wasUseful
          ? `Hedge expired. Absorbed total: $${updatedHedge.payoutAccumulated.toFixed(0)} | Cost: $${updatedHedge.costPaid.toFixed(0)}`
          : `Hedge expired unused. Cost of insurance: $${updatedHedge.costPaid.toFixed(0)}`,
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
    lossAbsorbed: totalLossAbsorbed,
    hedgesTriggered,
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

  // Return max coverage from active hedges
  return Math.max(...skillState.activeHedges.map(h => h.coverage));
}

export function getTotalHedgeCost(skillState: SkillState): number {
  return skillState.activeHedges.reduce((sum, h) => sum + h.costPaid, 0);
}
