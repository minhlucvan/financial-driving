import React, { useCallback, useEffect } from 'react';
import { useAppState } from '../context/AppStateProvider';
import { PLAYBACK_SPEEDS } from '../types/timeline';

interface PlaybackControlsProps {
  compact?: boolean;
  showProgress?: boolean;
  showSpeedControl?: boolean;
}

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  compact = false,
  showProgress = true,
  showSpeedControl = true,
}) => {
  const { timeline, playback, datasetName, market } = useAppState();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (timeline.mode === 'playing') {
            playback.pause();
          } else {
            playback.play();
          }
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            playback.goToStart();
          } else {
            playback.prevBar();
          }
          break;
        case 'ArrowRight':
          if (e.shiftKey) {
            playback.goToEnd();
          } else {
            playback.nextBar();
          }
          break;
        case 'Home':
          playback.goToStart();
          break;
        case 'End':
          playback.goToEnd();
          break;
        case '[':
          const currentSpeedIdx = PLAYBACK_SPEEDS.indexOf(timeline.playbackSpeed as any);
          if (currentSpeedIdx > 0) {
            playback.setSpeed(PLAYBACK_SPEEDS[currentSpeedIdx - 1]);
          }
          break;
        case ']':
          const speedIdx = PLAYBACK_SPEEDS.indexOf(timeline.playbackSpeed as any);
          if (speedIdx < PLAYBACK_SPEEDS.length - 1) {
            playback.setSpeed(PLAYBACK_SPEEDS[speedIdx + 1]);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeline.mode, timeline.playbackSpeed, playback]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const barIndex = Math.floor(percent * timeline.totalBars);
      playback.goToBar(barIndex);
    },
    [timeline.totalBars, playback]
  );

  const progress = timeline.totalBars > 0 ? (timeline.currentIndex / (timeline.totalBars - 1)) * 100 : 0;

  const buttonStyle: React.CSSProperties = {
    padding: compact ? '4px 8px' : '8px 12px',
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: compact ? 12 : 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: compact ? 28 : 36,
    transition: 'background-color 0.2s',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'rgba(100, 100, 100, 0.5)',
    cursor: 'not-allowed',
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
        userSelect: 'none',
      }}
    >
      {/* Dataset and current bar info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: compact ? 11 : 13,
          color: '#ccc',
        }}
      >
        <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{datasetName}</span>
        <span>
          Bar {timeline.currentIndex + 1} / {timeline.totalBars}
        </span>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div
          onClick={handleProgressClick}
          style={{
            height: compact ? 6 : 10,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 5,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#3b82f6',
              borderRadius: 5,
              transition: 'width 0.1s',
            }}
          />
          {/* Current position indicator */}
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: `${progress}%`,
              transform: 'translateX(-50%)',
              width: compact ? 10 : 14,
              height: compact ? 10 : 14,
              backgroundColor: '#fff',
              borderRadius: '50%',
              boxShadow: '0 0 4px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>
      )}

      {/* Control buttons */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Go to start */}
        <button
          onClick={playback.goToStart}
          disabled={!timeline.canGoBack}
          style={timeline.canGoBack ? buttonStyle : disabledButtonStyle}
          title="Go to start (Home)"
        >
          ⏮
        </button>

        {/* Previous bar */}
        <button
          onClick={playback.prevBar}
          disabled={!timeline.canGoBack}
          style={timeline.canGoBack ? buttonStyle : disabledButtonStyle}
          title="Previous bar (←)"
        >
          ◀
        </button>

        {/* Play/Pause */}
        <button
          onClick={timeline.mode === 'playing' ? playback.pause : playback.play}
          disabled={!timeline.canGoForward && timeline.mode !== 'playing'}
          style={{
            ...buttonStyle,
            minWidth: compact ? 40 : 50,
            backgroundColor:
              timeline.mode === 'playing'
                ? 'rgba(239, 68, 68, 0.8)'
                : 'rgba(16, 185, 129, 0.8)',
          }}
          title={timeline.mode === 'playing' ? 'Pause (Space)' : 'Play (Space)'}
        >
          {timeline.mode === 'playing' ? '⏸' : '▶'}
        </button>

        {/* Next bar */}
        <button
          onClick={playback.nextBar}
          disabled={!timeline.canGoForward}
          style={timeline.canGoForward ? buttonStyle : disabledButtonStyle}
          title="Next bar (→)"
        >
          ▶
        </button>

        {/* Go to end */}
        <button
          onClick={playback.goToEnd}
          disabled={!timeline.canGoForward}
          style={timeline.canGoForward ? buttonStyle : disabledButtonStyle}
          title="Go to end (End)"
        >
          ⏭
        </button>

        {/* Stop/Reset */}
        <button
          onClick={playback.stop}
          style={buttonStyle}
          title="Stop and reset"
        >
          ⏹
        </button>
      </div>

      {/* Speed control */}
      {showSpeedControl && (
        <div
          style={{
            display: 'flex',
            gap: 4,
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: compact ? 10 : 12,
          }}
        >
          <span style={{ color: '#888', marginRight: 4 }}>Speed:</span>
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => playback.setSpeed(speed)}
              style={{
                padding: '2px 6px',
                backgroundColor:
                  timeline.playbackSpeed === speed
                    ? 'rgba(59, 130, 246, 0.9)'
                    : 'rgba(255, 255, 255, 0.1)',
                color: timeline.playbackSpeed === speed ? '#fff' : '#888',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: compact ? 10 : 11,
              }}
              title={`${speed}x speed ([/] to adjust)`}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}

      {/* Current candle info */}
      {market.currentCandle && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: compact ? 10 : 11,
            color: '#888',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: 8,
            marginTop: 4,
          }}
        >
          <span>{market.currentCandle.date}</span>
          <span
            style={{
              color: market.currentCandle.dailyReturn >= 0 ? '#10b981' : '#ef4444',
            }}
          >
            {market.currentCandle.dailyReturn >= 0 ? '+' : ''}
            {market.currentCandle.dailyReturn.toFixed(2)}%
          </span>
          <span style={{ color: market.regime === 'BULL' ? '#10b981' : market.regime === 'BEAR' ? '#ef4444' : '#f59e0b' }}>
            {market.regime}
          </span>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {!compact && (
        <div
          style={{
            fontSize: 9,
            color: '#555',
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Space: Play/Pause | ←→: Step | Shift+←→: Jump | []: Speed
        </div>
      )}
    </div>
  );
};

export default PlaybackControls;
