/**
 * DualViewHUD - Responsive Split-screen Trading Terminal Interface
 *
 * CHART VIEW (Top): Candlestick chart where you SEE and DRAW orders
 * DRIVE VIEW (Bottom): Accumulated returns road where you FEEL the market
 *
 * The two views are SYNCED:
 * - Orders drawn on chart appear as road elements
 * - Current candle highlighted on chart matches car position
 * - P&L shown on both views
 *
 * RESPONSIVE DESIGN:
 * - All positions calculated as percentages of screen size
 * - Font sizes scale with screen dimensions
 * - Adapts to different aspect ratios
 */

// View modes
const VIEW_MODES = {
    SPLIT: { name: 'Split View', chartRatio: 0.25, key: 'split' },
    CHART_FOCUS: { name: 'Chart Focus', chartRatio: 0.4, key: 'chart' },
    DRIVE_FOCUS: { name: 'Drive Focus', chartRatio: 0.12, key: 'drive' },
    FULL_IMMERSION: { name: 'Full Immersion', chartRatio: 0, key: 'immersion' }
};

class DualViewHUD {
    constructor(scene) {
        this.scene = scene;
        this.currentMode = VIEW_MODES.SPLIT;
        this.modeIndex = 0;

        // Responsive sizing - calculate based on screen dimensions
        this.layout = this.calculateLayout();

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
            returnLevel: null,
            stopLossLine: null,
            takeProfitLine: null,
            entryLine: null,
            pnlGlow: null
        };

        // === SYNC ELEMENTS ===
        this.syncMarker = null;
        this.syncLine = null;

        // Cached data
        this.candleData = [];
        this.visibleRange = { start: 0, end: 50 };

