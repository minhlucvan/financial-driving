// Timeline and Playback State Types

export type PlaybackMode = 'paused' | 'playing' | 'stepping';

export interface TimelineState {
  // Current position
  currentIndex: number;
  totalBars: number;

  // Playback control
  mode: PlaybackMode;
  playbackSpeed: number; // bars per second (0.5, 1, 2, 5, 10)

  // Navigation limits
  canGoBack: boolean;
  canGoForward: boolean;

  // Time tracking
  lastUpdateTime: number;
  elapsedTime: number;
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  nextBar: () => void;
  prevBar: () => void;
  goToBar: (index: number) => void;
  goToStart: () => void;
  goToEnd: () => void;
  setSpeed: (speed: number) => void;
  reset: () => void;
}

// Speed presets
export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 5, 10] as const;
export type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];
