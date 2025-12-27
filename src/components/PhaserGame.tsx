import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { useGameContext } from '../context/GameContext';

// Import game modules (we'll create these as TypeScript modules)
import { createGameConfig } from '../game/config';
import { VSelectScene } from '../game/scenes/VSelectScene';
import { GameScene } from '../game/scenes/GameScene';

export interface PhaserGameHandle {
  game: Phaser.Game | null;
  restartGame: () => void;
  toggleFullscreen: () => void;
}

interface PhaserGameProps {
  width?: number;
  height?: number;
  onGameReady?: (game: Phaser.Game) => void;
  onGameUpdate?: (data: GameUpdateData) => void;
}

export interface GameUpdateData {
  currentIndex: number;
  wealth: number;
  drawdown: number;
  regime: string;
  vehicleVelocity: { x: number; y: number };
  isFlipped: boolean;
}

const PhaserGame = forwardRef<PhaserGameHandle, PhaserGameProps>(
  ({ width, height, onGameReady, onGameUpdate }, ref) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { updateWealth, updateVehicle, setCurrentCandleIndex, updateIndicators, setGameState } =
      useGameContext();

    useImperativeHandle(ref, () => ({
      game: gameRef.current,
      restartGame: () => {
        if (gameRef.current) {
          const gameScene = gameRef.current.scene.getScene('gameScene');
          if (gameScene) {
            gameScene.scene.restart();
          }
        }
      },
      toggleFullscreen: () => {
        if (gameRef.current) {
          gameRef.current.scale.toggleFullscreen();
        }
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      // Create game config
      const config = createGameConfig({
        parent: containerRef.current,
        width: width || 1536,
        height: height || 864,
        scenes: [VSelectScene, GameScene],
        onGameUpdate: (data: GameUpdateData) => {
          // Update React state from game
          updateWealth({
            currentWealth: data.wealth,
            drawdown: data.drawdown,
          });
          updateVehicle({
            velocityX: data.vehicleVelocity.x,
            velocityY: data.vehicleVelocity.y,
            isFlipped: data.isFlipped,
          });
          setCurrentCandleIndex(data.currentIndex);
          updateIndicators({ regime: data.regime as any });

          if (onGameUpdate) {
            onGameUpdate(data);
          }
        },
        onStateChange: (state: 'playing' | 'victory' | 'bankrupt') => {
          setGameState(state);
        },
      });

      // Create the Phaser game
      gameRef.current = new Phaser.Game(config);

      if (onGameReady) {
        gameRef.current.events.once('ready', () => {
          onGameReady(gameRef.current!);
        });
      }

      // Cleanup on unmount
      return () => {
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
        }
      };
    }, []);

    // Handle resize
    useEffect(() => {
      if (gameRef.current && width && height) {
        gameRef.current.scale.resize(width, height);
      }
    }, [width, height]);

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />
    );
  }
);

PhaserGame.displayName = 'PhaserGame';

export default PhaserGame;
