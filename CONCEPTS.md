
🎮 Game Concept: Financial Drive

Genre
Simulation · Strategy · Skill-based · Educational (but not boring)

Core Fantasy

You are not “picking stocks”.
You are driving a financial machine through market terrain.

⸻

🧠 Core Mental Model (Locked In)

Financial Concept	Game Metaphor
Assets	🚗 Engine (power)
Cash	🛑 Brake (control, survival)
Debt	🚀 Accelerator (speed, risk)
Volatility	🌪 Road conditions
Drawdown	⛰ Steep downhill
Liquidity crisis	🚧 Roadblocks
Margin call	💥 Engine failure

This is not cosmetic — physics is enforced.

⸻

📐 Gain–Loss Asymmetry (Two Core Laws)

The game embodies the fundamental truth about losses:

**1) Mathematical Law (Compounding Reality)**

A loss of L% requires a gain of L/(1-L)% to recover.

| Loss | Recovery Needed |
|------|-----------------|
| -10% | +11.1% |
| -20% | +25% |
| -50% | +100% |
| -90% | +900% |

**Losses increase recovery non-linearly.**

In-game: The HUD shows "DD: -30% → Need +42.86% to recover"

**2) Psychological Law (Prospect Theory / Loss Aversion)**

Empirically, losses are weighted ~2.25× stronger than gains in human utility.

v(x) = x^α for gains, -λ|x|^α for losses, where λ ≈ 2.25

This means a loss of $100 feels roughly as painful as a gain of $225 feels pleasurable.

In-game:
- Stress accumulates 2.25× faster on losses
- Stress reduces slower on gains
- The car FEELS heavier when recovering from drawdown

**Combined Insight:**
- Math: Losses demand disproportionately larger gains to recover
- Psychology: Losses are felt disproportionately more than gains

👉 **Losses are asymmetric in both capital and emotion, which is why drawdown control dominates long-term performance.**

In-game: "Recovery Drag" makes the car harder to accelerate when in drawdown. The deeper the hole, the harder to climb out.

⸻

🗺 World & Visual Design

The Road = Market History
	•	The road is generated from real daily price data
	•	Each candle → road segment
	•	Slope = return
	•	Curvature = volatility
	•	Surface = liquidity & regime

Bull market → smooth uphill highway
Chop → winding mountain road
Crash → steep downhill + fog + potholes

⸻

🔮 Historical vs Future Road (Fog of War)

The road is divided into two parts:

**Historical (Behind Car):** 100% opacity
- You've driven it
- Represents actual market history
- Clear, certain, unchangeable

**Future (Ahead of Car):** 50% opacity
- Uncertain projection
- Faded/fogged terrain
- Shows current momentum hints but NOT certainty

Visual Elements:
- **NOW marker:** Yellow vertical line at car position
- **Gradient zone:** Smooth transition from clear to fog
- **Projection indicator:** "AHEAD: ↗ Likely uphill" based on momentum
- **Fog overlay:** Semi-transparent cover on future terrain

Press **V** to toggle fog of war on/off.

This enforces the core lesson: **You cannot see the future market. Past performance ≠ future results.**

⸻

🚗 The Car = Your Financial Position

Car Stats (updated every “day”)

Engine Power = Asset Allocation × Market Trend
Brake Strength = Cash %
Acceleration Boost = Debt Ratio
Traction = Diversification + Volatility
Durability = Drawdown tolerance

Visual Feedback
	•	Engine overheating = over-leveraged
	•	Brake glow = cash buffer active
	•	Turbo flame = debt acceleration
	•	Skidding = volatility mismatch
	•	Smoke / sparks = margin stress

⸻

🎯 Player Actions (What You Can Actually Do)

Allowed (Realistic)
	•	Buy / Sell assets (rebalance engine)
	•	Increase / Decrease cash (brake tuning)
	•	Add / Reduce debt (accelerator)
	•	Pause at checkpoints (rebalance only)
	•	Choose strategy presets

Not Allowed (Critical)

❌ See future prices
❌ Undo crashes
❌ Infinite leverage
❌ Instant reactions (latency exists)

⸻

