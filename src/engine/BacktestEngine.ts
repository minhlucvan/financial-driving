/**
 * BacktestEngine - A tick-by-tick backtesting engine
 *
 * Simulates a trading environment with:
 * - Order submission and execution
 * - Position tracking
 * - Portfolio management
 * - P&L calculation
 *
 * Inspired by event-driven backtesting frameworks like Backtrader and Zipline
 */

import type {
  Position,
  ClosedPosition,
  PortfolioState,
  PositionDirection,
  BacktestTick,
} from '../types';

// ============================================
// ORDER TYPES
// ============================================

export type OrderType = 'market' | 'limit' | 'stop';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled' | 'rejected';

export interface Order {
  id: string;
  side: OrderSide;
  type: OrderType;
  size: number;            // Fraction of available capital (0-1)
  price?: number;          // For limit/stop orders
  leverage: number;
  status: OrderStatus;
  createdAt: number;       // Tick index when created
  filledAt?: number;       // Tick index when filled
  filledPrice?: number;
  rejectionReason?: string;
}

export interface Fill {
  orderId: string;
  positionId: string;
  side: OrderSide;
  size: number;
  price: number;
  tick: number;
  timestamp: string;
}

// ============================================
// ENGINE EVENTS
// ============================================

export interface EngineEvents {
  onTick?: (tick: BacktestTick) => void;
  onOrderFilled?: (fill: Fill) => void;
  onPositionOpened?: (position: Position) => void;
  onPositionClosed?: (closed: ClosedPosition) => void;
  onMarginCall?: (portfolio: PortfolioState) => void;
  onError?: (error: string) => void;
}

// ============================================
// MARKET DATA
// ============================================

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ============================================
// ENGINE CONFIGURATION
// ============================================

export interface EngineConfig {
  initialCapital: number;
  maxLeverage: number;
  marginCallLevel: number;    // % of equity that triggers margin call
  slippage: number;           // % slippage on market orders
  commission: number;         // $ per trade
}

const DEFAULT_CONFIG: EngineConfig = {
  initialCapital: 10000,
  maxLeverage: 3,
  marginCallLevel: 0.2,
  slippage: 0.001,  // 0.1%
  commission: 0,
};

// ============================================
// BACKTEST ENGINE CLASS
// ============================================

export class BacktestEngine {
  private config: EngineConfig;
  private data: OHLCV[] = [];
  private currentTick: number = 0;
  private portfolio: PortfolioState;
  private pendingOrders: Order[] = [];
  private orderHistory: Order[] = [];
  private fillHistory: Fill[] = [];
  private tickHistory: BacktestTick[] = [];
  private events: EngineEvents = {};
  private isRunning: boolean = false;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.portfolio = this.createInitialPortfolio();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private createInitialPortfolio(): PortfolioState {
    return {
      initialCapital: this.config.initialCapital,
      cash: this.config.initialCapital,
      equity: this.config.initialCapital,
      positions: [],
      closedPositions: [],
      totalExposure: 0,
      totalUnrealizedPnL: 0,
      totalRealizedPnL: 0,
      accumulatedReturn: 0,
      accumulatedReturnDollar: 0,
      drawdown: 0,
      maxDrawdown: 0,
      peakEquity: this.config.initialCapital,
      marginUsage: 0,
      stressLevel: 0,
    };
  }

  /**
   * Load market data for backtesting
   */
  loadData(data: OHLCV[]): void {
    this.data = data;
    this.reset();
  }

  /**
   * Reset the engine to initial state
   */
  reset(): void {
    this.currentTick = 0;
    this.portfolio = this.createInitialPortfolio();
    this.pendingOrders = [];
    this.orderHistory = [];
    this.fillHistory = [];
    this.tickHistory = [];
    this.isRunning = false;
  }

