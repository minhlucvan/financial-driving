/**
 * Hedge Skill Tests
 *
 * Tests for the hedge skill that creates SHORT positions on the index.
 * A hedge is a real position, not an abstract insurance mechanism.
 */

import { describe, it, expect } from 'vitest';
import {
  activateHedge,
  processHedges,
  canActivateHedge,
  getActiveHedgeCoverage,
  getTotalHedgeCost,
  getTotalHedgeSize,
  getEffectiveHedgeRatio,
  type ActivateHedgeParams,
  type ProcessHedgeParams,
} from './HedgeSkill';
import {
  HEDGE_CONFIGS,
  INITIAL_SKILL_STATE,
  type HedgeState,
  type SkillState,
} from './types';

// ============================================
// TEST FIXTURES
// ============================================

function createTestSkillState(overrides: Partial<SkillState> = {}): SkillState {
  return {
    ...INITIAL_SKILL_STATE,
    ...overrides,
  };
}

function createActiveHedge(overrides: Partial<HedgeState> = {}): HedgeState {
  return {
    isActive: true,
    type: 'basic',
    positionId: 'hedge_test_123',
    beta: 0.7,
    hedgeSize: 3500,
    entryPrice: 100,
    costPaid: 17.5,
    remainingCandles: 5,
    activatedAt: 0,
    // Legacy fields
    coverage: 0.7,
    triggerPrice: 100,
    payoutAccumulated: 0,
    ...overrides,
  };
}

// ============================================
// HEDGE ACTIVATION TESTS
// ============================================

describe('Hedge Activation', () => {
  describe('activateHedge', () => {
    it('should activate basic hedge successfully', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(true);
      expect(result.event.type).toBe('hedge_activated');
      expect(result.newState.activeHedges).toHaveLength(1);
      expect(result.newState.activeHedges![0].type).toBe('basic');
      expect(result.newState.activeHedges![0].beta).toBe(0.7);
    });

    it('should calculate hedge size based on beta', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000, // $5000 position
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(true);
      // Hedge size = positionValue * beta = 5000 * 0.7 = 3500
      expect(result.newState.activeHedges![0].hedgeSize).toBe(3500);
    });

    it('should calculate transaction cost correctly', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000, // $5000 position
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(true);
      const event = result.event as any;
      // Basic hedge: beta=0.7, cost=0.5%
      // Hedge size = 5000 * 0.7 = 3500
      // Cost = 3500 * 0.005 = 17.5
      expect(event.costPaid).toBe(17.5);
    });

    it('should create position info for the short index position', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(true);
      expect(result.newPosition).toBeDefined();
      expect(result.newPosition!.direction).toBe('short');
      expect(result.newPosition!.instrument).toBe('index');
      expect(result.newPosition!.isHedge).toBe(true);
      expect(result.newPosition!.beta).toBe(0.7);
      expect(result.newPosition!.sizeInDollars).toBe(3500);
    });

    it('should fail if no significant position', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 50, // Too small (< 100)
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(false);
      expect(result.event.type).toBe('hedge_failed');
      expect((result.event as any).reason).toBe('no_position');
    });

    it('should fail if on cooldown', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 3, // 3 candles remaining
      });

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('cooldown');
    });

    it('should fail if max hedges reached', () => {
      const existingHedges = [
        createActiveHedge(),
        createActiveHedge({ positionId: 'hedge_test_456' }),
      ];
      const skillState = createTestSkillState({
        activeHedges: existingHedges,
        maxHedges: 2,
      });

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('max_hedges');
    });

    it('should fail if insufficient funds (cost > 5% portfolio)', () => {
      const skillState = createTestSkillState();

      // Position value of 100000 with beta=0.7 = 70000 hedge
      // Cost = 70000 * 0.005 = 350
      // But portfolio is only 1000, so 350 > 5% of 1000 (50)
      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 100000,
        portfolioValue: 1000, // Small portfolio
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('insufficient_funds');
    });

    it('should set hedge duration from config', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.newState.activeHedges![0].remainingCandles).toBe(
        HEDGE_CONFIGS.basic.duration
      );
    });

    it('should activate different hedge types with correct beta', () => {
      const skillState = createTestSkillState({ playerLevel: 15 }); // High level for all hedges

      const tightResult = activateHedge({
        hedgeType: 'tight',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(tightResult.newState.activeHedges![0].beta).toBe(
        HEDGE_CONFIGS.tight.beta
      );
    });

    it('should fail if hedge type is locked by level', () => {
      const skillState = createTestSkillState({ playerLevel: 1 }); // Low level

      const result = activateHedge({
        hedgeType: 'dynamic', // Requires level 15
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.success).toBe(false);
      expect((result.event as any).reason).toBe('locked');
    });

    it('should record activation time', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 42,
        skillState,
      });

      expect(result.newState.activeHedges![0].activatedAt).toBe(42);
    });

    it('should store entry price', () => {
      const skillState = createTestSkillState();

      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 150,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(result.newState.activeHedges![0].entryPrice).toBe(150);
    });
  });
});