⏱ Time System
	•	1 tick = 1 market day
	•	Player can:
	•	Run real-time
	•	Fast-forward
	•	Pause only at candle close

This forces discipline, not twitch trading.

⸻

🧩 Market Physics (This Is the Soul)

Road Conditions are driven by indicators

Indicator	Road Effect
ATR	Road roughness
VIX	Fog + wind
MA slope	Uphill / downhill
RSI	Slippery edges
Volume	Road width
Correlation	Multi-lane instability

You feel indicators, not read them.

⸻

🛠 Strategy Archetypes (Player Styles)

Each style feels different to drive.

🐢 Conservative Driver
	•	Big brakes
	•	Small engine
	•	Rare crashes
	•	Low top speed

🐎 Trend Follower
	•	Strong engine
	•	Moderate brakes
	•	Loves highways
	•	Hates sharp turns

🧨 Aggressive Leverage
	•	Massive acceleration
	•	Weak brakes
	•	Spectacular wins
	•	Spectacular crashes

🧠 Adaptive Macro
	•	Adjustable everything
	•	Hard to master
	•	Highest Sharpe potential

⸻

🧮 Scoring System (No Fake Gamification)

Score = Real investing metrics, not points.

Metric	Meaning
CAGR	Distance covered
Sharpe	Smoothness of drive
Max Drawdown	Crash severity
Time to Recovery	Pit stop efficiency
Risk of Ruin	Career survival

Leaderboard is multi-dimensional:
	•	“Fastest with Sharpe > 1”
	•	“Longest survival”
	•	“Best crash recovery”

⸻

🏁 Game Modes

1️⃣ Career Mode
	•	Start with small engine
	•	Unlock assets, tools, leverage
	•	Survive multiple cycles

2️⃣ Scenario Mode
	•	Dotcom bubble
	•	2008 crash
	•	COVID
	•	Crypto winter

3️⃣ Sandbox
	•	Free experiment
	•	No scoring pressure

4️⃣ Ghost Drive
	•	Race against your past self
	•	See where you crashed before

⸻

🧠 Learning Without Teaching

The player learns:
	•	Why leverage kills in volatility
	•	Why cash feels “slow but safe”
	•	Why trends matter more than prediction
	•	Why survival beats brilliance

No tutorials. Only consequences.

⸻

🧩 Why This Is Powerful (Design Insight)

Most investing games fail because:
	•	They reward prediction
	•	They hide risk
	•	They reset pain

Your game:
	•	Rewards positioning
	•	Makes risk physical
	•	Makes mistakes memorable

This builds market reflex, not knowledge.

⸻

📊 Trading Terminal Integration

The game features a **real-time trading terminal** that bridges the gap between simulation and real trading practice.

**Core Concept:**
The Trading Terminal is your "cockpit dashboard" — allowing you to place orders that directly affect your car's financial state while driving through market terrain.

---

### 🖥 Dual-View System: See & Feel

The game uses a **split-screen architecture** that separates what you SEE from what you FEEL:

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 CHART VIEW (Where you SEE & DRAW)                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │       ┃   ┃                                               │  │
│  │     ┃ ┃   ┃ ┃    ┃      Candlestick Chart                 │  │
│  │     ┃ ┃ ┃ ┃ ┃  ┃ ┃                                        │  │
│  │     ┗━┛ ┗━┛ ┗━━┛ ┗━┛    ← Draw orders HERE               │  │
│  │     ══════════════════  ← Entry line                      │  │
│  │     ██████████████████  ← Stop zone                       │  │
│  │     Price: $105.20      Volume: 1.2M                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓ SYNCED ↓                         │
├─────────────────────────────────────────────────────────────────┤
│  🏎 DRIVE VIEW (Where you FEEL)                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │    ☁️         ☁️                    ☁️                      │  │
│  │              ╱╲        Road = Accumulated Returns         │  │
│  │        🚗💨 ╱  ╲                                           │  │
│  │      ═════╱════╲════════                                  │  │
│  │          ╱  🛡️  ╲___🏁    ← Orders appear as road elements │  │
│  │    ~~~~~~~~~~~~~~~~~~~~~  (water/ground)                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  [P&L: +5.2%] [Position: 100 AAPL] [Streak: 3🔥]                │
└─────────────────────────────────────────────────────────────────┘
```

**Why Two Views?**

| View | Shows | Purpose |
|------|-------|---------|
| **Chart View** | Candlesticks (Price) | Traditional trading interface - what traders SEE |
| **Drive View** | Accumulated Returns | Physical terrain - what traders FEEL |

**The Learning Loop:**
```
1. SEE patterns     → Recognize candlestick formations on chart
        ↓