        this.initialize();
    }

    /**
     * Calculate responsive layout dimensions
     */
    calculateLayout() {
        const sw = screen_width;
        const sh = screen_height;

        // Base scale factor for fonts and elements
        const scaleFactor = Math.min(sw / 1536, sh / 864);

        return {
            // Chart panel (top-right, avoiding existing HUDs)
            chart: {
                x: sw * 0.55,              // Start at 55% from left
                y: sh * 0.02,              // 2% from top
                width: sw * 0.43,          // 43% of screen width
                height: sh * 0.22,         // 22% of screen height
                padding: sw * 0.01
            },

            // Trading panel (right side, below chart)
            trading: {
                x: sw * 0.82,              // 82% from left
                y: sh * 0.26,              // Below chart
                width: sw * 0.16,          // 16% of screen width
                height: sh * 0.35          // 35% of screen height
            },

            // Font sizes (scaled)
            fonts: {
                tiny: Math.max(8, Math.floor(10 * scaleFactor)),
                small: Math.max(9, Math.floor(11 * scaleFactor)),
                normal: Math.max(10, Math.floor(12 * scaleFactor)),
                medium: Math.max(11, Math.floor(14 * scaleFactor)),
                large: Math.max(12, Math.floor(16 * scaleFactor)),
                xlarge: Math.max(14, Math.floor(20 * scaleFactor))
            },

            // Element sizes
            candleWidth: Math.max(4, Math.floor(6 * scaleFactor)),
            candleSpacing: Math.max(1, Math.floor(2 * scaleFactor)),
            maxCandles: Math.floor(sw * 0.035),  // ~50-60 candles

            // Scale factor for other elements
            scale: scaleFactor
        };
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
    // CHART VIEW (Top-Right Panel)
    // ========================================

    createChartView() {
        const l = this.layout;
        const c = l.chart;

        // Background panel
        this.chartView.background = this.scene.add.graphics();
        this.chartView.background.setScrollFactor(0).setDepth(900);

        this.drawChartBackground();

        // Title
        this.chartView.title = this.scene.add.text(c.x + c.padding, c.y + c.padding, 'CHART', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#4488ff'
        }).setScrollFactor(0).setDepth(901);

        // Symbol and price
        this.chartView.symbolText = this.scene.add.text(c.x + c.width * 0.15, c.y + c.padding, 'SPY', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(901);

        this.chartView.priceText = this.scene.add.text(c.x + c.width - c.padding * 8, c.y + c.padding, '$0.00', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#44ff44'
        }).setScrollFactor(0).setDepth(901);

        // Return display
        this.chartView.returnText = this.scene.add.text(c.x + c.width * 0.5, c.y + c.padding, '0%', {
            fontFamily: 'monospace',
            fontSize: l.fonts.normal + 'px',
            fontStyle: 'bold',
            color: '#ffffff'
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

    drawChartBackground() {
        const c = this.layout.chart;

        this.chartView.background.clear();

        // Semi-transparent dark background
        this.chartView.background.fillStyle(0x0a0a14, 0.9);
        this.chartView.background.fillRoundedRect(c.x, c.y, c.width, c.height, 6);

        // Border
        this.chartView.background.lineStyle(1, 0x4488ff, 0.4);
        this.chartView.background.strokeRoundedRect(c.x, c.y, c.width, c.height, 6);

        // Grid lines (subtle)
        this.chartView.background.lineStyle(1, 0x333366, 0.2);
        const gridSpacing = c.height / 5;
        for (let i = 1; i < 5; i++) {
            const y = c.y + i * gridSpacing;
            this.chartView.background.lineBetween(c.x + 5, y, c.x + c.width - 5, y);
        }
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

        // Calculate visible range
        const maxCandles = this.layout.maxCandles;
        const startIdx = Math.max(0, currentIdx - maxCandles);
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

        const l = this.layout;
        const c = l.chart;

        const chartX = c.x + c.padding * 2;
        const chartY = c.y + c.height * 0.15;  // Leave room for header
        const chartWidth = c.width - c.padding * 6;
        const chartHeight = c.height * 0.75;

        const candleWidth = l.candleWidth;
        const candleSpacing = l.candleSpacing;
        const totalCandleWidth = candleWidth + candleSpacing;

        // Helper to convert price to Y coordinate
        const priceToY = (price) => {
            return chartY + chartHeight - ((price - minPrice) / priceRange * chartHeight);
        };

        // Draw candles
        const candleCount = endIdx - startIdx;
        const actualCandleWidth = Math.min(candleWidth, (chartWidth / candleCount) - candleSpacing);

        for (let i = startIdx; i < endIdx && i < data.length; i++) {
            const candle = data[i];
            const candleIndex = i - startIdx;
            const x = chartX + candleIndex * (actualCandleWidth + candleSpacing);

            const isGreen = candle.close >= candle.open;
            const bodyColor = isGreen ? 0x44cc44 : 0xcc4444;
            const wickColor = isGreen ? 0x66ff66 : 0xff6666;

            const openY = priceToY(candle.open);
            const closeY = priceToY(candle.close);
            const highY = priceToY(candle.high);
            const lowY = priceToY(candle.low);

            // Wick
            this.chartView.candleGraphics.lineStyle(1, wickColor, 0.7);
            this.chartView.candleGraphics.lineBetween(
                x + actualCandleWidth / 2, highY,
                x + actualCandleWidth / 2, lowY
            );

            // Body
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));

            this.chartView.candleGraphics.fillStyle(bodyColor, 0.9);
            this.chartView.candleGraphics.fillRect(x, bodyTop, actualCandleWidth, bodyHeight);
        }

        // Highlight current candle
        if (candleCount > 0) {
            const lastX = chartX + (candleCount - 1) * (actualCandleWidth + candleSpacing);
            this.chartView.candleGraphics.lineStyle(2, 0xffff00, 0.8);
            this.chartView.candleGraphics.strokeRect(lastX - 1, chartY, actualCandleWidth + 2, chartHeight);
        }

        // Draw orders on chart
        this.drawOrdersOnChart(chartX, chartY, chartWidth, chartHeight, minPrice, maxPrice, priceToY);

        // Update current position indicator
        this.drawPositionOnChart(chartX, chartY, chartWidth, chartHeight, priceToY, minPrice, maxPrice);

        // Update display text
        const currentCandle = data[Math.min(currentIdx - 1, data.length - 1)];
        if (currentCandle) {
            const info = marketDataLoader.getDatasetInfo(currentMarketDataKey);
            this.chartView.symbolText.setText(`${info?.symbol || 'SPY'}`);

            const priceColor = currentCandle.close >= currentCandle.open ? '#44ff44' : '#ff4444';
            this.chartView.priceText.setText(`$${currentCandle.close.toFixed(2)}`);
            this.chartView.priceText.setColor(priceColor);

            // Update return display
            const metadata = marketTerrainGenerator.getTerrainMetadata();
            if (metadata && metadata.cumulativeReturn !== undefined) {
                const ret = metadata.cumulativeReturn;
                const retColor = ret >= 0 ? '#44ff44' : '#ff4444';
                const retSign = ret >= 0 ? '+' : '';
                this.chartView.returnText.setText(`${retSign}${ret.toFixed(1)}%`);
                this.chartView.returnText.setColor(retColor);
            }
        }
    }

    /**
     * Draw pending orders on chart
     */
    drawOrdersOnChart(chartX, chartY, chartWidth, chartHeight, minPrice, maxPrice, priceToY) {
        if (!tradingTerminal) return;

        const orders = tradingTerminal.getPendingOrders();
        const priceRange = maxPrice - minPrice;
        if (priceRange <= 0) return;

        for (const order of orders) {
            const orderType = ORDER_TYPES[order.type];

            // Convert return level to price position
            const currentReturn = tradingTerminal.getCurrentReturn();
            const returnDiff = order.priceLevel - currentReturn;
            const pricePct = 0.5 + returnDiff / 20;  // Map ±10% to 0-1
            const clampedPct = Math.max(0.05, Math.min(0.95, pricePct));
            const y = chartY + chartHeight * (1 - clampedPct);

            // Draw order line
            this.chartView.orderGraphics.lineStyle(2, orderType.color, 0.6);
            this.chartView.orderGraphics.lineBetween(chartX, y, chartX + chartWidth, y);

            // Dashed effect
            for (let dx = 0; dx < chartWidth; dx += 15) {
                this.chartView.orderGraphics.fillStyle(orderType.color, 0.2);
                this.chartView.orderGraphics.fillRect(chartX + dx, y - 1, 8, 2);
            }

            // Order type indicator on right
            this.chartView.orderGraphics.fillStyle(orderType.color, 0.9);
            this.chartView.orderGraphics.fillCircle(chartX + chartWidth + 8, y, 4);
        }
    }

    /**
     * Draw current position indicator on chart
     */
    drawPositionOnChart(chartX, chartY, chartWidth, chartHeight, priceToY, minPrice, maxPrice) {
        if (!tradingTerminal || !tradingTerminal.position.isOpen) return;

        const position = tradingTerminal.position;
        const pnl = position.unrealizedPnL;
        const currentReturn = tradingTerminal.getCurrentReturn();

        // Entry line position
        const entryDiff = position.entryReturn - currentReturn;
        const entryPct = 0.5 + entryDiff / 20;
        const clampedPct = Math.max(0.1, Math.min(0.9, entryPct));
        const entryY = chartY + chartHeight * (1 - clampedPct);

        // P&L zone highlight
        const currentY = chartY + chartHeight * 0.5;
        if (pnl > 0) {
            this.chartView.positionGraphics.fillStyle(0x44ff44, 0.1);
            this.chartView.positionGraphics.fillRect(chartX, Math.min(entryY, currentY),
                chartWidth, Math.abs(currentY - entryY));
        } else if (pnl < 0) {
            this.chartView.positionGraphics.fillStyle(0xff4444, 0.1);
            this.chartView.positionGraphics.fillRect(chartX, Math.min(entryY, currentY),
                chartWidth, Math.abs(currentY - entryY));
        }

        // Entry line
        this.chartView.positionGraphics.lineStyle(2, 0x4488ff, 0.8);
        this.chartView.positionGraphics.lineBetween(chartX, entryY, chartX + chartWidth, entryY);
    }

    // ========================================
    // TRADING PANEL (Right Side)
    // ========================================

    createTradingPanel() {
        const l = this.layout;
        const t = l.trading;

        // Background
        this.tradingPanel.background = this.scene.add.graphics();
        this.tradingPanel.background.setScrollFactor(0).setDepth(900);

        this.tradingPanel.background.fillStyle(0x0a0a14, 0.9);
        this.tradingPanel.background.fillRoundedRect(t.x, t.y, t.width, t.height, 6);

        this.tradingPanel.background.lineStyle(1, 0x44ff44, 0.4);
        this.tradingPanel.background.strokeRoundedRect(t.x, t.y, t.width, t.height, 6);

        const padding = t.width * 0.06;
        const lineHeight = t.height * 0.08;
        let yPos = t.y + padding;

        // Title
        this.scene.add.text(t.x + padding, yPos, 'TRADING', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#44ff44'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight * 1.2;

        // Position display
        this.tradingPanel.positionText = this.scene.add.text(t.x + padding, yPos, 'No Position', {
            fontFamily: 'monospace',
            fontSize: l.fonts.normal + 'px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight;

        // P&L display
        this.tradingPanel.pnlText = this.scene.add.text(t.x + padding, yPos, 'P&L: $0', {
            fontFamily: 'monospace',
            fontSize: l.fonts.medium + 'px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight * 1.1;

        // Unrealized P&L
        this.tradingPanel.unrealizedText = this.scene.add.text(t.x + padding, yPos, 'Unreal: --', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight;

        // Orders count
        this.tradingPanel.ordersText = this.scene.add.text(t.x + padding, yPos, 'Orders: 0', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#aaaaaa'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight;

        // Combo display
        this.tradingPanel.comboText = this.scene.add.text(t.x + padding, yPos, 'Streak: 0', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#ffcc00'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight;

        // Win rate
        this.tradingPanel.winRateText = this.scene.add.text(t.x + padding, yPos, 'Win: 0%', {
            fontFamily: 'monospace',
            fontSize: l.fonts.small + 'px',
            color: '#888888'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight * 1.2;

        // Divider
        this.tradingPanel.background.lineStyle(1, 0x444466, 0.5);
        this.tradingPanel.background.lineBetween(t.x + padding, yPos, t.x + t.width - padding, yPos);

        yPos += lineHeight * 0.5;

        // Quick action hints
        this.scene.add.text(t.x + padding, yPos, 'B:Buy X:Sell', {
            fontFamily: 'monospace',
            fontSize: l.fonts.tiny + 'px',
            color: '#44ff88'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight * 0.8;

        this.scene.add.text(t.x + padding, yPos, 'P:TP O:SL', {
            fontFamily: 'monospace',
            fontSize: l.fonts.tiny + 'px',
            color: '#ffaa44'
        }).setScrollFactor(0).setDepth(901);

        yPos += lineHeight * 0.8;

        // View mode indicator
        this.tradingPanel.viewModeText = this.scene.add.text(t.x + padding, yPos, '[C] Split', {
            fontFamily: 'monospace',
            fontSize: l.fonts.tiny + 'px',
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
            const typeIcon = position.type === 'long' ? '▲' : '▼';
            this.tradingPanel.positionText.setText(`${typeIcon} ${position.type.toUpperCase()}`);
            this.tradingPanel.positionText.setColor('#ffffff');
        } else {
            this.tradingPanel.positionText.setText('No Position');
            this.tradingPanel.positionText.setColor('#888888');
        }

        // P&L
        const totalPnL = position.realizedPnL;
        const pnlColor = totalPnL >= 0 ? '#44ff44' : '#ff4444';
        const pnlSign = totalPnL >= 0 ? '+' : '';
        this.tradingPanel.pnlText.setText(`P&L: ${pnlSign}${totalPnL.toFixed(1)}%`);
        this.tradingPanel.pnlText.setColor(pnlColor);

        // Unrealized P&L
        if (position.isOpen) {
            const uPnL = position.unrealizedPnL;
            const uColor = uPnL >= 0 ? '#88ff88' : '#ff8888';
            const uSign = uPnL >= 0 ? '+' : '';
            this.tradingPanel.unrealizedText.setText(`Unreal: ${uSign}${uPnL.toFixed(1)}%`);
            this.tradingPanel.unrealizedText.setColor(uColor);
        } else {
            this.tradingPanel.unrealizedText.setText('Unreal: --');
            this.tradingPanel.unrealizedText.setColor('#888888');
        }

        // Orders
        this.tradingPanel.ordersText.setText(`Orders: ${data.orders.pending}`);

        // Combo
        if (combo.count > 0) {
            this.tradingPanel.comboText.setText(`Streak: ${combo.count}x`);
            this.tradingPanel.comboText.setColor('#ffcc00');
        } else {
            this.tradingPanel.comboText.setText('Streak: 0');
            this.tradingPanel.comboText.setColor('#888888');
        }

        // Win rate
        this.tradingPanel.winRateText.setText(`Win: ${stats.winRate.toFixed(0)}%`);

        // View mode
        this.tradingPanel.viewModeText.setText(`[C] ${this.currentMode.name.split(' ')[0]}`);
    }

    // ========================================
    // DRIVE VIEW OVERLAY (On the road)
    // ========================================

    createDriveViewOverlay() {
        // Return level marker
        this.driveView.returnMarker = this.scene.add.graphics();
        this.driveView.returnMarker.setDepth(180);

        // P&L glow effect around car
        this.driveView.pnlGlow = this.scene.add.graphics();
        this.driveView.pnlGlow.setDepth(90);

        // Entry line
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

        // Scale factor for road elements
        const scale = this.layout.scale;

        // === P&L GLOW AROUND CAR ===
        if (tradingTerminal && tradingTerminal.position.isOpen) {
            const pnl = tradingTerminal.position.unrealizedPnL;
            const glowColor = pnl >= 0 ? 0x44ff44 : 0xff4444;
            const glowIntensity = Math.min(0.4, Math.abs(pnl) / 25);

            // Outer glow
            this.driveView.pnlGlow.fillStyle(glowColor, glowIntensity * 0.3);
            this.driveView.pnlGlow.fillCircle(carX, carY, 50 * scale);

            // Inner glow
            this.driveView.pnlGlow.fillStyle(glowColor, glowIntensity * 0.5);
            this.driveView.pnlGlow.fillCircle(carX, carY, 30 * scale);

            // === ENTRY LEVEL LINE ===
            const entryReturn = tradingTerminal.position.entryReturn;
            const currentReturn = tradingTerminal.getCurrentReturn();
            const entryYOffset = -(entryReturn - currentReturn) * 6 * scale;
            const entryY = carY + entryYOffset;

            // Draw entry line (dashed)
            this.driveView.entryGraphics.lineStyle(2, 0x4488ff, 0.6);
            for (let x = carX - 200; x < carX + 100; x += 15) {
                this.driveView.entryGraphics.lineBetween(x, entryY, x + 8, entryY);
            }
        }

        // === STOP LOSS AND TAKE PROFIT LINES ===
        if (tradingTerminal) {
            const pendingOrders = tradingTerminal.getPendingOrders();
            const currentReturn = tradingTerminal.getCurrentReturn();

            for (const order of pendingOrders) {
                const orderType = ORDER_TYPES[order.type];
                const yOffset = -(order.priceLevel - currentReturn) * 6 * scale;
                const lineY = carY + yOffset;

                if (order.type === 'STOP_LOSS') {
                    // Red dashed line
                    this.driveView.slGraphics.lineStyle(2, 0xff4444, 0.7);
                    for (let x = carX - 150; x < carX + 300; x += 15) {
                        this.driveView.slGraphics.lineBetween(x, lineY, x + 8, lineY);
                    }

                    // Shield icon
                    this.driveView.slGraphics.fillStyle(0xff4444, 0.8);
                    this.driveView.slGraphics.fillCircle(carX + 320, lineY, 8 * scale);
                }
                else if (order.type === 'TAKE_PROFIT') {
                    // Green dashed line
                    this.driveView.tpGraphics.lineStyle(2, 0x44ff44, 0.7);
                    for (let x = carX - 150; x < carX + 300; x += 15) {
                        this.driveView.tpGraphics.lineBetween(x, lineY, x + 8, lineY);
                    }

                    // Flag icon
                    this.driveView.tpGraphics.fillStyle(0x44ff44, 0.8);
                    this.driveView.tpGraphics.fillTriangle(
                        carX + 320, lineY - 10 * scale,
                        carX + 335, lineY - 5 * scale,
                        carX + 320, lineY
                    );
                }
            }
        }
    }

    // ========================================
    // SYNC ELEMENTS
    // ========================================

    createSyncElements() {
        this.syncMarker = this.scene.add.graphics();
        this.syncMarker.setScrollFactor(0).setDepth(950);
    }

    updateSyncElements() {
        // Minimal sync indicator - just update if needed
    }

    // ========================================
    // VIEW MODE CONTROL
    // ========================================

    /**
     * Set the current view mode
     */
    setViewMode(mode) {
        this.currentMode = mode;

        // Recalculate layout for new mode
        this.layout = this.calculateLayout();

        // Adjust chart scaling based on mode
        const chartScale = mode.chartRatio / 0.25;  // Relative to split mode

        if (mode === VIEW_MODES.FULL_IMMERSION) {
            // Hide all HUD elements
            this.setChartVisibility(false);
            this.setTradingPanelVisibility(false);
        } else {
            this.setChartVisibility(true);
            this.setTradingPanelVisibility(true);

            // Redraw backgrounds with new sizes
            this.layout.chart.height = screen_height * 0.22 * chartScale;
            this.drawChartBackground();
        }

        console.log(`View mode: ${mode.name}`);
    }

    setChartVisibility(visible) {
        this.chartView.background?.setVisible(visible);
        this.chartView.title?.setVisible(visible);
        this.chartView.symbolText?.setVisible(visible);
        this.chartView.priceText?.setVisible(visible);
        this.chartView.returnText?.setVisible(visible);
        this.chartView.candleGraphics?.setVisible(visible);
        this.chartView.orderGraphics?.setVisible(visible);
        this.chartView.positionGraphics?.setVisible(visible);
        this.chartView.priceScale?.setVisible(visible);
    }

    setTradingPanelVisibility(visible) {
        this.tradingPanel.background?.setVisible(visible);
        this.tradingPanel.positionText?.setVisible(visible);
        this.tradingPanel.pnlText?.setVisible(visible);
        this.tradingPanel.unrealizedText?.setVisible(visible);
        this.tradingPanel.ordersText?.setVisible(visible);
        this.tradingPanel.comboText?.setVisible(visible);
        this.tradingPanel.winRateText?.setVisible(visible);
        this.tradingPanel.viewModeText?.setVisible(visible);
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
     * Handle window resize
     */
    onResize() {
        this.layout = this.calculateLayout();
        // Would need to recreate elements for full resize support
    }

    /**
     * Clean up resources
     */
    destroy() {
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
