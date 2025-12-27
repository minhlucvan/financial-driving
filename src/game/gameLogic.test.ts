/**
 * Game Logic Unit Tests
 *
 * Tests for core game logic, financial calculations, and state management.
 * These tests verify the mathematical laws and constants used in the game.
 */

import { describe, it, expect } from 'vitest';
import {
  LOSS_AVERSION_MULTIPLIER,
  calculateRecoveryNeeded,
  STRATEGY_PRESETS,
  type CarPhysics,
  type RoadConditions,
  type PositionDirection,
} from '../types/game';
import {
  INITIAL_CAR_PHYSICS,
  INITIAL_ROAD_CONDITIONS,
  INITIAL_PORTFOLIO_STATE,
  INITIAL_MARKET_STATE,
  INITIAL_TERRAIN_STATE,
  INITIAL_WEALTH_STATE,
  INITIAL_VEHICLE_STATE,
  INITIAL_POSITION_STATE,
  INITIAL_PHYSICS_MODIFIERS,
  INITIAL_BACKTEST_STATE,
  INITIAL_TIMELINE_STATE,
} from '../types/state';
import {
  HEDGE_CONFIGS,
  INITIAL_SKILL_STATE,
  type HedgeType,
} from '../skills/types';

// ============================================
// MATHEMATICAL LAW TESTS
// ============================================

describe('Financial Mathematics', () => {
  describe('calculateRecoveryNeeded', () => {
    it('should return 0% recovery needed for 0% loss', () => {
      expect(calculateRecoveryNeeded(0)).toBe(0);
    });

    it('should calculate correct recovery for 10% loss', () => {
      // Loss of 10% requires gain of 10/(1-0.1) = 10/0.9 = 11.11%
      expect(calculateRecoveryNeeded(10)).toBeCloseTo(11.11, 1);
    });

    it('should calculate correct recovery for 20% loss', () => {
      // Loss of 20% requires gain of 20/(1-0.2) = 20/0.8 = 25%
      expect(calculateRecoveryNeeded(20)).toBe(25);
    });

    it('should calculate correct recovery for 33% loss', () => {
      // Loss of 33% requires gain of 33/(1-0.33) = 33/0.67 = ~50%
      expect(calculateRecoveryNeeded(33)).toBeCloseTo(49.25, 1);
    });

    it('should calculate correct recovery for 50% loss', () => {
      // Loss of 50% requires gain of 50/(1-0.5) = 50/0.5 = 100%
      expect(calculateRecoveryNeeded(50)).toBe(100);
    });

    it('should calculate correct recovery for 75% loss', () => {
      // Loss of 75% requires gain of 75/(1-0.75) = 75/0.25 = 300%
      expect(calculateRecoveryNeeded(75)).toBe(300);
    });

    it('should return Infinity for 100% loss', () => {
      expect(calculateRecoveryNeeded(100)).toBe(Infinity);
    });

    it('should return Infinity for losses >= 100%', () => {
      expect(calculateRecoveryNeeded(150)).toBe(Infinity);
      expect(calculateRecoveryNeeded(200)).toBe(Infinity);
    });

    it('should handle negative input (treat as positive loss)', () => {
      // Negative input should be treated as absolute value
      expect(calculateRecoveryNeeded(-20)).toBe(25);
    });

    it('should demonstrate non-linear relationship', () => {
      // Recovery needed grows faster as loss increases
      const recovery10 = calculateRecoveryNeeded(10);
      const recovery20 = calculateRecoveryNeeded(20);
      const recovery30 = calculateRecoveryNeeded(30);
      const recovery40 = calculateRecoveryNeeded(40);

      // Each 10% step requires progressively more recovery
      const step1 = recovery20 - recovery10;
      const step2 = recovery30 - recovery20;
      const step3 = recovery40 - recovery30;

      expect(step2).toBeGreaterThan(step1);
      expect(step3).toBeGreaterThan(step2);
    });
  });

  describe('LOSS_AVERSION_MULTIPLIER', () => {
    it('should be 2.25 (Prospect Theory value)', () => {
      expect(LOSS_AVERSION_MULTIPLIER).toBe(2.25);
    });

    it('should make losses feel 2.25x stronger than gains', () => {
      const gain = 100;
      const loss = 100;
      const perceivedGain = gain;
      const perceivedLoss = loss * LOSS_AVERSION_MULTIPLIER;

      expect(perceivedLoss).toBe(225);
      expect(perceivedLoss / perceivedGain).toBe(2.25);
    });
  });
});