2. DRAW orders      → Place entry, stop loss, take profit
        ↓
3. WATCH sync       → See orders appear as road elements
        ↓
4. FEEL outcome     → Drive through returns, experience P&L
        ↓
5. BUILD intuition  → Connect "chart pattern" → "road difficulty"
```

---

#### 📐 View Modes

Players can toggle layout based on their focus:

| Mode | Layout | Best For | Key |
|------|--------|----------|-----|
| **Split View** | 30% chart / 70% road | Active trading + driving | C |
| **Chart Focus** | 70% chart / 30% road | Drawing complex setups | C+C |
| **Drive Focus** | Mini chart overlay | Execution & driving | C+C+C |
| **Full Immersion** | Road only | Advanced players | C+C+C+C |

**Quick Toggle:** Press **C** to cycle through views

**Picture-in-Picture:** Hold **Tab** to temporarily show full chart while driving

---

#### 🕯 Candlestick → Terrain Translation

Each candle on the chart becomes a road segment:

| Candle Pattern | Road Shape | Physics Effect |
|----------------|------------|----------------|
| 📗 Green candle | Uphill slope | Car gains momentum |
| 📕 Red candle | Downhill slope | Car accelerates down |
| Long upper wick | Bump → drop | Sudden deceleration |
| Long lower wick | Dip → recovery | Bounce effect |
| Doji (cross) | Rough/flat patch | Vibration, no momentum |
| Marubozu (full body) | Smooth steep slope | Fast acceleration |
| Hammer | Deep pothole → ramp | Hard bounce up |
| Shooting star | Ramp → cliff edge | Momentum trap |

**Visual Sync Indicator:**
- Current candle highlighted on chart with pulsing border
- Corresponding road segment glows beneath car
- Timeline marker shows exact position on both views

---

#### 📊 What Each View Shows

**Chart View (Top Panel):**
```
┌─────────────────────────────────────────┐
│ AAPL 15m                    $105.20 ▲2% │  ← Symbol, timeframe, price
│                                         │
│     ┃   ┃ ┃                            │
│   ┃ ┃   ┃ ┃ ┃    ┃                     │  ← Candlesticks
│   ┃ ┃ ┃ ┃ ┃ ┃  ┃ ┃                     │
│   ┗━┛ ┗━┛ ┗━┻━━┛ ┗━┛                    │
│   ════════════════════  [ENTRY $100]    │  ← Your drawn orders
│   ████████████████████  [SL $95]        │
│           ████████████  [TP $115]       │
│─────────────────────────────────────────│
│ RSI: 58 | MACD: + | Vol: 1.2M          │  ← Indicators as numbers
└─────────────────────────────────────────┘
```

**Drive View (Bottom Panel):**
```
┌─────────────────────────────────────────┐
│   ☁️              ☀️            ☁️       │  ← Sky (market sentiment)
│                                         │
│                    🏁                    │  ← Take profit checkpoint
│               ╱╲  ╱                      │
│         🚗💨╱   ╲╱                       │  ← Car on returns road
│    ══════╱═══════╲════════════          │
│         ╱    🛡️    ╲________            │  ← Stop loss barrier
│   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ │  ← Ground level (0% return)
│                                         │
│  [+5.2%] [Speed: 72] [Fuel: 80%]       │  ← Dashboard
└─────────────────────────────────────────┘
```

---

#### 🔄 Real-Time Synchronization

**Chart → Road sync happens continuously:**

| Chart Event | Road Event |
|-------------|------------|
| New candle forms | New road segment generates |
| Price hits your entry line | Boost pad activates, position opens |
| Price hits stop loss | Barrier catches car, position closes |
| Indicator crosses threshold | Road sign appears (warning/opportunity) |
| Volume spike | Road widens or obstacles appear |
| Volatility increase | Road surface becomes rougher |

**Order Sync Visualization:**
```
Chart View:                      Drive View:

    ════════ Entry @ $100   →    ═══🚀═══ Boost pad at 0%
    ████████ Stop @ $95     →    ═══🛡️═══ Barrier at -5%
    ████████ Target @ $115  →    ═══🏁═══ Checkpoint at +15%
