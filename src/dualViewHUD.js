/**
 * DualViewHUD - Split-screen Trading Terminal Interface
 *
 * CHART VIEW (Top): Candlestick chart where you SEE and DRAW orders
 * DRIVE VIEW (Bottom): Accumulated returns road where you FEEL the market
 *
 * The two views are SYNCED:
 * - Orders drawn on chart appear as road elements
 * - Current candle highlighted on chart matches car position
 * - P&L shown on both views
 */

// View modes
const VIEW_MODES = {
    SPLIT: { name: 'Split View', chartRatio: 0.3, key: 'split' },
    CHART_FOCUS: { name: 'Chart Focus', chartRatio: 0.7, key: 'chart' },
    DRIVE_FOCUS: { name: 'Drive Focus', chartRatio: 0.15, key: 'drive' },
    FULL_IMMERSION: { name: 'Full Immersion', chartRatio: 0, key: 'immersion' }
};

class DualViewHUD {
    constructor(scene) {
        this.scene = scene;
        this.currentMode = VIEW_MODES.SPLIT;
        this.modeIndex = 0;

        // === CHART VIEW ELEMENTS ===
        this.chartView = {
            container: null,
            background: null,
            candles: [],
            priceLabels: [],
            orderLines: [],
            currentPriceMarker: null,
            volumeBars: [],
            timeAxis: null
        };

        // === TRADING PANEL ===
        this.tradingPanel = {
            container: null,
            positionDisplay: null,
            pnlDisplay: null,
            ordersDisplay: null,
            comboDisplay: null,
            quickButtons: []
        };

        // === DRIVE VIEW OVERLAY ===
        this.driveView = {
            returnLevel: null,        // Current return % marker
            stopLossLine: null,       // Horizontal SL indicator
            takeProfitLine: null,     // Horizontal TP indicator
            entryLine: null,          // Entry price line
            pnlGlow: null            // P&L glow around car
        };

        // === SYNC ELEMENTS ===
        this.syncMarker = null;       // Shows connection between views
        this.syncLine = null;

        // Chart display settings
        this.chartSettings = {
            candleWidth: 8,
            candleSpacing: 2,
            maxCandles: 50,
            chartHeight: 150,
            volumeHeight: 30
        };

        // Cached data
        this.candleData = [];
        this.visibleRange = { start: 0, end: 50 };

        this.initialize();
    }

    initialize() {
        if (!this.scene) return;

        this.createChartView();
        this.createTradingPanel();
        this.createDriveViewOverlay();
        this.createSyncElements();

        // Initially set to split view
        this.setViewMode(VIEW_MODES.SPLIT);
    }

    // ========================================
    // CHART VIEW (Top Panel)
    // ========================================

    createChartView() {
        const chartY = 10;
        const chartWidth = screen_width - 220;  // Leave room for trading panel
        const chartHeight = this.chartSettings.chartHeight;

        // Background panel
        this.chartView.background = this.scene.add.graphics();
        this.chartView.background.setScrollFactor(0).setDepth(900);

        this.chartView.background.fillStyle(0x1a1a2e, 0.95);
        this.chartView.background.fillRoundedRect(10, chartY, chartWidth, chartHeight + 40, 8);

        // Border
        this.chartView.background.lineStyle(2, 0x4488ff, 0.5);
        this.chartView.background.strokeRoundedRect(10, chartY, chartWidth, chartHeight + 40, 8);

        // Title
        this.chartView.title = this.scene.add.text(20, chartY + 5, 'CHART VIEW', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#4488ff'
        }).setScrollFactor(0).setDepth(901);

        // Symbol and price
        this.chartView.symbolText = this.scene.add.text(100, chartY + 5, 'SPY 15m', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(901);

        this.chartView.priceText = this.scene.add.text(chartWidth - 80, chartY + 5, '$0.00', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#44ff44'
        }).setScrollFactor(0).setDepth(901);