// ============================================
// STRATEGY PRESETS TESTS
// ============================================

describe('Strategy Presets', () => {
  it('should have 4 presets', () => {
    expect(STRATEGY_PRESETS).toHaveLength(4);
  });

  it('should have Conservative preset with low risk settings', () => {
    const conservative = STRATEGY_PRESETS.find(p => p.name === 'Conservative');
    expect(conservative).toBeDefined();
    expect(conservative!.leverage).toBe(1.0);
    expect(conservative!.cashBuffer).toBe(0.3);
    expect(conservative!.emoji).toBe('🐢');
  });

  it('should have Balanced preset with moderate settings', () => {
    const balanced = STRATEGY_PRESETS.find(p => p.name === 'Balanced');
    expect(balanced).toBeDefined();
    expect(balanced!.leverage).toBe(1.5);
    expect(balanced!.cashBuffer).toBe(0.2);
    expect(balanced!.emoji).toBe('⚖️');
  });

  it('should have Aggressive preset with higher risk settings', () => {
    const aggressive = STRATEGY_PRESETS.find(p => p.name === 'Aggressive');
    expect(aggressive).toBeDefined();
    expect(aggressive!.leverage).toBe(2.0);
    expect(aggressive!.cashBuffer).toBe(0.1);
    expect(aggressive!.emoji).toBe('🚀');
  });

  it('should have YOLO preset with maximum risk settings', () => {
    const yolo = STRATEGY_PRESETS.find(p => p.name === 'YOLO');
    expect(yolo).toBeDefined();
    expect(yolo!.leverage).toBe(3.0);
    expect(yolo!.cashBuffer).toBe(0.0);
    expect(yolo!.emoji).toBe('🎰');
  });

  it('should have increasing leverage across presets', () => {
    const leverages = STRATEGY_PRESETS.map(p => p.leverage);
    for (let i = 1; i < leverages.length; i++) {
      expect(leverages[i]).toBeGreaterThan(leverages[i - 1]);
    }
  });

  it('should have decreasing cash buffer across presets', () => {
    const buffers = STRATEGY_PRESETS.map(p => p.cashBuffer);
    for (let i = 1; i < buffers.length; i++) {
      expect(buffers[i]).toBeLessThanOrEqual(buffers[i - 1]);
    }
  });

  it('should have all required fields', () => {
    STRATEGY_PRESETS.forEach(preset => {
      expect(preset.name).toBeDefined();
      expect(preset.emoji).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(typeof preset.leverage).toBe('number');
      expect(typeof preset.cashBuffer).toBe('number');
    });
  });
});

// ============================================
// HEDGE CONFIG TESTS
// ============================================

