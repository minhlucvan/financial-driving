import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type {
  UnifiedAppState,
  CurrentMarketState,
  TerrainState,
  PhysicsModifiers,
  TimelineState,
  PlaybackMode,
  ProcessedCandle,
  ChartCandle,
  MarketRegime,
  WealthState,
  VehicleState,
  PositionState,
  ViewMode,
  GameState,
  MarketIndicators,
} from '../types';
import {
  INITIAL_APP_STATE,
  INITIAL_TIMELINE_STATE,
  INITIAL_MARKET_STATE,
  INITIAL_TERRAIN_STATE,
  INITIAL_PHYSICS_MODIFIERS,
  INITIAL_WEALTH_STATE,
  INITIAL_VEHICLE_STATE,
  INITIAL_POSITION_STATE,
} from '../types/state';
import type { PlaybackControls } from '../types/timeline';

// ============================================
// ACTION TYPES
// ============================================

type AppAction =
  // Data loading
  | { type: 'LOAD_DATASET_START'; payload: { key: string } }
  | { type: 'LOAD_DATASET_SUCCESS'; payload: { key: string; name: string; data: ProcessedCandle[] } }
  | { type: 'LOAD_DATASET_ERROR'; payload: { error: string } }
  // Timeline control
  | { type: 'SET_TIMELINE_INDEX'; payload: number }
  | { type: 'SET_PLAYBACK_MODE'; payload: PlaybackMode }
  | { type: 'SET_PLAYBACK_SPEED'; payload: number }
  | { type: 'TICK'; payload: { deltaTime: number } }
  // Wealth updates
  | { type: 'UPDATE_WEALTH'; payload: Partial<WealthState> }
  | { type: 'SET_LEVERAGE'; payload: number }
  | { type: 'SET_CASH_BUFFER'; payload: number }
  // Vehicle updates (from game)
  | { type: 'UPDATE_VEHICLE'; payload: Partial<VehicleState> }
  // Position updates
  | { type: 'UPDATE_POSITION'; payload: Partial<PositionState> }
  // UI updates
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  // Reset
  | { type: 'RESET_GAME' }
  | { type: 'RESET_ALL' };

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateIndicators(
  data: ProcessedCandle[],
  currentIndex: number
): MarketIndicators {
  if (currentIndex < 0 || currentIndex >= data.length) {
    return INITIAL_MARKET_STATE.indicators;
  }

  const candle = data[currentIndex];
  const lookback = Math.min(14, currentIndex + 1);
  const recentCandles = data.slice(Math.max(0, currentIndex - lookback + 1), currentIndex + 1);

  // Calculate RSI (simplified)
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recentCandles.length; i++) {
    const change = recentCandles[i].dailyReturn;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / lookback;
  const avgLoss = losses / lookback;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  // ATR
  const atr =
    recentCandles.reduce((sum, c) => sum + c.trueRange, 0) / recentCandles.length;

  // Volatility
  const volatility = candle.rollingVolatility;

  // Trend (simple: positive if price above 20-day MA)
  const maLookback = Math.min(20, currentIndex + 1);
  const maCandles = data.slice(Math.max(0, currentIndex - maLookback + 1), currentIndex + 1);
  const ma = maCandles.reduce((sum, c) => sum + c.close, 0) / maCandles.length;
  const trend = ((candle.close - ma) / ma) * 100;

  // Drawdown
  const maxPrice = Math.max(...data.slice(0, currentIndex + 1).map((c) => c.high));
  const drawdown = ((maxPrice - candle.close) / maxPrice) * 100;

  // Regime detection
  let regime: MarketRegime = 'CHOP';
  if (trend > 5 && rsi > 50) regime = 'BULL';
  else if (trend < -5 && rsi < 50) regime = 'BEAR';
  else if (drawdown > 20) regime = 'CRASH';
  else if (trend > 0 && drawdown > 10) regime = 'RECOVERY';

  return { rsi, atr, volatility, trend, drawdown, regime };
}

function calculateTerrainState(
  market: CurrentMarketState,
  leverage: number
): TerrainState {
  const currentSlope = market.terrainSlope * leverage;
  const currentRoughness = market.roadRoughness;
  const leverageAmplification = leverage;

  return { currentSlope, currentRoughness, leverageAmplification };
}

