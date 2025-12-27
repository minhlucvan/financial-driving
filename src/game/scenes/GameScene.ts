import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';

// Simplified game scene - the full implementation would import all the game modules
export class GameScene extends Phaser.Scene {
  private vehicle: any = null;
  private chunkLoader: any = null;
  private backgroundLoader: any = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private marketDataLoader: any = null;
  private wealthEngine: any = null;
  private currentCandleIndex = 0;
  private gameState: 'playing' | 'victory' | 'bankrupt' = 'playing';

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

    // Load market data
    this.load.json('sp500', '/market/sp500.json');
    this.load.json('bitcoin', '/market/bitcoin.json');
    this.load.json('meme_stock', '/market/meme_stock.json');
    this.load.json('steady_growth', '/market/steady_growth.json');
    this.load.json('crash_2008', '/market/scenarios/crash_2008.json');
    this.load.json('covid_2020', '/market/scenarios/covid_2020.json');
  }

  create() {
    const { width, height } = getScreenDimensions();

    // Reset game state
    this.gameState = 'playing';
    this.currentCandleIndex = 0;

    // Create background layers (simplified)
    this.createBackground();

    // Create ground/terrain (simplified - uses basic physics rectangle)
    this.createSimplifiedTerrain();

    // Create vehicle (simplified)
    this.createVehicle();

    // Setup camera
    if (this.vehicle?.mainBody) {
      this.cameras.main.startFollow(this.vehicle.mainBody, true, 0.2, 0.2, -width / 8, height / 8);
      this.cameras.main.setZoom(1.5);
      this.cameras.main.roundPixels = true;
    }

    // Create HUD
    this.createHUD();

    // Setup keyboard input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.setupKeyboardControls();

    // Enable mouse spring for physics interaction
    this.matter.add.mouseSpring();

    // Notify React that game is ready
    if (globalGameState.onStateChange) {
      globalGameState.onStateChange('playing');
    }
  }

  private createBackground() {
    const { width, height } = getScreenDimensions();

    // Create parallax background layers
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

  private createSimplifiedTerrain() {
    const { width, height } = getScreenDimensions();

    // Create a simple ground for demonstration
    // The full implementation would use the ChunkLoader and terrain generators
    const groundHeight = 100;
    const groundY = height - groundHeight / 2;

    // Create static ground bodies
    for (let i = 0; i < 20; i++) {
      const groundBody = this.matter.add.rectangle(
        i * width * 0.5,
        groundY,
        width * 0.5,
        groundHeight,
        { isStatic: true }
      );
    }

    // Add visual ground
    const graphics = this.add.graphics();
    graphics.fillStyle(0x4a5568, 1);
    graphics.fillRect(-width, groundY - groundHeight / 2, width * 10, groundHeight);
  }

  private createVehicle() {
    const { width, height } = getScreenDimensions();

    // Simplified vehicle creation
    // The full implementation would use the Vehicle class
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

    // Connect wheels to body with constraints
    this.matter.add.constraint(body, frontWheel, 40, 0.4, {
      pointA: { x: 35, y: 20 },
    });
    this.matter.add.constraint(body, backWheel, 40, 0.4, {
      pointA: { x: -35, y: 20 },
    });

    // Add visual sprites (simplified rectangles for now)
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
    };
  }

  private createHUD() {
    const { width } = getScreenDimensions();

    // Market dataset info
    this.add
      .text(16, 16, `Market: ${globalGameState.currentMarketDataKey.toUpperCase()}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setScrollFactor(0);

    // Controls info
    this.add
      .text(16, 50, 'Arrow keys: Drive | W/S: Leverage | N: Dataset | C: View', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 },
      })
      .setScrollFactor(0);

    // Wealth display
    this.add
      .text(width - 16, 16, 'Wealth: $10,000', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
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

    // Restart game
    this.input.keyboard!.addKey('R').on('down', () => {
      this.scene.restart();
    });

    // Cycle market dataset
    this.input.keyboard!.addKey('N').on('down', () => {
      const datasets = ['sp500', 'bitcoin', 'meme_stock', 'steady_growth', 'crash_2008', 'covid_2020'];
      const currentIdx = datasets.indexOf(globalGameState.currentMarketDataKey);
      globalGameState.currentMarketDataKey = datasets[(currentIdx + 1) % datasets.length];
      console.log('Switched to:', globalGameState.currentMarketDataKey);
    });
  }

  update() {
    if (!this.cursors || !this.vehicle) return;

    // Update vehicle sprites to match physics bodies
    this.updateVehicleSprites();

    // Handle input
    this.handleInput();

    // Update game state
    this.updateGameState();
  }

  private updateVehicleSprites() {
    const { mainBody, frontWheel, backWheel, bodySprite, frontWheelSprite, backWheelSprite } = this.vehicle;

    if (bodySprite && mainBody) {
      bodySprite.x = mainBody.position.x;
      bodySprite.y = mainBody.position.y;
      bodySprite.rotation = mainBody.angle;
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
    const { mainBody, frontWheel, backWheel, torqueMultiplier, brakeMultiplier } = this.vehicle;
    const torque = 0.002 * torqueMultiplier;
    const force = 0.001;

    if (this.cursors!.up.isDown) {
      // Apply torque to wheels
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
      // Tilt left
      this.matter.body.applyForce(mainBody, mainBody.position, { x: 0, y: -force });
    }

    if (this.cursors!.right.isDown) {
      // Tilt right
      this.matter.body.applyForce(mainBody, mainBody.position, { x: force, y: 0 });
    }
  }

  private updateGameState() {
    // Send update to React
    if (globalGameState.onGameUpdate && this.vehicle?.mainBody) {
      globalGameState.onGameUpdate({
        currentIndex: this.currentCandleIndex,
        wealth: 10000, // Placeholder - would come from WealthEngine
        drawdown: 0,
        regime: 'CHOP',
        vehicleVelocity: {
          x: this.vehicle.mainBody.velocity?.x || 0,
          y: this.vehicle.mainBody.velocity?.y || 0,
        },
        isFlipped: Math.abs(this.vehicle.mainBody.angle) > Math.PI / 2,
      });
    }

    // Increment candle index based on car position
    if (this.vehicle?.mainBody) {
      const carX = this.vehicle.mainBody.position.x;
      const newIndex = Math.floor(carX / 100); // One candle per 100 pixels
      if (newIndex !== this.currentCandleIndex) {
        this.currentCandleIndex = newIndex;
      }
    }
  }
}
