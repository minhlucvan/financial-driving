/**
 * TradingTerminal - Draw-to-Trade Order Management System
 *
 * Core concept: Players draw orders on the chart, which become
 * physical road elements they must drive through.
 *
 * Order Types:
 * - Entry (Limit/Market) -> Boost pads on road
 * - Stop Loss -> Safety barriers
 * - Take Profit -> Checkpoints/flags
 * - Trailing Stop -> Moving barriers
 */

// Order states
const ORDER_STATE = {
    PENDING: 'pending',      // Waiting to be triggered
    ACTIVE: 'active',        // Position is open
    FILLED: 'filled',        // Order completed
    CANCELLED: 'cancelled',  // Order removed
    TRIGGERED: 'triggered'   // Stop/TP hit
};

// Order types mapped to road elements
const ORDER_TYPES = {
    MARKET_BUY: {
        name: 'Market Buy',
        icon: '🚀',
        roadElement: 'boost_pad',
        color: 0x44ff44,
        description: 'Instant entry - immediate execution'
    },
    MARKET_SELL: {
        name: 'Market Sell',
        icon: '⬇️',
        roadElement: 'exit_pad',
        color: 0xff4444,
        description: 'Close position immediately'
    },
    LIMIT_BUY: {
        name: 'Limit Buy',
        icon: '🎯',
        roadElement: 'boost_pad',
        color: 0x44ff88,
        description: 'Buy at specific price level'
    },
    LIMIT_SELL: {
        name: 'Limit Sell',
        icon: '💰',
        roadElement: 'checkpoint',
        color: 0xffcc44,
        description: 'Sell at target price'
    },
    STOP_LOSS: {
        name: 'Stop Loss',
        icon: '🛡️',
        roadElement: 'barrier',
        color: 0xff6644,
        description: 'Auto-exit to limit loss'
    },
    TAKE_PROFIT: {
        name: 'Take Profit',
        icon: '🏁',
        roadElement: 'checkpoint',
        color: 0x44ffcc,
        description: 'Auto-exit at profit target'
    },
    TRAILING_STOP: {
        name: 'Trailing Stop',
        icon: '👻',
        roadElement: 'moving_barrier',
        color: 0xaa88ff,
        description: 'Dynamic stop that follows price'
    }
};

class TradingTerminal {
    constructor(scene) {
        this.scene = scene;

        // === POSITION STATE ===
        this.position = {
            isOpen: false,
            type: null,           // 'long' or 'short'
            entryPrice: 0,
            entryReturn: 0,       // Accumulated return at entry
            size: 0,              // Position size (% of capital)
            unrealizedPnL: 0,     // Current P&L
            realizedPnL: 0        // Closed trade P&L
        };

        // === ORDERS ===
        this.orders = [];         // All orders (pending + active)
        this.orderIdCounter = 0;

        // === ORDER ROAD ELEMENTS ===
        // These are the physical game objects on the road
        this.roadElements = [];

        // === TRADE HISTORY ===
        this.tradeHistory = [];
        this.maxHistoryLength = 100;

        // === DRAWING STATE ===
        this.isDrawing = false;
        this.drawingType = null;
        this.drawStart = { x: 0, y: 0, price: 0 };
        this.drawPreview = null;

        // === SETTINGS ===
        this.settings = {
            defaultPositionSize: 0.1,  // 10% of capital
            maxOrders: 10,
            slippagePercent: 0.1,      // 0.1% slippage on market orders
            executionDelay: 100,       // ms delay for order execution
            showOrderLabels: true
        };

        // === STATISTICS ===
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalPnL: 0,
            bestTrade: 0,
            worstTrade: 0,
            avgWin: 0,
            avgLoss: 0,
            winRate: 0,
            currentStreak: 0,
            bestStreak: 0
        };

        // === COMBO SYSTEM ===
        this.combo = {
            count: 0,
            multiplier: 1.0,
            lastTradeProfit: false,
            streakBonus: 0
        };

        // === VISUAL ELEMENTS ===
        this.graphics = null;
        this.orderLabels = [];

