# Financial Drive - Development Plan

## Overview

This document outlines the phased development plan to transform the current procedural terrain driving game into **Financial Drive** - an educational simulation where driving mechanics teach financial concepts.

---

## Current State

### Implemented
- Phaser 3.55.2 game framework with Matter.js physics
- Procedural terrain generation via noise algorithms
- Chunk-based world loading with circular buffer
- Data-driven vehicle system with JSON configuration
- Parallax scrolling backgrounds
- Vehicle selection scene
- Basic keyboard controls

### Not Implemented
- Market data integration
- Financial position system
- Time/tick mechanics
- Scoring system
- Game modes
- Visual feedback for financial states

---

## Development Phases

### Phase 1: Foundation - Market Data Terrain

**Goal:** Replace procedural noise with market price data for terrain generation.

#### Tasks

1. **Create MarketDataLoader class** (`src/marketDataLoader.js`)
   - Load historical price data (JSON/CSV format)
   - Parse OHLCV candle data
   - Calculate daily returns for slope mapping
   - Calculate volatility (ATR) for terrain roughness

2. **Create MarketTerrainGenerator** (`src/marketTerrainGenerator.js`)
   - Map price returns to terrain slopes (-32 to +32 pixels)
   - Map volatility to terrain curvature
   - Integrate with existing `drawTerrain()` function

3. **Sample Market Data** (`assets/market/`)
   - Create sample datasets: S&P 500, Bitcoin, volatile stocks
   - Format: `{ date, open, high, low, close, volume }`

4. **Update NoiseGenerator.getCurve()**
   - Add option to select market data vs procedural generation

#### Deliverables
- Terrain generated from real price history
- Visual representation: uphill = gains, downhill = losses

---

### Phase 2: Financial Position System

**Goal:** Implement car stats that reflect a financial portfolio.

#### Tasks

1. **Create FinancialPosition class** (`src/financialPosition.js`)
   ```javascript
   {
     assets: 0.7,      // 70% allocation (affects engine power)
     cash: 0.2,        // 20% cash (affects brake strength)
     debt: 0.1,        // 10% leverage (affects acceleration)
     drawdown: 0,      // Current drawdown from peak
     portfolioValue: 10000
   }
   ```

2. **Link Position to Vehicle Physics**
   - Engine torque = base * (1 + assets * marketTrend)
   - Brake force = base * (1 + cash * 2)
   - Acceleration boost = base * (1 + debt * 3)
   - Traction = base * (1 - volatility * debt)

3. **Create PositionManager class** (`src/positionManager.js`)
   - Track portfolio value over time
   - Calculate drawdown from peak
   - Handle margin calls (debt > threshold during drawdown)

4. **Update Vehicle class**
   - Accept FinancialPosition as constructor parameter
   - Dynamically adjust physics based on position

#### Deliverables
- Car behavior changes based on portfolio allocation
- High leverage = faster but harder to control

---

### Phase 3: Time System & Game Loop

**Goal:** Implement tick-based progression tied to market days.

#### Tasks

1. **Create TimeController class** (`src/timeController.js`)
   - 1 tick = 1 market day
   - Modes: pause, play, fast-forward (2x, 4x, 8x)
   - Emit events on tick advance

2. **Tick-Based Terrain Reveal**
   - Fog-of-war: only show terrain up to current tick
   - Reveal next segment on tick advance
   - Visual fog effect beyond current position

3. **Update gameScene loop**
   - Decouple physics from time progression
   - Update position values on each tick
   - Trigger rebalancing opportunities at checkpoints

4. **Create Checkpoint System**
   - Designated pause points (weekly/monthly)
   - Allow portfolio rebalancing only at checkpoints
   - Visual markers on terrain

#### Deliverables
- Game progresses in market-day ticks
- Player cannot see future terrain
- Checkpoints for strategic decisions

---

### Phase 4: Scoring System

**Goal:** Implement real financial metrics as game score.

#### Tasks

1. **Create ScoreTracker class** (`src/scoreTracker.js`)
   - Track daily portfolio values
   - Calculate:
     - CAGR (Compound Annual Growth Rate)
     - Sharpe Ratio (risk-adjusted return)
     - Max Drawdown (worst peak-to-trough)
     - Time to Recovery
     - Sortino Ratio

2. **Create HUD Display** (`src/hud.js`)
   - Real-time metrics display
   - Portfolio value graph (mini chart)
   - Current position breakdown
   - Risk indicators

3. **End-Game Summary Screen**
   - Final metrics comparison
   - Performance vs benchmark
   - Replay option

#### Deliverables
- Live financial metrics during gameplay
- Meaningful score based on real investing metrics

---

### Phase 5: Visual Feedback System

**Goal:** Physical feedback for financial states.

#### Tasks

