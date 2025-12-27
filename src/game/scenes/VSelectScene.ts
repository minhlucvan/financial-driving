import Phaser from 'phaser';
import { getScreenDimensions, globalGameState } from '../config';

export class VSelectScene extends Phaser.Scene {
  private VthumbnailKey = 'Vthumbnail';
  private carThumbnails: Phaser.GameObjects.Image[] = [];
  private selectIdx = 0;

  constructor() {
    super({ key: 'VSelectScene' });
  }

  preload() {
    // Load vehicle thumbnails and fonts
    this.load.multiatlas(this.VthumbnailKey, '/car/carThumbnail.json', '/car');
    this.load.bitmapFont('desyrel-pink', '/fonts/desyrel-pink.png', '/fonts/desyrel-pink.xml');
    this.load.image('btn-start', '/button.png');
  }

  create() {
    const { width, height } = getScreenDimensions();

    // Fullscreen toggle
    const FKey = this.input.keyboard!.addKey('F');
    FKey.on('down', () => {
      this.scale.toggleFullscreen();
    });

    // Load car thumbnails
    this.carThumbnails = [];
    const frames = this.textures.get(this.VthumbnailKey).getFrameNames();

    frames.forEach((imgFName: string) => {
      if (imgFName !== '__BASE') {
        const img = this.add.image(width / 2, height / 2, this.VthumbnailKey, imgFName);
        img.name = imgFName.split('.')[0];
        img.visible = false;
        this.carThumbnails.push(img);
      }
    });

    this.carThumbnails.sort((a, b) => a.name.localeCompare(b.name));

    if (this.carThumbnails.length > 0) {
      this.carThumbnails[this.selectIdx].visible = true;
    }

    const Iw = 100 + (this.carThumbnails[0]?.displayWidth || 200);

    // Right arrow button
    this.add
      .bitmapText(width / 2 + Iw / 2, height / 2, 'desyrel-pink', '>')
      .setOrigin(0.5, 0)
      .setInteractive()
      .on('pointerdown', () => {
        if (this.selectIdx + 1 >= this.carThumbnails.length) return;
        this.carThumbnails[this.selectIdx].visible = false;
        this.selectIdx += 1;
        this.carThumbnails[this.selectIdx].visible = true;
      });

    // Left arrow button
    this.add
      .bitmapText(width / 2 - Iw / 2, height / 2, 'desyrel-pink', '<')
      .setOrigin(0.5, 0)
      .setInteractive()
      .on('pointerdown', () => {
        if (this.selectIdx - 1 < 0) return;
        this.carThumbnails[this.selectIdx].visible = false;
        this.selectIdx -= 1;
        this.carThumbnails[this.selectIdx].visible = true;
      });

    // Title
    this.add
      .bitmapText(width / 2, height / 5, 'desyrel-pink', 'Financial Drive')
      .setOrigin(0.5, 0);

    // Subtitle
    this.add
      .bitmapText(width / 2, height / 5 + 60, 'desyrel-pink', 'Select Your Vehicle')
      .setOrigin(0.5, 0)
      .setScale(0.6);

    // Start button background
    this.add.image(width / 2, (height * 2) / 3 - 10, 'btn-start').setOrigin(0.5, 0);

    // Start button
    this.add
      .bitmapText(width / 2, (height * 2) / 3, 'desyrel-pink', 'Start')
      .setOrigin(0.5, 0)
      .setInteractive()
      .on('pointerdown', () => {
        this.input.stopPropagation();
        if (this.carThumbnails.length > 0) {
          globalGameState.vehicleKey = this.carThumbnails[this.selectIdx].name;
        }
        this.scene.switch('gameScene');
      });

    // Instructions
    this.add
      .bitmapText(
        width / 2,
        (height * 5) / 6,
        'desyrel-pink',
        'Use arrow keys to move car\nPress "F" for fullscreen\nPress "C" to toggle chart view'
      )
      .setOrigin(0.5, 0)
      .setScale(0.7);

    // Market dataset info
    this.add
      .bitmapText(
        width / 2,
        (height * 5) / 6 + 80,
        'desyrel-pink',
        'Press "N" to change market dataset'
      )
      .setOrigin(0.5, 0)
      .setScale(0.5);
  }
}