function calculatePhysicsModifiers(
  wealth: WealthState,
  market: CurrentMarketState
): PhysicsModifiers {
  // Torque based on leverage (higher leverage = more power but more risk)
  const torqueMultiplier = 0.8 + wealth.leverage * 0.4;

  // Brake based on cash buffer (more cash = better braking)
  const brakeMultiplier = 0.5 + wealth.cashBuffer * 2.0;

  // Traction based on volatility and RSI
  const volatilityPenalty = market.indicators.volatility * 0.5;
  const rsiPenalty =
    Math.abs(market.indicators.rsi - 50) > 30
      ? (Math.abs(market.indicators.rsi - 50) - 30) * 0.01
      : 0;
  const tractionMultiplier = Math.max(0.3, 1 - volatilityPenalty - rsiPenalty);

  // Recovery drag when in drawdown
  const recoveryDrag = wealth.isInRecovery ? 1 + wealth.drawdown * 2 : 1;

  return { torqueMultiplier, brakeMultiplier, tractionMultiplier, recoveryDrag };
}

function returnToSlope(dailyReturn: number): number {
  const maxReturn = 4;
  const normalized = Math.max(-1, Math.min(1, dailyReturn / maxReturn));
  const slope = Math.round(normalized * 32);
  const validSlopes = [-32, -16, 0, 16, 32];
  let closest = validSlopes[0];
  for (const s of validSlopes) {
    if (Math.abs(slope - s) < Math.abs(slope - closest)) {
      closest = s;
    }
  }
  return closest;
}

