import Phaser from 'phaser';
import type { CarType } from './vector/svg-car';

// Vehicle update data reported from game to React
export interface VehicleUpdateData {
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  isOnGround: boolean;
  isFlipped: boolean;
  positionX: number;
  positionY: number;
}

export interface GameConfigOptions {
  parent: HTMLElement;
  width?: number;
  height?: number;
  scenes: Phaser.Types.Scenes.SceneType[];
  onVehicleUpdate?: (data: VehicleUpdateData) => void;
  onStateChange?: (state: 'playing' | 'victory' | 'bankrupt') => void;
  onReset?: () => void;
}

// Global game state that can be accessed from scenes
export interface GlobalGameState {
  onVehicleUpdate?: (data: VehicleUpdateData) => void;
  onStateChange?: (state: 'playing' | 'victory' | 'bankrupt') => void;
  onReset?: () => void;
  vehicleKey: string;
  carType: CarType;
  currentMarketDataKey: string;
  gameState: 'playing' | 'victory' | 'bankrupt';
}

export const globalGameState: GlobalGameState = {
  vehicleKey: 'car2',
  carType: 'sedan',
  currentMarketDataKey: 'sp500',
  gameState: 'playing',
};

export function createGameConfig(options: GameConfigOptions): Phaser.Types.Core.GameConfig {
  // Store callbacks in global state
  globalGameState.onVehicleUpdate = options.onVehicleUpdate;
  globalGameState.onStateChange = options.onStateChange;
  globalGameState.onReset = options.onReset;

  // Calculate dimensions
  const logicalWidth = 1536;
  const logicalHeight = 864;
  const deviceAspectRatio = window.innerWidth / window.innerHeight;
  const extraWidth = Math.round(deviceAspectRatio * logicalHeight - logicalWidth);
  const screenWidth = options.width || logicalWidth + extraWidth;
  const screenHeight = options.height || logicalHeight;

  return {
    type: Phaser.AUTO,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      parent: options.parent,
      width: screenWidth,
      height: screenHeight,
    },
    backgroundColor: '#1a1a2e',
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1 },
        debug: false,
      },
    },
    scene: options.scenes,
    pixelArt: true,
  };
}

// Screen dimensions helper
export function getScreenDimensions() {
  const logicalWidth = 1536;
  const logicalHeight = 864;
  const deviceAspectRatio = window.innerWidth / window.innerHeight;
  const extraWidth = Math.round(deviceAspectRatio * logicalHeight - logicalWidth);
  return {
    width: logicalWidth + extraWidth,
    height: logicalHeight,
    logicalWidth,
    logicalHeight,
  };
}
