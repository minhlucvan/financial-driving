import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';
import type { RoadSegment, RoadConditions, MarketRegime, CarPhysics, ChartCandle, MarketIndicators, Position } from '../../types';
import {
  drawSky,
  drawFog,
  drawWind,
  drawRain,
  drawCloud,
  drawLightning,
  drawRoadSegment,
  drawGround,
  drawGauge,
  drawBar,
  type RoadGeometry,
  // SVG car system
  generateCarSVG,
  getCarTextureKey,
  getCarDefinition,
  loadSVGTexture,
  type CarType,
  type CarState,
  // Chart overlay
  drawCandlestickChart,
  drawMarketInfoPanel,
  drawPortfolioPanel,
  drawPlaybackControls,
  drawTradingButtons,
} from '../vector';
import {
  REGIME_COLORS,
  UI_COLORS,
  getPnLColor,
  getDrawdownColor,
} from '../vector';

/**
 * GameScene - Vector-based visualization engine
 *
 * A clean, simple vector graphics game that visualizes financial state.
 * All rendering uses geometric primitives - no bitmap assets for gameplay elements.
 * This keeps focus on the financial concepts rather than game art.
 */
export class GameScene extends Phaser.Scene {
  // Graphics layers (back to front)
  private skyGraphics: Phaser.GameObjects.Graphics | null = null;
  private weatherGraphics: Phaser.GameObjects.Graphics | null = null;
  private groundGraphics: Phaser.GameObjects.Graphics | null = null;
  private roadGraphics: Phaser.GameObjects.Graphics | null = null;
  private carGraphics: Phaser.GameObjects.Graphics | null = null;
  private hudGraphics: Phaser.GameObjects.Graphics | null = null;

  // Chart overlay graphics (screen-space, fixed to camera)
  private chartGraphics: Phaser.GameObjects.Graphics | null = null;

  // HUD Text objects
  private hudTexts: {
    wealth?: Phaser.GameObjects.Text;
    return?: Phaser.GameObjects.Text;
    regime?: Phaser.GameObjects.Text;
    barInfo?: Phaser.GameObjects.Text;
    price?: Phaser.GameObjects.Text;
    rsi?: Phaser.GameObjects.Text;
    volatility?: Phaser.GameObjects.Text;
    drawdown?: Phaser.GameObjects.Text;
    leverage?: Phaser.GameObjects.Text;
    cash?: Phaser.GameObjects.Text;
    equity?: Phaser.GameObjects.Text;
    pnl?: Phaser.GameObjects.Text;
    controls?: Phaser.GameObjects.Text;
    speed?: Phaser.GameObjects.Text;
  } = {};

  // SVG car sprite
  private carSprite: Phaser.GameObjects.Sprite | null = null;
  private carType: CarType = 'sedan';
  private lastCarTextureKey = '';

  // Physics bodies
  private carBody: MatterJS.BodyType | null = null;
  private frontWheel: MatterJS.BodyType | null = null;
  private backWheel: MatterJS.BodyType | null = null;
  private groundBodies: MatterJS.BodyType[] = [];

  // Input
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;

  // Animation state
  private weatherTime = 0;
  private lightningTimer = 0;
  private showLightning = false;

  // External state from React (single source of truth)
  private externalState = {
    // Terrain
    terrainSlope: 0,
    terrainRoughness: 0,
    roadHeight: 0,

    // Road conditions
    roadConditions: {
      roughness: 0,
      visibility: 1,
      slope: 0,
      grip: 1,
      width: 1,
      weather: 'clear' as RoadConditions['weather'],
    },

    // Road segment
    roadSegment: {
      pattern: 'neutral' as const,
      slope: 0,
      roughness: 0,
      width: 1,
      hasObstacle: false,
      hasBump: false,
      hasPothole: false,
    } as RoadSegment,

    // Car physics
    carPhysics: {
      enginePower: 1,
      brakeStrength: 1,
      accelerationBoost: 1,
      traction: 1,
      durability: 1,
      recoveryDrag: 1,
      engineTemperature: 0,
      fuelLevel: 1,
    } as CarPhysics,

    // Physics modifiers
    torqueMultiplier: 1,
    brakeMultiplier: 1,
    tractionMultiplier: 1,

    // Financial state
    leverage: 1,
    cashBuffer: 0.2,
    pnlPercent: 0,
    drawdown: 0,
    stressLevel: 0,

    // Market state
    regime: 'CHOP' as MarketRegime,
    currentIndex: 0,
    wealth: 10000,
    datasetName: 'S&P 500',

    // Hedge state
    isHedged: false,
    hedgeCoverage: 0,
    hedgeRemaining: 0,
    hedgeCooldown: 0,

    // Chart data (for overlay)
    chartCandles: [] as ChartCandle[],
    totalBars: 0,
    currentPrice: 0,
    currentReturn: 0,
    currentDate: '',
    indicators: {
      rsi: 50,
      atr: 0,
      volatility: 0,
      trend: 0,
      drawdown: 0,
      regime: 'CHOP' as MarketRegime,
    } as MarketIndicators,

    // Portfolio state (for overlay)
    equity: 10000,
    cash: 10000,
    positions: [] as Position[],

    // Playback state
    isPlaying: false,
    playbackSpeed: 1,
    canGoBack: false,
    canGoForward: true,
  };

