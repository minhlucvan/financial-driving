import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';

/**
 * GameScene - A stateless view engine that renders based on external state
 *
 * This scene does NOT manage its own game logic. It receives state updates from
 * the React AppStateProvider and renders accordingly. The game acts purely as
 * a visualization layer.
 */
export class GameScene extends Phaser.Scene {
  private vehicle: any = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private terrainGraphics: Phaser.GameObjects.Graphics | null = null;
  private groundBodies: MatterJS.BodyType[] = [];
  private hudText: Phaser.GameObjects.Text | null = null;

  // External state received from React (single source of truth)
  private externalState = {
    terrainSlope: 0,
    terrainRoughness: 0,
    torqueMultiplier: 1,
    brakeMultiplier: 1,
    tractionMultiplier: 1,
    leverage: 1,
    cashBuffer: 0.2,
    currentIndex: 0,
    regime: 'CHOP' as string,
    wealth: 10000,
    datasetName: 'S&P 500',
  };

  constructor() {
    super({ key: 'gameScene' });
  }

  preload() {
    const vehicleKey = globalGameState.vehicleKey;

    // Load vehicle assets
    this.load.multiatlas('carParts', '/car/carParts.json', '/car');
    this.load.json(vehicleKey, `/car/${vehicleKey}.json`);

    // Load terrain tileset
    this.load.image('land', '/land_ext.png');
    this.load.json('landCollision', '/land_ext.json');

    // Load backgrounds
    this.load.image('sky', '/game_background_1/layers/sky.png');
    this.load.image('rocks_1', '/game_background_1/layers/rocks_1.png');
    this.load.image('rocks_2', '/game_background_1/layers/rocks_2.png');
    this.load.image('clouds_1', '/game_background_1/layers/clouds_1.png');
    this.load.image('clouds_2', '/game_background_1/layers/clouds_2.png');
    this.load.image('ground_1', '/game_background_1/layers/ground_1.png');
    this.load.image('ground_2', '/game_background_1/layers/ground_2.png');
    this.load.image('ground_3', '/game_background_1/layers/ground_3.png');
    this.load.image('plant', '/game_background_1/layers/plant.png');
  }

  create() {
    const { width, height } = getScreenDimensions();

    // Create background layers
    this.createBackground();

    // Create terrain graphics
    this.terrainGraphics = this.add.graphics();
    this.createTerrain();

    // Create vehicle
    this.createVehicle();

    // Setup camera
    if (this.vehicle?.mainBody) {
      this.cameras.main.startFollow(this.vehicle.mainBody, true, 0.2, 0.2, -width / 8, height / 8);
      this.cameras.main.setZoom(1.5);
      this.cameras.main.roundPixels = true;
    }

    // Create minimal HUD (most HUD is in React)
    this.createHUD();

    // Setup keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.setupKeyboardControls();

    // Enable mouse spring for physics interaction
    this.matter.add.mouseSpring();

    // Register for state updates from React
    this.game.events.on('updateState', this.handleStateUpdate, this);

    // Notify React that game is ready
    if (globalGameState.onStateChange) {
      globalGameState.onStateChange('playing');
    }
  }

  /**
   * Handle state updates from React AppStateProvider
   * This is the primary way the game receives state changes
   */
  private handleStateUpdate = (state: Partial<typeof this.externalState>) => {
    const prevState = { ...this.externalState };
    Object.assign(this.externalState, state);

    // Apply physics modifiers to vehicle
    if (this.vehicle) {
      this.vehicle.torqueMultiplier = this.externalState.torqueMultiplier;
      this.vehicle.brakeMultiplier = this.externalState.brakeMultiplier;
      this.vehicle.tractionMultiplier = this.externalState.tractionMultiplier;
    }

    // Update terrain if slope changed significantly
    if (Math.abs(prevState.terrainSlope - this.externalState.terrainSlope) > 5) {
      this.updateTerrainSlope();
    }

    // Update HUD
    this.updateHUD();
  };

