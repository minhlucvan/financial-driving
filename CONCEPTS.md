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

### Primary Score: Drive Score (Calmar Ratio)

The **Calmar Ratio** is used by real hedge funds to measure skill: how much return did you get relative to your worst crash?

```
DRIVE SCORE = (Total Return % / Max Drawdown %) × 100
```

| Metric | Real Name | Driving Term | What It Shows |
|--------|-----------|--------------|---------------|
| **Distance** | Total Return % | km traveled | Raw performance |
| **Worst Crash** | Max Drawdown % | Damage % | Biggest mistake |
| **Drive Score** | Calmar Ratio | Skill rating | Risk-adjusted skill |

---

### Driver Tier System

| Drive Score | Tier | Real Equivalent |
|-------------|------|-----------------|
| > 500 | 🏆 Elite Driver | Top hedge fund |
| 300-500 | 🥇 Pro Driver | Good fund manager |
| 150-300 | 🥈 Skilled Driver | Above average investor |
| 50-150 | 🥉 Learner | Average investor |
| < 50 | 💀 Crashed | Poor risk management |

---

### Bonus Multipliers

Earn bonus multipliers for exceptional driving:

| Achievement | Multiplier | Condition |
|-------------|------------|-----------|
| **No Crash** | ×1.2 | Max Drawdown < 10% |
| **Storm Survivor** | ×1.1 | Finished during high volatility period |
| **Beat the Market** | ×1.3 | Outperformed buy-and-hold |
| **Quick Recovery** | ×1.1 | Recovered from 10%+ drawdown in < 20 days |

```
FINAL SCORE = Drive Score × Bonus Multipliers
```

---

### Example Scoring

```
Player A: +50% return, 25% max drawdown
Drive Score = (50 / 25) × 100 = 200 → Skilled Driver

Player B: +30% return, 5% max drawdown
Drive Score = (30 / 5) × 100 = 600 → Elite Driver
+ No Crash bonus (×1.2)
Final Score = 600 × 1.2 = 720

Player A made more money, but Player B is the better driver!
```

---

### Dashboard Stats

```
┌─────────────────────────────────────────────────┐
│  DRIVE SCORE: 450        Tier: 🥇 Pro Driver    │
├─────────────────────────────────────────────────┤
│  📈 Distance:     +35.2%  (Total Return)        │
│  💥 Worst Crash:  -8.5%   (Max Drawdown)        │
│  🎯 Win Rate:     62%     (Positive Days)       │
│  ⏱️ Recovery:     12 days (From last crash)     │
├─────────────────────────────────────────────────┤
│  Bonuses: No Crash ×1.2 | Beat Market ×1.3     │
│  FINAL SCORE: 450 × 1.56 = 702                  │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Win Conditions

| Mode | Goal | Win When |
|------|------|----------|
| **Survival** | Don't go broke | Finish the period with capital > 0 |
| **Target** | Hit return goal | Reach +X% return |
| **Challenge** | Beat benchmark | Outperform buy-and-hold (earn ×1.3 bonus) |
| **Pro Driver** | Reach tier | Achieve Drive Score > 300 |
| **Elite** | Master the road | Achieve Drive Score > 500 |

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
   - Read indicators (Trend, Volatility, Value)
   - Adjust position (Accelerate, Brake, Coast)
   - Survive the road
5. End of run:
   - Drive Score = (Return / Max Drawdown) × 100
   - Apply bonus multipliers
   - Get your Driver Tier ranking
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
