import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameContext } from '../context/GameContext';
import PhaserGame, { PhaserGameHandle } from './PhaserGame';
import FinancialChart from './FinancialChart';
import useMarketData from '../hooks/useMarketData';
import { ViewMode } from '../types';

interface GameLayoutProps {
  initialDataset?: string;
}

const VIEW_MODE_HEIGHTS: Record<ViewMode, { chart: number; game: number }> = {
  split: { chart: 28, game: 72 },
  chart_focus: { chart: 45, game: 55 },
  drive_focus: { chart: 15, game: 85 },
  full_immersion: { chart: 0, game: 100 },
};

const GameLayout: React.FC<GameLayoutProps> = ({ initialDataset = 'sp500' }) => {
  const gameRef = useRef<PhaserGameHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { viewMode, cycleViewMode, setChartData, wealth, indicators, gameState, settings, updateSettings } =
    useGameContext();

  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const { chartData, rawData, currentDataset, cycleDataset, isLoading } = useMarketData(initialDataset);

  // Update chart data in context when it changes
  useEffect(() => {
    if (chartData.length > 0) {
      setChartData(chartData);
    }
  }, [chartData, setChartData]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        cycleViewMode();
      }
      if (e.key === 'n' || e.key === 'N') {
        const newDataset = cycleDataset();
        updateSettings({ selectedDataset: newDataset });
      }
      if (e.key === 'f' || e.key === 'F') {
        gameRef.current?.toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cycleViewMode, cycleDataset, updateSettings]);

  const heights = VIEW_MODE_HEIGHTS[viewMode];
  const chartHeight = (dimensions.height * heights.chart) / 100;
  const gameHeight = (dimensions.height * heights.game) / 100;

  const handleGameUpdate = useCallback(() => {
    // Game update handling is done via context
  }, []);

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
              Loading {currentDataset} data...
            </div>
          ) : (
            <FinancialChart width={dimensions.width} height={chartHeight} showVolume={viewMode !== 'drive_focus'} showMA={true} />
          )}

          {/* Dataset indicator */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '4px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {rawData?.name || currentDataset.toUpperCase()} | Press N to change
          </div>
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
        <PhaserGame ref={gameRef} width={dimensions.width} height={gameHeight} onGameUpdate={handleGameUpdate} />

        {/* Overlay HUD */}
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {gameState !== 'playing' && (
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: gameState === 'victory' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  borderRadius: 4,
                  fontWeight: 'bold',
                  fontSize: 16,
                }}
              >
                {gameState === 'victory' ? '🎉 VICTORY!' : '💥 BANKRUPT'}
              </div>
            )}
          </div>

          {/* Right side - Wealth info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 4,
            }}
          >
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

        {/* Bottom controls hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#888',
            borderRadius: 4,
            fontSize: 11,
            pointerEvents: 'none',
          }}
        >
          Arrow keys: Drive | W/S: Leverage | Q/E: Cash | C: View ({viewMode}) | R: Restart
        </div>
      </div>
    </div>
  );
};

export default GameLayout;