```

---

#### 🎯 Why Accumulated Returns (Not Price) for Road?

The road represents **your P&L journey**, not the asset's price history:

| Aspect | Price-Based Road | Returns-Based Road ✓ |
|--------|------------------|---------------------|
| **Starting point** | Asset's current price | 0% (your entry) |
| **Scale** | BTC: 40,000 vs Stock: $100 | Both: -50% to +100% |
| **Meaning** | "Price went here" | "You gained/lost this much" |
| **Drawdown feel** | Confusing across assets | Universal: -20% = same hill |
| **Recovery** | Price retracing | +25% climb after -20% fall |

**The Math Becomes Physical:**
```
You're down 50%:
├── Road shows: Deep canyon at -50% level
├── Recovery needed: +100% to break even
└── Road shows: The climb back is TWICE as steep

This teaches gain-loss asymmetry through PHYSICS, not numbers.
```

---

### 🖥 Screen Reading & Data Sources

**TradingView Integration:**
- Connect to TradingView charts via screen capture or API
- Real-time price feeds drive terrain generation
- Candlestick patterns become road obstacles and opportunities
- Technical indicators appear as road signs and warnings

**Supported Data Sources:**
| Source | Integration Method | Use Case |
|--------|-------------------|----------|
| TradingView | Screen Reader / Webhook | Live charts, indicators |
| Broker APIs | REST/WebSocket | Real order execution (paper) |
| CSV/JSON | File import | Historical replay |
| Manual Input | In-game UI | Educational scenarios |

**Screen Reading Architecture:**
```
TradingView Chart → Screen Capture → OCR/Pattern Recognition
                                          ↓
                              Price Data Extraction
                                          ↓
                              Terrain Generator ← Order Engine
                                          ↓
                                    Game Physics