  /**
   * Set event handlers
   */
  setEvents(events: EngineEvents): void {
    this.events = events;
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  private generateOrderId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePositionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Submit a market order (executed immediately at next tick)
   */
  submitMarketOrder(side: OrderSide, size: number, leverage: number = 1): Order | null {
    if (size <= 0 || size > 1) {
      this.events.onError?.('Invalid order size. Must be between 0 and 1.');
      return null;
    }

    if (leverage > this.config.maxLeverage) {
      this.events.onError?.(`Leverage exceeds maximum (${this.config.maxLeverage}x)`);
      return null;
    }

    const order: Order = {
      id: this.generateOrderId(),
      side,
      type: 'market',
      size,
      leverage,
      status: 'pending',
      createdAt: this.currentTick,
    };

    this.pendingOrders.push(order);
    return order;
  }

  /**
   * Submit a limit order
   */
  submitLimitOrder(side: OrderSide, size: number, price: number, leverage: number = 1): Order | null {
    if (size <= 0 || size > 1) {
      this.events.onError?.('Invalid order size');
      return null;
    }

    const order: Order = {
      id: this.generateOrderId(),
      side,
      type: 'limit',
      size,
      price,
      leverage,
      status: 'pending',
      createdAt: this.currentTick,
    };

    this.pendingOrders.push(order);
    return order;
  }

  /**
   * Cancel a pending order
   */
  cancelOrder(orderId: string): boolean {
    const orderIndex = this.pendingOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return false;

    this.pendingOrders[orderIndex].status = 'cancelled';
    this.orderHistory.push(this.pendingOrders[orderIndex]);
    this.pendingOrders.splice(orderIndex, 1);
    return true;
  }

  /**
   * Close a specific position
   */
  closePosition(positionId: string): Order | null {
    const position = this.portfolio.positions.find(p => p.id === positionId);
    if (!position) {
      this.events.onError?.('Position not found');
      return null;
    }

    // Create a closing order (opposite side)
    const closingSide: OrderSide = position.direction === 'long' ? 'sell' : 'buy';
    return this.submitMarketOrder(closingSide, position.size, 1);
  }

  /**
   * Close all positions
   */
  closeAllPositions(): void {
    for (const position of this.portfolio.positions) {
      this.closePosition(position.id);
    }
  }

  // ============================================
  // TICK PROCESSING
  // ============================================

  /**
   * Advance the simulation by one tick
   * This is the core of the backtesting engine
   */
  tick(): BacktestTick | null {
    if (this.currentTick >= this.data.length) {
      return null;
    }

    const bar = this.data[this.currentTick];
    const price = bar.close;

    // 1. Process pending orders
    this.processOrders(bar);

    // 2. Update all positions with current price
    this.updatePositions(price);

    // 3. Check for margin call
    this.checkMarginCall();

    // 4. Create tick record
    const tick = this.createTick(bar);
    this.tickHistory.push(tick);

    // 5. Emit tick event
    this.events.onTick?.(tick);

    // 6. Advance tick counter
    this.currentTick++;

    return tick;
  }

  /**
   * Run multiple ticks
   */
  runTicks(count: number): BacktestTick[] {
    const ticks: BacktestTick[] = [];
    for (let i = 0; i < count; i++) {
      const tick = this.tick();
      if (!tick) break;
      ticks.push(tick);
    }
    return ticks;
  }

  /**
   * Run until end of data
   */
  runToEnd(): BacktestTick[] {
    return this.runTicks(this.data.length - this.currentTick);
  }

  // ============================================
  // INTERNAL PROCESSING
  // ============================================

  private processOrders(bar: OHLCV): void {
    const ordersToProcess = [...this.pendingOrders];
    this.pendingOrders = [];

    for (const order of ordersToProcess) {
      const filled = this.tryFillOrder(order, bar);
      if (!filled) {
        // Keep limit orders that weren't filled
        if (order.type === 'limit') {
          this.pendingOrders.push(order);
        } else {
          order.status = 'rejected';
          order.rejectionReason = 'Could not fill market order';
          this.orderHistory.push(order);
        }
      }
    }
  }

  private tryFillOrder(order: Order, bar: OHLCV): boolean {
    let fillPrice: number;

    switch (order.type) {
      case 'market':
        // Fill at open with slippage
        const slippage = order.side === 'buy' ? 1 + this.config.slippage : 1 - this.config.slippage;
        fillPrice = bar.open * slippage;
        break;

      case 'limit':
        // Check if limit price was touched
        if (order.side === 'buy' && bar.low <= order.price!) {
          fillPrice = order.price!;
        } else if (order.side === 'sell' && bar.high >= order.price!) {
          fillPrice = order.price!;
        } else {
          return false; // Limit not reached
        }
        break;

      default:
        return false;
    }

    // Execute the fill
    this.executeFill(order, fillPrice, bar.date);
    return true;
  }

  private executeFill(order: Order, price: number, timestamp: string): void {
    order.status = 'filled';
    order.filledAt = this.currentTick;
    order.filledPrice = price;
    this.orderHistory.push(order);

    // Determine if opening or closing a position
    const existingPosition = this.portfolio.positions.find(p => {
      if (order.side === 'buy') return p.direction === 'short';
      return p.direction === 'long';
    });

    if (existingPosition && existingPosition.size >= order.size) {
      // Closing a position
      this.closePositionInternal(existingPosition, price, order);
    } else {
      // Opening a new position
      this.openPositionInternal(order, price, timestamp);
    }
  }

  private openPositionInternal(order: Order, price: number, timestamp: string): void {
    const direction: PositionDirection = order.side === 'buy' ? 'long' : 'short';
    const positionValue = this.portfolio.cash * order.size;

    const newPosition: Position = {
      id: this.generatePositionId(),
      direction,
      entryPrice: price,
      entryIndex: this.currentTick,
      entryTime: timestamp,
      size: order.size,
      currentPrice: price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      leverage: order.leverage,
    };

    this.portfolio.positions.push(newPosition);
    this.portfolio.cash -= positionValue;
    this.portfolio.totalExposure += order.size;

    // Create fill record
    const fill: Fill = {
      orderId: order.id,
      positionId: newPosition.id,
      side: order.side,
      size: order.size,
      price,
      tick: this.currentTick,
      timestamp,
    };
    this.fillHistory.push(fill);

    this.events.onOrderFilled?.(fill);
    this.events.onPositionOpened?.(newPosition);
  }

  private closePositionInternal(position: Position, price: number, order: Order): void {
    // Calculate P&L
    const priceDiff = price - position.entryPrice;
    const pnlMultiplier = position.direction === 'long' ? 1 : -1;
    const pnlPercent = (priceDiff / position.entryPrice) * 100 * pnlMultiplier * position.leverage;
    const positionValue = position.size * position.entryPrice;
    const realizedPnL = positionValue * (pnlPercent / 100) - this.config.commission;

    // Create closed position record
    const closedPosition: ClosedPosition = {
      id: position.id,
      direction: position.direction,
      entryPrice: position.entryPrice,
      entryIndex: position.entryIndex,
      exitPrice: price,
      exitIndex: this.currentTick,
      size: position.size,
      realizedPnL,
      realizedPnLPercent: pnlPercent,
      holdingPeriod: this.currentTick - position.entryIndex,
    };

    // Update portfolio
    this.portfolio.positions = this.portfolio.positions.filter(p => p.id !== position.id);
    this.portfolio.closedPositions.push(closedPosition);
    this.portfolio.cash += positionValue + realizedPnL;
    this.portfolio.totalExposure -= position.size;
    this.portfolio.totalRealizedPnL += realizedPnL;

    this.events.onPositionClosed?.(closedPosition);
  }

  private updatePositions(currentPrice: number): void {
    let totalUnrealizedPnL = 0;

    for (const position of this.portfolio.positions) {
      const priceDiff = currentPrice - position.entryPrice;
      const pnlMultiplier = position.direction === 'long' ? 1 : -1;
      const pnlPercent = (priceDiff / position.entryPrice) * 100 * pnlMultiplier * position.leverage;
      const positionValue = position.size * position.entryPrice;
      const unrealizedPnL = positionValue * (pnlPercent / 100);

      position.currentPrice = currentPrice;
      position.unrealizedPnL = unrealizedPnL;
      position.unrealizedPnLPercent = pnlPercent;

      totalUnrealizedPnL += unrealizedPnL;
    }

    // Update portfolio metrics
    this.portfolio.totalUnrealizedPnL = totalUnrealizedPnL;
    this.portfolio.equity = this.portfolio.cash + totalUnrealizedPnL;

    // Calculate accumulated return
    const totalReturn = this.portfolio.equity - this.portfolio.initialCapital + this.portfolio.totalRealizedPnL;
    this.portfolio.accumulatedReturnDollar = totalReturn;
    this.portfolio.accumulatedReturn = (totalReturn / this.portfolio.initialCapital) * 100;

    // Update peak and drawdown
    if (this.portfolio.equity > this.portfolio.peakEquity) {
      this.portfolio.peakEquity = this.portfolio.equity;
    }
    this.portfolio.drawdown = (this.portfolio.peakEquity - this.portfolio.equity) / this.portfolio.peakEquity;
    this.portfolio.maxDrawdown = Math.max(this.portfolio.maxDrawdown, this.portfolio.drawdown);

    // Calculate stress level
    this.portfolio.stressLevel = Math.min(1, (this.portfolio.totalExposure * 0.3) + (this.portfolio.drawdown * 2));
    this.portfolio.marginUsage = this.portfolio.totalExposure / this.config.maxLeverage;
  }

  private checkMarginCall(): void {
    const equityRatio = this.portfolio.equity / this.portfolio.initialCapital;
    if (equityRatio < this.config.marginCallLevel && this.portfolio.positions.length > 0) {
      this.events.onMarginCall?.(this.portfolio);
      // Auto-close all positions on margin call
      this.closeAllPositions();
    }
  }

  private createTick(bar: OHLCV): BacktestTick {
    const RETURN_TO_HEIGHT_SCALE = 10;
    return {
      index: this.currentTick,
      timestamp: bar.date,
      price: bar.close,
      portfolioValue: this.portfolio.equity,
      accumulatedReturn: this.portfolio.accumulatedReturn,
      roadHeight: this.portfolio.accumulatedReturn * RETURN_TO_HEIGHT_SCALE,
    };
  }

  // ============================================
  // GETTERS
  // ============================================

  getCurrentTick(): number {
    return this.currentTick;
  }

  getTotalTicks(): number {
    return this.data.length;
  }

  getPortfolio(): PortfolioState {
    return { ...this.portfolio };
  }

  getPositions(): Position[] {
    return [...this.portfolio.positions];
  }

  getClosedPositions(): ClosedPosition[] {
    return [...this.portfolio.closedPositions];
  }

  getTickHistory(): BacktestTick[] {
    return [...this.tickHistory];
  }

  getPendingOrders(): Order[] {
    return [...this.pendingOrders];
  }

  getOrderHistory(): Order[] {
    return [...this.orderHistory];
  }

  getCurrentBar(): OHLCV | null {
    if (this.currentTick >= this.data.length) return null;
    return this.data[this.currentTick];
  }

  getPreviousBar(): OHLCV | null {
    if (this.currentTick <= 0) return null;
    return this.data[this.currentTick - 1];
  }

  isAtEnd(): boolean {
    return this.currentTick >= this.data.length;
  }

  // ============================================
  // STATISTICS
  // ============================================

  getStatistics() {
    const closedPositions = this.portfolio.closedPositions;
    const winners = closedPositions.filter(p => p.realizedPnL > 0);
    const losers = closedPositions.filter(p => p.realizedPnL < 0);

    const totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
    const grossProfit = winners.reduce((sum, p) => sum + p.realizedPnL, 0);
    const grossLoss = Math.abs(losers.reduce((sum, p) => sum + p.realizedPnL, 0));

    return {
      totalTrades: closedPositions.length,
      winningTrades: winners.length,
      losingTrades: losers.length,
      winRate: closedPositions.length > 0 ? winners.length / closedPositions.length : 0,
      totalPnL,
      totalPnLPercent: (totalPnL / this.portfolio.initialCapital) * 100,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      maxDrawdown: this.portfolio.maxDrawdown * 100,
      finalEquity: this.portfolio.equity,
      totalReturn: this.portfolio.accumulatedReturn,
    };
  }
}

export default BacktestEngine;
