import React from 'react';
import { useAppState } from '../context/AppStateProvider';

interface TradingControlsProps {
  compact?: boolean;
}

const TradingControls: React.FC<TradingControlsProps> = ({ compact = false }) => {
  const { position, market, openPosition, closePosition } = useAppState();

  const buttonStyle = {
    padding: compact ? '6px 12px' : '8px 16px',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 'bold' as const,
    fontSize: compact ? 12 : 14,
    transition: 'all 0.2s ease',
  };

  const buyButtonStyle = {
    ...buttonStyle,
    backgroundColor: position.isOpen ? '#333' : '#10b981',
    color: position.isOpen ? '#666' : '#fff',
    cursor: position.isOpen ? 'not-allowed' : 'pointer',
  };

  const sellButtonStyle = {
    ...buttonStyle,
    backgroundColor: !position.isOpen ? '#333' : '#ef4444',
    color: !position.isOpen ? '#666' : '#fff',
    cursor: !position.isOpen ? 'not-allowed' : 'pointer',
  };

  const handleBuy = () => {
    if (!position.isOpen) {
      openPosition(1); // Full position (100% exposure)
    }
  };

  const handleSell = () => {
    if (position.isOpen) {
      closePosition();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: compact ? 8 : 12,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 8,
        minWidth: compact ? 100 : 140,
      }}
    >
      {/* Position Status */}
      <div
        style={{
          fontSize: compact ? 10 : 11,
          color: '#888',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Position
      </div>

      {/* Current Position Info */}
      <div
        style={{
          padding: '4px 8px',
          backgroundColor: position.isOpen ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 100, 100, 0.2)',
          borderRadius: 4,
          textAlign: 'center',
          fontSize: compact ? 11 : 12,
          color: position.isOpen ? '#10b981' : '#888',
        }}
      >
        {position.isOpen ? (
          <>
            <div>LONG @ ${position.entryPrice.toFixed(2)}</div>
            <div
              style={{
                color: position.unrealizedPnL >= 0 ? '#10b981' : '#ef4444',
                fontWeight: 'bold',
              }}
            >
              {position.unrealizedPnL >= 0 ? '+' : ''}
              ${position.unrealizedPnL.toFixed(2)} ({position.unrealizedPnLPercent >= 0 ? '+' : ''}
              {position.unrealizedPnLPercent.toFixed(2)}%)
            </div>
          </>
        ) : (
          <div>FLAT (Cash)</div>
        )}
      </div>

      {/* Buy/Sell Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleBuy}
          disabled={position.isOpen}
          style={buyButtonStyle}
          title={position.isOpen ? 'Already in position' : 'Open long position'}
        >
          BUY
        </button>
        <button
          onClick={handleSell}
          disabled={!position.isOpen}
          style={sellButtonStyle}
          title={!position.isOpen ? 'No position to close' : 'Close position'}
        >
          SELL
        </button>
      </div>

      {/* Current Price */}
      <div
        style={{
          fontSize: compact ? 10 : 11,
          color: '#666',
          textAlign: 'center',
        }}
      >
        Price: ${market.currentPrice.toFixed(2)}
      </div>
    </div>
  );
};

export default TradingControls;
