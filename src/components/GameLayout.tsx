import React, { useRef, useEffect, useState } from 'react';
import { useAppState } from '../context/AppStateProvider';
import PhaserGame, { type PhaserGameHandle } from './PhaserGame';
import FinancialChart from './FinancialChart';
import PlaybackControls from './PlaybackControls';
import TradingControls from './TradingControls';
import type { ViewMode } from '../types';

const VIEW_MODE_HEIGHTS: Record<ViewMode, { chart: number; game: number }> = {
  split: { chart: 28, game: 72 },
  chart_focus: { chart: 45, game: 55 },
  drive_focus: { chart: 15, game: 85 },
  full_immersion: { chart: 0, game: 100 },
};

const GameLayout: React.FC = () => {
  const gameRef = useRef<PhaserGameHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get state from unified provider
  const {
    viewMode,
    cycleViewMode,
    wealth,
    gamePlayState,
    isLoading,
    timeline,
    setLeverage,
    setCashBuffer,
    loadDataset,
    playback,
  } = useAppState();

  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for view mode, dataset, and wealth controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in input or if modifier keys pressed
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'c':
          cycleViewMode();
          break;
        case 'n':
          // Cycle datasets
          const datasets = ['sp500', 'bitcoin', 'meme_stock', 'steady_growth', 'crash_2008', 'covid_2020'];
          // This would need access to current dataset - handled by loadDataset
          break;
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleViewMode, setLeverage, setCashBuffer, wealth.leverage, wealth.cashBuffer]);

  const heights = VIEW_MODE_HEIGHTS[viewMode];
  const chartHeight = (dimensions.height * heights.chart) / 100;
  const gameHeight = (dimensions.height * heights.game) / 100;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f0f1a',
        overflow: 'hidden',
      }}
    >
      {/* Chart Section */}
      {heights.chart > 0 && (
        <div
          style={{
            height: chartHeight,
            width: '100%',
            backgroundColor: '#1a1a2e',
            borderBottom: '2px solid #333',
            position: 'relative',
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#666',
              }}
            >
              Loading market data...
            </div>
          ) : (
            <FinancialChart
              width={dimensions.width}
              height={chartHeight}
              showVolume={viewMode !== 'drive_focus'}
              showMA={true}
            />
          )}
        </div>
      )}

      {/* Game Section */}
      <div
        style={{
          height: gameHeight,
          width: '100%',
          position: 'relative',
        }}
      >
        <PhaserGame ref={gameRef} width={dimensions.width} height={gameHeight} />

        {/* Playback Controls - Bottom Left */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 20,
            pointerEvents: 'auto',
          }}
        >
          <PlaybackControls compact={viewMode === 'drive_focus'} showSpeedControl={viewMode !== 'drive_focus'} />
        </div>

        {/* Trading Controls - Bottom Center */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'auto',
          }}
        >
          <TradingControls compact={viewMode === 'drive_focus'} />
        </div>

        {/* Overlay HUD - Top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            pointerEvents: 'none',
          }}
        >
          {/* Left side - Game status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gamePlayState !== 'playing' && gamePlayState !== 'menu' && (
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: gamePlayState === 'victory' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  borderRadius: 4,
                  fontWeight: 'bold',
                  fontSize: 16,
                }}
              >
                {gamePlayState === 'victory' ? 'VICTORY!' : 'BANKRUPT'}
              </div>
            )}
          </div>

          {/* Right side - Wealth info */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <div
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: wealth.currentWealth >= wealth.startingWealth ? '#10b981' : '#ef4444',
                borderRadius: 4,
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            >
              ${wealth.currentWealth.toLocaleString()}
            </div>
            {wealth.drawdown > 0 && (
              <div
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.8)',
                  color: '#fff',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                Drawdown: {(wealth.drawdown * 100).toFixed(1)}%
              </div>
            )}
            <div
              style={{
                padding: '4px 8px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: '#888',
                borderRadius: 4,
                fontSize: 11,
              }}
            >
              Leverage: {wealth.leverage.toFixed(1)}x | Cash: {(wealth.cashBuffer * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Bottom Center - View mode and controls hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#888',
            borderRadius: 4,
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          C: View ({viewMode}) | W/S: Leverage | Q/E: Cash | Space: Play/Pause
        </div>
      </div>
    </div>
  );
};

export default GameLayout;
