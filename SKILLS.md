# Financial Drive - Skill System Design

## Overview

Skills are **active abilities** that let players apply real financial strategies during gameplay. Unlike passive car stats (engine, brake, acceleration), skills are **triggered actions** with cooldowns, costs, and timing requirements.

The skill system teaches financial concepts through **gameplay mechanics**, not tutorials.

---

## Core Skill Principles

1. **Real Financial Basis** - Every skill maps to a real trading/investing strategy
2. **Risk-Reward Tradeoff** - No free protection; skills have costs and timing risks
3. **Skill Expression** - Good timing and judgment should be rewarded
4. **Learning Through Failure** - Misused skills teach expensive lessons

---

## Skill Categories

### 1. Defensive Skills (Reduce Risk)
- **Hedging** - Offset position risk
- **Stop Loss** - Automatic exit at threshold
- **Cash Buffer** - Emergency brake boost

### 2. Offensive Skills (Increase Return)
- **Leverage Up** - Temporary acceleration boost
- **Momentum Ride** - Extended uphill speed
- **Breakout Entry** - Jump into trend

### 3. Utility Skills (Strategic)
- **Rebalance** - Reset allocation mid-drive
- **Dollar Cost Average** - Smooth entry over time
- **Tax Harvest** - Convert losses to future benefits

---

## Skill: Hedging (Detailed Design)

### Financial Concept

**Hedging** = Taking an offsetting position to reduce portfolio risk.

Real-world examples:
- Buy PUT options to protect stock holdings
- Short index futures while long individual stocks
- Currency hedging for international exposure

### Game Mechanic

**Activation**: Player presses `H` key (or skill button)

**What happens**:
1. Player places a "hedge bet" that the market will move AGAINST their current position
2. If market moves against them → Hedge pays out, canceling losses
3. If market moves WITH them → Hedge costs money, reducing gains

### Implementation

```
┌─────────────────────────────────────────────────────────────┐
│  HEDGE ACTIVE                                               │
│  ═══════════════════════════════════════════════════════    │
│                                                             │
│  Your Position: LONG +50%                                   │
│  Hedge Bet: Market will DROP                                │
│                                                             │
│  If price drops 10%:                                        │
│    • Position loses: -$1,000                                │
│    • Hedge pays: +$800 (80% coverage)                       │
│    • Net loss: -$200 (instead of -$1,000)                   │
│                                                             │
│  If price rises 10%:                                        │
│    • Position gains: +$1,000                                │
│    • Hedge costs: -$150 (premium)                           │
│    • Net gain: +$850 (instead of +$1,000)                   │
│                                                             │
│  [Cost: 1.5% of position] [Duration: 5 candles]             │
└─────────────────────────────────────────────────────────────┘
```

### Road/Car Visualization

When hedge is active:

```
Normal Drive:                    Hedged Drive:

    🚗                              🚗🛡️
    ╱╲                              ╱╲
═══╱══╲═══════                 ═══╱══╲═══════
              ↘ Crash               ↘ Cushioned landing
              💥                     🛬
```

**Visual Elements**:
- **Shield icon** appears around car when hedged
- **Blue glow** on car body (hedge protection color)
- **Parachute deploy** animation if hedge triggers
- **Cost indicator** shows premium burning over time

### Hedge Parameters

| Parameter | Value | Financial Equivalent |
|-----------|-------|---------------------|
| **Cost** | 1-3% of position | Option premium |
| **Coverage** | 60-90% of losses | Delta hedge ratio |
| **Duration** | 3-10 candles | Option expiry |
| **Cooldown** | 5 candles after expiry | Rolling cost |
| **Max Stack** | 2 hedges | Portfolio insurance limit |

### Hedge Types (Unlockable)

#### 1. Basic Hedge (Starter)
- 70% loss coverage
- 2% cost
- 5 candle duration
- *"Like buying a cheap PUT"*

#### 2. Tight Hedge (Unlock at Level 5)
- 90% loss coverage
- 4% cost
- 3 candle duration
- *"ATM PUT option - expensive but strong"*

#### 3. Tail Hedge (Unlock at Level 10)
- 50% coverage on small losses
- 150% coverage on large losses (>20%)
- 1% cost
- 10 candle duration
- *"OTM PUT - cheap crash insurance"*

#### 4. Dynamic Hedge (Unlock at Level 15)
- Coverage adjusts to volatility
- Cost scales with VIX
- Auto-renews if funded
- *"Systematic hedging program"*

### Skill Upgrade Path

```
Level 1-4:   Basic Hedge only
Level 5-9:  + Tight Hedge unlocked
Level 10-14: + Tail Hedge unlocked
Level 15+:   + Dynamic Hedge unlocked
             + Hedge cost reduction (-0.5%)
             + Faster cooldown (-1 candle)
```

### Teaching Moments

**When hedge saves you**:
> "Your hedge absorbed 80% of that crash! Cost: $150. Saved: $1,200."

**When hedge expires unused**:
> "Market went up - your hedge expired worthless. Cost of insurance: $150."