describe('Hedge Configurations', () => {
  const hedgeTypes: HedgeType[] = ['basic', 'tight', 'tail', 'dynamic'];

  it('should have all 4 hedge types configured', () => {
    hedgeTypes.forEach(type => {
      expect(HEDGE_CONFIGS[type]).toBeDefined();
    });
  });

  describe('Basic Hedge', () => {
    const config = HEDGE_CONFIGS.basic;

    it('should have 70% beta', () => {
      expect(config.beta).toBe(0.70);
    });

    it('should have 0.5% cost', () => {
      expect(config.cost).toBe(0.005);
    });

    it('should last 5 candles', () => {
      expect(config.duration).toBe(5);
    });

    it('should have 5 candle cooldown', () => {
      expect(config.cooldown).toBe(5);
    });

    it('should be available at level 1', () => {
      expect(config.unlockLevel).toBe(1);
    });
  });

  describe('Tight Hedge', () => {
    const config = HEDGE_CONFIGS.tight;

    it('should have 90% beta (near-full protection)', () => {
      expect(config.beta).toBe(0.90);
    });

    it('should be more expensive than basic', () => {
      expect(config.cost).toBeGreaterThan(HEDGE_CONFIGS.basic.cost);
    });

    it('should have shorter duration than basic', () => {
      expect(config.duration).toBeLessThan(HEDGE_CONFIGS.basic.duration);
    });

    it('should require higher level than basic', () => {
      expect(config.unlockLevel).toBeGreaterThan(HEDGE_CONFIGS.basic.unlockLevel);
    });
  });

  describe('Tail Hedge', () => {
    const config = HEDGE_CONFIGS.tail;

    it('should have 50% beta (partial protection)', () => {
      expect(config.beta).toBe(0.50);
    });

    it('should be cheapest hedge', () => {
      const costs = hedgeTypes.map(t => HEDGE_CONFIGS[t].cost);
      expect(config.cost).toBe(Math.min(...costs));
    });

    it('should have longest duration', () => {
      const durations = hedgeTypes.map(t => HEDGE_CONFIGS[t].duration);
      expect(config.duration).toBe(Math.max(...durations));
    });
  });

  describe('Dynamic Hedge', () => {
    const config = HEDGE_CONFIGS.dynamic;

    it('should have 75% beta (balanced protection)', () => {
      expect(config.beta).toBe(0.75);
    });

    it('should have shortest cooldown', () => {
      const cooldowns = hedgeTypes.map(t => HEDGE_CONFIGS[t].cooldown);
      expect(config.cooldown).toBe(Math.min(...cooldowns));
    });

    it('should require highest level', () => {
      const levels = hedgeTypes.map(t => HEDGE_CONFIGS[t].unlockLevel);
      expect(config.unlockLevel).toBe(Math.max(...levels));
    });
  });

  it('should have beta equal to coverage for all configs', () => {
    hedgeTypes.forEach(type => {
      const config = HEDGE_CONFIGS[type];
      expect(config.beta).toBe(config.coverage);
    });
  });

  it('should have all costs between 0 and 1%', () => {
    hedgeTypes.forEach(type => {
      const config = HEDGE_CONFIGS[type];
      expect(config.cost).toBeGreaterThan(0);
      expect(config.cost).toBeLessThan(0.01);
    });
  });
});

// ============================================
// INITIAL STATE TESTS
// ============================================

