import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import {
  GameState,
  ViewMode,
  WealthState,
  VehicleState,
  PositionState,
  GameSettings,
  ChartCandle,
  MarketIndicators,
  MarketRegime,
} from '../types';

// Game Context State
interface GameContextState {
  gameState: GameState;
  viewMode: ViewMode;
  wealth: WealthState;
  vehicle: VehicleState;
  position: PositionState;
  settings: GameSettings;
  chartData: ChartCandle[];
  currentCandleIndex: number;
  indicators: MarketIndicators;
}

// Action Types
type GameAction =
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'UPDATE_WEALTH'; payload: Partial<WealthState> }
  | { type: 'UPDATE_VEHICLE'; payload: Partial<VehicleState> }
  | { type: 'UPDATE_POSITION'; payload: Partial<PositionState> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<GameSettings> }
  | { type: 'SET_CHART_DATA'; payload: ChartCandle[] }
  | { type: 'SET_CURRENT_CANDLE_INDEX'; payload: number }
  | { type: 'UPDATE_INDICATORS'; payload: Partial<MarketIndicators> }
  | { type: 'RESET_GAME' };

// Initial State
const initialState: GameContextState = {
  gameState: 'menu',
  viewMode: 'split',
  wealth: {
    currentWealth: 10000,
    startingWealth: 10000,
    targetWealth: 1000000,
    leverage: 1.0,
    cashBuffer: 0.2,
    stressLevel: 0,
    drawdown: 0,
    allTimeHigh: 10000,
    isInRecovery: false,
  },
  vehicle: {
    velocityX: 0,
    velocityY: 0,
    angularVelocity: 0,
    isOnGround: false,
    isFlipped: false,
  },
  position: {
    isOpen: false,
    entryPrice: 0,
    currentPrice: 0,
    unrealizedPnL: 0,
    realizedPnL: 0,
    size: 0,
  },
  settings: {
    selectedVehicle: 'car2',
    selectedDataset: 'sp500',
    viewMode: 'split',
    showFogOfWar: true,
    soundEnabled: false,
  },
  chartData: [],
  currentCandleIndex: 0,
  indicators: {
    rsi: 50,
    atr: 0,
    volatility: 0,
    trend: 0,
    drawdown: 0,
    regime: 'CHOP' as MarketRegime,
  },
};

// Reducer
function gameReducer(state: GameContextState, action: GameAction): GameContextState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'UPDATE_WEALTH':
      return { ...state, wealth: { ...state.wealth, ...action.payload } };
    case 'UPDATE_VEHICLE':
      return { ...state, vehicle: { ...state.vehicle, ...action.payload } };
    case 'UPDATE_POSITION':
      return { ...state, position: { ...state.position, ...action.payload } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_CHART_DATA':
      return { ...state, chartData: action.payload };
    case 'SET_CURRENT_CANDLE_INDEX':
      return { ...state, currentCandleIndex: action.payload };
    case 'UPDATE_INDICATORS':
      return { ...state, indicators: { ...state.indicators, ...action.payload } };
    case 'RESET_GAME':
      return {
        ...initialState,
        settings: state.settings,
        chartData: state.chartData,
      };
    default:
      return state;
  }
}

// Context
interface GameContextValue extends GameContextState {
  dispatch: React.Dispatch<GameAction>;
  setGameState: (state: GameState) => void;
  setViewMode: (mode: ViewMode) => void;
  updateWealth: (wealth: Partial<WealthState>) => void;
  updateVehicle: (vehicle: Partial<VehicleState>) => void;
  updatePosition: (position: Partial<PositionState>) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setChartData: (data: ChartCandle[]) => void;
  setCurrentCandleIndex: (index: number) => void;
  updateIndicators: (indicators: Partial<MarketIndicators>) => void;
  resetGame: () => void;
  cycleViewMode: () => ViewMode;
}

const GameContext = createContext<GameContextValue | null>(null);

// Provider Component
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setGameState = useCallback((gameState: GameState) => {
    dispatch({ type: 'SET_GAME_STATE', payload: gameState });
  }, []);

  const setViewMode = useCallback((viewMode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: viewMode });
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

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const setChartData = useCallback((data: ChartCandle[]) => {
    dispatch({ type: 'SET_CHART_DATA', payload: data });
  }, []);

  const setCurrentCandleIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_CURRENT_CANDLE_INDEX', payload: index });
  }, []);

  const updateIndicators = useCallback((indicators: Partial<MarketIndicators>) => {
    dispatch({ type: 'UPDATE_INDICATORS', payload: indicators });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET_GAME' });
  }, []);

  const cycleViewMode = useCallback(() => {
    const modes: ViewMode[] = ['split', 'chart_focus', 'drive_focus', 'full_immersion'];
    const currentIndex = modes.indexOf(state.viewMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    dispatch({ type: 'SET_VIEW_MODE', payload: nextMode });
    return nextMode;
  }, [state.viewMode]);

  const value: GameContextValue = {
    ...state,
    dispatch,
    setGameState,
    setViewMode,
    updateWealth,
    updateVehicle,
    updatePosition,
    updateSettings,
    setChartData,
    setCurrentCandleIndex,
    updateIndicators,
    resetGame,
    cycleViewMode,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

// Hook
export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

export default GameContext;
