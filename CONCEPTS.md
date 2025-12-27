# 🎮 Financial Drive

> You're not picking stocks. You're driving through markets.

**Genre:** Simulation · Strategy · Educational

---

## 🎯 Core Concept

**One Asset. One Car. One Road.**

You control a car driving through market history. The road is generated from real price data of a single asset (e.g., S&P 500, Bitcoin, Gold).

Your job: **Survive and grow** by reading the road conditions and adjusting your position.

---

## 🚗 The Car = Your Position

| Car Part | Financial Meaning | What It Does |
|----------|-------------------|--------------|
| **Gas Pedal** | Position Size (0-100%) | More gas = more exposure = faster gains/losses |
| **Brake** | Cash Reserve | Reduces speed, protects from crashes |
| **Speedometer** | Current Returns | Shows your P&L in real-time |
| **Fuel Tank** | Total Capital | Your money - empty = game over |

### Simple Controls
- **Accelerate** → Increase position (buy more)
- **Brake** → Decrease position (sell some)
- **Coast** → Hold current position

---

## 🛣️ The Road = Price Action

The road is generated from **real historical data**:

| Price Action | Road Shape |
|--------------|------------|
| Price goes up | Road goes uphill ↗️ |
| Price goes down | Road goes downhill ↘️ |
| Sideways/choppy | Winding road 〰️ |
| Crash | Steep cliff ⬇️ |

**You cannot see the future.** Fog limits visibility to current conditions only.

---

## 📊 Three Indicator Systems

The dashboard shows 3 key indicators that affect road conditions:

### 1️⃣ TREND Indicator (Direction)

**What it measures:** Where is the market heading?

| Signal | Visual | Road Effect | Suggested Action |
|--------|--------|-------------|------------------|
| **Strong Uptrend** | 🟢 Green arrow up | Smooth uphill highway | Accelerate |
| **Weak Uptrend** | 🟡 Yellow arrow up | Gentle slope | Maintain speed |
| **Neutral** | ⚪ Flat line | Flat road | Coast |
| **Weak Downtrend** | 🟡 Yellow arrow down | Gentle decline | Light brake |
| **Strong Downtrend** | 🔴 Red arrow down | Steep downhill | Heavy brake |

**Based on:** Moving Average direction (price vs 20-day MA)

---

### 2️⃣ VOLATILITY Indicator (Danger)

**What it measures:** How bumpy is the ride?

| Signal | Visual | Road Effect | Suggested Action |
|--------|--------|-------------|------------------|
| **Low Volatility** | 🟢 Calm | Smooth pavement | Safe to accelerate |
| **Normal** | 🟡 Wavy | Normal road | Standard driving |
| **High Volatility** | 🔴 Shaking | Rocky, unpredictable | Reduce speed |
| **Extreme** | 💀 Storm | Dangerous terrain | Brake hard |

**Based on:** ATR (Average True Range) or daily price swings

**Key Rule:** High volatility + High speed = Easy crash

---

### 3️⃣ VALUE Indicator (Fundamentals)

**What it measures:** Is the asset cheap or expensive?

| Signal | Visual | Road Effect | Suggested Action |
|--------|--------|-------------|------------------|
| **Undervalued** | 🟢 "$" cheap tag | Road likely to rise | Good entry point |
| **Fair Value** | 🟡 "=" balanced | Normal conditions | Hold position |
| **Overvalued** | 🔴 "$$" expensive | Risk of drop ahead | Consider reducing |
| **Extreme Bubble** | 💀 "🎈" bubble | Cliff likely ahead | Defensive mode |

**Based on:** P/E Ratio, Price-to-MA ratio, or RSI extremes

---

## 🎮 Dashboard Display

```
┌─────────────────────────────────────────────┐
│  💰 Capital: $10,450  |  📈 Returns: +4.5%  │
├─────────────────────────────────────────────┤
│                                             │
│  TREND      [🟢🟢🟢⚪⚪]  Strong Up         │
│  VOLATILITY [🟢🟢⚪⚪⚪]  Low               │
│  VALUE      [🟡🟡🟡⚪⚪]  Fair              │
│                                             │
│  Position: ████████░░ 80%                   │
│  Speed:    ▓▓▓▓▓▓░░░░ 60 km/h              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🏆 Scoring System

### Primary Score: Risk-Adjusted Returns

```
FINAL SCORE = Total Return × Safety Multiplier
```

| Metric | What It Measures | How It's Shown |
|--------|------------------|----------------|
| **Total Return** | % gain/loss on capital | Distance traveled |
| **Max Drawdown** | Worst crash during run | Damage taken |
| **Volatility** | Bumpiness of your returns | Ride smoothness |
| **Safety Multiplier** | Reward for not crashing | Bonus points |

### Safety Multiplier Table

| Max Drawdown | Multiplier | Rating |
|--------------|------------|--------|
| < 5% | ×1.5 | ⭐⭐⭐ Smooth Operator |
| 5-10% | ×1.2 | ⭐⭐ Careful Driver |
| 10-20% | ×1.0 | ⭐ Normal |
| 20-30% | ×0.8 | ⚠️ Reckless |
| > 30% | ×0.5 | 💀 Crash Penalty |

### Example Scoring

```
Player A: +50% return, 25% max drawdown
Score = 50 × 0.8 = 40 points

Player B: +30% return, 8% max drawdown
Score = 30 × 1.2 = 36 points

Player A wins but Player B drove better!
```

---

## 🎯 Win Conditions

| Mode | Goal | Win When |
|------|------|----------|
| **Survival** | Don't go broke | Finish the period with capital > 0 |
| **Target** | Hit return goal | Reach +X% return |
| **Challenge** | Beat benchmark | Outperform buy-and-hold |
| **Efficiency** | Best risk-adjusted | Highest score (return × safety) |

---

## 📈 Indicator Combinations (Strategy Hints)

| Trend | Volatility | Value | Road Condition | Strategy |
|-------|------------|-------|----------------|----------|
| 🟢 Up | 🟢 Low | 🟢 Cheap | Highway | Full speed! |
| 🟢 Up | 🔴 High | 🟡 Fair | Bumpy uphill | Moderate speed |
| 🔴 Down | 🟢 Low | 🟢 Cheap | Smooth decline | Wait, prepare to buy |
| 🔴 Down | 🔴 High | 🔴 Expensive | Dangerous cliff | BRAKE! |
| 🟡 Neutral | 🟡 Normal | 🟡 Fair | Normal road | Coast, save fuel |

---

## 🎮 Game Flow

```
1. Choose Asset (S&P 500, Bitcoin, Gold, etc.)
2. Choose Time Period (2008 crash, 2020 COVID, etc.)
3. Start with $10,000 and 0% position
4. Drive through history:
   - Read indicators
   - Adjust position
   - Survive the road
5. Final score = Return × Safety Multiplier
```

---

## 🧠 What Players Learn

By playing, you naturally understand:

| Experience | Investing Lesson |
|------------|------------------|
| Crash after ignoring red signals | Indicators matter |
| Slow gains with green signals | Trends are your friend |
| Wipeout from full speed + high volatility | Position sizing saves you |
| Missing rally while braking | Cash has opportunity cost |
| Surviving crash others didn't | Risk management wins long-term |

**No tutorials. Only consequences.**

---

## 🚀 Future Expansions

Once core works:
- Multiple assets (portfolio mode)
- More indicators (momentum, sentiment)
- Multiplayer races
- Real-time market mode 
