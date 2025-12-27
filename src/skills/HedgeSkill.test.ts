/**
 * Hedge Skill Tests
 *
 * Comprehensive tests for the hedge skill activation and processing.
 */

import { describe, it, expect } from 'vitest';
import {
  activateHedge,
  processHedges,
  canActivateHedge,
  getActiveHedgeCoverage,
  getTotalHedgeCost,
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
    coverage: 0.7,
    costPaid: 100,
    remainingCandles: 5,
    triggerPrice: 100,
    payoutAccumulated: 0,
    activatedAt: 0,
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
      expect(result.newState.activeHedges![0].coverage).toBe(0.7);
    });

    it('should calculate hedge cost correctly', () => {
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
      // Basic hedge: 2% of position value = 5000 * 0.02 = 100
      expect(event.costPaid).toBe(100);
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
        createActiveHedge(),
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

    it('should fail if insufficient funds (cost > 10% portfolio)', () => {
      const skillState = createTestSkillState();

      // Position value of 10000 with 2% cost = 200
      // But portfolio is only 1000, so 200 > 10% of 1000 (100)
      const result = activateHedge({
        hedgeType: 'basic',
        currentPrice: 100,
        positionValue: 10000,
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

    it('should activate different hedge types with correct coverage', () => {
      const skillState = createTestSkillState({ playerLevel: 15 }); // High level for all hedges

      const tightResult = activateHedge({
        hedgeType: 'tight',
        currentPrice: 100,
        positionValue: 5000,
        portfolioValue: 10000,
        currentTick: 10,
        skillState,
      });

      expect(tightResult.newState.activeHedges![0].coverage).toBe(
        HEDGE_CONFIGS.tight.coverage
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
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      expect(result.newState.activeHedges![0].remainingCandles).toBe(4);
    });

    it('should absorb losses for long position when price drops', () => {
      const hedge = createActiveHedge({ coverage: 0.7 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: -0.10, // 10% drop
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      // Loss = 5000 * 0.10 = 500
      // Absorbed = 500 * 0.7 = 350
      expect(result.lossAbsorbed).toBeCloseTo(350, 0);
      expect(result.hedgesTriggered).toHaveLength(1);
    });

    it('should absorb losses for short position when price rises', () => {
      const hedge = createActiveHedge({ coverage: 0.7 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: 0.10, // 10% rise (loss for short)
        positionValue: 5000,
        positionDirection: 'short',
        currentTick: 1,
        skillState,
      });

      expect(result.lossAbsorbed).toBeCloseTo(350, 0);
    });

    it('should not absorb gains for long position', () => {
      const hedge = createActiveHedge({ coverage: 0.7 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: 0.10, // 10% gain (profit for long)
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      expect(result.lossAbsorbed).toBe(0);
      expect(result.hedgesTriggered).toHaveLength(0);
    });

    it('should accumulate payout on hedge', () => {
      const hedge = createActiveHedge({
        coverage: 0.7,
        payoutAccumulated: 100, // Already paid out 100
      });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: -0.10,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      // 100 + 350 = 450
      expect(result.newState.activeHedges![0].payoutAccumulated).toBeCloseTo(450, 0);
    });

    it('should expire hedge when remaining candles reach 0', () => {
      const hedge = createActiveHedge({ remainingCandles: 1 });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      expect(result.newState.activeHedges).toHaveLength(0);
      expect(result.hedgesExpired).toHaveLength(1);
      expect(result.events).toContainEqual(
        expect.objectContaining({ type: 'hedge_expired' })
      );
    });

    it('should decrement cooldown each tick when no active hedges', () => {
      const skillState = createTestSkillState({
        hedgeCooldown: 5,
        activeHedges: [],
      });

      const result = processHedges({
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
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
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      expect(result.newState.hedgeCooldown).toBe(0);
    });

    it('should process multiple hedges', () => {
      const hedges = [
        createActiveHedge({ remainingCandles: 3, coverage: 0.5 }),
        createActiveHedge({ remainingCandles: 5, coverage: 0.3 }),
      ];
      const skillState = createTestSkillState({
        activeHedges: hedges,
      });

      const result = processHedges({
        priceChange: -0.10,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      // Both hedges should be updated
      expect(result.newState.activeHedges).toHaveLength(2);
      expect(result.newState.activeHedges![0].remainingCandles).toBe(2);
      expect(result.newState.activeHedges![1].remainingCandles).toBe(4);

      // Loss = 500, absorbed by both = 500*0.5 + 500*0.3 = 250 + 150 = 400
      expect(result.lossAbsorbed).toBeCloseTo(400, 0);
    });

    it('should track hedge usefulness on expiry', () => {
      const usefulHedge = createActiveHedge({
        remainingCandles: 1,
        payoutAccumulated: 100, // Absorbed some losses
      });
      const uselessHedge = createActiveHedge({
        remainingCandles: 1,
        payoutAccumulated: 0, // Never triggered
      });

      const skillStateUseful = createTestSkillState({
        activeHedges: [usefulHedge],
      });

      const skillStateUseless = createTestSkillState({
        activeHedges: [uselessHedge],
      });

      const resultUseful = processHedges({
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState: skillStateUseful,
      });

      const resultUseless = processHedges({
        priceChange: 0,
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState: skillStateUseless,
      });

      const usefulEvent = resultUseful.events.find(e => e.type === 'hedge_expired');
      const uselessEvent = resultUseless.events.find(e => e.type === 'hedge_expired');

      expect((usefulEvent as any).wasUseful).toBe(true);
      expect((uselessEvent as any).wasUseful).toBe(false);
    });

    it('should provide extra coverage for tail hedge on large drops', () => {
      const hedge = createActiveHedge({
        type: 'tail',
        coverage: 0.5, // Base coverage
      });
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: -0.25, // 25% crash (> 20% threshold)
        positionValue: 5000,
        positionDirection: 'long',
        currentTick: 1,
        skillState,
      });

      // Loss = 5000 * 0.25 = 1250
      // Tail hedge gets 150% coverage on crashes > 20%
      // Absorbed = 1250 * 1.50 = 1875
      expect(result.lossAbsorbed).toBeCloseTo(1875, 0);
    });

    it('should handle no position direction', () => {
      const hedge = createActiveHedge();
      const skillState = createTestSkillState({
        activeHedges: [hedge],
      });

      const result = processHedges({
        priceChange: -0.10,
        positionValue: 0,
        positionDirection: 'none',
        currentTick: 1,
        skillState,
      });

      expect(result.lossAbsorbed).toBe(0);
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

  it('should have valid coverage values (0-1)', () => {
    Object.values(HEDGE_CONFIGS).forEach(config => {
      expect(config.coverage).toBeGreaterThan(0);
      expect(config.coverage).toBeLessThanOrEqual(1);
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

  it('tight hedge should have higher coverage and cost than basic', () => {
    expect(HEDGE_CONFIGS.tight.coverage).toBeGreaterThan(HEDGE_CONFIGS.basic.coverage);
    expect(HEDGE_CONFIGS.tight.cost).toBeGreaterThan(HEDGE_CONFIGS.basic.cost);
  });

  it('tail hedge should be cheaper than basic', () => {
    expect(HEDGE_CONFIGS.tail.cost).toBeLessThan(HEDGE_CONFIGS.basic.cost);
  });

  it('tail hedge should have longer duration', () => {
    expect(HEDGE_CONFIGS.tail.duration).toBeGreaterThan(HEDGE_CONFIGS.basic.duration);
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
        activeHedges: [createActiveHedge(), createActiveHedge()],
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

    it('should return max coverage from active hedges', () => {
      const skillState = createTestSkillState({
        activeHedges: [
          createActiveHedge({ coverage: 0.5 }),
          createActiveHedge({ coverage: 0.8 }),
          createActiveHedge({ coverage: 0.3 }),
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
          createActiveHedge({ costPaid: 150 }),
        ],
      });

      expect(getTotalHedgeCost(skillState)).toBe(250);
    });
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  it('should handle zero price change', () => {
    const hedge = createActiveHedge();
    const skillState = createTestSkillState({
      activeHedges: [hedge],
    });

    const result = processHedges({
      priceChange: 0,
      positionValue: 5000,
      positionDirection: 'long',
      currentTick: 1,
      skillState,
    });

    expect(result.lossAbsorbed).toBe(0);
    expect(result.newState.activeHedges).toHaveLength(1);
  });

  it('should handle very small price changes', () => {
    const hedge = createActiveHedge({ coverage: 0.7 });
    const skillState = createTestSkillState({
      activeHedges: [hedge],
    });

    const result = processHedges({
      priceChange: -0.0001, // 0.01% drop
      positionValue: 5000,
      positionDirection: 'long',
      currentTick: 1,
      skillState,
    });

    // Loss = 5000 * 0.0001 = 0.5
    // Absorbed = 0.5 * 0.7 = 0.35
    expect(result.lossAbsorbed).toBeCloseTo(0.35, 2);
  });

  it('should handle very large position values', () => {
    const hedge = createActiveHedge({ coverage: 0.7 });
    const skillState = createTestSkillState({
      activeHedges: [hedge],
    });

    const result = processHedges({
      priceChange: -0.10,
      positionValue: 1000000, // $1M position
      positionDirection: 'long',
      currentTick: 1,
      skillState,
    });

    // Loss = 1M * 0.10 = 100k
    // Absorbed = 100k * 0.7 = 70k
    expect(result.lossAbsorbed).toBeCloseTo(70000, 0);
  });

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
      priceChange: -0.10,
      positionValue: 5000,
      positionDirection: 'long',
      currentTick: 1,
      skillState,
    });

    expect(result.lossAbsorbed).toBe(0);
    expect(result.newState.activeHedges).toHaveLength(0);
  });

  it('should apply cost reduction from upgrades', () => {
    const skillState = createTestSkillState({
      hedgeCostReduction: 0.01, // 1% reduction
    });

    const result = activateHedge({
      hedgeType: 'basic', // 2% base cost
      currentPrice: 100,
      positionValue: 5000,
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    // Cost should be (2% - 1%) = 1% of 5000 = 50
    expect((result.event as any).costPaid).toBe(50);
  });

  it('should enforce minimum cost even with high reduction', () => {
    const skillState = createTestSkillState({
      hedgeCostReduction: 0.02, // Equal to basic cost
    });

    const result = activateHedge({
      hedgeType: 'basic', // 2% base cost
      currentPrice: 100,
      positionValue: 5000,
      portfolioValue: 10000,
      currentTick: 0,
      skillState,
    });

    // Minimum cost is 0.5%, so 5000 * 0.005 = 25
    expect((result.event as any).costPaid).toBe(25);
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