        this.initialize();
    }

    initialize() {
        // Create graphics object for drawing orders
        if (this.scene) {
            this.graphics = this.scene.add.graphics();
            this.graphics.setDepth(200);
        }
    }

    // ========================================
    // ORDER CREATION
    // ========================================

    /**
     * Create a new order
     * @param {string} type - Order type from ORDER_TYPES
     * @param {number} priceLevel - Price level (as return %)
     * @param {Object} options - Additional options
     */
    createOrder(type, priceLevel, options = {}) {
        if (this.orders.length >= this.settings.maxOrders) {
            console.warn('Maximum orders reached');
            return null;
        }

        const orderType = ORDER_TYPES[type];
        if (!orderType) {
            console.error('Unknown order type:', type);
            return null;
        }

        const order = {
            id: ++this.orderIdCounter,
            type: type,
            priceLevel: priceLevel,          // As accumulated return %
            size: options.size || this.settings.defaultPositionSize,
            state: ORDER_STATE.PENDING,
            createdAt: Date.now(),
            triggeredAt: null,
            roadElement: null,               // Will hold the road object
            label: null,                     // Visual label

            // For stop loss / take profit
            linkedOrderId: options.linkedOrderId || null,

            // For trailing stops
            trailingDistance: options.trailingDistance || 5,  // % distance
            highWaterMark: priceLevel,

            // Visual position on road (calculated later)
            roadX: 0,
            roadY: 0
        };

        this.orders.push(order);

        // Create road element for this order
        this.createRoadElement(order);

        console.log(`Order created: ${orderType.name} at ${priceLevel.toFixed(2)}%`);

        return order;
    }

    /**
     * Quick market buy at current price
     */
    marketBuy(size = null) {
        const currentReturn = this.getCurrentReturn();
        const order = this.createOrder('MARKET_BUY', currentReturn, {
            size: size || this.settings.defaultPositionSize
        });

        // Market orders execute immediately
        if (order) {
            this.executeOrder(order);
        }

        return order;
    }

    /**
     * Quick market sell (close position)
     */
    marketSell() {
        if (!this.position.isOpen) {
            console.warn('No position to close');
            return null;
        }

        const currentReturn = this.getCurrentReturn();
        const order = this.createOrder('MARKET_SELL', currentReturn);

        if (order) {
            this.executeOrder(order);
        }

        return order;
    }

    /**
     * Place a limit buy order at specified return level
     */
    limitBuy(returnLevel, size = null) {
        return this.createOrder('LIMIT_BUY', returnLevel, {
            size: size || this.settings.defaultPositionSize
        });
    }

    /**
     * Place a stop loss order
     */
    stopLoss(returnLevel) {
        if (!this.position.isOpen) {
            console.warn('No position for stop loss');
            return null;
        }

        return this.createOrder('STOP_LOSS', returnLevel, {
            linkedOrderId: this.position.entryOrderId
        });
    }

    /**
     * Place a take profit order
     */
    takeProfit(returnLevel) {
        if (!this.position.isOpen) {
            console.warn('No position for take profit');
            return null;
        }

        return this.createOrder('TAKE_PROFIT', returnLevel, {
            linkedOrderId: this.position.entryOrderId
        });
    }

    /**
     * Place a bracket order (entry + SL + TP)
     */
    bracketOrder(entryLevel, stopLevel, targetLevel, size = null) {
        const entry = this.limitBuy(entryLevel, size);
        if (!entry) return null;

        // Stop loss and take profit will be activated when entry fills
        entry.pendingStopLoss = stopLevel;
        entry.pendingTakeProfit = targetLevel;

        return entry;
    }

    // ========================================
    // ORDER EXECUTION
    // ========================================

    /**
     * Execute an order (fill it)
     */
    executeOrder(order) {
        if (order.state !== ORDER_STATE.PENDING) return;

        const currentReturn = this.getCurrentReturn();

        // Apply slippage for market orders
        let fillPrice = order.priceLevel;
        if (order.type === 'MARKET_BUY' || order.type === 'MARKET_SELL') {
            const slippage = this.settings.slippagePercent * (Math.random() - 0.5) * 2;
            fillPrice += slippage;
        }

        order.fillPrice = fillPrice;
        order.triggeredAt = Date.now();
        order.state = ORDER_STATE.FILLED;

        // Handle based on order type
        if (order.type === 'MARKET_BUY' || order.type === 'LIMIT_BUY') {
            this.openPosition('long', fillPrice, order.size, order.id);

            // Activate pending bracket orders
            if (order.pendingStopLoss !== undefined) {
                this.stopLoss(order.pendingStopLoss);
            }
            if (order.pendingTakeProfit !== undefined) {
                this.takeProfit(order.pendingTakeProfit);
            }
        }
        else if (order.type === 'MARKET_SELL' || order.type === 'STOP_LOSS' || order.type === 'TAKE_PROFIT') {
            this.closePosition(fillPrice, order.type);
        }

        // Update road element to show filled state
        this.updateRoadElementState(order, 'filled');

        // Play fill effect
        this.playOrderFillEffect(order);
    }

    /**
     * Open a new position
     */
    openPosition(type, entryReturn, size, orderId) {
        if (this.position.isOpen) {
            console.warn('Position already open');
            return;
        }

        this.position = {
            isOpen: true,
            type: type,
            entryPrice: entryReturn,
            entryReturn: entryReturn,
            size: size,
            unrealizedPnL: 0,
            realizedPnL: this.position.realizedPnL,
            entryOrderId: orderId,
            openedAt: Date.now()
        };

        console.log(`Position opened: ${type} at ${entryReturn.toFixed(2)}%`);
    }

    /**
     * Close the current position
     */
    closePosition(exitReturn, reason = 'manual') {
        if (!this.position.isOpen) return;

        const pnl = this.calculatePnL(exitReturn);

        // Record trade
        const trade = {
            id: this.tradeHistory.length + 1,
            type: this.position.type,
            entryReturn: this.position.entryReturn,
            exitReturn: exitReturn,
            pnl: pnl,
            pnlPercent: pnl / this.position.size * 100,
            size: this.position.size,
            duration: Date.now() - this.position.openedAt,
            reason: reason,
            closedAt: Date.now()
        };

        this.tradeHistory.push(trade);
        if (this.tradeHistory.length > this.maxHistoryLength) {
            this.tradeHistory.shift();
        }

        // Update statistics
        this.updateStats(trade);

        // Update combo
        this.updateCombo(pnl > 0);

        // Clear position
        this.position.realizedPnL += pnl;
        this.position.isOpen = false;
        this.position.type = null;
        this.position.unrealizedPnL = 0;

        // Cancel related orders (SL/TP)
        this.cancelRelatedOrders(this.position.entryOrderId);

        console.log(`Position closed: ${reason} at ${exitReturn.toFixed(2)}%, P&L: ${pnl.toFixed(2)}%`);

        return trade;
    }

    /**
     * Calculate P&L for current position
     */
    calculatePnL(currentReturn) {
        if (!this.position.isOpen) return 0;

        const diff = currentReturn - this.position.entryReturn;

        if (this.position.type === 'long') {
            return diff * this.position.size;
        } else {
            return -diff * this.position.size;
        }
    }

    // ========================================
    // ORDER CHECKING & UPDATES
    // ========================================

    /**
     * Check all pending orders against current price
     * Called each frame
     */
    update(currentReturn, carX) {
        // Update unrealized P&L
        if (this.position.isOpen) {
            this.position.unrealizedPnL = this.calculatePnL(currentReturn);
        }

        // Check pending orders
        for (const order of this.orders) {
            if (order.state !== ORDER_STATE.PENDING) continue;

            // Check if order should trigger
            if (this.shouldTrigger(order, currentReturn)) {
                this.executeOrder(order);
            }

            // Update trailing stops
            if (order.type === 'TRAILING_STOP') {
                this.updateTrailingStop(order, currentReturn);
            }

            // Update road element positions
            this.updateRoadElementPosition(order, carX);
        }

        // Update visual elements
        this.updateVisuals(currentReturn, carX);
    }

    /**
     * Check if order should trigger
     */
    shouldTrigger(order, currentReturn) {
        switch (order.type) {
            case 'LIMIT_BUY':
                // Trigger if price falls to or below limit
                return currentReturn <= order.priceLevel;

            case 'STOP_LOSS':
                // Trigger if price falls to or below stop
                return this.position.type === 'long' && currentReturn <= order.priceLevel;

            case 'TAKE_PROFIT':
                // Trigger if price rises to or above target
                return this.position.type === 'long' && currentReturn >= order.priceLevel;

            case 'TRAILING_STOP':
                // Trigger if price falls below trailing level
                return currentReturn <= order.priceLevel;

            default:
                return false;
        }
    }

    /**
     * Update trailing stop position
     */
    updateTrailingStop(order, currentReturn) {
        if (currentReturn > order.highWaterMark) {
            order.highWaterMark = currentReturn;
            order.priceLevel = currentReturn - order.trailingDistance;

            // Update road element
            if (order.roadElement) {
                this.updateRoadElementPosition(order, this.scene?.cameras?.main?.scrollX || 0);
            }
        }
    }

    /**
     * Cancel an order
     */
    cancelOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order || order.state !== ORDER_STATE.PENDING) return false;

        order.state = ORDER_STATE.CANCELLED;
        this.destroyRoadElement(order);

        console.log(`Order cancelled: #${orderId}`);
        return true;
    }

    /**
     * Cancel all pending orders
     */
    cancelAllOrders() {
        for (const order of this.orders) {
            if (order.state === ORDER_STATE.PENDING) {
                this.cancelOrder(order.id);
            }
        }
    }

    /**
     * Cancel orders related to a position
     */
    cancelRelatedOrders(positionOrderId) {
        for (const order of this.orders) {
            if (order.linkedOrderId === positionOrderId && order.state === ORDER_STATE.PENDING) {
                this.cancelOrder(order.id);
            }
        }
    }

    // ========================================
    // ROAD ELEMENTS (Visual on terrain)
    // ========================================

    /**
     * Create a road element for an order
     */
    createRoadElement(order) {
        if (!this.scene) return;

        const orderType = ORDER_TYPES[order.type];
        const elementType = orderType.roadElement;

        // Calculate position on road
        const pos = this.returnToRoadPosition(order.priceLevel);
        order.roadX = pos.x;
        order.roadY = pos.y;

        let element = null;

        switch (elementType) {
            case 'boost_pad':
                element = this.createBoostPad(order, pos);
                break;
            case 'barrier':
                element = this.createBarrier(order, pos);
                break;
            case 'checkpoint':
                element = this.createCheckpoint(order, pos);
                break;
            case 'moving_barrier':
                element = this.createMovingBarrier(order, pos);
                break;
            case 'exit_pad':
                element = this.createExitPad(order, pos);
                break;
        }

        order.roadElement = element;

        // Create label
        if (this.settings.showOrderLabels) {
            this.createOrderLabel(order);
        }

        this.roadElements.push({ order, element });
    }

    /**
     * Create a boost pad (for entry orders)
     */
    createBoostPad(order, pos) {
        const orderType = ORDER_TYPES[order.type];

        // Create a glowing platform
        const graphics = this.scene.add.graphics();
        graphics.setDepth(150);

        // Outer glow
        graphics.fillStyle(orderType.color, 0.3);
        graphics.fillRoundedRect(pos.x - 40, pos.y - 8, 80, 16, 4);

        // Inner pad
        graphics.fillStyle(orderType.color, 0.8);
        graphics.fillRoundedRect(pos.x - 35, pos.y - 5, 70, 10, 3);

        // Arrow indicator
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillTriangle(
            pos.x, pos.y - 15,
            pos.x - 8, pos.y - 5,
            pos.x + 8, pos.y - 5
        );

        return graphics;
    }

    /**
     * Create a safety barrier (for stop loss)
     */
    createBarrier(order, pos) {
        const orderType = ORDER_TYPES[order.type];

        const graphics = this.scene.add.graphics();
        graphics.setDepth(150);

        // Warning stripes
        const stripeWidth = 10;
        for (let i = 0; i < 8; i++) {
            const color = i % 2 === 0 ? 0xff4444 : 0xffff44;
            graphics.fillStyle(color, 0.9);
            graphics.fillRect(pos.x - 40 + i * stripeWidth, pos.y - 20, stripeWidth, 40);
        }

        // Border
        graphics.lineStyle(3, 0xff0000, 1);
        graphics.strokeRect(pos.x - 40, pos.y - 20, 80, 40);

        // Shield icon
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(pos.x, pos.y, 12);
        graphics.fillStyle(orderType.color, 1);
        graphics.fillCircle(pos.x, pos.y, 8);

        return graphics;
    }

    /**
     * Create a checkpoint (for take profit)
     */
    createCheckpoint(order, pos) {
        const orderType = ORDER_TYPES[order.type];

        const graphics = this.scene.add.graphics();
        graphics.setDepth(150);

        // Flag pole
        graphics.fillStyle(0x888888, 1);
        graphics.fillRect(pos.x - 2, pos.y - 60, 4, 60);

        // Flag
        graphics.fillStyle(orderType.color, 0.9);
        graphics.fillTriangle(
            pos.x + 2, pos.y - 60,
            pos.x + 35, pos.y - 45,
            pos.x + 2, pos.y - 30
        );

        // Checkered base
        const squareSize = 8;
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 6; col++) {
                const color = (row + col) % 2 === 0 ? 0xffffff : 0x000000;
                graphics.fillStyle(color, 0.9);
                graphics.fillRect(
                    pos.x - 24 + col * squareSize,
                    pos.y - 8 + row * squareSize,
                    squareSize, squareSize
                );
            }
        }

        return graphics;
    }

    /**
     * Create a moving barrier (for trailing stop)
     */
    createMovingBarrier(order, pos) {
        const orderType = ORDER_TYPES[order.type];

        const graphics = this.scene.add.graphics();
        graphics.setDepth(150);

        // Ghost-like barrier with trail effect
        graphics.fillStyle(orderType.color, 0.2);
        graphics.fillRoundedRect(pos.x - 50, pos.y - 15, 100, 30, 8);

        graphics.fillStyle(orderType.color, 0.4);
        graphics.fillRoundedRect(pos.x - 40, pos.y - 12, 80, 24, 6);

        graphics.fillStyle(orderType.color, 0.7);
        graphics.fillRoundedRect(pos.x - 30, pos.y - 8, 60, 16, 4);

        // Trail dots
        for (let i = 0; i < 5; i++) {
            graphics.fillStyle(orderType.color, 0.5 - i * 0.1);
            graphics.fillCircle(pos.x - 50 - i * 15, pos.y, 5 - i);
        }

        return graphics;
    }

    /**
     * Create an exit pad (for sell orders)
     */
    createExitPad(order, pos) {
        const orderType = ORDER_TYPES[order.type];

        const graphics = this.scene.add.graphics();
        graphics.setDepth(150);

        // Red exit platform
        graphics.fillStyle(orderType.color, 0.3);
        graphics.fillRoundedRect(pos.x - 40, pos.y - 8, 80, 16, 4);

        graphics.fillStyle(orderType.color, 0.8);
        graphics.fillRoundedRect(pos.x - 35, pos.y - 5, 70, 10, 3);

        // Down arrow
        graphics.fillStyle(0xffffff, 0.9);
        graphics.fillTriangle(
            pos.x, pos.y + 15,
            pos.x - 8, pos.y + 5,
            pos.x + 8, pos.y + 5
        );

        return graphics;
    }

    /**
     * Create order label
     */
    createOrderLabel(order) {
        if (!this.scene) return;

        const orderType = ORDER_TYPES[order.type];
        const pos = this.returnToRoadPosition(order.priceLevel);

        const label = this.scene.add.text(pos.x, pos.y - 30,
            `${orderType.icon} ${order.priceLevel.toFixed(1)}%`, {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(160);

        order.label = label;
        this.orderLabels.push(label);
    }

    /**
     * Update road element position (for scrolling)
     */
    updateRoadElementPosition(order, carX) {
        // Road elements are positioned based on return level, not car position
        // They stay in place as the market moves
    }

    /**
     * Update road element visual state
     */
    updateRoadElementState(order, state) {
        if (!order.roadElement) return;

        if (state === 'filled') {
            // Flash effect then fade
            this.scene.tweens.add({
                targets: order.roadElement,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => {
                    this.destroyRoadElement(order);
                }
            });
        }
    }

    /**
     * Destroy a road element
     */
    destroyRoadElement(order) {
        if (order.roadElement) {
            order.roadElement.destroy();
            order.roadElement = null;
        }
        if (order.label) {
            order.label.destroy();
            order.label = null;
        }
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    /**
     * Get current accumulated return from market terrain
     */
    getCurrentReturn() {
        if (!marketTerrainGenerator) return 0;
        const metadata = marketTerrainGenerator.getTerrainMetadata();
        return metadata?.cumulativeReturn || 0;
    }

    /**
     * Convert return level to road position
     */
    returnToRoadPosition(returnLevel) {
        // Get car position as reference
        const carX = vehicle?.mainBody?.x || 600;
        const carY = vehicle?.mainBody?.y || 400;

        // Calculate Y offset based on return difference
        const currentReturn = this.getCurrentReturn();
        const returnDiff = returnLevel - currentReturn;

        // Map return to Y position (higher return = higher on screen = lower Y)
        const yOffset = -returnDiff * 8;  // 8 pixels per 1% return

        return {
            x: carX + 200,  // Orders appear ahead of car
            y: carY + yOffset
        };
    }

    /**
     * Play order fill effect
     */
    playOrderFillEffect(order) {
        if (!this.scene || !order.roadElement) return;

        const pos = this.returnToRoadPosition(order.priceLevel);
        const orderType = ORDER_TYPES[order.type];

        // Create burst effect
        const burst = this.scene.add.graphics();
        burst.setDepth(170);
        burst.fillStyle(orderType.color, 1);
        burst.fillCircle(pos.x, pos.y, 5);

        this.scene.tweens.add({
            targets: burst,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => burst.destroy()
        });

        // Screen flash for important orders
        if (order.type === 'STOP_LOSS' || order.type === 'TAKE_PROFIT') {
            this.scene.cameras.main.flash(100,
                (orderType.color >> 16) & 0xff,
                (orderType.color >> 8) & 0xff,
                orderType.color & 0xff
            );
        }
    }

    /**
     * Update visual elements
     */
    updateVisuals(currentReturn, carX) {
        // Update pending order labels with current distance
        for (const order of this.orders) {
            if (order.state !== ORDER_STATE.PENDING || !order.label) continue;

            const distance = order.priceLevel - currentReturn;
            const orderType = ORDER_TYPES[order.type];
            const distStr = distance >= 0 ? `+${distance.toFixed(1)}%` : `${distance.toFixed(1)}%`;

            order.label.setText(`${orderType.icon} ${order.priceLevel.toFixed(1)}% (${distStr})`);
        }
    }

    // ========================================
    // STATISTICS & COMBO
    // ========================================

    updateStats(trade) {
        this.stats.totalTrades++;
        this.stats.totalPnL += trade.pnl;

        if (trade.pnl > 0) {
            this.stats.winningTrades++;
            this.stats.avgWin = (this.stats.avgWin * (this.stats.winningTrades - 1) + trade.pnl) / this.stats.winningTrades;
            if (trade.pnl > this.stats.bestTrade) this.stats.bestTrade = trade.pnl;
        } else {
            this.stats.losingTrades++;
            this.stats.avgLoss = (this.stats.avgLoss * (this.stats.losingTrades - 1) + trade.pnl) / this.stats.losingTrades;
            if (trade.pnl < this.stats.worstTrade) this.stats.worstTrade = trade.pnl;
        }

        this.stats.winRate = this.stats.totalTrades > 0
            ? (this.stats.winningTrades / this.stats.totalTrades) * 100
            : 0;
    }

    updateCombo(isWin) {
        if (isWin) {
            this.combo.count++;
            this.combo.multiplier = 1 + (this.combo.count * 0.1);  // +10% per streak
            this.combo.streakBonus = this.combo.count * 5;  // +5 XP per streak

            if (this.combo.count > this.stats.bestStreak) {
                this.stats.bestStreak = this.combo.count;
            }
            this.stats.currentStreak = this.combo.count;
        } else {
            this.combo.count = 0;
            this.combo.multiplier = 1.0;
            this.combo.streakBonus = 0;
            this.stats.currentStreak = 0;
        }

        this.combo.lastTradeProfit = isWin;
    }

    // ========================================
    // PUBLIC GETTERS
    // ========================================

    getPosition() {
        return { ...this.position };
    }

    getPendingOrders() {
        return this.orders.filter(o => o.state === ORDER_STATE.PENDING);
    }

    getStats() {
        return { ...this.stats };
    }

    getCombo() {
        return { ...this.combo };
    }

    getTradeHistory() {
        return [...this.tradeHistory];
    }

    /**
     * Get display data for HUD
     */
    getDisplayData() {
        const currentReturn = this.getCurrentReturn();

        return {
            position: {
                isOpen: this.position.isOpen,
                type: this.position.type,
                entryReturn: this.position.entryReturn,
                unrealizedPnL: this.position.unrealizedPnL,
                realizedPnL: this.position.realizedPnL
            },
            orders: {
                pending: this.getPendingOrders().length,
                total: this.orders.length
            },
            stats: this.stats,
            combo: this.combo,
            currentReturn: currentReturn
        };
    }

    /**
     * Reset terminal state
     */
    reset() {
        // Clear orders and elements
        for (const order of this.orders) {
            this.destroyRoadElement(order);
        }
        this.orders = [];

        // Reset position
        this.position = {
            isOpen: false,
            type: null,
            entryPrice: 0,
            entryReturn: 0,
            size: 0,
            unrealizedPnL: 0,
            realizedPnL: 0
        };

        // Reset combo (keep stats for learning)
        this.combo = {
            count: 0,
            multiplier: 1.0,
            lastTradeProfit: false,
            streakBonus: 0
        };
    }
}

// Global instance
var tradingTerminal = null;