  constructor() {
    super({ key: 'gameScene' });
  }

  preload() {
    // SVG cars are generated programmatically - no asset loading needed
    // Get selected car type from global state
    this.carType = globalGameState.carType;
  }

  create() {
    const { width, height } = getScreenDimensions();

    // Create graphics layers (order matters - back to front)
    this.skyGraphics = this.add.graphics();
    this.weatherGraphics = this.add.graphics();
    this.groundGraphics = this.add.graphics();
    this.roadGraphics = this.add.graphics();
    this.carGraphics = this.add.graphics();
    this.hudGraphics = this.add.graphics().setScrollFactor(0);

    // Create chart overlay graphics (screen-space, fixed to camera)
    this.chartGraphics = this.add.graphics().setScrollFactor(0);

    // Create HUD text objects (screen-space)
    this.createHUDTexts();

    // Create physics world
    this.createPhysicsWorld();

    // Create physics car body
    this.createVectorCar();

    // Create SVG car sprite
    this.createSVGCarSprite();

    // Setup camera to follow car
    if (this.carBody) {
      this.cameras.main.startFollow(
        { x: this.carBody.position.x, y: this.carBody.position.y } as any,
        true,
        0.2,
        0.2,
        -width / 8,
        height / 8
      );
      this.cameras.main.setZoom(1.5);
    }

    // Setup keyboard
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.setupKeyboardControls();

    // Enable physics debug drawing temporarily
    // this.matter.world.drawDebug = true;

    // Register for state updates from React
    this.game.events.on('updateState', this.handleStateUpdate, this);

    // Initial render
    this.renderAll();

    // Notify React that game is ready
    if (globalGameState.onStateChange) {
      globalGameState.onStateChange('playing');
    }
  }

