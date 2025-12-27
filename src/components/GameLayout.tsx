import React, { useRef, useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateProvider';
import PhaserGame, { type PhaserGameHandle } from './PhaserGame';

const GameLayout: React.FC = () => {
  const gameRef = useRef<PhaserGameHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get state from unified provider
  const {
    wealth,
    gamePlayState,
    isLoading,
    setLeverage,
    setCashBuffer,
    playback,
  } = useAppState();

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for wealth controls and playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input or if modifier keys pressed
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          gameRef.current?.toggleFullscreen();
          break;
        case 'w':
          setLeverage(wealth.leverage + 0.25);
          break;
        case 's':
          // Only adjust leverage if not arrow key (which is handled by game)
          if (!e.shiftKey) {
            setLeverage(wealth.leverage - 0.25);
          }
          break;
        case 'q':
          setCashBuffer(wealth.cashBuffer + 0.05);
          break;
        case 'e':
          setCashBuffer(wealth.cashBuffer - 0.05);
          break;
        case ' ':
          // Toggle play/pause
          e.preventDefault();
          if (playback) {
            playback.play();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLeverage, setCashBuffer, wealth.leverage, wealth.cashBuffer, playback]);

  // Show loading screen
  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f0f1a',
          color: '#666',
          fontFamily: 'monospace',
          fontSize: 16,
        }}
      >
        Loading market data...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f0f1a',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Full-screen Game Canvas */}
      <PhaserGame ref={gameRef} width={dimensions.width} height={dimensions.height} />

      {/* Game status overlay (victory/bankrupt) - rendered via HTML for accessibility */}
      {gamePlayState !== 'playing' && gamePlayState !== 'menu' && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '24px 48px',
            backgroundColor: gamePlayState === 'victory' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 32,
            fontFamily: 'monospace',
            textAlign: 'center',
            zIndex: 100,
            pointerEvents: 'none',
          }}
        >
          {gamePlayState === 'victory' ? 'VICTORY!' : 'BANKRUPT'}
        </div>
      )}
    </div>
  );
};

export default GameLayout;
