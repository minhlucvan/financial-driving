import React from 'react';
import { useAppState } from '../context/AppStateProvider';
import type { Position } from '../types';

interface TradingControlsProps {
  compact?: boolean;
}

const TradingControls: React.FC<TradingControlsProps> = ({ compact = false }) => {
  const {
    backtest,
    market,
    openLong,
    openShort,
    closePositionById,
    closeAllPositions,
  } = useAppState();

  const { portfolio } = backtest;
  const positions = portfolio.positions;
  const hasPositions = positions.length > 0;

  const buttonStyle = {
    padding: compact ? '4px 8px' : '6px 12px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: compact ? 11 : 12,
    transition: 'all 0.2s ease',
    flex: 1,
  };

  const handleBuyLong = () => {
    openLong(0.5); // 50% of available capital
  };

  const handleSellShort = () => {
    openShort(0.5); // 50% of available capital
  };

  const handleCloseAll = () => {
    closeAllPositions();
  };

  const formatPnL = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}$${pnl.toFixed(2)}`;
  };

  const formatPercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: compact ? 8 : 10,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderRadius: 8,
        minWidth: compact ? 160 : 200,
        maxWidth: 280,
      }}
    >
      {/* Header with portfolio info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333',
          paddingBottom: 4,
        }}
      >
        <span style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>
          Portfolio
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            color: portfolio.accumulatedReturn >= 0 ? '#10b981' : '#ef4444',
          }}
        >
          {formatPercent(portfolio.accumulatedReturn)}
        </span>
      </div>

      {/* Cash and Equity */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: '#888' }}>Equity:</span>
        <span style={{ color: '#fff' }}>${portfolio.equity.toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: '#888' }}>Cash:</span>
        <span style={{ color: '#66b3ff' }}>${portfolio.cash.toFixed(2)}</span>
      </div>

      {/* Open Positions */}
      {positions.length > 0 && (
        <div
          style={{
            marginTop: 4,
            borderTop: '1px solid #333',
            paddingTop: 4,
          }}
        >
          <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>
            Open Positions ({positions.length})
          </div>
          <div style={{ maxHeight: 100, overflowY: 'auto' }}>
            {positions.map((pos) => (
              <PositionRow
                key={pos.id}
                position={pos}
                compact={compact}
                onClose={() => closePositionById(pos.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Trading Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <button
          onClick={handleBuyLong}
          style={{
            ...buttonStyle,
            backgroundColor: '#10b981',
            color: '#fff',
          }}
          title="Open long position (50% of cash)"
        >
          LONG
        </button>
        <button
          onClick={handleSellShort}
          style={{
            ...buttonStyle,
            backgroundColor: '#ef4444',
            color: '#fff',
          }}
          title="Open short position (50% of cash)"
        >
          SHORT
        </button>
      </div>

      {/* Close All Button */}
      {hasPositions && (
        <button
          onClick={handleCloseAll}
          style={{
            ...buttonStyle,
            backgroundColor: '#f59e0b',
            color: '#000',
          }}
          title="Close all positions"
        >
          CLOSE ALL
        </button>
      )}

      {/* Current Price */}
      <div
        style={{
          fontSize: 10,
          color: '#666',
          textAlign: 'center',
          marginTop: 4,
          borderTop: '1px solid #333',
          paddingTop: 4,
        }}
      >
        Price: ${market.currentPrice.toFixed(2)}
      </div>

      {/* Stats */}
      {portfolio.closedPositions.length > 0 && (
        <div style={{ fontSize: 9, color: '#666', textAlign: 'center' }}>
          Trades: {portfolio.closedPositions.length} | Realized: {formatPnL(portfolio.totalRealizedPnL)}
        </div>
      )}
    </div>
  );
};

// Individual position row component
interface PositionRowProps {
  position: Position;
  compact: boolean;
  onClose: () => void;
}

const PositionRow: React.FC<PositionRowProps> = ({ position, compact, onClose }) => {
  const isLong = position.direction === 'long';
  const pnlColor = position.unrealizedPnL >= 0 ? '#10b981' : '#ef4444';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 4px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 3,
        marginBottom: 2,
        fontSize: compact ? 9 : 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span
          style={{
            color: isLong ? '#10b981' : '#ef4444',
            fontWeight: 'bold',
          }}
        >
          {isLong ? '▲' : '▼'}
        </span>
        <span style={{ color: '#aaa' }}>
          {(position.size * 100).toFixed(0)}%
        </span>
      </div>
      <span style={{ color: pnlColor, fontWeight: 'bold' }}>
        {position.unrealizedPnL >= 0 ? '+' : ''}
        {position.unrealizedPnLPercent.toFixed(1)}%
      </span>
      <button
        onClick={onClose}
        style={{
          padding: '1px 4px',
          fontSize: 8,
          backgroundColor: '#666',
          color: '#fff',
          border: 'none',
          borderRadius: 2,
          cursor: 'pointer',
        }}
      >
        ✕
      </button>
    </div>
  );
};

export default TradingControls;
