/**
 * Phaser-based Candlestick Chart Renderer
 *
 * Renders OHLCV candlestick charts as a game overlay using Phaser Graphics.
 * Standard candlestick visualization with volume bars.
 */

import type { ChartCandle, MarketRegime, MarketIndicators, PortfolioState, Position } from '../../types';
import { REGIME_COLORS, UI_COLORS } from './styles';

// Chart configuration
export interface ChartConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  candleCount: number;  // Number of candles to display
  showVolume: boolean;
  showMA: boolean;
  opacity: number;
}

export const DEFAULT_CHART_CONFIG: ChartConfig = {
  x: 0,
  y: 0,
  width: 400,
  height: 200,
  candleCount: 60,
  showVolume: true,
  showMA: false,
  opacity: 0.85,
};

// Colors
const CANDLE_COLORS = {
  bullish: 0x26a69a,  // Green
  bearish: 0xef5350,  // Red
  bullishWick: 0x26a69a,
  bearishWick: 0xef5350,
  volume_bull: 0x26a69a,
  volume_bear: 0xef5350,
  background: 0x1a1a2e,
  grid: 0x333333,
  axis: 0x666666,
  currentLine: 0xffd700,  // Gold for current price line
};

/**
 * Draw a candlestick chart overlay
 */
export function drawCandlestickChart(
  graphics: Phaser.GameObjects.Graphics,
  candles: ChartCandle[],
  currentIndex: number,
  config: Partial<ChartConfig> = {}
): void {
  const cfg = { ...DEFAULT_CHART_CONFIG, ...config };

  if (!candles || candles.length === 0) return;

  // Calculate visible range
  const startIdx = Math.max(0, currentIndex - cfg.candleCount + 1);
  const endIdx = currentIndex + 1;
  const visibleCandles = candles.slice(startIdx, endIdx);

  if (visibleCandles.length === 0) return;

  // Calculate price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVolume = 0;

  for (const candle of visibleCandles) {
    minPrice = Math.min(minPrice, candle.low);
    maxPrice = Math.max(maxPrice, candle.high);
    maxVolume = Math.max(maxVolume, candle.volume);
  }

  // Add padding to price range
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1;
  minPrice -= pricePadding;
  maxPrice += pricePadding;

  // Layout calculations
  const chartPadding = 10;
  const volumeHeight = cfg.showVolume ? cfg.height * 0.2 : 0;
  const priceHeight = cfg.height - volumeHeight - chartPadding * 2;
  const chartWidth = cfg.width - chartPadding * 2;

  const candleWidth = Math.max(2, chartWidth / cfg.candleCount * 0.8);
  const candleGap = chartWidth / cfg.candleCount;

  // Draw background
  graphics.fillStyle(CANDLE_COLORS.background, cfg.opacity);
  graphics.fillRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 8);

  // Draw border
  graphics.lineStyle(1, UI_COLORS.border, 0.5);
  graphics.strokeRoundedRect(cfg.x, cfg.y, cfg.width, cfg.height, 8);

  // Helper functions
  const priceToY = (price: number): number => {
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    return cfg.y + chartPadding + priceHeight * (1 - ratio);
  };

  const volumeToY = (volume: number): number => {
    if (maxVolume === 0) return cfg.y + cfg.height - chartPadding;
    const ratio = volume / maxVolume;
    return cfg.y + cfg.height - chartPadding - volumeHeight * ratio;
  };

  // Draw grid lines
  graphics.lineStyle(1, CANDLE_COLORS.grid, 0.3);
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = cfg.y + chartPadding + (priceHeight * i) / gridLines;
    graphics.beginPath();
    graphics.moveTo(cfg.x + chartPadding, y);
    graphics.lineTo(cfg.x + cfg.width - chartPadding, y);
    graphics.strokePath();
  }

  // Draw candles
  visibleCandles.forEach((candle, i) => {
    const x = cfg.x + chartPadding + i * candleGap + candleGap / 2;
    const isBullish = candle.close >= candle.open;
    const color = isBullish ? CANDLE_COLORS.bullish : CANDLE_COLORS.bearish;

    // Determine if this is the current candle
    const isCurrentCandle = startIdx + i === currentIndex;

    // Draw wick
    const wickX = x;
    const wickTop = priceToY(candle.high);
    const wickBottom = priceToY(candle.low);

    graphics.lineStyle(1, color, isCurrentCandle ? 1 : 0.8);
    graphics.beginPath();
    graphics.moveTo(wickX, wickTop);
    graphics.lineTo(wickX, wickBottom);
    graphics.strokePath();

    // Draw body
    const bodyTop = priceToY(Math.max(candle.open, candle.close));
    const bodyBottom = priceToY(Math.min(candle.open, candle.close));
    const bodyHeight = Math.max(1, bodyBottom - bodyTop);

    graphics.fillStyle(color, isCurrentCandle ? 1 : 0.9);
    graphics.fillRect(
      x - candleWidth / 2,
      bodyTop,
      candleWidth,
      bodyHeight
    );

    // Highlight current candle
    if (isCurrentCandle) {
      graphics.lineStyle(2, CANDLE_COLORS.currentLine, 0.8);
      graphics.strokeRect(
        x - candleWidth / 2 - 1,
        bodyTop - 1,
        candleWidth + 2,
        bodyHeight + 2
      );
    }

    // Draw volume bar
    if (cfg.showVolume && maxVolume > 0) {
      const volY = volumeToY(candle.volume);
      const volHeight = cfg.y + cfg.height - chartPadding - volY;

      graphics.fillStyle(color, isCurrentCandle ? 0.6 : 0.4);
      graphics.fillRect(
        x - candleWidth / 2,
        volY,
        candleWidth,
        volHeight
      );
    }
  });

  // Draw current price line
  if (visibleCandles.length > 0) {
    const currentCandle = visibleCandles[visibleCandles.length - 1];
    const currentPriceY = priceToY(currentCandle.close);

    graphics.lineStyle(1, CANDLE_COLORS.currentLine, 0.8);
    graphics.beginPath();
    graphics.moveTo(cfg.x + chartPadding, currentPriceY);
    graphics.lineTo(cfg.x + cfg.width - chartPadding, currentPriceY);
    graphics.strokePath();
  }
}

