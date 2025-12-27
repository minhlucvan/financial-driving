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
      activateHedge,
      // State to send to game
      terrain,
      physics,
      wealth,
      market,
      position,
      datasetName,
      backtest,
      timeline,
      playback,
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
        // Hedge activation handler
        onHedgeActivate: () => {
          activateHedge('basic');
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
        // Get active hedge info for visual display
        const activeHedges = backtest.portfolio.skillState.activeHedges;
        const primaryHedge = activeHedges.length > 0 ? activeHedges[0] : null;

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
          carPhysics: backtest.portfolio.carPhysics,
          pnlPercent: backtest.portfolio.accumulatedReturn,
          drawdown: backtest.portfolio.drawdown,
          stressLevel: backtest.portfolio.stressLevel,
          // Hedge state
          isHedged: primaryHedge !== null && primaryHedge.isActive,
          hedgeCoverage: primaryHedge?.coverage ?? 0,
          hedgeRemaining: primaryHedge?.remainingCandles ?? 0,
          hedgeCooldown: backtest.portfolio.skillState.hedgeCooldown,
          // Chart data for overlay
          chartCandles: market.visibleCandles,
          totalBars: timeline.totalBars,
          currentIndex: timeline.currentIndex,
          currentPrice: market.currentPrice,
          currentReturn: market.currentReturn,
          currentDate: market.currentCandle?.date || '',
          indicators: market.indicators,
          // Portfolio data for overlay
          equity: backtest.portfolio.equity,
          cash: backtest.portfolio.cash,
          positions: backtest.portfolio.positions,
          // Playback state
          isPlaying: timeline.mode === 'playing',
          playbackSpeed: timeline.playbackSpeed,
          canGoBack: timeline.canGoBack,
          canGoForward: timeline.canGoForward,
        });
      }
    }, [terrain, physics, wealth, market, datasetName, position, backtest, timeline]);

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