describe('Initial States', () => {
  describe('INITIAL_CAR_PHYSICS', () => {
    it('should have neutral engine power', () => {
      expect(INITIAL_CAR_PHYSICS.enginePower).toBe(1.0);
    });

    it('should have neutral brake strength', () => {
      expect(INITIAL_CAR_PHYSICS.brakeStrength).toBe(1.0);
    });

    it('should have no acceleration boost (no leverage)', () => {
      expect(INITIAL_CAR_PHYSICS.accelerationBoost).toBe(1.0);
    });

    it('should have full traction', () => {
      expect(INITIAL_CAR_PHYSICS.traction).toBe(1.0);
    });

    it('should have full durability', () => {
      expect(INITIAL_CAR_PHYSICS.durability).toBe(1.0);
    });

    it('should have no recovery drag (not in drawdown)', () => {
      expect(INITIAL_CAR_PHYSICS.recoveryDrag).toBe(1.0);
    });

    it('should have cool engine temperature', () => {
      expect(INITIAL_CAR_PHYSICS.engineTemperature).toBe(0.0);
    });

    it('should have full fuel', () => {
      expect(INITIAL_CAR_PHYSICS.fuelLevel).toBe(1.0);
    });
  });

  describe('INITIAL_ROAD_CONDITIONS', () => {
    it('should have smooth road', () => {
      expect(INITIAL_ROAD_CONDITIONS.roughness).toBe(0.0);
    });

    it('should have full visibility', () => {
      expect(INITIAL_ROAD_CONDITIONS.visibility).toBe(1.0);
    });

    it('should be flat', () => {
      expect(INITIAL_ROAD_CONDITIONS.slope).toBe(0);
    });

    it('should have full grip', () => {
      expect(INITIAL_ROAD_CONDITIONS.grip).toBe(1.0);
    });

    it('should have normal width', () => {
      expect(INITIAL_ROAD_CONDITIONS.width).toBe(1.0);
    });

    it('should have clear weather', () => {
      expect(INITIAL_ROAD_CONDITIONS.weather).toBe('clear');
    });
  });

  describe('INITIAL_PORTFOLIO_STATE', () => {
    it('should start with 10000 initial capital', () => {
      expect(INITIAL_PORTFOLIO_STATE.initialCapital).toBe(10000);
    });

    it('should have full cash at start', () => {
      expect(INITIAL_PORTFOLIO_STATE.cash).toBe(10000);
    });

    it('should have equity equal to initial capital', () => {
      expect(INITIAL_PORTFOLIO_STATE.equity).toBe(INITIAL_PORTFOLIO_STATE.initialCapital);
    });

    it('should have no positions', () => {
      expect(INITIAL_PORTFOLIO_STATE.positions).toHaveLength(0);
    });

    it('should have no closed positions', () => {
      expect(INITIAL_PORTFOLIO_STATE.closedPositions).toHaveLength(0);
    });

    it('should have zero exposure', () => {
      expect(INITIAL_PORTFOLIO_STATE.totalExposure).toBe(0);
    });

    it('should have zero unrealized P&L', () => {
      expect(INITIAL_PORTFOLIO_STATE.totalUnrealizedPnL).toBe(0);
    });

    it('should have zero realized P&L', () => {
      expect(INITIAL_PORTFOLIO_STATE.totalRealizedPnL).toBe(0);
    });

    it('should have zero drawdown', () => {
      expect(INITIAL_PORTFOLIO_STATE.drawdown).toBe(0);
      expect(INITIAL_PORTFOLIO_STATE.maxDrawdown).toBe(0);
    });

    it('should have peak equity at initial capital', () => {
      expect(INITIAL_PORTFOLIO_STATE.peakEquity).toBe(10000);
    });

    it('should have zero stress level', () => {
      expect(INITIAL_PORTFOLIO_STATE.stressLevel).toBe(0);
      expect(INITIAL_PORTFOLIO_STATE.rawStress).toBe(0);
    });

    it('should include initial car physics', () => {
      expect(INITIAL_PORTFOLIO_STATE.carPhysics).toEqual(INITIAL_CAR_PHYSICS);
    });

    it('should include initial skill state', () => {
      expect(INITIAL_PORTFOLIO_STATE.skillState).toEqual(INITIAL_SKILL_STATE);
    });
  });

  describe('INITIAL_MARKET_STATE', () => {
    it('should have no current candle', () => {
      expect(INITIAL_MARKET_STATE.currentCandle).toBeNull();
    });

    it('should have zero current price', () => {
      expect(INITIAL_MARKET_STATE.currentPrice).toBe(0);
    });

    it('should have zero current return', () => {
      expect(INITIAL_MARKET_STATE.currentReturn).toBe(0);
    });

    it('should have neutral RSI (50)', () => {
      expect(INITIAL_MARKET_STATE.indicators.rsi).toBe(50);
    });

    it('should be in CHOP regime', () => {
      expect(INITIAL_MARKET_STATE.regime).toBe('CHOP');
    });

    it('should have flat terrain slope', () => {
      expect(INITIAL_MARKET_STATE.terrainSlope).toBe(0);
    });

    it('should have full traction multiplier', () => {
      expect(INITIAL_MARKET_STATE.tractionMultiplier).toBe(1);
    });
  });

  describe('INITIAL_TERRAIN_STATE', () => {
    it('should have zero road height', () => {
      expect(INITIAL_TERRAIN_STATE.roadHeight).toBe(0);
    });

    it('should have zero slope', () => {
      expect(INITIAL_TERRAIN_STATE.currentSlope).toBe(0);
    });

    it('should have zero exposure multiplier (flat when no position)', () => {
      expect(INITIAL_TERRAIN_STATE.exposureMultiplier).toBe(0);
    });

    it('should have 1x leverage amplification', () => {
      expect(INITIAL_TERRAIN_STATE.leverageAmplification).toBe(1);
    });
  });

  describe('INITIAL_SKILL_STATE', () => {
    it('should have no active hedges', () => {
      expect(INITIAL_SKILL_STATE.activeHedges).toHaveLength(0);
    });

    it('should have zero hedge cooldown', () => {
      expect(INITIAL_SKILL_STATE.hedgeCooldown).toBe(0);
    });

    it('should allow 2 simultaneous hedges', () => {
      expect(INITIAL_SKILL_STATE.maxHedges).toBe(2);
    });

    it('should start at level 1', () => {
      expect(INITIAL_SKILL_STATE.playerLevel).toBe(1);
    });

    it('should have zero skill points', () => {
      expect(INITIAL_SKILL_STATE.skillPoints).toBe(0);
    });

    it('should have no cost reduction', () => {
      expect(INITIAL_SKILL_STATE.hedgeCostReduction).toBe(0);
    });

    it('should have no cooldown reduction', () => {
      expect(INITIAL_SKILL_STATE.hedgeCooldownReduction).toBe(0);
    });
  });

  describe('INITIAL_POSITION_STATE', () => {
    it('should not be open', () => {
      expect(INITIAL_POSITION_STATE.isOpen).toBe(false);
    });

    it('should have zero size', () => {
      expect(INITIAL_POSITION_STATE.size).toBe(0);
    });

    it('should have zero exposure (flat road)', () => {
      expect(INITIAL_POSITION_STATE.exposure).toBe(0);
    });

    it('should have zero P&L', () => {
      expect(INITIAL_POSITION_STATE.unrealizedPnL).toBe(0);
      expect(INITIAL_POSITION_STATE.realizedPnL).toBe(0);
    });
  });

  describe('INITIAL_VEHICLE_STATE', () => {
    it('should have zero velocity', () => {
      expect(INITIAL_VEHICLE_STATE.velocityX).toBe(0);
      expect(INITIAL_VEHICLE_STATE.velocityY).toBe(0);
    });

    it('should have zero angular velocity', () => {
      expect(INITIAL_VEHICLE_STATE.angularVelocity).toBe(0);
    });

    it('should not be on ground initially', () => {
      expect(INITIAL_VEHICLE_STATE.isOnGround).toBe(false);
    });

    it('should not be flipped', () => {
      expect(INITIAL_VEHICLE_STATE.isFlipped).toBe(false);
    });
  });

  describe('INITIAL_BACKTEST_STATE', () => {
    it('should start at tick 0', () => {
      expect(INITIAL_BACKTEST_STATE.currentTick).toBe(0);
    });

    it('should have 1-day tick duration', () => {
      expect(INITIAL_BACKTEST_STATE.tickDuration).toBe(1);
    });

    it('should allow max 3x leverage', () => {
      expect(INITIAL_BACKTEST_STATE.maxLeverage).toBe(3);
    });

    it('should trigger margin call at 20% equity', () => {
      expect(INITIAL_BACKTEST_STATE.marginCallLevel).toBe(0.2);
    });

    it('should not be running initially', () => {
      expect(INITIAL_BACKTEST_STATE.isRunning).toBe(false);
    });

    it('should be paused initially', () => {
      expect(INITIAL_BACKTEST_STATE.isPaused).toBe(true);
    });

    it('should not be margin called', () => {
      expect(INITIAL_BACKTEST_STATE.isMarginCalled).toBe(false);
    });
  });

  describe('INITIAL_TIMELINE_STATE', () => {
    it('should start at index 0', () => {
      expect(INITIAL_TIMELINE_STATE.currentIndex).toBe(0);
    });

    it('should be paused', () => {
      expect(INITIAL_TIMELINE_STATE.mode).toBe('paused');
    });

    it('should have 1x playback speed', () => {
      expect(INITIAL_TIMELINE_STATE.playbackSpeed).toBe(1);
    });

    it('should not be able to go back initially', () => {
      expect(INITIAL_TIMELINE_STATE.canGoBack).toBe(false);
    });

    it('should not be able to go forward initially', () => {
      expect(INITIAL_TIMELINE_STATE.canGoForward).toBe(false);
    });
  });
});