/**
 * Draw market info HUD panel
 */
export function drawMarketInfoPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  data: {
    regime: MarketRegime;
    currentReturn: number;
    price: number;
    barIndex: number;
    totalBars: number;
    date?: string;
    indicators: MarketIndicators;
  }
): void {
  const panelWidth = 160;
  const panelHeight = 100;

  // Background
  graphics.fillStyle(UI_COLORS.panel, 0.85);
  graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 6);
  graphics.lineStyle(1, UI_COLORS.border, 0.5);
  graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 6);

  // Regime indicator
  const regimeColor = REGIME_COLORS[data.regime].primary;
  graphics.fillStyle(regimeColor, 1);
  graphics.fillCircle(x + 15, y + 15, 8);

  // Return indicator bar
  const returnBarWidth = 100;
  const returnBarHeight = 8;
  const returnBarX = x + 30;
  const returnBarY = y + 11;

  // Background bar
  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(returnBarX, returnBarY, returnBarWidth, returnBarHeight);

  // Return bar (centered at 50%)
  const returnNormalized = Math.max(-100, Math.min(100, data.currentReturn));
  const returnColor = returnNormalized >= 0 ? UI_COLORS.positive : UI_COLORS.negative;
  const barCenter = returnBarX + returnBarWidth / 2;
  const barWidth = Math.abs(returnNormalized) / 100 * (returnBarWidth / 2);

  graphics.fillStyle(returnColor, 0.9);
  if (returnNormalized >= 0) {
    graphics.fillRect(barCenter, returnBarY, barWidth, returnBarHeight);
  } else {
    graphics.fillRect(barCenter - barWidth, returnBarY, barWidth, returnBarHeight);
  }

  // Center line
  graphics.lineStyle(1, UI_COLORS.text, 0.5);
  graphics.beginPath();
  graphics.moveTo(barCenter, returnBarY);
  graphics.lineTo(barCenter, returnBarY + returnBarHeight);
  graphics.strokePath();

  // RSI indicator
  const rsiBarY = y + 35;
  const rsiNormalized = data.indicators.rsi / 100;
  const rsiColor = data.indicators.rsi > 70 ? UI_COLORS.negative :
                   data.indicators.rsi < 30 ? UI_COLORS.positive : UI_COLORS.textSecondary;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, rsiBarY, 140, 6);
  graphics.fillStyle(rsiColor, 0.8);
  graphics.fillRect(x + 10, rsiBarY, 140 * rsiNormalized, 6);

  // Volatility indicator
  const volBarY = y + 50;
  const volNormalized = Math.min(1, data.indicators.volatility / 5);
  const volColor = volNormalized > 0.6 ? UI_COLORS.negative :
                   volNormalized > 0.3 ? UI_COLORS.warning : UI_COLORS.positive;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, volBarY, 140, 6);
  graphics.fillStyle(volColor, 0.8);
  graphics.fillRect(x + 10, volBarY, 140 * volNormalized, 6);

  // Drawdown indicator
  const ddBarY = y + 65;
  const ddNormalized = Math.min(1, data.indicators.drawdown / 50);
  const ddColor = ddNormalized > 0.4 ? UI_COLORS.negative :
                  ddNormalized > 0.2 ? UI_COLORS.warning : UI_COLORS.positive;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, ddBarY, 140, 6);
  graphics.fillStyle(ddColor, 0.8);
  graphics.fillRect(x + 10, ddBarY, 140 * ddNormalized, 6);

  // Progress bar at bottom
  const progressBarY = y + panelHeight - 15;
  const progress = data.barIndex / Math.max(1, data.totalBars - 1);

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, progressBarY, 140, 6);
  graphics.fillStyle(UI_COLORS.positive, 0.7);
  graphics.fillRect(x + 10, progressBarY, 140 * progress, 6);
}