// ============================================
// HEDGE PROCESSING TESTS
// ============================================

describe('Hedge Processing', () => {
  describe('processHedges', () => {
    it('should decrement remaining candles', () => {
      const hedge = createActiveHedge({ remainingCandles: 5 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      expect(result.newState.activeHedges![0].remainingCandles).toBe(4);
    });

    it('should expire hedge when remaining candles reach 0', () => {
      const hedge = createActiveHedge({ remainingCandles: 1 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      expect(result.newState.activeHedges).toHaveLength(0);
      expect(result.hedgesExpired).toHaveLength(1);
      expect(result.hedgesToClose).toContain(hedge.positionId);
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'hedge_expired' })
      );
    });

    it('should provide position ID for closing', () => {
      const hedge = createActiveHedge({
        remainingCandles: 1,
        positionId: 'hedge_to_close_123',
      });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      expect(result.hedgesToClose).toContain('hedge_to_close_123');
    });

    it('should use getPositionPnL callback for realized P&L', () => {
      const hedge = createActiveHedge({ remainingCandles: 1 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
        getPositionPnL: (positionId) => 500, // $500 profit from short
      });

      const expiredEvent = result.events.find(e => e.type === 'hedge_expired');
      expect((expiredEvent as any).realizedPnL).toBe(500);
      expect((expiredEvent as any).wasUseful).toBe(true);
    });

    it('should decrement cooldown each tick when no active hedges', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 5,
        activeHedges: [],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      expect(result.newState.hedgeCooldown).toBe(4);
    });

    it('should not go below 0 cooldown', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 0,
        activeHedges: [],
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      expect(result.newState.hedgeCooldown).toBe(0);
    });

    it('should process multiple hedges', () => {
      const hedges = [
        createActiveHedge({ remainingCandles: 3, positionId: 'hedge_1' }),
        createActiveHedge({ remainingCandles: 5, positionId: 'hedge_2' }),
      ];
      const skillState = createTestSkillState({
        activeHedges: hedges,
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      // Both hedges should be updated
      expect(result.newState.activeHedges).toHaveLength(2);
      expect(result.newState.activeHedges![0].remainingCandles).toBe(2);
      expect(result.newState.activeHedges![1].remainingCandles).toBe(4);
    });

    it('should set cooldown when hedge expires', () => {
      const hedge = createActiveHedge({ remainingCandles: 1, type: 'basic' });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
        hedgeCooldown: 0,
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      // Basic hedge has cooldown of 5
      expect(result.newState.hedgeCooldown).toBe(HEDGE_CONFIGS.basic.cooldown);
    });

    it('should apply cooldown reduction from upgrades', () => {
      const hedge = createActiveHedge({ remainingCandles: 1, type: 'basic' });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
        hedgeCooldown: 0,
        hedgeCooldownReduction: 2,
      });

      const result = processHedges({
        currentPrice: 100,
        currentTick: 1,
        skillState,
      });

      // Basic cooldown (5) - reduction (2) = 3, but min is 1
      expect(result.newState.hedgeCooldown).toBe(Math.max(1, HEDGE_CONFIGS.basic.cooldown - 2));
    });
  });
});

// ============================================
// HEDGE CONFIG TESTS
// ============================================

