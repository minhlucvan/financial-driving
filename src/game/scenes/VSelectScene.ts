import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';
import {
  CAR_DEFINITIONS,
  generateCarPreviewSVG,
  loadSVGTexture,
  type CarType,
} from '../vector';
import { UI_COLORS, REGIME_COLORS } from '../vector';

/**
 * Vehicle Selection Scene - Full Vector Graphics
 *
 * Clean, simple UI for selecting car type before gameplay.
 * No bitmap assets - all vector/SVG based.
 */
export class VSelectScene extends Phaser.Scene {
  private selectIdx = 0;
  private carSprites: Phaser.GameObjects.Sprite[] = [];
  private carNameText: Phaser.GameObjects.Text | null = null;
  private carDescText: Phaser.GameObjects.Text | null = null;
  private backgroundGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'VSelectScene' });
  }

  preload() {
    // No asset loading needed - all vector graphics
  }

  async create() {
    const { width, height } = getScreenDimensions();

    // Draw background
    this.backgroundGraphics = this.add.graphics();
    this.drawBackground(width, height);

    // Fullscreen toggle
    const FKey = this.input.keyboard!.addKey('F');
    FKey.on('down', () => {
      this.scale.toggleFullscreen();
    });

    // Load SVG car previews
    await this.loadCarPreviews();

    // Create UI elements
    this.createTitle(width, height);
    this.createCarSelector(width, height);
    this.createStartButton(width, height);
    this.createInstructions(width, height);

    // Show first car
    this.updateCarDisplay();
  }

  private drawBackground(width: number, height: number) {
    if (!this.backgroundGraphics) return;

    const g = this.backgroundGraphics;
    g.clear();

    // Gradient background
    const colors = REGIME_COLORS.CHOP;
    const bandCount = 20;
    const bandHeight = height / bandCount;

    for (let i = 0; i < bandCount; i++) {
      const t = i / bandCount;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(0x1a1a2e),
        Phaser.Display.Color.IntegerToColor(0x16213e),
        100,
        t * 100
      );
      g.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      g.fillRect(0, i * bandHeight, width, bandHeight + 1);
    }

    // Decorative road lines at bottom
    g.lineStyle(4, 0x374151, 0.5);
    const roadY = height - 100;
    g.beginPath();
    g.moveTo(0, roadY);
    g.lineTo(width, roadY);
    g.strokePath();

    // Dashed center line
    g.fillStyle(0xfbbf24, 0.6);
    for (let i = 0; i < width / 60; i++) {
      g.fillRect(i * 60 + 10, roadY - 2, 40, 4);
    }
  }

  private async loadCarPreviews() {
    const { width, height } = getScreenDimensions();

    for (const carDef of CAR_DEFINITIONS) {
      const svgString = generateCarPreviewSVG(carDef.type);
      const textureKey = `car_preview_${carDef.type}`;

      await loadSVGTexture(this, textureKey, svgString, carDef.width, carDef.height);

      const sprite = this.add.sprite(width / 2, height / 2 - 20, textureKey);
      sprite.setScale(2);
      sprite.setVisible(false);
      sprite.setData('carType', carDef.type);
      this.carSprites.push(sprite);
    }
  }

  private createTitle(width: number, height: number) {
    // Main title
    this.add.text(width / 2, height / 6, 'FINANCIAL DRIVE', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#f8fafc',
      stroke: '#1e293b',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 6 + 60, 'Select Your Vehicle', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#94a3b8',
    }).setOrigin(0.5);
  }

  private createCarSelector(width: number, height: number) {
    const arrowY = height / 2 - 20;
    const arrowOffset = 180;

    // Left arrow
    const leftArrow = this.createArrowButton(
      width / 2 - arrowOffset,
      arrowY,
      '<',
      () => this.selectPrevCar()
    );

    // Right arrow
    const rightArrow = this.createArrowButton(
      width / 2 + arrowOffset,
      arrowY,
      '>',
      () => this.selectNextCar()
    );

    // Car name
    this.carNameText = this.add.text(width / 2, height / 2 + 80, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    // Car description
    this.carDescText = this.add.text(width / 2, height / 2 + 115, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Keyboard navigation
    this.input.keyboard!.addKey('LEFT').on('down', () => this.selectPrevCar());
    this.input.keyboard!.addKey('RIGHT').on('down', () => this.selectNextCar());
  }

  private createArrowButton(x: number, y: number, text: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(UI_COLORS.panel, 0.8);
    bg.fillRoundedRect(-30, -30, 60, 60, 10);
    bg.lineStyle(2, UI_COLORS.border, 0.5);
    bg.strokeRoundedRect(-30, -30, 60, 60, 10);

    // Arrow text
    const arrow = this.add.text(0, 0, text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#f8fafc',
    }).setOrigin(0.5);

    container.add([bg, arrow]);
    container.setSize(60, 60);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(UI_COLORS.positive, 0.3);
      bg.fillRoundedRect(-30, -30, 60, 60, 10);
      bg.lineStyle(2, UI_COLORS.positive, 0.8);
      bg.strokeRoundedRect(-30, -30, 60, 60, 10);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(UI_COLORS.panel, 0.8);
      bg.fillRoundedRect(-30, -30, 60, 60, 10);
      bg.lineStyle(2, UI_COLORS.border, 0.5);
      bg.strokeRoundedRect(-30, -30, 60, 60, 10);
    });

    container.on('pointerdown', onClick);

    return container;
  }

  private createStartButton(width: number, height: number) {
    const btnY = (height * 2) / 3 + 20;
    const container = this.add.container(width / 2, btnY);

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(REGIME_COLORS.BULL.primary, 0.9);
    bg.fillRoundedRect(-80, -25, 160, 50, 12);

    // Button text
    const text = this.add.text(0, 0, 'START', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(160, 50);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(REGIME_COLORS.BULL.secondary, 1);
      bg.fillRoundedRect(-80, -25, 160, 50, 12);
      container.setScale(1.05);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(REGIME_COLORS.BULL.primary, 0.9);
      bg.fillRoundedRect(-80, -25, 160, 50, 12);
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      this.startGame();
    });

    // Enter key to start
    this.input.keyboard!.addKey('ENTER').on('down', () => this.startGame());
    this.input.keyboard!.addKey('SPACE').on('down', () => this.startGame());
  }

  private createInstructions(width: number, height: number) {
    const instructions = [
      '↑↓ Arrow keys to accelerate/brake',
      '←→ Arrow keys to tilt car',
      'LONG / SHORT to open positions',
      'Press F for fullscreen',
    ];

    instructions.forEach((text, i) => {
      this.add.text(width / 2, height - 120 + i * 24, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#64748b',
      }).setOrigin(0.5);
    });
  }

  private selectPrevCar() {
    if (this.selectIdx > 0) {
      this.selectIdx--;
      this.updateCarDisplay();
    }
  }

  private selectNextCar() {
    if (this.selectIdx < CAR_DEFINITIONS.length - 1) {
      this.selectIdx++;
      this.updateCarDisplay();
    }
  }

  private updateCarDisplay() {
    // Hide all cars
    this.carSprites.forEach((sprite, i) => {
      sprite.setVisible(i === this.selectIdx);
    });

    // Update text
    const carDef = CAR_DEFINITIONS[this.selectIdx];
    if (this.carNameText) {
      this.carNameText.setText(carDef.name);
    }
    if (this.carDescText) {
      this.carDescText.setText(carDef.description);
    }

    // Update global state
    globalGameState.carType = carDef.type;
  }

  private startGame() {
    const carDef = CAR_DEFINITIONS[this.selectIdx];
    globalGameState.carType = carDef.type;
    globalGameState.vehicleKey = carDef.type;
    this.scene.switch('gameScene');
  }
}