/**
 * Draw portfolio HUD panel
 */
export function drawPortfolioPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  data: {
    equity: number;
    cash: number;
    pnlPercent: number;
    drawdown: number;
    leverage: number;
    cashBuffer: number;
    positions: Position[];
  }
): void {
  const panelWidth = 180;
  const positionsHeight = Math.min(3, data.positions.length) * 20;
  const panelHeight = 90 + positionsHeight;

  // Background
  graphics.fillStyle(UI_COLORS.panel, 0.85);
  graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 6);
  graphics.lineStyle(1, UI_COLORS.border, 0.5);
  graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 6);

  // P&L indicator (large circle)
  const pnlColor = data.pnlPercent >= 0 ? UI_COLORS.positive : UI_COLORS.negative;
  graphics.fillStyle(pnlColor, 0.9);
  graphics.fillCircle(x + 25, y + 30, 18);

  // Equity bar
  const equityBarX = x + 50;
  const equityBarY = y + 15;
  const equityBarWidth = 120;
  const equityBarHeight = 10;

  // Use initial capital as reference (assuming $10,000)
  const initialCapital = 10000;
  const equityRatio = Math.min(2, data.equity / initialCapital);
  const equityColor = equityRatio >= 1 ? UI_COLORS.positive : UI_COLORS.negative;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(equityBarX, equityBarY, equityBarWidth, equityBarHeight);
  graphics.fillStyle(equityColor, 0.8);
  graphics.fillRect(equityBarX, equityBarY, equityBarWidth * Math.min(1, equityRatio), equityBarHeight);

  // Cash bar
  const cashBarY = y + 32;
  const cashRatio = data.cash / initialCapital;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(equityBarX, cashBarY, equityBarWidth, equityBarHeight);
  graphics.fillStyle(0x3b82f6, 0.8);  // Blue for cash
  graphics.fillRect(equityBarX, cashBarY, equityBarWidth * Math.min(1, cashRatio), equityBarHeight);

  // Leverage indicator (gauge-like)
  const leverageY = y + 55;
  const maxLeverage = 3;
  const leverageRatio = data.leverage / maxLeverage;
  const leverageColor = data.leverage > 2 ? UI_COLORS.negative :
                        data.leverage > 1.5 ? UI_COLORS.warning : UI_COLORS.positive;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, leverageY, 70, 8);
  graphics.fillStyle(leverageColor, 0.8);
  graphics.fillRect(x + 10, leverageY, 70 * leverageRatio, 8);

  // Cash buffer indicator
  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 100, leverageY, 70, 8);
  graphics.fillStyle(0x3b82f6, 0.8);
  graphics.fillRect(x + 100, leverageY, 70 * data.cashBuffer, 8);

  // Drawdown bar
  const drawdownY = y + 72;
  const drawdownRatio = Math.min(1, data.drawdown);
  const drawdownColor = drawdownRatio > 0.2 ? UI_COLORS.negative :
                        drawdownRatio > 0.1 ? UI_COLORS.warning : UI_COLORS.positive;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(x + 10, drawdownY, 160, 8);
  graphics.fillStyle(drawdownColor, 0.8);
  graphics.fillRect(x + 10, drawdownY, 160 * drawdownRatio, 8);

  // Position indicators
  if (data.positions.length > 0) {
    const posStartY = y + 90;
    const visiblePositions = data.positions.slice(0, 3);

    visiblePositions.forEach((pos, i) => {
      const posY = posStartY + i * 20;
      const isLong = pos.direction === 'long';
      const posColor = pos.unrealizedPnL >= 0 ? UI_COLORS.positive : UI_COLORS.negative;

      // Direction indicator
      graphics.fillStyle(isLong ? UI_COLORS.positive : UI_COLORS.negative, 0.9);
      if (isLong) {
        // Up arrow
        graphics.fillTriangle(
          x + 15, posY + 12,
          x + 20, posY + 4,
          x + 25, posY + 12
        );
      } else {
        // Down arrow
        graphics.fillTriangle(
          x + 15, posY + 4,
          x + 20, posY + 12,
          x + 25, posY + 4
        );
      }

      // Size bar
      const sizeBarWidth = 60 * pos.size;
      graphics.fillStyle(posColor, 0.7);
      graphics.fillRect(x + 35, posY + 4, sizeBarWidth, 10);

      // P&L indicator
      const pnlWidth = Math.min(50, Math.abs(pos.unrealizedPnLPercent) * 5);
      graphics.fillStyle(posColor, 0.9);
      graphics.fillRect(x + 100, posY + 4, pnlWidth, 10);
    });
  }
}