describe('Hedge Configurations', () => {
  it('should have all hedge types defined', () => {
    expect(HEDGE_CONFIGS.basic).toBeDefined();
    expect(HEDGE_CONFIGS.tight).toBeDefined();
    expect(HEDGE_CONFIGS.tail).toBeDefined();
    expect(HEDGE_CONFIGS.dynamic).toBeDefined();
  });

  it('should have valid beta values (0-1)', () => {
    Object.values(HEDGE_CONFIGS).forEach(config => {
      expect(config.beta).toBeGreaterThan(0);
      expect(config.beta).toBeLessThanOrEqual(1);
    });
  });

  it('should have valid cost values', () => {
    Object.values(HEDGE_CONFIGS).forEach(config => {
      expect(config.cost).toBeGreaterThan(0);
      expect(config.cost).toBeLessThan(0.1); // Max 10% cost
    });
  });

  it('should have positive duration', () => {
    Object.values(HEDGE_CONFIGS).forEach(config => {
      expect(config.duration).toBeGreaterThan(0);
    });
  });

  it('should have non-negative cooldown', () => {
    Object.values(HEDGE_CONFIGS).forEach(config => {
      expect(config.cooldown).toBeGreaterThanOrEqual(0);
    });
  });

  it('tight hedge should have higher beta and cost than basic', () => {
    expect(HEDGE_CONFIGS.tight.beta).toBeGreaterThan(HEDGE_CONFIGS.basic.beta);
    expect(HEDGE_CONFIGS.tight.cost).toBeGreaterThan(HEDGE_CONFIGS.basic.cost);
  });

  it('tail hedge should be cheaper than basic', () => {
    expect(HEDGE_CONFIGS.tail.cost).toBeLessThan(HEDGE_CONFIGS.basic.cost);
  });

  it('tail hedge should have longer duration', () => {
    expect(HEDGE_CONFIGS.tail.duration).toBeGreaterThan(HEDGE_CONFIGS.basic.duration);
  });

  it('tail hedge should have lower beta than basic', () => {
    expect(HEDGE_CONFIGS.tail.beta).toBeLessThan(HEDGE_CONFIGS.basic.beta);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  describe('canActivateHedge', () => {
    it('should return true when no cooldown and under max hedges', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 0,
        activeHedges: [],
        maxHedges: 2,
      });

      expect(canActivateHedge(skillState)).toBe(true);
    });

    it('should return false when on cooldown', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 3,
        activeHedges: [],
      });

      expect(canActivateHedge(skillState)).toBe(false);
    });

    it('should return false when max hedges reached', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 0,
        activeHedges: [createActiveHedge(), createActiveHedge({ positionId: 'hedge_2' })],
        maxHedges: 2,
      });

      expect(canActivateHedge(skillState)).toBe(false);
    });
  });

  describe('getActiveHedgeCoverage', () => {
    it('should return 0 with no active hedges', () => {
      const skillState = createTestSkillState({ activeHedges: [] });
      expect(getActiveHedgeCoverage(skillState)).toBe(0);
    });

    it('should return max beta from active hedges', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ beta: 0.5 }),
          createActiveHedge({ beta: 0.8, positionId: 'hedge_2' }),
          createActiveHedge({ beta: 0.3, positionId: 'hedge_3' }),
        ],
      });

      expect(getActiveHedgeCoverage(skillState)).toBe(0.8);
    });
  });

  describe('getTotalHedgeCost', () => {
    it('should return 0 with no hedges', () => {
      const skillState = createTestSkillState({ activeHedges: [] });
      expect(getTotalHedgeCost(skillState)).toBe(0);
    });

    it('should sum all hedge costs', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ costPaid: 100 }),
          createActiveHedge({ costPaid: 150, positionId: 'hedge_2' }),
        ],
      });

      expect(getTotalHedgeCost(skillState)).toBe(250);
    });
  });

  describe('getTotalHedgeSize', () => {
    it('should return 0 with no hedges', () => {
      const skillState = createTestSkillState({ activeHedges: [] });
      expect(getTotalHedgeSize(skillState)).toBe(0);
    });

    it('should sum all hedge sizes', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ hedgeSize: 3500 }),
          createActiveHedge({ hedgeSize: 2000, positionId: 'hedge_2' }),
        ],
      });

      expect(getTotalHedgeSize(skillState)).toBe(5500);
    });
  });

  describe('getEffectiveHedgeRatio', () => {
    it('should return 0 with no hedges', () => {
      const skillState = createTestSkillState({ activeHedges: [] });
      expect(getEffectiveHedgeRatio(skillState)).toBe(0);
    });

    it('should sum all betas for total hedge ratio', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ beta: 0.5 }),
          createActiveHedge({ beta: 0.3, positionId: 'hedge_2' }),
        ],
      });

      expect(getEffectiveHedgeRatio(skillState)).toBe(0.8);
    });

    it('should allow over-hedging (ratio > 1)', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ beta: 0.7 }),
          createActiveHedge({ beta: 0.9, positionId: 'hedge_2' }),
        ],
      });

      expect(getEffectiveHedgeRatio(skillState)).toBe(1.6);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('should handle activation at tick 0', () => {
    const skillState = createTestSkillState();

    const result = activateHedge({
      hedgeType: 'basic',
      currentPrice: 100,
      positionValue: 5000,
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    expect(result.success).toBe(true);
    expect(result.newState.activeHedges![0].activatedAt).toBe(0);
  });

  it('should handle empty activeHedges in processing', () => {
    const skillState = createTestSkillState({
      activeHedges: [],
    });

    const result = processHedges({
      currentPrice: 100,
      currentTick: 1,
      skillState,
    });

    expect(result.hedgesToClose).toHaveLength(0);
    expect(result.newState.activeHedges).toHaveLength(0);
  });

  it('should apply cost reduction from upgrades', () => {
    const skillState = createTestSkillState({
      hedgeCostReduction: 0.002, // 0.2% reduction
    });

    const result = activateHedge({
      hedgeType: 'basic', // 0.5% base cost
      currentPrice: 100,
      positionValue: 5000, // hedge size = 5000 * 0.7 = 3500
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    // Cost should be (0.5% - 0.2%) = 0.3% of 3500 = 10.5
    expect((result.event as any).costPaid).toBe(10.5);
  });

  it('should enforce minimum cost even with high reduction', () => {
    const skillState = createTestSkillState({
      hedgeCostReduction: 0.01, // More than basic cost
    });

    const result = activateHedge({
      hedgeType: 'basic', // 0.5% base cost
      currentPrice: 100,
      positionValue: 5000, // hedge size = 5000 * 0.7 = 3500
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    // Minimum cost is 0.1%, so 3500 * 0.001 = 3.5
    expect((result.event as any).costPaid).toBe(3.5);
  });

  it('should generate unique position IDs', () => {
    const skillState = createTestSkillState();

    const result1 = activateHedge({
      hedgeType: 'basic',
      currentPrice: 100,
      positionValue: 5000,
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    const result2 = activateHedge({
      hedgeType: 'basic',
      currentPrice: 100,
      positionValue: 5000,
      portfolioValue: 10000,
      currentTick: 1,
      skillState,
    });

    expect(result1.newState.activeHedges![0].positionId).not.toBe(
      result2.newState.activeHedges![0].positionId
    );
  });
});

// ============================================
// INITIAL STATE TESTS
// ============================================

describe('Initial Skill State', () => {
  it('should have empty active hedges', () => {
    expect(INITIAL_SKILL_STATE.activeHedges).toEqual([]);
  });

  it('should have zero cooldown', () => {
    expect(INITIAL_SKILL_STATE.hedgeCooldown).toBe(0);
  });

  it('should allow 2 simultaneous hedges by default', () => {
    expect(INITIAL_SKILL_STATE.maxHedges).toBe(2);
  });

  it('should start at player level 1', () => {
    expect(INITIAL_SKILL_STATE.playerLevel).toBe(1);
  });

  it('should have no skill upgrades initially', () => {
    expect(INITIAL_SKILL_STATE.hedgeCostReduction).toBe(0);
    expect(INITIAL_SKILL_STATE.hedgeCooldownReduction).toBe(0);
  });
});
