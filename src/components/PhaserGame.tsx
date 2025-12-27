import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';
import { useAppState } from '../context/AppStateProvider';
import { createGameConfig, type VehicleUpdateData } from '../game/config';
import { VSelectScene } from '../game/scenes/VSelectScene';
import { GameScene } from '../game/scenes/GameScene';

export interface PhaserGameHandle {
  game: Phaser.Game | null;
  restartGame: () => void;
  toggleFullscreen: () => void;
  sendStateUpdate: () => void;
}

interface PhaserGameProps {
  width?: number;
  height?: number;
  onGameReady?: (game: Phaser.Game) => void;
}

const PhaserGame = forwardRef<PhaserGameHandle, PhaserGameProps>(
  ({ width, height, onGameReady }, ref) => {
    const gameRef = useRef<Phaser.Game | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Get state and actions from unified provider
    const {
      updateVehicle,
      setGameState,
      resetGame,
      // State to send to game
      terrain,
      physics,
      wealth,
      market,
      position,
      datasetName,
    } = useAppState();

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
      sendStateUpdate: () => {
        if (gameRef.current) {
          // Send current state to game
          gameRef.current.events.emit('updateState', {
            terrainSlope: terrain.currentSlope,
            terrainRoughness: terrain.currentRoughness,
            torqueMultiplier: physics.torqueMultiplier,
            brakeMultiplier: physics.brakeMultiplier,
            tractionMultiplier: physics.tractionMultiplier,
            leverage: wealth.leverage,
            cashBuffer: wealth.cashBuffer,
            regime: market.regime,
            wealth: wealth.currentWealth,
            datasetName: datasetName,
            exposure: position.exposure,
            isPositionOpen: position.isOpen,
          });
        }
      },
    }));

    // Create game on mount
    useEffect(() => {
      if (!containerRef.current) return;

      // Create game config with callbacks
      const config = createGameConfig({
        parent: containerRef.current,
        width: width || 1536,
        height: height || 864,
        scenes: [VSelectScene, GameScene],
        // Vehicle state updates from game to React
        onVehicleUpdate: (data: VehicleUpdateData) => {
          updateVehicle({
            velocityX: data.velocityX,
            velocityY: data.velocityY,
            angularVelocity: data.angularVelocity,
            isOnGround: data.isOnGround,
            isFlipped: data.isFlipped,
          });
        },
        // Game state changes
        onStateChange: (state: 'playing' | 'victory' | 'bankrupt') => {
          setGameState(state);
        },
        // Reset handler
        onReset: () => {
          resetGame();
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

    // Sync state from React to Game whenever it changes
    useEffect(() => {
      if (gameRef.current) {
        gameRef.current.events.emit('updateState', {
          terrainSlope: terrain.currentSlope,
          terrainRoughness: terrain.currentRoughness,
          torqueMultiplier: physics.torqueMultiplier,
          brakeMultiplier: physics.brakeMultiplier,
          tractionMultiplier: physics.tractionMultiplier,
          leverage: wealth.leverage,
          cashBuffer: wealth.cashBuffer,
          regime: market.regime,
          wealth: wealth.currentWealth,
          datasetName: datasetName,
          exposure: position.exposure,
          isPositionOpen: position.isOpen,
        });
      }
    }, [terrain, physics, wealth, market.regime, datasetName, position]);

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