  private createHUDTexts() {
    const { width, height } = getScreenDimensions();

    // Common text styles
    const labelStyle = {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#888888',
    };

    const valueStyle = {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffffff',
    };

    const largeValueStyle = {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    };

    // Top-right: Wealth display
    this.hudTexts.wealth = this.add.text(width - 20, 20, '$10,000', largeValueStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    // Top-right: Return percentage
    this.hudTexts.return = this.add.text(width - 20, 45, '+0.00%', valueStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    // Top-right: Leverage and Cash
    this.hudTexts.leverage = this.add.text(width - 20, 70, 'Lev: 1.0x | Cash: 20%', labelStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    // Top-left (chart area): Bar info
    this.hudTexts.barInfo = this.add.text(20, 200, 'Bar 1 / 100', labelStyle)
      .setScrollFactor(0)
      .setOrigin(0, 0);

    // Top-left (chart area): Date
    this.hudTexts.price = this.add.text(20, 215, 'Price: $0.00', valueStyle)
      .setScrollFactor(0)
      .setOrigin(0, 0);

    // Chart indicators (right side of chart)
    this.hudTexts.rsi = this.add.text(390, 20, 'RSI: 50', labelStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    this.hudTexts.volatility = this.add.text(390, 35, 'Vol: 0.0%', labelStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    this.hudTexts.drawdown = this.add.text(390, 50, 'DD: 0.0%', labelStyle)
      .setScrollFactor(0)
      .setOrigin(1, 0);

    // Top-left: Regime badge
    this.hudTexts.regime = this.add.text(20, 20, 'CHOP', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#6b7280',
      padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setOrigin(0, 0);

    // Portfolio info (left side, below chart)
    this.hudTexts.equity = this.add.text(20, 235, 'Equity: $10,000', valueStyle)
      .setScrollFactor(0)
      .setOrigin(0, 0);

    this.hudTexts.cash = this.add.text(20, 255, 'Cash: $10,000', valueStyle)
      .setScrollFactor(0)
      .setOrigin(0, 0);

    this.hudTexts.pnl = this.add.text(20, 275, 'P&L: $0.00', valueStyle)
      .setScrollFactor(0)
      .setOrigin(0, 0);

    // Bottom-right: Controls hint
    this.hudTexts.controls = this.add.text(width - 20, height - 20,
      'Space: Play/Pause | Arrows: Drive | W/S: Leverage | Q/E: Cash',
      { fontFamily: 'monospace', fontSize: '10px', color: '#666666' }
    ).setScrollFactor(0).setOrigin(1, 1);

    // Bottom-left: Speed indicator
    this.hudTexts.speed = this.add.text(20, height - 20, '1x', labelStyle)
      .setScrollFactor(0)
      .setOrigin(0, 1);
  }

  private handleStateUpdate = (state: Partial<typeof this.externalState>) => {
    Object.assign(this.externalState, state);

    // Update physics based on new state
    this.updatePhysicsFromState();
  };

  private createPhysicsWorld() {
    const { width, height } = getScreenDimensions();
    const groundY = height - 100;

    // Create ground segments
    const segmentWidth = 200;
    const numSegments = 100;

    for (let i = -10; i < numSegments; i++) {
      const x = i * segmentWidth;
      const body = this.matter.add.rectangle(
        x + segmentWidth / 2,
        groundY + 40,
        segmentWidth,
        80,
        {
          isStatic: true,
          friction: 1,
          label: 'ground',
        }
      );
      this.groundBodies.push(body);
    }
  }

  private createVectorCar() {
    const { width, height } = getScreenDimensions();
    const carX = width / 4;
    const carY = height - 180;

    // Car dimensions
    const carWidth = 100;
    const carHeight = 40;
    const wheelRadius = 18;

    // Main body
    this.carBody = this.matter.add.rectangle(carX, carY, carWidth, carHeight, {
      chamfer: { radius: 8 },
      friction: 0.8,
      frictionAir: 0.01,
      label: 'carBody',
    });

    // Wheels
    const wheelOptions = {
      friction: 1,
      frictionStatic: 10,
      restitution: 0.1,
      label: 'wheel',
    };

    this.frontWheel = this.matter.add.circle(
      carX + carWidth / 3,
      carY + carHeight / 2 + 5,
      wheelRadius,
      wheelOptions
    );

    this.backWheel = this.matter.add.circle(
      carX - carWidth / 3,
      carY + carHeight / 2 + 5,
      wheelRadius,
      wheelOptions
    );

    // Connect wheels to body with constraints
    this.matter.add.constraint(this.carBody, this.frontWheel, 35, 0.4, {
      pointA: { x: carWidth / 3, y: carHeight / 2 },
    });

    this.matter.add.constraint(this.carBody, this.backWheel, 35, 0.4, {
      pointA: { x: -carWidth / 3, y: carHeight / 2 },
    });

    // Mouse spring for debug
    this.matter.add.mouseSpring();
  }

  private async createSVGCarSprite() {
    if (!this.carBody) return;

    const { pnlPercent, carPhysics, isHedged, hedgeCoverage, hedgeRemaining } = this.externalState;
    const carDef = getCarDefinition(this.carType);

    // Generate initial SVG
    const state: CarState = {
      pnlPercent,
      carPhysics,
      isAccelerating: false,
      isBraking: false,
      isHedged,
      hedgeCoverage,
      hedgeRemaining,
    };

    const svgString = generateCarSVG(this.carType, state);
    const textureKey = `car_${this.carType}_initial`;

    // Load SVG as texture
    await loadSVGTexture(this, textureKey, svgString, carDef.width, carDef.height);

    // Create sprite at car body position
    this.carSprite = this.add.sprite(
      this.carBody.position.x,
      this.carBody.position.y,
      textureKey
    );

    // Set origin to center
    this.carSprite.setOrigin(0.5, 0.5);

    // Initial rotation
    this.carSprite.setRotation(this.carBody.angle);

    this.lastCarTextureKey = textureKey;
  }

  private async updateSVGCarTexture() {
    if (!this.carSprite || !this.carBody) return;

    const { pnlPercent, carPhysics, isHedged, hedgeCoverage, hedgeRemaining } = this.externalState;
    const carDef = getCarDefinition(this.carType);
    const isAccelerating = this.cursors?.up.isDown ?? false;
    const isBraking = this.cursors?.down.isDown ?? false;

    // Generate car state
    const state: CarState = {
      pnlPercent,
      carPhysics,
      isAccelerating,
      isBraking,
      isHedged,
      hedgeCoverage,
      hedgeRemaining,
    };

    const textureKey = getCarTextureKey(this.carType, state);

    // Only update if texture changed
    if (textureKey !== this.lastCarTextureKey) {
      const svgString = generateCarSVG(this.carType, state);

      // Load new texture
      await loadSVGTexture(this, textureKey, svgString, carDef.width, carDef.height);

      // Update sprite texture
      this.carSprite.setTexture(textureKey);
      this.lastCarTextureKey = textureKey;
    }

    // Update position and rotation to match physics body
    this.carSprite.setPosition(this.carBody.position.x, this.carBody.position.y);
    this.carSprite.setRotation(this.carBody.angle);
  }

  private updatePhysicsFromState() {
    const { roadConditions, carPhysics } = this.externalState;

    // Update ground friction based on grip
    const friction = Math.max(0.3, roadConditions.grip);
    this.groundBodies.forEach((body) => {
      body.friction = friction;
    });
  }

  private setupKeyboardControls() {
    // Fullscreen toggle
    this.input.keyboard!.addKey('F').on('down', () => {
      this.scale.toggleFullscreen();
    });

    // Reset
    this.input.keyboard!.addKey('R').on('down', () => {
      if (globalGameState.onReset) {
        globalGameState.onReset();
      }
    });

    // Hedge activation (H key)
    this.input.keyboard!.addKey('H').on('down', () => {
      if (globalGameState.onHedgeActivate) {
        globalGameState.onHedgeActivate();
      }
    });
  }

  update(time: number, delta: number) {
    if (!this.cursors || !this.carBody) return;

    // Update animation timers
    this.weatherTime += delta / 1000;

    // Handle input
    this.handleInput();

    // Update camera follow target
    if (this.carBody) {
      const target = this.cameras.main.deadzone ? undefined : this.carBody.position;
      if (target) {
        this.cameras.main.scrollX = target.x - this.cameras.main.width / 2;
      }
    }

    // Render all vector graphics
    this.renderAll();

    // Report vehicle state to React
    this.reportVehicleState();
  }

  private handleInput() {
    if (!this.carBody || !this.frontWheel || !this.backWheel) return;

    const { carPhysics } = this.externalState;

    // Base values
    const baseTorque = 0.003;
    const torque = baseTorque * carPhysics.enginePower * carPhysics.traction;

    // Apply recovery drag
    const effectiveTorque = torque / carPhysics.recoveryDrag;

    // Forward (arrow up)
    if (this.cursors!.up.isDown) {
      this.matter.body.setAngularVelocity(
        this.frontWheel,
        this.frontWheel.angularVelocity - effectiveTorque
      );
      this.matter.body.setAngularVelocity(
        this.backWheel,
        this.backWheel.angularVelocity - effectiveTorque
      );
    }

    // Brake (arrow down)
    if (this.cursors!.down.isDown) {
      const brakeFactor = 0.92 + (1 - carPhysics.brakeStrength) * 0.05;
      this.matter.body.setAngularVelocity(
        this.frontWheel,
        this.frontWheel.angularVelocity * brakeFactor
      );
      this.matter.body.setAngularVelocity(
        this.backWheel,
        this.backWheel.angularVelocity * brakeFactor
      );
    }

    // Tilt controls
    const tiltForce = 0.0008;
    if (this.cursors!.left.isDown) {
      this.matter.body.applyForce(this.carBody, this.carBody.position, { x: 0, y: -tiltForce });
    }
    if (this.cursors!.right.isDown) {
      this.matter.body.applyForce(this.carBody, this.carBody.position, { x: tiltForce, y: 0 });
    }
  }

  private renderAll() {
    const { width, height } = getScreenDimensions();
    const { roadConditions, roadSegment, carPhysics, regime, pnlPercent, stressLevel } =
      this.externalState;

    // Clear all graphics
    this.skyGraphics?.clear();
    this.weatherGraphics?.clear();
    this.groundGraphics?.clear();
    this.roadGraphics?.clear();
    this.carGraphics?.clear();
    this.hudGraphics?.clear();

    // 1. Draw sky
    if (this.skyGraphics) {
      drawSky(this.skyGraphics, width * 3, height, roadConditions.weather);
    }

    // 2. Draw weather effects
    if (this.weatherGraphics) {
      this.renderWeatherEffects(width * 3, height);
    }

    // 3. Draw ground
    if (this.groundGraphics && this.carBody) {
      const groundY = height - 60;
      drawGround(
        this.groundGraphics,
        this.carBody.position.x - width,
        groundY,
        width * 3,
        200,
        regime
      );
    }

    // 4. Draw road segments
    if (this.roadGraphics && this.carBody) {
      this.renderRoad();
    }

    // 5. Draw car (SVG sprite only)
    if (this.carBody && this.carSprite) {
      this.updateSVGCarTexture();
    }

    // 6. Draw HUD (screen-space)
    if (this.hudGraphics) {
      this.renderHUD();
    }
  }

  private renderWeatherEffects(width: number, height: number) {
    if (!this.weatherGraphics) return;

    const { roadConditions } = this.externalState;

    // Fog overlay (VIX → fog)
    drawFog(this.weatherGraphics, width, height, roadConditions.visibility);

    // Wind effect (VIX → wind intensity)
    // Low visibility or stormy weather = more wind
    const windIntensity = Math.max(
      1 - roadConditions.visibility,
      roadConditions.weather === 'stormy' ? 0.8 : 0
    );
    drawWind(this.weatherGraphics, width, height, windIntensity, this.weatherTime);

    // Rain
    if (roadConditions.weather === 'rainy' || roadConditions.weather === 'stormy') {
      const intensity = roadConditions.weather === 'stormy' ? 0.8 : 0.4;
      drawRain(this.weatherGraphics, width, height, intensity, this.weatherTime);
    }

    // Lightning (random during storms)
    if (roadConditions.weather === 'stormy') {
      this.lightningTimer += 1;
      if (this.lightningTimer > 120 && Math.random() < 0.02) {
        this.showLightning = true;
        this.lightningTimer = 0;
      }
      if (this.showLightning) {
        const lightningX = Math.random() * width;
        drawLightning(this.weatherGraphics, lightningX, 0, height * 0.6);
        if (Math.random() < 0.3) {
          this.showLightning = false;
        }
      }
    }

    // Clouds
    if (roadConditions.weather !== 'clear') {
      const cloudCount = roadConditions.weather === 'stormy' ? 8 : 4;
      for (let i = 0; i < cloudCount; i++) {
        const cloudX = (i * width / cloudCount + this.weatherTime * 10) % width;
        const cloudY = 50 + Math.sin(i * 1.5) * 30;
        const cloudWidth = 80 + (i % 3) * 30;
        drawCloud(this.weatherGraphics, cloudX, cloudY, cloudWidth, roadConditions.weather);
      }
    }
  }

  private renderRoad() {
    if (!this.roadGraphics || !this.carBody) return;

    const { width, height } = getScreenDimensions();
    const { roadSegment, roadConditions, regime } = this.externalState;

    const groundY = height - 100;
    const segmentWidth = 200;

    // Draw multiple road segments around the car
    const carX = this.carBody.position.x;
    const startSegment = Math.floor((carX - width) / segmentWidth);
    const endSegment = Math.floor((carX + width * 2) / segmentWidth);

    for (let i = startSegment; i <= endSegment; i++) {
      const geometry: RoadGeometry = {
        x: i * segmentWidth,
        y: groundY - 80,
        width: segmentWidth,
        slope: roadSegment.slope * (0.8 + Math.sin(i * 0.5) * 0.2), // Slight variation
        height: 0,
      };

      drawRoadSegment(
        this.roadGraphics,
        geometry,
        roadSegment,
        roadConditions,
        regime
      );
    }
  }

  private renderHUD() {
    if (!this.hudGraphics || !this.chartGraphics) return;

    const { width, height } = getScreenDimensions();
    const {
      carPhysics, pnlPercent, drawdown, stressLevel, leverage, cashBuffer, regime, wealth, datasetName,
      chartCandles, currentIndex, totalBars, currentPrice, currentReturn, currentDate, indicators,
      equity, cash, positions, isPlaying, playbackSpeed, canGoBack, canGoForward,
    } = this.externalState;

    // Clear chart graphics
    this.chartGraphics.clear();

    // Draw candlestick chart overlay (top-left)
    if (chartCandles.length > 0) {
      drawCandlestickChart(this.chartGraphics, chartCandles, currentIndex, {
        x: 10,
        y: 40,
        width: 400,
        height: 150,
        candleCount: 60,
        showVolume: true,
        opacity: 0.9,
      });
    }

    // Draw market info panel (top-right of chart)
    drawMarketInfoPanel(this.chartGraphics, 420, 40, {
      regime,
      currentReturn,
      price: currentPrice,
      barIndex: currentIndex,
      totalBars,
      date: currentDate,
      indicators,
    });

    // Draw portfolio panel (below chart on left)
    drawPortfolioPanel(this.chartGraphics, 10, 200, {
      equity,
      cash,
      pnlPercent,
      drawdown,
      leverage,
      cashBuffer,
      positions,
    });

    // Draw playback controls (bottom-left)
    drawPlaybackControls(this.chartGraphics, 10, height - 70, {
      isPlaying,
      speed: playbackSpeed,
      progress: totalBars > 0 ? currentIndex / totalBars : 0,
      canGoBack,
      canGoForward,
    });

    // Draw trading buttons (bottom-center)
    drawTradingButtons(this.chartGraphics, width / 2 - 75, height - 80, {
      hasPositions: positions.length > 0,
      canTrade: true,
    });

    // Update HUD text elements
    this.updateHUDTexts();

    // Clear and redraw old HUD graphics (gauges)
    this.hudGraphics.clear();

    const padding = 16;
    const gaugeRadius = 24;

    // Right side panel: Engine and stress gauges
    const rightPanelX = width - 300;
    this.hudGraphics.fillStyle(UI_COLORS.panel, 0.85);
    this.hudGraphics.fillRoundedRect(rightPanelX, 100, 280, 80, 8);
    this.hudGraphics.lineStyle(1, UI_COLORS.border, 0.5);
    this.hudGraphics.strokeRoundedRect(rightPanelX, 100, 280, 80, 8);

    // Engine gauge (fuel level)
    const fuelColor = carPhysics.fuelLevel > 0.3 ? UI_COLORS.positive : UI_COLORS.negative;
    drawGauge(this.hudGraphics, rightPanelX + 40, 140, gaugeRadius, carPhysics.fuelLevel, fuelColor);

    // Stress gauge
    const stressColor = stressLevel < 0.5 ? UI_COLORS.positive : (stressLevel < 0.7 ? UI_COLORS.warning : UI_COLORS.negative);
    drawGauge(this.hudGraphics, rightPanelX + 100, 140, gaugeRadius, stressLevel, stressColor);

    // P&L bar
    const pnlNormalized = (pnlPercent + 100) / 200; // Map -100% to +100% -> 0 to 1
    const pnlColor = getPnLColor(pnlPercent);
    drawBar(this.hudGraphics, rightPanelX + 140, 120, 120, 12, pnlNormalized, pnlColor);

    // Drawdown bar
    const drawdownColor = getDrawdownColor(drawdown);
    drawBar(this.hudGraphics, rightPanelX + 140, 145, 120, 12, 1 - drawdown, drawdownColor);

    // Regime indicator
    const regimeColors = REGIME_COLORS[regime];
    this.hudGraphics.fillStyle(regimeColors.primary, 1);
    this.hudGraphics.fillCircle(rightPanelX + 270, 165, 8);
  }

  private updateHUDTexts() {
    const {
      wealth, pnlPercent, leverage, cashBuffer, regime, currentIndex, totalBars,
      currentPrice, currentDate, indicators, equity, cash, playbackSpeed,
    } = this.externalState;

    // Update wealth display
    if (this.hudTexts.wealth) {
      this.hudTexts.wealth.setText(`$${wealth.toLocaleString()}`);
      this.hudTexts.wealth.setColor(pnlPercent >= 0 ? '#10b981' : '#ef4444');
    }

    // Update return percentage
    if (this.hudTexts.return) {
      const sign = pnlPercent >= 0 ? '+' : '';
      this.hudTexts.return.setText(`${sign}${pnlPercent.toFixed(2)}%`);
      this.hudTexts.return.setColor(pnlPercent >= 0 ? '#10b981' : '#ef4444');
    }

    // Update leverage and cash
    if (this.hudTexts.leverage) {
      this.hudTexts.leverage.setText(`Lev: ${leverage.toFixed(1)}x | Cash: ${(cashBuffer * 100).toFixed(0)}%`);
    }

    // Update bar info
    if (this.hudTexts.barInfo) {
      this.hudTexts.barInfo.setText(`Bar ${currentIndex + 1} / ${totalBars}${currentDate ? ` | ${currentDate}` : ''}`);
    }

    // Update price
    if (this.hudTexts.price) {
      this.hudTexts.price.setText(`Price: $${currentPrice.toFixed(2)}`);
    }

    // Update indicators
    if (this.hudTexts.rsi) {
      this.hudTexts.rsi.setText(`RSI: ${indicators.rsi.toFixed(0)}`);
      this.hudTexts.rsi.setColor(
        indicators.rsi > 70 ? '#ef4444' :
        indicators.rsi < 30 ? '#10b981' : '#888888'
      );
    }

    if (this.hudTexts.volatility) {
      this.hudTexts.volatility.setText(`Vol: ${indicators.volatility.toFixed(2)}%`);
    }

    if (this.hudTexts.drawdown) {
      this.hudTexts.drawdown.setText(`DD: ${indicators.drawdown.toFixed(1)}%`);
      this.hudTexts.drawdown.setColor(
        indicators.drawdown > 20 ? '#ef4444' :
        indicators.drawdown > 10 ? '#f59e0b' : '#888888'
      );
    }

    // Update regime badge
    if (this.hudTexts.regime) {
      this.hudTexts.regime.setText(regime);
      const regimeColors: Record<string, string> = {
        BULL: '#10b981',
        BEAR: '#ef4444',
        CRASH: '#7f1d1d',
        CHOP: '#6b7280',
        RECOVERY: '#0ea5e9',
      };
      this.hudTexts.regime.setBackgroundColor(regimeColors[regime] || '#6b7280');
    }

    // Update portfolio info
    if (this.hudTexts.equity) {
      this.hudTexts.equity.setText(`Equity: $${equity.toLocaleString()}`);
    }

    if (this.hudTexts.cash) {
      this.hudTexts.cash.setText(`Cash: $${cash.toLocaleString()}`);
    }

    if (this.hudTexts.pnl) {
      const pnlAmount = equity - 10000; // Assuming initial capital of $10,000
      const sign = pnlAmount >= 0 ? '+' : '';
      this.hudTexts.pnl.setText(`P&L: ${sign}$${pnlAmount.toFixed(2)}`);
      this.hudTexts.pnl.setColor(pnlAmount >= 0 ? '#10b981' : '#ef4444');
    }

    // Update speed indicator
    if (this.hudTexts.speed) {
      this.hudTexts.speed.setText(`Speed: ${playbackSpeed}x`);
    }
  }

  private reportVehicleState() {
    if (!this.carBody) return;

    const isFlipped = Math.abs(this.carBody.angle) > Math.PI / 2;

    if (globalGameState.onVehicleUpdate) {
      globalGameState.onVehicleUpdate({
        velocityX: this.carBody.velocity?.x || 0,
        velocityY: this.carBody.velocity?.y || 0,
        angularVelocity: this.carBody.angularVelocity || 0,
        isOnGround: true,
        isFlipped,
        positionX: this.carBody.position.x,
        positionY: this.carBody.position.y,
      });
    }
  }

  shutdown() {
    this.game.events.off('updateState', this.handleStateUpdate, this);
  }
}