1. **Create VisualFeedback class** (`src/visualFeedback.js`)
   - Particle systems for:
     - Engine smoke (over-leveraged)
     - Brake glow (cash buffer active)
     - Turbo flames (debt acceleration)
     - Sparks (margin stress)
     - Skid marks (volatility mismatch)

2. **Car State Indicators**
   - Color tinting based on health
   - Damage sprites for drawdown
   - Warning icons for margin call risk

3. **Environmental Effects**
   - Fog density based on VIX/volatility
   - Rain/weather for market conditions
   - Road surface changes (smooth highway vs rocky path)

4. **Audio Feedback** (Optional)
   - Engine sounds varying with leverage
   - Warning beeps for risk
   - Crash sounds for margin calls

#### Deliverables
- Visual language that communicates financial state
- Players "feel" their portfolio status

---

### Phase 6: Game Modes

**Goal:** Implement multiple play experiences.

#### Tasks

1. **Sandbox Mode**
   - Free experimentation
   - No scoring pressure
   - Adjustable parameters

2. **Scenario Mode**
   - Pre-loaded historical events:
     - Dotcom Bubble (1999-2002)
     - 2008 Financial Crisis
     - COVID Crash (2020)
     - Crypto Winter (2022)
   - Fixed starting conditions
   - Leaderboard per scenario

3. **Career Mode**
   - Start with limited options
   - Unlock assets/tools over time
   - Survive multiple market cycles
   - Progression system

4. **Ghost Drive Mode**
   - Race against previous runs
   - See where past self crashed
   - Improve on previous decisions

#### Deliverables
- Multiple engaging game modes
- Replayability through different experiences

---

### Phase 7: UI/UX Polish

**Goal:** Create intuitive, polished interface.

#### Tasks

1. **Main Menu Redesign**
   - Mode selection
   - Settings
   - Leaderboards

2. **Rebalancing UI**
   - Slider controls for allocation
   - Visual preview of changes
   - Confirmation with trade costs

3. **Strategy Presets**
   - Conservative, Balanced, Aggressive
   - Custom strategy saving

4. **Tutorial/Onboarding** (Optional)
   - Contextual hints
   - First-run guidance
   - Concept explanations

5. **Mobile Controls** (Future)
   - Touch input support
   - Responsive layout

#### Deliverables
- Polished, intuitive user experience
- Clear communication of game mechanics

---

## File Structure (Proposed)

```
src/
├── base.js                  # Globals (existing)
├── main.js                  # Scenes (existing)
├── vehicle.js               # Vehicle class (existing, modified)
├── chunk.js                 # Chunk class (existing)
├── chunkLoader.js           # ChunkLoader (existing)
├── noiseGenerator.js        # Noise gen (existing)
├── terrainGenerator.js      # Terrain gen (existing, modified)
├── backgroundLoader.js      # Backgrounds (existing)
├── marketDataLoader.js      # NEW: Load market data
├── marketTerrainGenerator.js # NEW: Market-based terrain
├── financialPosition.js     # NEW: Portfolio state
├── positionManager.js       # NEW: Position management
├── timeController.js        # NEW: Tick system
├── scoreTracker.js          # NEW: Metrics calculation
├── hud.js                   # NEW: UI overlay
├── visualFeedback.js        # NEW: Particle effects
└── gameModes.js             # NEW: Mode configurations

assets/
├── market/                  # NEW: Market data files
│   ├── sp500.json
│   ├── btc.json
│   └── scenarios/
│       ├── dotcom.json
│       ├── 2008crash.json
│       └── covid.json
├── particles/               # NEW: Particle sprites
└── ui/                      # NEW: UI elements
```

---

## Priority Recommendations

### MVP (Minimum Viable Product)
1. Phase 1: Market Data Terrain
2. Phase 2: Financial Position System
3. Phase 4: Scoring System (basic metrics)

### Full Release
4. Phase 3: Time System
5. Phase 5: Visual Feedback
6. Phase 6: Game Modes
7. Phase 7: UI Polish

---

## Technical Considerations

### Performance
- Market data should be pre-processed, not calculated in real-time
- Particle systems need object pooling
- Consider Web Workers for heavy calculations

### Data Sources
- Free historical data: Yahoo Finance API, Alpha Vantage
- Store as static JSON for offline play
- Consider data update mechanism for "real-time" mode

### Testing
- Unit tests for financial calculations
- Browser testing across Chrome, Firefox, Safari
- Performance profiling for mobile devices

---

## Cleanup Tasks

- Remove duplicate `CONCEPTS.md` (keep only `CONCEPT.md`)
- Add `.gitignore` for any build artifacts
- Consider adding ESLint for code consistency

---

## Success Metrics

The game succeeds when players:
1. Understand leverage risk through gameplay (not tutorials)
2. Feel the difference between strategies
3. Remember crashes as learning moments
4. Can explain Sharpe ratio from experience
