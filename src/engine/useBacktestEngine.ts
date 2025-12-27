/**
 * useBacktestEngine - React hook for the backtest engine
 *
 * Provides reactive state management for the backtesting engine
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { BacktestEngine, type EngineConfig, type Order, type Fill, type OHLCV } from './BacktestEngine';
import type { PortfolioState, Position, ClosedPosition, BacktestTick } from '../types';

export interface UseBacktestEngineReturn {
  // State
  currentTick: number;
  totalTicks: number;
  portfolio: PortfolioState;
  positions: Position[];
  closedPositions: ClosedPosition[];
  tickHistory: BacktestTick[];
  pendingOrders: Order[];
  currentBar: OHLCV | null;
  isRunning: boolean;
  isAtEnd: boolean;

  // Actions
  loadData: (data: OHLCV[]) => void;
  reset: () => void;
  tick: () => BacktestTick | null;
  runTicks: (count: number) => BacktestTick[];
  runToEnd: () => BacktestTick[];
  buyMarket: (size: number, leverage?: number) => Order | null;
  sellMarket: (size: number, leverage?: number) => Order | null;
  buyLimit: (size: number, price: number, leverage?: number) => Order | null;
  sellLimit: (size: number, price: number, leverage?: number) => Order | null;
  closePosition: (positionId: string) => Order | null;
  closeAllPositions: () => void;
  cancelOrder: (orderId: string) => boolean;

  // Getters
  getStatistics: () => ReturnType<BacktestEngine['getStatistics']>;
}

export function useBacktestEngine(config?: Partial<EngineConfig>): UseBacktestEngineReturn {
  const engineRef = useRef<BacktestEngine | null>(null);

  // Initialize engine
  if (!engineRef.current) {
    engineRef.current = new BacktestEngine(config);
  }

  // State
  const [currentTick, setCurrentTick] = useState(0);
  const [totalTicks, setTotalTicks] = useState(0);
  const [portfolio, setPortfolio] = useState<PortfolioState>(engineRef.current.getPortfolio());
  const [positions, setPositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [tickHistory, setTickHistory] = useState<BacktestTick[]>([]);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [currentBar, setCurrentBar] = useState<OHLCV | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAtEnd, setIsAtEnd] = useState(false);

  // Sync state from engine
  const syncState = useCallback(() => {
    const engine = engineRef.current!;
    setCurrentTick(engine.getCurrentTick());
    setTotalTicks(engine.getTotalTicks());
    setPortfolio(engine.getPortfolio());
    setPositions(engine.getPositions());
    setClosedPositions(engine.getClosedPositions());
    setTickHistory(engine.getTickHistory());
    setPendingOrders(engine.getPendingOrders());
    setCurrentBar(engine.getCurrentBar());
    setIsAtEnd(engine.isAtEnd());
  }, []);

  // Set up event handlers
  useEffect(() => {
    const engine = engineRef.current!;
    engine.setEvents({
      onTick: () => syncState(),
      onOrderFilled: () => syncState(),
      onPositionOpened: () => syncState(),
      onPositionClosed: () => syncState(),
      onMarginCall: () => syncState(),
    });
  }, [syncState]);

  // Actions
  const loadData = useCallback((data: OHLCV[]) => {
    engineRef.current!.loadData(data);
    syncState();
  }, [syncState]);

  const reset = useCallback(() => {
    engineRef.current!.reset();
    syncState();
  }, [syncState]);

  const tick = useCallback(() => {
    const result = engineRef.current!.tick();
    syncState();
    return result;
  }, [syncState]);

  const runTicks = useCallback((count: number) => {
    setIsRunning(true);
    const result = engineRef.current!.runTicks(count);
    syncState();
    setIsRunning(false);
    return result;
  }, [syncState]);

  const runToEnd = useCallback(() => {
    setIsRunning(true);
    const result = engineRef.current!.runToEnd();
    syncState();
    setIsRunning(false);
    return result;
  }, [syncState]);

  const buyMarket = useCallback((size: number, leverage: number = 1) => {
    const order = engineRef.current!.submitMarketOrder('buy', size, leverage);
    syncState();
    return order;
  }, [syncState]);

  const sellMarket = useCallback((size: number, leverage: number = 1) => {
    const order = engineRef.current!.submitMarketOrder('sell', size, leverage);
    syncState();
    return order;
  }, [syncState]);

  const buyLimit = useCallback((size: number, price: number, leverage: number = 1) => {
    const order = engineRef.current!.submitLimitOrder('buy', size, price, leverage);
    syncState();
    return order;
  }, [syncState]);

  const sellLimit = useCallback((size: number, price: number, leverage: number = 1) => {
    const order = engineRef.current!.submitLimitOrder('sell', size, price, leverage);
    syncState();
    return order;
  }, [syncState]);

  const closePositionAction = useCallback((positionId: string) => {
    const order = engineRef.current!.closePosition(positionId);
    syncState();
    return order;
  }, [syncState]);

  const closeAllPositionsAction = useCallback(() => {
    engineRef.current!.closeAllPositions();
    syncState();
  }, [syncState]);

  const cancelOrder = useCallback((orderId: string) => {
    const result = engineRef.current!.cancelOrder(orderId);
    syncState();
    return result;
  }, [syncState]);

  const getStatistics = useCallback(() => {
    return engineRef.current!.getStatistics();
  }, []);

  return {
    // State
    currentTick,
    totalTicks,
    portfolio,
    positions,
    closedPositions,
    tickHistory,
    pendingOrders,
    currentBar,
    isRunning,
    isAtEnd,

    // Actions
    loadData,
    reset,
    tick,
    runTicks,
    runToEnd,
    buyMarket,
    sellMarket,
    buyLimit,
    sellLimit,
    closePosition: closePositionAction,
    closeAllPositions: closeAllPositionsAction,
    cancelOrder,

    // Getters
    getStatistics,
  };
}

export default useBacktestEngine;