```

---

### 🎨 Draw-to-Trade: Visual Order Placement

**No Forms. No Menus. Just Draw.**

The Trading Terminal is fully **playable** — players draw their trade setups directly on the chart like sketching on a canvas. This transforms order placement from boring form-filling into an intuitive, game-like experience.

---

#### ✏️ Drawing Tools

| Tool | Gesture | What It Creates |
|------|---------|-----------------|
| **Entry Line** | Draw horizontal line | Limit order at that price |
| **Entry Arrow** | Draw arrow pointing up/down | Market order (up=buy, down=sell) |
| **Stop Zone** | Draw red rectangle below entry | Stop loss zone |
| **Target Zone** | Draw green rectangle above entry | Take profit zone |
| **Trail Path** | Draw wavy line following price | Trailing stop path |
| **Position Box** | Draw box around candles | Define entry zone range |
| **Risk Triangle** | Connect entry, stop, target | Visualize R:R ratio |

**Drawing Mechanics:**
```
┌─────────────────────────────────────────┐
│                    🎯 TP [$115]         │  ← Green zone (draw rectangle)
│               ┌────────────┐            │
│               │  +15% ✓    │            │
│               └────────────┘            │
│  ════════════════════════════════════   │  ← Entry line (draw horizontal)
│              📍 ENTRY [$100]            │
│                    │                    │
│               ┌────┴───────┐            │
│               │  -5% ✗     │            │  ← Red zone (draw rectangle)
│               └────────────┘            │
│                    🛑 SL [$95]          │
└─────────────────────────────────────────┘
```

---

#### 🎮 Gesture Controls

**Mouse/Touch Gestures:**
| Gesture | Action |
|---------|--------|
| **Click + Drag horizontal** | Draw entry/exit level |
| **Click + Drag vertical** | Adjust position size (wider = bigger) |
| **Swipe up on price** | Quick market buy |
| **Swipe down on price** | Quick market sell |
| **Pinch zones** | Tighten stop loss / take profit |
| **Spread zones** | Widen stop loss / take profit |
| **Double-tap order** | Cancel/modify |
| **Long press + drag** | Move existing order |
| **Draw X over order** | Cancel order |

**Keyboard + Draw Combos:**
| Key + Draw | Effect |
|------------|--------|
| Hold **Shift** + draw | Snap to support/resistance |
| Hold **Ctrl** + draw | Draw on multiple timeframes |
| Hold **Alt** + draw | Mirror order (hedge) |

---

#### 🎯 Visual Order Types

**1. Sniper Entry (Limit Order)**
- Draw a thin horizontal line at desired price
- Line glows when price approaches
- Pulses green when filled

**2. Cannon Shot (Market Order)**
- Draw arrow pointing into the chart
- Instant execution with explosion effect
- Arrow size = position size

**3. Safety Net (Stop Loss)**
- Draw red zone below your entry
- Net catches your car if it falls
- Stretchy animation shows buffer

**4. Treasure Chest (Take Profit)**
- Draw green zone above your entry
- Chest opens with coins when hit
- Sparkle effect on profit capture

**5. Shadow Trail (Trailing Stop)**
- Draw a path that follows the car
- Shadow follows at fixed distance
- Fades if car reverses too fast

**6. Bracket Trap (OCO Order)**
- Draw both stop and target zones
- Forms a bracket around position
- First zone hit cancels the other

---

#### 🏎 Orders Become Road Elements

Your drawn orders materialize as **physical objects on the road**:

| Order Type | Road Element | Interaction |
|------------|-------------|-------------|
| **Limit Buy** | Boost pad (appears at price level) | Car hits it → position opens |
| **Stop Loss** | Safety barrier | Catches falling car, limits damage |
| **Take Profit** | Finish flag / Checkpoint | Triggers celebration, banks gains |
| **Trailing Stop** | Moving barrier behind car | Follows at distance, stops if reversed |
| **Pending Order** | Glowing marker on road | Visible obstacle/opportunity ahead |

**Visual Example:**
```
Road View:
                    🏁 [TP $120]
                   /
    ═══════════════════════════════  ← Road (price history)
         🚗💨                         ← Your car at $105
    ═══════════════════════════════
                   \
                    🛡️ [SL $98]

