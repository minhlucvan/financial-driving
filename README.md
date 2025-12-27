# Financial Drive

A browser-based driving simulation that teaches financial concepts through physics. Built with Phaser 3 and Matter.js.

**You are not "picking stocks". You are driving a financial machine through market terrain.**

## Core Concept

Financial Drive transforms market data into a physical driving experience. Every financial concept has a mechanical equivalent:

| Financial Concept | Game Metaphor |
|-------------------|---------------|
| Assets | Engine power |
| Cash | Brake strength |
| Debt/Leverage | Acceleration boost |
| Volatility | Road roughness |
| Drawdown | Steep downhill |
| Margin Call | Engine failure |

This is not cosmetic - **physics is enforced**.

## Gain-Loss Asymmetry

The game embodies two fundamental truths about losses:

### Mathematical Law (Compounding Reality)

A loss of L% requires a gain of **L/(1-L)%** to recover:

| Loss | Recovery Needed |
|------|-----------------|
| -10% | +11.1% |
| -20% | +25% |
| -50% | +100% |
| -90% | +900% |

**In-game:** The HUD displays "DD: -30% → Need +42.86% to recover"

### Psychological Law (Loss Aversion)

Losses are weighted ~2.25x stronger than gains (Kahneman-Tversky Prospect Theory).

**In-game:**
- Stress accumulates 2.25x faster on losses
- Stress reduces slower on gains
- **Recovery Drag**: The car feels heavier when climbing back from drawdown

## The Road = Market History

The terrain is generated from market price data:
- **Slope** = Daily returns (up = gains, down = losses)
- **Curvature** = Volatility patterns
- **Road conditions** = Liquidity and regime

Bull market = smooth uphill highway
Choppy market = winding mountain road
Crash = steep downhill + fog + potholes

## Fog of War

The road is divided into two parts:

**Historical (Behind Car):** 100% opacity
- You've driven it
- Clear, certain, unchangeable

**Future (Ahead of Car):** 50% opacity
- Uncertain projection
- Faded/fogged terrain
- Shows momentum hints, NOT certainty

**VIX/Volatility controls fog intensity** - higher volatility = thicker fog.

Press **V** to toggle fog of war.

This enforces the core lesson: **You cannot see the future. Past performance ≠ future results.**

## Strategy Presets

Press **T** to cycle through strategies:

| Strategy | Leverage | Cash Buffer | Description |
|----------|----------|-------------|-------------|
| Conservative | 0.5x | 40% | Big brakes, small engine. Slow but safe. |
| Balanced | 1.0x | 20% | Moderate risk, moderate reward. |
| Aggressive | 2.0x | 10% | Strong engine, weak brakes. High risk. |
| YOLO | 3.0x | 2% | Maximum leverage. Spectacular wins or crashes. |

## Market Physics

Road conditions are driven by technical indicators:

| Indicator | Road Effect |
|-----------|-------------|
| ATR | Road roughness |
| VIX/Volatility | Fog + wind + camera shake |
| Moving Average slope | Uphill / downhill |
| RSI extremes | Slippery edges (overbought/oversold) |
| Volume | Road width |

**You feel indicators, not read them.**

### RSI Traction Penalty
- RSI > 70 (overbought): Reduced traction
- RSI < 30 (oversold): Reduced traction
- Market extremes are unstable - the "edge of the road" is slippery

## Visual Stress Indicators

The car visually responds to financial stress:

- **Smoke particles**: Emit when approaching margin call
- **Car tinting**: Red tint intensity based on margin proximity
- **Recovery drag visual**: Darker tint when climbing back from drawdown
- **Engine overheating**: Over-leveraged state

## Controls

| Key | Action |
|-----|--------|
| **W / Right Arrow** | Accelerate (forward torque) |
| **S / Left Arrow** | Brake / Reverse |
| **Q** | Decrease leverage |
| **E** | Increase leverage |
| **T** | Cycle strategy preset |
| **V** | Toggle fog of war |
| **N** | Next market dataset |
| **R** | Restart |
| **F** | Toggle fullscreen |
| **D** | Debug info (FPS) |

## HUD Display

The heads-up display shows:
- **Portfolio Value**: Current wealth
- **Leverage**: Current leverage multiplier
- **Drawdown**: Current % below peak (with recovery needed)
- **Stress**: Psychological stress meter (λ=2.25 weighted)
- **Sharpe Ratio**: Risk-adjusted performance metric
- **Strategy**: Current strategy preset
- **Market Day**: Current position in market data
- **Volatility**: Current market volatility level

## Scoring System

Score = Real investing metrics, not points:

| Metric | Meaning |
|--------|---------|
| CAGR | Distance covered |
| Sharpe Ratio | Smoothness of drive |
| Max Drawdown | Crash severity |
| Time to Recovery | Pit stop efficiency |
| Risk of Ruin | Career survival |

## Technical Details

### Terrain Generation
- Terrain generated from cumulative market returns
- Each market day = terrain segment with slope based on daily return
- Chunks loaded dynamically as vehicle progresses
- Procedural generation with premade segments for variety

### Financial Physics Engine
The `WealthEngine` class manages:
- Portfolio value tracking with leverage
- Drawdown calculation and recovery tracking
- Stress accumulation with loss aversion (λ=2.25)
- Margin call detection
- Sharpe ratio calculation
- Strategy preset management

### Vehicle Physics Modifiers
- **Leverage → Torque**: Higher leverage = more acceleration power
- **Cash Buffer → Brakes**: More cash = better stopping power
- **Volatility → Traction**: High volatility = reduced grip
- **Recovery Drag → Reduced Power**: Deeper drawdown = harder to accelerate
- **RSI Extremes → Slippery**: Market extremes reduce traction

## Running the Game

This is a static web application. Serve with any HTTP server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Open `http://localhost:8000` in a browser.

## Architecture

```
financial-driving/
├── index.html           # Entry point
├── src/
│   ├── base.js          # Global variables
│   ├── noiseGenerator.js # Curve generation
│   ├── terrainGenerator.js # Tile placement
│   ├── chunk.js         # Terrain segments
│   ├── chunkLoader.js   # Chunk management
│   ├── vehicle.js       # Vehicle physics
│   ├── wealthEngine.js  # Financial simulation
│   ├── backgroundLoader.js # Parallax backgrounds
│   └── main.js          # Game scenes and loop
├── assets/              # Sprites, tilesets, fonts
├── tests/               # Jest test suite
├── CONCEPTS.md          # Detailed game design document
└── CLAUDE.md            # AI development guide
```

## Design Philosophy

Most investing games fail because they:
- Reward prediction
- Hide risk
- Reset pain

Financial Drive:
- **Rewards positioning** over prediction
- **Makes risk physical** through car handling
- **Makes mistakes memorable** through consequences

This builds market reflex, not just knowledge.

**No tutorials. Only consequences.**

## License

MIT License - See LICENSE file for details.

## Credits

- Original car physics: [phaser3-matterjs-car](https://github.com/ankit-4129/phaser3-matterjs-car)
- Framework: Phaser 3.55.2
- Physics: Matter.js
- Background assets: craftpix.net
- Tile editing: Tiled Map Editor