function processedToChartCandle(candle: ProcessedCandle): ChartCandle {
  return {
    date: new Date(candle.date),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

function deriveMarketState(
  data: ProcessedCandle[],
  currentIndex: number
): CurrentMarketState {
  if (data.length === 0 || currentIndex < 0) {
    return INITIAL_MARKET_STATE;
  }

  const safeIndex = Math.min(currentIndex, data.length - 1);
  const currentCandle = data[safeIndex];
  const startPrice = data[0].open;
  const currentPrice = currentCandle.close;
  const currentReturn = ((currentPrice - startPrice) / startPrice) * 100;

  const visibleCandles = data.slice(0, safeIndex + 1).map(processedToChartCandle);
  const indicators = calculateIndicators(data, safeIndex);
  const terrainSlope = returnToSlope(currentCandle.dailyReturn);
  const roadRoughness = Math.min(1, currentCandle.intradayVolatility / 5);
  const tractionMultiplier = Math.max(0.5, 1 - roadRoughness * 0.5);

  return {
    currentCandle,
    currentPrice,
    currentReturn,
    visibleCandles,
    indicators,
    regime: indicators.regime,
    terrainSlope,
    roadRoughness,
    tractionMultiplier,
  };
}

// ============================================
// REDUCER
// ============================================

interface ReducerState extends UnifiedAppState {
  rawData: ProcessedCandle[];
}

const initialReducerState: ReducerState = {
  ...INITIAL_APP_STATE,
  rawData: [],
};

function appReducer(state: ReducerState, action: AppAction): ReducerState {
  switch (action.type) {
    case 'LOAD_DATASET_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        datasetKey: action.payload.key,
      };

    case 'LOAD_DATASET_SUCCESS': {
      const data = action.payload.data;
      const market = deriveMarketState(data, 0);
      const terrain = calculateTerrainState(market, state.wealth.leverage);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        datasetKey: action.payload.key,
        datasetName: action.payload.name,
        rawData: data,
        timeline: {
          ...INITIAL_TIMELINE_STATE,
          totalBars: data.length,
          canGoForward: data.length > 1,
        },
        market,
        terrain,
        physics,
      };
    }

    case 'LOAD_DATASET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case 'SET_TIMELINE_INDEX': {
      const newIndex = Math.max(0, Math.min(action.payload, state.rawData.length - 1));
      const market = deriveMarketState(state.rawData, newIndex);
      const terrain = calculateTerrainState(market, state.wealth.leverage);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentIndex: newIndex,
          canGoBack: newIndex > 0,
          canGoForward: newIndex < state.rawData.length - 1,
        },
        market,
        terrain,
        physics,
      };
    }

    case 'SET_PLAYBACK_MODE':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          mode: action.payload,
          lastUpdateTime: action.payload === 'playing' ? Date.now() : state.timeline.lastUpdateTime,
        },
      };

    case 'SET_PLAYBACK_SPEED':
      return {
        ...state,
        timeline: {
          ...state.timeline,
          playbackSpeed: action.payload,
        },
      };

    case 'TICK': {
      if (state.timeline.mode !== 'playing') return state;

      const elapsed = state.timeline.elapsedTime + action.payload.deltaTime;
      const barsToAdvance = Math.floor(elapsed * state.timeline.playbackSpeed);

      if (barsToAdvance === 0) {
        return {
          ...state,
          timeline: {
            ...state.timeline,
            elapsedTime: elapsed,
          },
        };
      }

      const newIndex = Math.min(
        state.timeline.currentIndex + barsToAdvance,
        state.rawData.length - 1
      );
      const market = deriveMarketState(state.rawData, newIndex);
      const terrain = calculateTerrainState(market, state.wealth.leverage);
      const physics = calculatePhysicsModifiers(state.wealth, market);

      const shouldPause = newIndex >= state.rawData.length - 1;

      return {
        ...state,
        timeline: {
          ...state.timeline,
          currentIndex: newIndex,
          elapsedTime: elapsed - barsToAdvance / state.timeline.playbackSpeed,
          canGoBack: newIndex > 0,
          canGoForward: !shouldPause,
          mode: shouldPause ? 'paused' : state.timeline.mode,
        },
        market,
        terrain,
        physics,
      };
    }

    case 'UPDATE_WEALTH': {
      const newWealth = { ...state.wealth, ...action.payload };
      const physics = calculatePhysicsModifiers(newWealth, state.market);
      const terrain = calculateTerrainState(state.market, newWealth.leverage);

      return {
        ...state,
        wealth: newWealth,
        physics,
        terrain,
      };
    }

    case 'SET_LEVERAGE': {
      const leverage = Math.max(0.5, Math.min(3.0, action.payload));
      const newWealth = { ...state.wealth, leverage };
      const terrain = calculateTerrainState(state.market, leverage);
      const physics = calculatePhysicsModifiers(newWealth, state.market);

      return {
        ...state,
        wealth: newWealth,
        terrain,
        physics,
      };
    }

    case 'SET_CASH_BUFFER': {
      const cashBuffer = Math.max(0, Math.min(1, action.payload));
      const newWealth = { ...state.wealth, cashBuffer };
      const physics = calculatePhysicsModifiers(newWealth, state.market);

      return {
        ...state,
        wealth: newWealth,
        physics,
      };
    }

    case 'UPDATE_VEHICLE':
      return {
        ...state,
        vehicle: { ...state.vehicle, ...action.payload },
      };

    case 'UPDATE_POSITION':
      return {
        ...state,
        position: { ...state.position, ...action.payload },
      };

    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };

    case 'SET_GAME_STATE':
      return {
        ...state,
        gamePlayState: action.payload,
      };

    case 'RESET_GAME': {
      const market = deriveMarketState(state.rawData, 0);
      const terrain = calculateTerrainState(market, INITIAL_WEALTH_STATE.leverage);
      const physics = calculatePhysicsModifiers(INITIAL_WEALTH_STATE, market);

      return {
        ...state,
        timeline: {
          ...INITIAL_TIMELINE_STATE,
          totalBars: state.rawData.length,
          canGoForward: state.rawData.length > 1,
        },
        market,
        terrain,
        physics,
        wealth: INITIAL_WEALTH_STATE,
        vehicle: INITIAL_VEHICLE_STATE,
        position: INITIAL_POSITION_STATE,
        gamePlayState: 'playing',
      };
    }

    case 'RESET_ALL':
      return initialReducerState;

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface AppStateContextValue extends UnifiedAppState {
  // Playback controls
  playback: PlaybackControls;

  // Data loading
  loadDataset: (key: string) => Promise<void>;

  // Wealth controls
  setLeverage: (leverage: number) => void;
  setCashBuffer: (buffer: number) => void;
  updateWealth: (wealth: Partial<WealthState>) => void;

  // Vehicle updates
  updateVehicle: (vehicle: Partial<VehicleState>) => void;

  // Position updates
  updatePosition: (position: Partial<PositionState>) => void;

  // UI controls
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => ViewMode;
  setGameState: (state: GameState) => void;

  // Reset
  resetGame: () => void;
  resetAll: () => void;

  // Selectors
  getChartData: () => ChartCandle[];
  isPlaying: () => boolean;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

interface AppStateProviderProps {
  children: ReactNode;
  initialDataset?: string;
}

export function AppStateProvider({
  children,
  initialDataset = 'sp500',
}: AppStateProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialReducerState);
  const animationFrameRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());

  // Playback animation loop
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const deltaTime = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      if (state.timeline.mode === 'playing') {
        dispatch({ type: 'TICK', payload: { deltaTime } });
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [state.timeline.mode]);

  // Load dataset function
  const loadDataset = useCallback(async (key: string) => {
    dispatch({ type: 'LOAD_DATASET_START', payload: { key } });

    try {
      const path =
        key.includes('crash') || key.includes('covid')
          ? `/market/scenarios/${key}.json`
          : `/market/${key}.json`;

      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load dataset: ${key}`);
      }

      const rawData = await response.json();

      // Process raw data
      const data: ProcessedCandle[] = rawData.data.map(
        (candle: any, i: number, arr: any[]) => {
          const prevClose = i > 0 ? arr[i - 1].close : candle.open;
          const dailyReturn = ((candle.close - prevClose) / prevClose) * 100;
          const intradayVolatility =
            ((candle.high - candle.low) / candle.open) * 100;
          const trueRange = Math.max(
            candle.high - candle.low,
            i > 0 ? Math.abs(candle.high - prevClose) : 0,
            i > 0 ? Math.abs(candle.low - prevClose) : 0
          );

          return {
            ...candle,
            dailyReturn,
            intradayVolatility,
            trueRange,
            rollingVolatility: intradayVolatility,
            index: i,
          };
        }
      );

      // Calculate rolling volatility
      const windowSize = 20;
      for (let i = windowSize - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = i - windowSize + 1; j <= i; j++) {
          sum += Math.pow(data[j].dailyReturn, 2);
        }
        data[i].rollingVolatility = Math.sqrt(sum / windowSize);
      }

      dispatch({
        type: 'LOAD_DATASET_SUCCESS',
        payload: {
          key,
          name: rawData.name || key.toUpperCase(),
          data,
        },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_DATASET_ERROR',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  }, []);

  // Load initial dataset
  useEffect(() => {
    loadDataset(initialDataset);
  }, [initialDataset, loadDataset]);

  // Playback controls
  const playback: PlaybackControls = {
    play: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'playing' });
    }, []),

    pause: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
    }, []),

    stop: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: 0 });
    }, []),

    nextBar: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.timeline.currentIndex + 1 });
    }, [state.timeline.currentIndex]),

    prevBar: useCallback(() => {
      dispatch({ type: 'SET_PLAYBACK_MODE', payload: 'paused' });
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.timeline.currentIndex - 1 });
    }, [state.timeline.currentIndex]),

    goToBar: useCallback((index: number) => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: index });
    }, []),

    goToStart: useCallback(() => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: 0 });
    }, []),

    goToEnd: useCallback(() => {
      dispatch({ type: 'SET_TIMELINE_INDEX', payload: state.rawData.length - 1 });
    }, [state.rawData.length]),

    setSpeed: useCallback((speed: number) => {
      dispatch({ type: 'SET_PLAYBACK_SPEED', payload: speed });
    }, []),

    reset: useCallback(() => {
      dispatch({ type: 'RESET_GAME' });
    }, []),
  };

  // Other controls
  const setLeverage = useCallback((leverage: number) => {
    dispatch({ type: 'SET_LEVERAGE', payload: leverage });
  }, []);

  const setCashBuffer = useCallback((buffer: number) => {
    dispatch({ type: 'SET_CASH_BUFFER', payload: buffer });
  }, []);

  const updateWealth = useCallback((wealth: Partial<WealthState>) => {
    dispatch({ type: 'UPDATE_WEALTH', payload: wealth });
  }, []);

  const updateVehicle = useCallback((vehicle: Partial<VehicleState>) => {
    dispatch({ type: 'UPDATE_VEHICLE', payload: vehicle });
  }, []);

  const updatePosition = useCallback((position: Partial<PositionState>) => {
    dispatch({ type: 'UPDATE_POSITION', payload: position });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);

  const cycleViewMode = useCallback(() => {
    const modes: ViewMode[] = ['split', 'chart_focus', 'drive_focus', 'full_immersion'];
    const currentIdx = modes.indexOf(state.viewMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    dispatch({ type: 'SET_VIEW_MODE', payload: nextMode });
    return nextMode;
  }, [state.viewMode]);

  const setGameState = useCallback((gameState: GameState) => {
    dispatch({ type: 'SET_GAME_STATE', payload: gameState });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // Selectors
  const getChartData = useCallback(() => state.market.visibleCandles, [state.market.visibleCandles]);

  const isPlaying = useCallback(() => state.timeline.mode === 'playing', [state.timeline.mode]);

  const value: AppStateContextValue = {
    // State
    ...state,
    // Exclude rawData from context value
    // Controls
    playback,
    loadDataset,
    setLeverage,
    setCashBuffer,
    updateWealth,
    updateVehicle,
    updatePosition,
    setViewMode,
    cycleViewMode,
    setGameState,
    resetGame,
    resetAll,
    getChartData,
    isPlaying,
  };

  return (
    <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export default AppStateContext;