  private createBackground() {
    const { width, height } = getScreenDimensions();

    const layers = [
      { key: 'sky', scrollFactor: 0 },
      { key: 'clouds_1', scrollFactor: 0.1 },
      { key: 'clouds_2', scrollFactor: 0.15 },
      { key: 'rocks_1', scrollFactor: 0.3 },
      { key: 'rocks_2', scrollFactor: 0.4 },
      { key: 'ground_1', scrollFactor: 0.6 },
      { key: 'ground_2', scrollFactor: 0.7 },
      { key: 'ground_3', scrollFactor: 0.8 },
    ];

    layers.forEach((layer) => {
      const img = this.add.image(width / 2, height / 2, layer.key);
      img.setScrollFactor(layer.scrollFactor);
      img.setDisplaySize(width * 2, height);
    });
  }

  private createTerrain() {
    const { width, height } = getScreenDimensions();
    const groundY = height - 100;

    // Clear existing ground bodies
    this.groundBodies.forEach((body) => {
      this.matter.world.remove(body);
    });
    this.groundBodies = [];

    // Create ground segments
    const segmentWidth = 200;
    const numSegments = 50;

    for (let i = 0; i < numSegments; i++) {
      const x = i * segmentWidth;
      const body = this.matter.add.rectangle(x + segmentWidth / 2, groundY, segmentWidth, 100, {
        isStatic: true,
        friction: 1,
      });
      this.groundBodies.push(body);
    }

    this.drawTerrain();
  }

  private updateTerrainSlope() {
    // Update terrain friction based on roughness
    const friction = Math.max(0.3, 1 - this.externalState.terrainRoughness * 0.7);
    this.groundBodies.forEach((body) => {
      body.friction = friction;
    });

    this.drawTerrain();
  }

  private drawTerrain() {
    const { height } = getScreenDimensions();
    const groundY = height - 100;

    if (this.terrainGraphics) {
      this.terrainGraphics.clear();

      // Color based on regime
      let color = 0x4a5568;
      switch (this.externalState.regime) {
        case 'BULL':
          color = 0x10b981;
          break;
        case 'BEAR':
          color = 0xef4444;
          break;
        case 'CRASH':
          color = 0xdc2626;
          break;
        case 'RECOVERY':
          color = 0x06b6d4;
          break;
      }

      this.terrainGraphics.fillStyle(color, 0.8);
      this.terrainGraphics.fillRect(-1000, groundY - 50, 15000, 200);
    }
  }

  private createVehicle() {
    const { width, height } = getScreenDimensions();
    const vehicleX = width / 4;
    const vehicleY = height - 200;

    // Create main body
    const body = this.matter.add.rectangle(vehicleX, vehicleY, 100, 40, {
      chamfer: { radius: 10 },
      friction: 0.8,
      frictionAir: 0.01,
    });

    // Create wheels
    const wheelRadius = 20;
    const wheelOptions = {
      friction: 1,
      frictionStatic: 10,
      restitution: 0.1,
      circleRadius: wheelRadius,
    };

    const frontWheel = this.matter.add.circle(vehicleX + 35, vehicleY + 20, wheelRadius, wheelOptions);
    const backWheel = this.matter.add.circle(vehicleX - 35, vehicleY + 20, wheelRadius, wheelOptions);

    // Connect wheels to body
    this.matter.add.constraint(body, frontWheel, 40, 0.4, { pointA: { x: 35, y: 20 } });
    this.matter.add.constraint(body, backWheel, 40, 0.4, { pointA: { x: -35, y: 20 } });

    // Add visual sprites
    const bodySprite = this.add.rectangle(vehicleX, vehicleY, 100, 40, 0x3b82f6);
    const frontWheelSprite = this.add.circle(vehicleX + 35, vehicleY + 20, wheelRadius, 0x1f2937);
    const backWheelSprite = this.add.circle(vehicleX - 35, vehicleY + 20, wheelRadius, 0x1f2937);

    this.vehicle = {
      mainBody: body,
      frontWheel,
      backWheel,
      bodySprite,
      frontWheelSprite,
      backWheelSprite,
      torqueMultiplier: 1,
      brakeMultiplier: 1,
      tractionMultiplier: 1,
    };
  }

  private createHUD() {
    // Minimal HUD - most info is shown in React overlay
    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0);