/**
 * Draw playback controls HUD
 */
export function drawPlaybackControls(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  data: {
    isPlaying: boolean;
    speed: number;
    progress: number;
    canGoBack: boolean;
    canGoForward: boolean;
  }
): void {
  const panelWidth = 200;
  const panelHeight = 50;

  // Background
  graphics.fillStyle(UI_COLORS.panel, 0.85);
  graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 6);
  graphics.lineStyle(1, UI_COLORS.border, 0.5);
  graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 6);

  // Progress bar
  const progressBarX = x + 10;
  const progressBarY = y + 10;
  const progressBarWidth = panelWidth - 20;
  const progressBarHeight = 8;

  graphics.fillStyle(UI_COLORS.background, 0.8);
  graphics.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
  graphics.fillStyle(UI_COLORS.positive, 0.7);
  graphics.fillRect(progressBarX, progressBarY, progressBarWidth * data.progress, progressBarHeight);

  // Control buttons area
  const buttonY = y + 28;
  const buttonSize = 14;
  const buttonGap = 25;
  const startX = x + 30;

  // Prev button
  const prevColor = data.canGoBack ? UI_COLORS.text : UI_COLORS.textSecondary;
  graphics.fillStyle(prevColor, data.canGoBack ? 0.9 : 0.4);
  graphics.fillTriangle(
    startX + buttonSize, buttonY,
    startX + buttonSize, buttonY + buttonSize,
    startX, buttonY + buttonSize / 2
  );

  // Play/Pause button
  const playX = startX + buttonGap;
  if (data.isPlaying) {
    // Pause icon (two bars)
    graphics.fillStyle(UI_COLORS.text, 0.9);
    graphics.fillRect(playX, buttonY, 4, buttonSize);
    graphics.fillRect(playX + 8, buttonY, 4, buttonSize);
  } else {
    // Play icon (triangle)
    graphics.fillStyle(UI_COLORS.positive, 0.9);
    graphics.fillTriangle(
      playX, buttonY,
      playX, buttonY + buttonSize,
      playX + buttonSize, buttonY + buttonSize / 2
    );
  }

  // Next button
  const nextX = playX + buttonGap;
  const nextColor = data.canGoForward ? UI_COLORS.text : UI_COLORS.textSecondary;
  graphics.fillStyle(nextColor, data.canGoForward ? 0.9 : 0.4);
  graphics.fillTriangle(
    nextX, buttonY,
    nextX, buttonY + buttonSize,
    nextX + buttonSize, buttonY + buttonSize / 2
  );

  // Speed indicator
  const speedX = nextX + buttonGap + 10;
  const speedIndicators = [0.5, 1, 2, 5];
  speedIndicators.forEach((spd, i) => {
    const isActive = Math.abs(data.speed - spd) < 0.1;
    graphics.fillStyle(isActive ? UI_COLORS.positive : UI_COLORS.textSecondary, isActive ? 0.9 : 0.5);
    graphics.fillRect(speedX + i * 12, buttonY + 2, 8, isActive ? buttonSize - 4 : 6);
  });
}

/**
 * Draw trading buttons HUD
 */
export function drawTradingButtons(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  data: {
    hasPositions: boolean;
    canTrade: boolean;
  }
): void {
  const panelWidth = 150;
  const panelHeight = 60;

  // Background
  graphics.fillStyle(UI_COLORS.panel, 0.85);
  graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 6);
  graphics.lineStyle(1, UI_COLORS.border, 0.5);
  graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 6);

  const buttonWidth = 60;
  const buttonHeight = 20;
  const buttonY = y + 10;

  // Long button
  const longColor = data.canTrade ? UI_COLORS.positive : UI_COLORS.textSecondary;
  graphics.fillStyle(longColor, data.canTrade ? 0.9 : 0.4);
  graphics.fillRoundedRect(x + 10, buttonY, buttonWidth, buttonHeight, 4);

  // Short button
  const shortColor = data.canTrade ? UI_COLORS.negative : UI_COLORS.textSecondary;
  graphics.fillStyle(shortColor, data.canTrade ? 0.9 : 0.4);
  graphics.fillRoundedRect(x + 80, buttonY, buttonWidth, buttonHeight, 4);

  // Close All button
  if (data.hasPositions) {
    graphics.fillStyle(UI_COLORS.warning, 0.9);
    graphics.fillRoundedRect(x + 10, buttonY + 28, panelWidth - 20, buttonHeight, 4);
  }
}