        // Candlestick graphics
        this.chartView.candleGraphics = this.scene.add.graphics();
        this.chartView.candleGraphics.setScrollFactor(0).setDepth(902);

        // Order lines graphics
        this.chartView.orderGraphics = this.scene.add.graphics();
        this.chartView.orderGraphics.setScrollFactor(0).setDepth(903);

        // Current position marker
        this.chartView.positionGraphics = this.scene.add.graphics();
        this.chartView.positionGraphics.setScrollFactor(0).setDepth(904);

        // Price scale on right
        this.chartView.priceScale = this.scene.add.graphics();
        this.chartView.priceScale.setScrollFactor(0).setDepth(901);
    }

    /**
     * Update chart view with market data
     */
    updateChartView() {
        if (!this.chartView.candleGraphics) return;
        if (this.currentMode === VIEW_MODES.FULL_IMMERSION) return;

        this.chartView.candleGraphics.clear();
        this.chartView.orderGraphics.clear();
        this.chartView.positionGraphics.clear();

        // Get market data
        if (!marketDataLoader || !marketDataLoader.currentDataset) return;

        const data = marketDataLoader.currentDataset.data;
        const currentIdx = marketTerrainGenerator.currentIndex;

        // Calculate visible range (show candles leading up to current)
        const startIdx = Math.max(0, currentIdx - this.chartSettings.maxCandles);
        const endIdx = currentIdx;

        if (endIdx <= startIdx) return;

        // Get price range for scaling
        let minPrice = Infinity, maxPrice = -Infinity;
        for (let i = startIdx; i < endIdx && i < data.length; i++) {
            minPrice = Math.min(minPrice, data[i].low);
            maxPrice = Math.max(maxPrice, data[i].high);
        }

        const priceRange = maxPrice - minPrice;
        if (priceRange <= 0) return;

        const chartX = 30;
        const chartY = 30;
        const chartWidth = screen_width - 260;
        const chartHeight = this.chartSettings.chartHeight;

        const candleWidth = this.chartSettings.candleWidth;
        const candleSpacing = this.chartSettings.candleSpacing;
        const totalCandleWidth = candleWidth + candleSpacing;

        // Helper to convert price to Y coordinate
        const priceToY = (price) => {
            return chartY + chartHeight - ((price - minPrice) / priceRange * chartHeight);
        };

        // Draw candles
        for (let i = startIdx; i < endIdx && i < data.length; i++) {
            const candle = data[i];
            const x = chartX + (i - startIdx) * totalCandleWidth;

            const isGreen = candle.close >= candle.open;
            const bodyColor = isGreen ? 0x44cc44 : 0xcc4444;
            const wickColor = isGreen ? 0x66ff66 : 0xff6666;

            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);

            // Wick
            this.chartView.candleGraphics.lineStyle(1, wickColor, 0.8);
            this.chartView.candleGraphics.lineBetween(
                x + candleWidth / 2, highY,
                x + candleWidth / 2, lowY
            );

            // Body
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY) || 1;

            this.chartView.candleGraphics.fillStyle(bodyColor, 1);
            this.chartView.candleGraphics.fillRect(x, bodyTop, candleWidth, bodyHeight);
        }

        // Highlight current candle
        if (currentIdx > 0 && currentIdx <= data.length) {
            const x = chartX + (Math.min(endIdx - 1, data.length - 1) - startIdx) * totalCandleWidth;
            this.chartView.candleGraphics.lineStyle(2, 0xffff00, 1);
            this.chartView.candleGraphics.strokeRect(x - 2, chartY, candleWidth + 4, chartHeight);
        }

        // Draw orders on chart
        this.drawOrdersOnChart(chartX, chartY, chartWidth, chartHeight, minPrice, maxPrice, priceToY);

        // Update current position indicator
        this.drawPositionOnChart(chartX, chartY, chartWidth, chartHeight, priceToY);

        // Update price labels
        this.updatePriceScale(chartY, chartHeight, minPrice, maxPrice, priceToY);

        // Update symbol and price display
        const currentCandle = data[Math.min(currentIdx - 1, data.length - 1)];
        if (currentCandle) {
            const info = marketDataLoader.getDatasetInfo(currentMarketDataKey);
            this.chartView.symbolText.setText(`${info?.symbol || 'SPY'} | ${currentCandle.date || ''}`);

            const priceColor = currentCandle.close >= currentCandle.open ? '#44ff44' : '#ff4444';
            this.chartView.priceText.setText(`$${currentCandle.close.toFixed(2)}`);
            this.chartView.priceText.setColor(priceColor);
        }
    }

    /**
     * Draw pending orders on chart
     */
    drawOrdersOnChart(chartX, chartY, chartWidth, chartHeight, minPrice, maxPrice, priceToY) {
        if (!tradingTerminal) return;

        const orders = tradingTerminal.getPendingOrders();
        const priceRange = maxPrice - minPrice;

        for (const order of orders) {
            const orderType = ORDER_TYPES[order.type];

            // Convert return level to approximate price (for visualization)
            // This is simplified - in real implementation, you'd map properly
            const pricePct = (order.priceLevel + 50) / 100;  // Normalize to 0-1
            const price = minPrice + pricePct * priceRange;
            const y = priceToY(price);

            if (y < chartY || y > chartY + chartHeight) continue;

            // Draw order line
            this.chartView.orderGraphics.lineStyle(2, orderType.color, 0.8);
            this.chartView.orderGraphics.lineBetween(chartX, y, chartX + chartWidth, y);

            // Order type indicator
            this.chartView.orderGraphics.fillStyle(orderType.color, 1);
            this.chartView.orderGraphics.fillCircle(chartX + chartWidth + 10, y, 5);

            // Dashed line effect
            for (let dx = 0; dx < chartWidth; dx += 10) {
                this.chartView.orderGraphics.fillStyle(orderType.color, 0.3);
                this.chartView.orderGraphics.fillRect(chartX + dx, y - 1, 5, 2);
            }
        }
    }

    /**
     * Draw current position indicator on chart
     */
    drawPositionOnChart(chartX, chartY, chartWidth, chartHeight, priceToY) {
        if (!tradingTerminal || !tradingTerminal.position.isOpen) return;

        const position = tradingTerminal.position;
        const pnl = position.unrealizedPnL;

        // Entry line (where position was opened)
        const entryY = chartY + chartHeight / 2;  // Simplified positioning

        // P&L zone highlight
        if (pnl > 0) {
            this.chartView.positionGraphics.fillStyle(0x44ff44, 0.1);
            this.chartView.positionGraphics.fillRect(chartX, entryY - 20, chartWidth, 20);
        } else if (pnl < 0) {
            this.chartView.positionGraphics.fillStyle(0xff4444, 0.1);
            this.chartView.positionGraphics.fillRect(chartX, entryY, chartWidth, 20);
        }

        // Entry line
        this.chartView.positionGraphics.lineStyle(2, 0x4488ff, 1);
        this.chartView.positionGraphics.lineBetween(chartX, entryY, chartX + chartWidth, entryY);

        // Position label
        const typeIcon = position.type === 'long' ? '📈' : '📉';
        const pnlStr = pnl >= 0 ? `+${pnl.toFixed(2)}%` : `${pnl.toFixed(2)}%`;
        const pnlColor = pnl >= 0 ? '#44ff44' : '#ff4444';

        // Text will be updated in trading panel instead
    }

    /**
     * Update price scale on right side of chart
     */
    updatePriceScale(chartY, chartHeight, minPrice, maxPrice, priceToY) {
        this.chartView.priceScale.clear();

        const scaleX = screen_width - 230;
        const steps = 5;
        const priceStep = (maxPrice - minPrice) / steps;

        for (let i = 0; i <= steps; i++) {
            const price = minPrice + i * priceStep;
            const y = priceToY(price);

            // Tick mark
            this.chartView.priceScale.lineStyle(1, 0x666666, 0.5);
            this.chartView.priceScale.lineBetween(scaleX - 5, y, scaleX, y);

            // Price label (using graphics for simplicity)
            this.chartView.priceScale.fillStyle(0x888888, 1);
        }
    }

    // ========================================
    // TRADING PANEL (Right Side)
    // ========================================

    createTradingPanel() {
        const panelX = screen_width - 200;
        const panelY = 10;
        const panelWidth = 190;
        const panelHeight = 280;

        // Background
        this.tradingPanel.background = this.scene.add.graphics();
        this.tradingPanel.background.setScrollFactor(0).setDepth(900);

        this.tradingPanel.background.fillStyle(0x1a1a2e, 0.95);
        this.tradingPanel.background.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

        this.tradingPanel.background.lineStyle(2, 0x44ff44, 0.5);
        this.tradingPanel.background.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

        // Title
        this.scene.add.text(panelX + 10, panelY + 8, 'TRADING TERMINAL', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#44ff44'
        }).setScrollFactor(0).setDepth(901);

        // Position display
        this.tradingPanel.positionText = this.scene.add.text(panelX + 10, panelY + 30, 'No Position', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        // P&L display
        this.tradingPanel.pnlText = this.scene.add.text(panelX + 10, panelY + 50, 'P&L: $0.00', {
            fontFamily: 'monospace',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(901);

        // Unrealized P&L
        this.tradingPanel.unrealizedText = this.scene.add.text(panelX + 10, panelY + 70, 'Unrealized: 0%', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        // Orders count
        this.tradingPanel.ordersText = this.scene.add.text(panelX + 10, panelY + 95, 'Orders: 0 pending', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#aaaaaa'
        }).setScrollFactor(0).setDepth(901);

        // Combo display
        this.tradingPanel.comboText = this.scene.add.text(panelX + 10, panelY + 115, 'Streak: 0', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffcc00'
        }).setScrollFactor(0).setDepth(901);

        // Win rate
        this.tradingPanel.winRateText = this.scene.add.text(panelX + 10, panelY + 135, 'Win Rate: 0%', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        // Quick action buttons (visual only - controls are keyboard)
        const buttonY = panelY + 165;

        this.scene.add.text(panelX + 10, buttonY, 'QUICK ACTIONS:', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#666666'
        }).setScrollFactor(0).setDepth(901);

        this.scene.add.text(panelX + 10, buttonY + 15, 'B: Buy  S: Sell', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#44ff44'
        }).setScrollFactor(0).setDepth(901);

        this.scene.add.text(panelX + 10, buttonY + 30, 'L: Limit  X: Cancel', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#ffaa44'
        }).setScrollFactor(0).setDepth(901);

        this.scene.add.text(panelX + 10, buttonY + 45, '1-9: Position Size', {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: '#4488ff'
        }).setScrollFactor(0).setDepth(901);

        // Current return display
        this.tradingPanel.returnText = this.scene.add.text(panelX + 10, buttonY + 70, 'Return: 0%', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(901);

        // View mode indicator
        this.tradingPanel.viewModeText = this.scene.add.text(panelX + 10, buttonY + 90, '[C] Split View', {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#666666'
        }).setScrollFactor(0).setDepth(901);
    }

    /**
     * Update trading panel with current data
     */
    updateTradingPanel() {
        if (!tradingTerminal) return;

        const data = tradingTerminal.getDisplayData();
        const position = data.position;
        const stats = data.stats;
        const combo = data.combo;

        // Position status
        if (position.isOpen) {
            const typeIcon = position.type === 'long' ? '📈' : '📉';
            this.tradingPanel.positionText.setText(`${typeIcon} ${position.type.toUpperCase()} @ ${position.entryReturn.toFixed(1)}%`);
            this.tradingPanel.positionText.setColor('#ffffff');
        } else {
            this.tradingPanel.positionText.setText('No Position');
            this.tradingPanel.positionText.setColor('#888888');
        }

        // P&L
        const totalPnL = position.realizedPnL;
        const pnlColor = totalPnL >= 0 ? '#44ff44' : '#ff4444';
        const pnlSign = totalPnL >= 0 ? '+' : '';
        this.tradingPanel.pnlText.setText(`P&L: ${pnlSign}${totalPnL.toFixed(2)}%`);
        this.tradingPanel.pnlText.setColor(pnlColor);

        // Unrealized P&L
        if (position.isOpen) {
            const uPnL = position.unrealizedPnL;
            const uColor = uPnL >= 0 ? '#88ff88' : '#ff8888';
            const uSign = uPnL >= 0 ? '+' : '';
            this.tradingPanel.unrealizedText.setText(`Unrealized: ${uSign}${uPnL.toFixed(2)}%`);
            this.tradingPanel.unrealizedText.setColor(uColor);
        } else {
            this.tradingPanel.unrealizedText.setText('Unrealized: --');
            this.tradingPanel.unrealizedText.setColor('#888888');
        }

        // Orders
        this.tradingPanel.ordersText.setText(`Orders: ${data.orders.pending} pending`);

        // Combo
        if (combo.count > 0) {
            this.tradingPanel.comboText.setText(`Streak: ${combo.count} 🔥 (${combo.multiplier.toFixed(1)}x)`);
            this.tradingPanel.comboText.setColor('#ffcc00');
        } else {
            this.tradingPanel.comboText.setText('Streak: 0');
            this.tradingPanel.comboText.setColor('#888888');
        }

        // Win rate
        this.tradingPanel.winRateText.setText(`Win Rate: ${stats.winRate.toFixed(1)}% (${stats.winningTrades}/${stats.totalTrades})`);

        // Current return
        const currentReturn = data.currentReturn;
        const retColor = currentReturn >= 0 ? '#44ff44' : '#ff4444';
        const retSign = currentReturn >= 0 ? '+' : '';
        this.tradingPanel.returnText.setText(`Return: ${retSign}${currentReturn.toFixed(2)}%`);
        this.tradingPanel.returnText.setColor(retColor);

        // View mode
        this.tradingPanel.viewModeText.setText(`[C] ${this.currentMode.name}`);
    }

    // ========================================
    // DRIVE VIEW OVERLAY (On the road)
    // ========================================

    createDriveViewOverlay() {
        // Return level marker (horizontal line showing current accumulated return)
        this.driveView.returnMarker = this.scene.add.graphics();
        this.driveView.returnMarker.setDepth(180);

        // P&L glow effect around car
        this.driveView.pnlGlow = this.scene.add.graphics();
        this.driveView.pnlGlow.setDepth(90);

        // Entry line (shows where position was opened)
        this.driveView.entryGraphics = this.scene.add.graphics();
        this.driveView.entryGraphics.setDepth(175);

        // Stop loss and take profit lines
        this.driveView.slGraphics = this.scene.add.graphics();
        this.driveView.slGraphics.setDepth(175);

        this.driveView.tpGraphics = this.scene.add.graphics();
        this.driveView.tpGraphics.setDepth(175);
    }

    /**
     * Update drive view overlay elements
     */
    updateDriveViewOverlay() {
        if (!vehicle || !vehicle.mainBody) return;

        this.driveView.returnMarker.clear();
        this.driveView.pnlGlow.clear();
        this.driveView.entryGraphics.clear();
        this.driveView.slGraphics.clear();
        this.driveView.tpGraphics.clear();

        const carX = vehicle.mainBody.x;
        const carY = vehicle.mainBody.y;
        const camera = this.scene.cameras.main;

        // === RETURN LEVEL MARKER ===
        // Horizontal line showing 0% return level (baseline)
        const baselineY = carY;  // Car position represents current return

        // Draw return level indicators
        const levelsToShow = [-10, -5, 0, 5, 10, 20];
        for (const level of levelsToShow) {
            const yOffset = -level * 8;  // 8 pixels per 1%
            const lineY = baselineY + yOffset;

            if (Math.abs(level) < 1) {
                // 0% line - brighter
                this.driveView.returnMarker.lineStyle(2, 0xffff00, 0.5);
            } else if (level > 0) {
                // Positive levels - green
                this.driveView.returnMarker.lineStyle(1, 0x44ff44, 0.3);
            } else {
                // Negative levels - red
                this.driveView.returnMarker.lineStyle(1, 0xff4444, 0.3);
            }

            this.driveView.returnMarker.lineBetween(
                carX - 200, lineY,
                carX + 400, lineY
            );
        }

        // === P&L GLOW AROUND CAR ===
        if (tradingTerminal && tradingTerminal.position.isOpen) {
            const pnl = tradingTerminal.position.unrealizedPnL;
            const glowColor = pnl >= 0 ? 0x44ff44 : 0xff4444;
            const glowIntensity = Math.min(0.5, Math.abs(pnl) / 20);

            // Outer glow
            this.driveView.pnlGlow.fillStyle(glowColor, glowIntensity * 0.3);
            this.driveView.pnlGlow.fillCircle(carX, carY, 60);

            // Inner glow
            this.driveView.pnlGlow.fillStyle(glowColor, glowIntensity * 0.5);
            this.driveView.pnlGlow.fillCircle(carX, carY, 40);

            // === ENTRY LEVEL LINE ===
            const entryReturn = tradingTerminal.position.entryReturn;
            const currentReturn = tradingTerminal.getCurrentReturn();
            const entryYOffset = -(entryReturn - currentReturn) * 8;
            const entryY = carY + entryYOffset;

            this.driveView.entryGraphics.lineStyle(2, 0x4488ff, 0.8);
            this.driveView.entryGraphics.lineBetween(carX - 300, entryY, carX + 100, entryY);

            // Entry label
            this.driveView.entryGraphics.fillStyle(0x4488ff, 0.8);
            this.driveView.entryGraphics.fillRoundedRect(carX - 320, entryY - 10, 50, 20, 4);
        }

        // === STOP LOSS AND TAKE PROFIT LINES ===
        if (tradingTerminal) {
            const pendingOrders = tradingTerminal.getPendingOrders();
            const currentReturn = tradingTerminal.getCurrentReturn();

            for (const order of pendingOrders) {
                const orderType = ORDER_TYPES[order.type];
                const yOffset = -(order.priceLevel - currentReturn) * 8;
                const lineY = carY + yOffset;

                if (order.type === 'STOP_LOSS') {
                    // Red dashed line for stop loss
                    this.driveView.slGraphics.lineStyle(3, 0xff4444, 0.8);

                    // Dashed line
                    for (let x = carX - 200; x < carX + 400; x += 20) {
                        this.driveView.slGraphics.lineBetween(x, lineY, x + 10, lineY);
                    }

                    // Shield icon
                    this.driveView.slGraphics.fillStyle(0xff4444, 0.9);
                    this.driveView.slGraphics.fillCircle(carX + 420, lineY, 10);
                }
                else if (order.type === 'TAKE_PROFIT') {
                    // Green dashed line for take profit
                    this.driveView.tpGraphics.lineStyle(3, 0x44ff44, 0.8);

                    // Dashed line
                    for (let x = carX - 200; x < carX + 400; x += 20) {
                        this.driveView.tpGraphics.lineBetween(x, lineY, x + 10, lineY);
                    }

                    // Flag icon
                    this.driveView.tpGraphics.fillStyle(0x44ff44, 0.9);
                    this.driveView.tpGraphics.fillTriangle(
                        carX + 420, lineY - 15,
                        carX + 440, lineY - 7,
                        carX + 420, lineY
                    );
                }
            }
        }
    }

    // ========================================
    // SYNC ELEMENTS
    // ========================================

    createSyncElements() {
        // Sync indicator (shows current candle on chart = car position)
        this.syncMarker = this.scene.add.graphics();
        this.syncMarker.setScrollFactor(0).setDepth(950);
    }

    updateSyncElements() {
        if (!this.syncMarker) return;
        this.syncMarker.clear();

        // Only show in split or chart focus modes
        if (this.currentMode === VIEW_MODES.FULL_IMMERSION) return;

        const chartHeight = this.chartSettings.chartHeight * this.currentMode.chartRatio / 0.3;
        if (chartHeight < 50) return;

        // Draw sync line from chart to edge of screen
        const syncX = screen_width - 230;
        const chartBottom = 30 + chartHeight;

        this.syncMarker.lineStyle(1, 0xffff00, 0.3);
        this.syncMarker.lineBetween(syncX, chartBottom, syncX, chartBottom + 20);

        // Sync indicator text
        this.syncMarker.fillStyle(0xffff00, 0.7);
        this.syncMarker.fillCircle(syncX, chartBottom + 25, 4);
    }

    // ========================================
    // VIEW MODE CONTROL
    // ========================================

    /**
     * Set the current view mode
     */
    setViewMode(mode) {
        this.currentMode = mode;

        // Adjust chart view visibility and size
        const chartHeight = this.chartSettings.chartHeight * (mode.chartRatio / 0.3);

        if (mode === VIEW_MODES.FULL_IMMERSION) {
            // Hide chart completely
            this.chartView.background?.setVisible(false);
            this.chartView.title?.setVisible(false);
            this.chartView.symbolText?.setVisible(false);
            this.chartView.priceText?.setVisible(false);
            this.chartView.candleGraphics?.setVisible(false);
            this.chartView.orderGraphics?.setVisible(false);
            this.chartView.positionGraphics?.setVisible(false);
            this.chartView.priceScale?.setVisible(false);
        } else {
            // Show chart
            this.chartView.background?.setVisible(true);
            this.chartView.title?.setVisible(true);
            this.chartView.symbolText?.setVisible(true);
            this.chartView.priceText?.setVisible(true);
            this.chartView.candleGraphics?.setVisible(true);
            this.chartView.orderGraphics?.setVisible(true);
            this.chartView.positionGraphics?.setVisible(true);
            this.chartView.priceScale?.setVisible(true);

            // Resize chart based on mode
            this.chartSettings.chartHeight = 150 * (mode.chartRatio / 0.3);
            this.chartSettings.chartHeight = Math.max(50, Math.min(300, this.chartSettings.chartHeight));
        }

        console.log(`View mode: ${mode.name}`);
    }

    /**
     * Cycle to next view mode
     */
    cycleViewMode() {
        const modes = Object.values(VIEW_MODES);
        this.modeIndex = (this.modeIndex + 1) % modes.length;
        this.setViewMode(modes[this.modeIndex]);
        return this.currentMode;
    }

    // ========================================
    // UPDATE LOOP
    // ========================================

    /**
     * Main update function - called each frame
     */
    update() {
        this.updateChartView();
        this.updateTradingPanel();
        this.updateDriveViewOverlay();
        this.updateSyncElements();
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Destroy all graphics objects
        this.chartView.background?.destroy();
        this.chartView.candleGraphics?.destroy();
        this.chartView.orderGraphics?.destroy();
        this.chartView.positionGraphics?.destroy();
        this.chartView.priceScale?.destroy();

        this.tradingPanel.background?.destroy();

        this.driveView.returnMarker?.destroy();
        this.driveView.pnlGlow?.destroy();
        this.driveView.entryGraphics?.destroy();
        this.driveView.slGraphics?.destroy();
        this.driveView.tpGraphics?.destroy();

        this.syncMarker?.destroy();
    }
}

// Global instance
var dualViewHUD = null;