    this.updateHUD();
  }

  private updateHUD() {
    if (this.hudText) {
      const { leverage, cashBuffer, regime, wealth } = this.externalState;
      this.hudText.setText(
        `${this.externalState.datasetName} | ${regime} | ` +
          `Lev: ${leverage.toFixed(1)}x | Cash: ${(cashBuffer * 100).toFixed(0)}% | ` +
          `$${wealth.toLocaleString()}`
      );
    }
  }

  private setupKeyboardControls() {
    // Fullscreen toggle
    this.input.keyboard!.addKey('F').on('down', () => {
      this.scale.toggleFullscreen();
    });

    // FPS logging
    this.input.keyboard!.addKey('D').on('down', () => {
      console.log('FPS:', this.game.loop.actualFps);
    });

    // Restart - delegate to React
    this.input.keyboard!.addKey('R').on('down', () => {
      if (globalGameState.onReset) {
        globalGameState.onReset();
      }
    });
  }

  update() {
    if (!this.cursors || !this.vehicle) return;

    // Update vehicle sprites to match physics bodies
    this.updateVehicleSprites();

    // Handle input (physics-only, no state management)
    this.handleInput();

    // Report vehicle state back to React
    this.reportVehicleState();
  }

  private updateVehicleSprites() {
    const { mainBody, frontWheel, backWheel, bodySprite, frontWheelSprite, backWheelSprite } = this.vehicle;

    if (bodySprite && mainBody) {
      bodySprite.x = mainBody.position.x;
      bodySprite.y = mainBody.position.y;
      bodySprite.rotation = mainBody.angle;

      // Color based on leverage (more red = more leveraged)
      const leverageColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        { r: 59, g: 130, b: 246 }, // Blue (low leverage)
        { r: 239, g: 68, b: 68 }, // Red (high leverage)
        3,
        (this.externalState.leverage - 0.5) / 2.5
      );
      bodySprite.fillColor = Phaser.Display.Color.GetColor(leverageColor.r, leverageColor.g, leverageColor.b);
    }

    if (frontWheelSprite && frontWheel) {
      frontWheelSprite.x = frontWheel.position.x;
      frontWheelSprite.y = frontWheel.position.y;
    }

    if (backWheelSprite && backWheel) {
      backWheelSprite.x = backWheel.position.x;
      backWheelSprite.y = backWheel.position.y;
    }
  }

  private handleInput() {
    const { mainBody, frontWheel, backWheel, torqueMultiplier, brakeMultiplier, tractionMultiplier } = this.vehicle;
    const baseTorque = 0.002;
    const torque = baseTorque * torqueMultiplier * tractionMultiplier;
    const force = 0.001;

    if (this.cursors!.up.isDown) {
      // Apply torque to wheels (forward)
      this.matter.body.setAngularVelocity(frontWheel, frontWheel.angularVelocity - torque);
      this.matter.body.setAngularVelocity(backWheel, backWheel.angularVelocity - torque);
    }

    if (this.cursors!.down.isDown) {
      // Brake
      const brakeFactor = 0.95 / brakeMultiplier;
      this.matter.body.setAngularVelocity(frontWheel, frontWheel.angularVelocity * brakeFactor);
      this.matter.body.setAngularVelocity(backWheel, backWheel.angularVelocity * brakeFactor);
    }

    if (this.cursors!.left.isDown) {
      // Tilt left (wheelie)
      this.matter.body.applyForce(mainBody, mainBody.position, { x: 0, y: -force });
    }

    if (this.cursors!.right.isDown) {
      // Lean forward
      this.matter.body.applyForce(mainBody, mainBody.position, { x: force, y: 0 });
    }
  }

  private reportVehicleState() {
    if (!this.vehicle?.mainBody) return;

    const isFlipped = Math.abs(this.vehicle.mainBody.angle) > Math.PI / 2;

    // Report to React via global callback
    if (globalGameState.onVehicleUpdate) {
      globalGameState.onVehicleUpdate({
        velocityX: this.vehicle.mainBody.velocity?.x || 0,
        velocityY: this.vehicle.mainBody.velocity?.y || 0,
        angularVelocity: this.vehicle.mainBody.angularVelocity || 0,
        isOnGround: true,
        isFlipped,
        positionX: this.vehicle.mainBody.position.x,
        positionY: this.vehicle.mainBody.position.y,
      });
    }
  }

  shutdown() {
    // Clean up event listener
    this.game.events.off('updateState', this.handleStateUpdate, this);
  }
}