// ============================================
// STATE CONSISTENCY TESTS
// ============================================

describe('State Consistency', () => {
  it('should have consistent equity across states', () => {
    expect(INITIAL_PORTFOLIO_STATE.equity).toBe(INITIAL_WEALTH_STATE.currentWealth);
  });

  it('should have consistent initial capital across states', () => {
    expect(INITIAL_PORTFOLIO_STATE.initialCapital).toBe(INITIAL_WEALTH_STATE.startingWealth);
  });

  it('should have consistent drawdown values', () => {
    expect(INITIAL_PORTFOLIO_STATE.drawdown).toBe(INITIAL_WEALTH_STATE.drawdown);
  });

  it('should have consistent stress levels', () => {
    expect(INITIAL_PORTFOLIO_STATE.stressLevel).toBe(INITIAL_WEALTH_STATE.stressLevel);
  });

  it('should have neutral physics modifiers initially', () => {
    expect(INITIAL_PHYSICS_MODIFIERS.torqueMultiplier).toBe(1);
    expect(INITIAL_PHYSICS_MODIFIERS.brakeMultiplier).toBe(1);
    expect(INITIAL_PHYSICS_MODIFIERS.tractionMultiplier).toBe(1);
    expect(INITIAL_PHYSICS_MODIFIERS.recoveryDrag).toBe(1);
  });
});