Your drawings become real track elements!
```

---

### 💰 Financial State System

Orders directly modify the car's financial position:

**Portfolio State Variables:**
```
Position Size    → Engine displacement (power potential)
Unrealized P&L   → Current momentum (speed boost/drag)
Realized P&L     → Fuel reserve (sustainability)
Margin Used      → Engine stress level
Available Margin → Brake fluid remaining
```

**State Transitions on Order Events:**

| Event | Financial Impact | Physics Effect |
|-------|-----------------|----------------|
| **Open Long** | +Position, -Cash, +Margin | Engine power up, brakes weaker |
| **Open Short** | +Short Position, -Margin | Reverse gear engaged |
| **Close @ Profit** | +Realized P&L, +Cash | Fuel tank refilled, smoother ride |
| **Close @ Loss** | -Realized P&L, -Cash | Engine damage, recovery drag |
| **Stop Loss Hit** | Limited loss, -Position | Emergency brake, car slows |
| **Margin Call** | Forced liquidation | Engine failure, coast to stop |
| **Leverage Increase** | +Margin Used | Turbo activated, less control |

---

### 📈 P&L Visualization

**Real-Time Feedback:**
- **Green glow** around car = Unrealized profit
- **Red warning lights** = Unrealized loss
- **P&L ticker** on dashboard shows live changes
- **Equity curve** rendered as "tire tracks" behind car

**Order Execution Feedback:**
- **Order placed**: Drawing solidifies with glow
- **Order filled**: Explosion/boost effect + sound
- **Order rejected**: Drawing shatters + warning
- **Partial fill**: Drawing partially fills in

**Draw Feedback Animations:**
| State | Animation |
|-------|-----------|
| Drawing | Sketchy/dotted line following cursor |
| Pending | Solid line, gentle pulse |
| Near trigger | Intense glow, vibration |
| Filled | Burst effect, line becomes road element |
| Cancelled | Line dissolves/erases |

---

### 🎮 Gamification Elements

**Combo System:**
- Chain successful trades for multiplier
- "3-Trade Streak!" → Bonus engine power
- "Perfect Entry!" → Hit limit within 0.1% → XP bonus

**Drawing Precision Rewards:**
| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| **Sniper** | Entry within 0.5% of drawn level | +10 XP |
| **Architect** | R:R ratio > 3:1 | +25 XP |
| **Safety First** | Stop loss saved > 5% | +15 XP |
| **Patient Hunter** | Limit order waited > 1 hour | +20 XP |
| **Quick Draw** | Order placed in < 2 seconds | +5 XP |

**Visual Unlocks:**
- Better drawing tools (glow effects, colors)
- Custom order markers (skulls, diamonds, etc.)
- Trail effects for your lines
- Sound packs for order fills

**Leaderboard Categories:**
- Most precise entries (lowest slippage)
- Best R:R ratios drawn
- Fastest profitable setups
- Longest winning streaks

---

### 🧪 Drawing Practice Mode

**Tutorial Missions:**

1. **"First Stroke"** - Draw your first entry line, watch it fill
2. **"Safety Sketch"** - Draw a stop loss, survive a dip
3. **"The Art of Patience"** - Draw limit below market, wait for fill
4. **"Bracket Master"** - Draw complete setup (entry + SL + TP)
5. **"Trail Blazer"** - Draw trailing path, ride a trend
6. **"Speed Sketch"** - Complete 5 setups in 60 seconds

**Skill Challenges:**
- Draw 10 setups with R:R > 2:1
- Get 5 limit orders filled within 1% of drawn price
- Survive a crash using only drawn stop losses
- Complete a trend trade using only trailing stop drawing

---

### 📊 Trade Journal & Analytics

**Automatic Trade Logging:**
- Every order timestamped and recorded
- Entry/exit prices with road position
- Win rate, average win/loss calculated
- Emotional state indicators (were you speeding when you traded?)

**Post-Game Analysis:**
```
Trade #  | Type   | Entry  | Exit   | P&L    | Road Condition
---------|--------|--------|--------|--------|---------------
1        | Long   | 100.50 | 105.20 | +4.7%  | Uphill smooth
2        | Long   | 108.00 | 102.00 | -5.5%  | Peak → crash
3        | Short  | 101.00 | 95.00  | +5.9%  | Downhill
```

**Learning Insights Generated:**
- "You tend to buy at peaks (uphill exhaustion)"
- "Your stops are too tight for this volatility"
- "You exit winners too early, losers too late"

---

### 🔗 External Platform Integration

**Paper Trading Mode:**
- Connect to broker paper trading accounts
- Real order flow, fake money
- Practice with real market conditions

**Supported Platforms:**
- TradingView (via webhooks/alerts)
- Interactive Brokers (paper account)
- Alpaca Markets (paper trading API)
- Binance Testnet (crypto)

**Webhook Format:**
```json
{
  "action": "buy",
  "symbol": "AAPL",
  "quantity": 10,
  "order_type": "market",
  "source": "tradingview_alert"
}
```

---

### ⚠️ Risk Warnings (Built Into Game)

The terminal enforces realistic trading constraints:

- **Slippage simulation** - Market orders fill at worse prices in volatility
- **Latency** - Orders take 100-500ms to execute (no instant fills)
- **Partial fills** - Large orders may fill gradually
- **Gap risk** - Price can jump past your stop loss
- **Overnight risk** - Holding through session close has gap exposure

**Unrealistic Behaviors Prevented:**
- No retroactive order placement
- No modifying filled orders
- No unlimited buying power
- No ignoring margin requirements

⸻

🚀 This Can Become a Platform

Future extensions:
	•	Multiplayer macro regimes
	•	AI co-driver strategies
	•	Real-time market mode
	•	Personal portfolio replay
	•	**Live Trading Terminal with real broker connections**
	•	**Social trading - copy other drivers' orders**
	•	**AI trading bot as co-pilot**

This is Miro-meets-TradingView-meets-F1, but 