**When unhedged crash**:
> "OUCH! That drop cost you $1,500. A hedge would have saved $1,200 for only $150."

### State Integration

```typescript
interface HedgeState {
  isActive: boolean;
  type: 'basic' | 'tight' | 'tail' | 'dynamic';
  coverage: number;           // 0-1 (percentage of losses covered)
  cost: number;               // Premium paid
  remainingCandles: number;   // Duration left
  triggerPrice: number;       // Price at activation
  payoutAccumulated: number;  // Running payout if triggered
}

interface PortfolioState {
  // ... existing fields
  hedges: HedgeState[];
  hedgeCooldown: number;
}
```

### Physics Integration

When hedged:
```typescript
// In car physics calculation
if (hedge.isActive && priceChange < 0) {
  const rawLoss = position * Math.abs(priceChange);
  const hedgedLoss = rawLoss * (1 - hedge.coverage);

  // Car feels less impact
  carPhysics.durability *= (1 + hedge.coverage * 0.5);  // Less damage
  carPhysics.recoveryDrag *= (1 - hedge.coverage * 0.3); // Easier recovery
}
```

---

## Skill: Stop Loss (Brief)

**Concept**: Automatic exit when losses reach threshold

**Mechanic**:
- Set a stop price (e.g., -10%)
- If price hits stop → Position auto-closes
- Car "catches" on safety barrier

**Visual**: Red barrier appears on road at stop level

**Risk**: Gap risk - price can jump past stop

---

## Skill: Leverage Up (Brief)

**Concept**: Temporarily increase position size with borrowed money

**Mechanic**:
- Press `L` to activate 2x leverage for 5 candles
- Gains AND losses doubled
- Engine overheats faster

**Visual**: Turbo flame, engine temperature rises

**Risk**: Margin call if losses exceed threshold

---

## Skill: Rebalance (Brief)

**Concept**: Reset portfolio to target allocation

**Mechanic**:
- Only available at checkpoints (candle close)
- Sell winners, buy losers to return to target
- Cooldown: 10 candles

**Visual**: Car enters "pit stop" animation

**Teaching**: Systematic rebalancing beats timing

---

## UI Design for Skills

### Skill Bar (Bottom of Screen)

```
┌─────────────────────────────────────────────────────────────┐
│  [H] HEDGE     [S] STOP     [L] LEVER    [R] REBAL         │
│  ████████░░    Ready        ████░░░░░░   Cooldown: 3       │
│  Active: 4     Cost: 2%     Cost: 0.5%   @ Checkpoint      │
└─────────────────────────────────────────────────────────────┘
```

### Skill Activation Overlay

```
┌─────────────────────────────────────────────────────────────┐
│                    🛡️ HEDGE ACTIVATED                       │
│                                                             │
│              Coverage: 70% | Duration: 5 candles            │
│              Cost: $150 (1.5% of $10,000)                   │
│                                                             │
│              "Your downside is protected"                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Skill Economy

### Skill Points (SP)

- Earned from: Distance traveled, Sharpe ratio, survival
- Spent on: Skill upgrades, unlocks, cooldown resets

### Skill Costs (In-Game Currency)

| Skill | Cost Basis | Typical Cost |
|-------|-----------|--------------|
| Hedge | % of position | 1-4% |
| Stop Loss | Free to set | Slippage on execution |
| Leverage | Interest rate | 0.5% per candle |
| Rebalance | Transaction fee | 0.1% of portfolio |

---

## Implementation Priority

### Phase 1: Core Skills
1. **Basic Hedge** - Most educational value
2. **Stop Loss** - Essential risk management
3. **Leverage Up** - Teaches risk amplification

### Phase 2: Advanced Skills
4. **Tight Hedge** / **Tail Hedge** variants
5. **Rebalance** at checkpoints
6. **Momentum Ride** for trends

### Phase 3: Expert Skills
7. **Dynamic Hedge** (auto-adjusting)
8. **Dollar Cost Average**
9. **Pairs Trade** (long/short combo)

---

## Learning Outcomes

After using the skill system, players should understand:

| Skill | Real-World Lesson |
|-------|-------------------|
| Hedge | Insurance has a cost; protection isn't free |
| Stop Loss | Discipline beats hope; cut losses early |
| Leverage | Amplifies both gains AND losses |
| Rebalance | Systematic beats emotional |
| Tail Hedge | Cheap insurance for rare disasters |

---

## Technical Architecture

```
src/
├── skills/
│   ├── types.ts         # Skill interfaces
│   ├── SkillManager.ts  # Activation, cooldown, state
│   ├── HedgeSkill.ts    # Hedge implementation
│   ├── StopLossSkill.ts # Stop loss implementation
│   └── LeverageSkill.ts # Leverage implementation
├── game/
│   └── scenes/
│       └── GameScene.ts # Skill UI rendering
└── context/
    └── AppStateProvider.tsx # Skill state in portfolio
```

---

## Notes

- Skills should feel **impactful** - clear before/after difference
- Costs should be **visible** - no hidden fees
- Timing should **matter** - reward good judgment
- Failures should **teach** - show what would have happened