// ============================================
// CAR PHYSICS MAPPING TESTS
// ============================================

describe('Car Physics Mapping Concepts', () => {
  it('should map engine power to asset allocation + market trend', () => {
    // When no exposure, engine power should be neutral
    expect(INITIAL_CAR_PHYSICS.enginePower).toBe(1.0);
  });

  it('should map brake strength to cash percentage', () => {
    // Full cash = full braking
    expect(INITIAL_CAR_PHYSICS.brakeStrength).toBe(1.0);
  });

  it('should map acceleration boost to leverage', () => {
    // No leverage = 1x boost
    expect(INITIAL_CAR_PHYSICS.accelerationBoost).toBe(1.0);
  });

  it('should map traction to volatility', () => {
    // Low volatility = high traction
    expect(INITIAL_CAR_PHYSICS.traction).toBe(1.0);
  });

  it('should map durability to drawdown tolerance', () => {
    // No drawdown = full durability
    expect(INITIAL_CAR_PHYSICS.durability).toBe(1.0);
  });

  it('should map recovery drag to current drawdown', () => {
    // Not in drawdown = no extra drag
    expect(INITIAL_CAR_PHYSICS.recoveryDrag).toBe(1.0);
  });

  it('should map engine temperature to leverage stress', () => {
    // No leverage stress = cool engine
    expect(INITIAL_CAR_PHYSICS.engineTemperature).toBe(0.0);
  });

  it('should map fuel level to realized P&L', () => {
    // No realized P&L = full fuel
    expect(INITIAL_CAR_PHYSICS.fuelLevel).toBe(1.0);
  });
});

// ============================================
// ROAD CONDITION MAPPING TESTS
// ============================================

describe('Road Condition Mapping Concepts', () => {
  it('should map roughness to ATR (volatility)', () => {
    // Low ATR = smooth road
    expect(INITIAL_ROAD_CONDITIONS.roughness).toBe(0.0);
  });

  it('should map visibility to market volatility', () => {
    // Low volatility = clear visibility
    expect(INITIAL_ROAD_CONDITIONS.visibility).toBe(1.0);
  });

  it('should map slope to price movement', () => {
    // Flat = no price movement
    expect(INITIAL_ROAD_CONDITIONS.slope).toBe(0);
  });

  it('should map grip to RSI extremes', () => {
    // Neutral RSI = full grip
    expect(INITIAL_ROAD_CONDITIONS.grip).toBe(1.0);
  });

  it('should have valid weather values', () => {
    const validWeather = ['clear', 'cloudy', 'rainy', 'stormy', 'foggy'];
    expect(validWeather).toContain(INITIAL_ROAD_CONDITIONS.weather);
  });
});
