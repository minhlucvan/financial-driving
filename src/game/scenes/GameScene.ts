import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';
import type { RoadSegment, RoadConditions, MarketRegime, CarPhysics } from '../../types';
import {
  drawSky,
  drawFog,
  drawRain,
  drawCloud,
  drawLightning,
  drawRoadSegment,
  drawGround,
  drawVectorCar,
  drawGauge,
  drawBar,
  type RoadGeometry,
  type CarGeometry,
  // SVG car system
  generateCarSVG,
  getCarTextureKey,
  loadSVGTexture,
  type CarSVGConfig,
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

  // SVG car sprite (alternative to graphics-based car)
  private carSprite: Phaser.GameObjects.Sprite | null = null;
  private useSVGCar = true; // Toggle between SVG sprite and graphics
  private lastCarTextureKey = '';
  private carSpriteWidth = 120;
  private carSpriteHeight = 60;

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
  };

  constructor() {
    super({ key: 'gameScene' });
  }

  preload() {
    // No bitmap assets needed - all vector graphics
    // But we still load the car physics data for reference
    const vehicleKey = globalGameState.vehicleKey;
    this.load.json(vehicleKey, `/car/${vehicleKey}.json`);
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

    // Create physics world
    this.createPhysicsWorld();

    // Create vector car
    this.createVectorCar();

    // Create SVG car sprite (if using SVG mode)
    if (this.useSVGCar) {
      this.createSVGCarSprite();
    }

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

    const { pnlPercent, carPhysics } = this.externalState;

    // Generate initial SVG
    const config: CarSVGConfig = {
      width: this.carSpriteWidth,
      height: this.carSpriteHeight,
      pnlPercent,
      carPhysics,
      isAccelerating: false,
      isBraking: false,
    };

    const svgString = generateCarSVG(config);
    const textureKey = 'svgCar_initial';

    // Load SVG as texture
    await loadSVGTexture(this, textureKey, svgString, this.carSpriteWidth, this.carSpriteHeight);

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

    const { pnlPercent, carPhysics } = this.externalState;
    const isAccelerating = this.cursors?.up.isDown ?? false;
    const isBraking = this.cursors?.down.isDown ?? false;

    // Generate texture key based on state
    const config: CarSVGConfig = {
      width: this.carSpriteWidth,
      height: this.carSpriteHeight,
      pnlPercent,
      carPhysics,
      isAccelerating,
      isBraking,
    };

    const textureKey = getCarTextureKey(config);

    // Only update if texture changed
    if (textureKey !== this.lastCarTextureKey) {
      const svgString = generateCarSVG(config);

      // Load new texture
      await loadSVGTexture(this, textureKey, svgString, this.carSpriteWidth, this.carSpriteHeight);

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

    // 5. Draw car (SVG sprite or Graphics-based)
    if (this.carBody) {
      if (this.useSVGCar && this.carSprite) {
        // Update SVG sprite texture and position
        this.updateSVGCarTexture();
      } else if (this.carGraphics) {
        // Fallback to graphics-based rendering
        const carGeometry: CarGeometry = {
          x: this.carBody.position.x,
          y: this.carBody.position.y,
          width: 100,
          height: 40,
          rotation: this.carBody.angle,
          wheelRadius: 18,
        };
        drawVectorCar(this.carGraphics, carGeometry, carPhysics, pnlPercent);
      }
    }

    // 6. Draw HUD (screen-space)
    if (this.hudGraphics) {
      this.renderHUD();
    }
  }

  private renderWeatherEffects(width: number, height: number) {
    if (!this.weatherGraphics) return;

    const { roadConditions } = this.externalState;

    // Fog overlay
    drawFog(this.weatherGraphics, width, height, roadConditions.visibility);

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
    if (!this.hudGraphics) return;

    const { carPhysics, pnlPercent, drawdown, stressLevel, leverage, regime, wealth, datasetName } =
      this.externalState;

    const padding = 16;
    const gaugeRadius = 24;

    // Background panel
    this.hudGraphics.fillStyle(UI_COLORS.panel, 0.85);
    this.hudGraphics.fillRoundedRect(padding, padding, 280, 100, 8);
    this.hudGraphics.lineStyle(1, UI_COLORS.border, 0.5);
    this.hudGraphics.strokeRoundedRect(padding, padding, 280, 100, 8);

    // Engine gauge (fuel level)
    const fuelColor = carPhysics.fuelLevel > 0.3 ? UI_COLORS.positive : UI_COLORS.negative;
    drawGauge(this.hudGraphics, padding + 40, padding + 50, gaugeRadius, carPhysics.fuelLevel, fuelColor);

    // Stress gauge
    const stressColor = stressLevel < 0.5 ? UI_COLORS.positive : (stressLevel < 0.7 ? UI_COLORS.warning : UI_COLORS.negative);
    drawGauge(this.hudGraphics, padding + 100, padding + 50, gaugeRadius, stressLevel, stressColor);

    // P&L bar
    const pnlNormalized = (pnlPercent + 100) / 200; // Map -100% to +100% -> 0 to 1
    const pnlColor = getPnLColor(pnlPercent);
    drawBar(this.hudGraphics, padding + 140, padding + 30, 120, 12, pnlNormalized, pnlColor);

    // Drawdown bar
    const drawdownColor = getDrawdownColor(drawdown);
    drawBar(this.hudGraphics, padding + 140, padding + 55, 120, 12, 1 - drawdown, drawdownColor);

    // Regime indicator
    const regimeColors = REGIME_COLORS[regime];
    this.hudGraphics.fillStyle(regimeColors.primary, 1);
    this.hudGraphics.fillCircle(padding + 270, padding + 85, 8);

    // Text labels (using Phaser text - not vector but necessary for readability)
    // This would be added as separate text objects in create()
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
