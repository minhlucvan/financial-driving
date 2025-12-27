
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

### 📝 Order Types & Mechanics

**Available Order Types:**

| Order Type | Game Effect | Learning Objective |
|------------|-------------|-------------------|
| **Market Buy** | Instant engine boost | Immediate execution, slippage risk |
| **Market Sell** | Reduce engine power | Exit positions quickly |
| **Limit Buy** | Scheduled boost at price level | Patience, price targeting |
| **Limit Sell** | Auto-sell at target | Taking profits |
| **Stop Loss** | Auto-brake trigger | Risk management |
| **Take Profit** | Auto-coast at gains | Locking in wins |
| **Trailing Stop** | Dynamic brake adjustment | Riding trends safely |

**Order Placement UI:**
- Press **T** to open Trading Terminal overlay
- Quick-order buttons on HUD for fast execution
- Order book visualization shows pending orders
- Drag-and-drop stop/limit levels on price ladder

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
- **Order placed**: Indicator light blinks
- **Order filled**: Engine sound change + visual flash
- **Order rejected**: Warning buzzer + red flash
- **Partial fill**: Gradual power adjustment

---

### 🎮 Trading Terminal Controls

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| T | Toggle Trading Terminal |
| B | Quick Market Buy |
| S | Quick Market Sell |
| L | Place Limit Order |
| X | Cancel all pending orders |
| P | Show/hide P&L panel |
| O | Open order book |

**Order Sizing:**
- Use number keys (1-9) to set position size as % of capital
- **0** = Close entire position
- **Shift + number** = Leverage multiplier

---

### 🧪 Learning Scenarios

**Tutorial Missions for Order Types:**

1. **"First Trade"** - Place a market buy, watch position open
2. **"The Stop Loss"** - Set stop loss, survive a mini-crash
3. **"Limit Order Patience"** - Wait for price, get better entry
4. **"Trailing the Trend"** - Ride uphill with trailing stop
5. **"Leverage Trap"** - Experience margin call in safe environment
6. **"Scale In/Out"** - Partial position management

**Skill Challenges:**
- Execute 10 trades with < 2% slippage
- Survive a 20% drawdown with proper stops
- Capture a trend with trailing stop (no manual exit)
- Close position before margin call triggers

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
