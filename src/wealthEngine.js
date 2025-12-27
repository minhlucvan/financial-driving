/**
 * WealthEngine - Core wealth accumulation system
 *
 * Your car is a wealth machine. The terrain is the market.
 * Drive toward financial freedom!
 */

class WealthEngine {
    constructor(config = {}) {
        // Starting wealth
        this.startingWealth = config.startingWealth || 10000;
        this.wealth = this.startingWealth;

        // Financial freedom target
        this.financialFreedomTarget = config.target || 1000000; // $1M default

        // Tracking
        this.peakWealth = this.wealth;
        this.totalDistance = 0;
        this.daysTraded = 0;
        this.crashes = 0;

        // State
        this.isRunning = true;
        this.gameResult = null; // 'freedom', 'bankrupt', 'crash_flip', 'crash_fall', 'margin_call'
        this.crashReason = null;

        // Wealth change rate (how fast wealth responds to terrain)
        this.sensitivity = config.sensitivity || 0.02; // 2% per unit slope

        // Passive income rate (small gain just for surviving)
        this.passiveRate = config.passiveRate || 0.0001; // 0.01% per tick

        // Bankruptcy threshold
        this.bankruptcyThreshold = config.bankruptcyThreshold || 100; // Game over below $100

        // === FINANCIAL POSITION ===
        // Leverage: 1.0 = no leverage, 2.0 = 2x leveraged, etc.
        // Higher leverage = faster gains/losses, less stability
        this.leverage = config.leverage || 1.0;
        this.maxLeverage = 3.0;
        this.minLeverage = 0.5;

        // Cash buffer: percentage of wealth held as cash (0-1)
        // Higher cash = more stability, slower gains
        this.cashBuffer = config.cashBuffer || 0.2; // 20% cash

        // Risk tolerance: affects margin call threshold
        this.riskTolerance = config.riskTolerance || 0.5; // 50% drawdown triggers margin call

        // Margin call threshold (drawdown % that triggers forced liquidation)
        this.marginCallThreshold = 0.4; // 40% drawdown with high leverage = margin call

        // Stability: affected by leverage and volatility
        // Lower stability = higher chance of crash on rough terrain
        this.stability = 1.0;

        // Stress level: accumulates during volatile periods
        this.stress = 0;
        this.maxStress = 100;

        // History for charts
        this.wealthHistory = [this.wealth];
        this.maxHistoryLength = 200;

        // Statistics
        this.stats = {
            maxWealth: this.wealth,
            minWealth: this.wealth,
            maxDrawdown: 0,
            totalGains: 0,
            totalLosses: 0,
            bestDay: 0,
            worstDay: 0
        };
    }

    /**
     * Adjust leverage (affects gains/losses multiplier and stability)
     */
    setLeverage(newLeverage) {
        this.leverage = Math.max(this.minLeverage, Math.min(this.maxLeverage, newLeverage));
        this.updateStability();
    }

    /**
     * Adjust cash buffer (affects stability)
     */
    setCashBuffer(newBuffer) {
        this.cashBuffer = Math.max(0, Math.min(0.5, newBuffer));
        this.updateStability();
    }

    /**
     * Update stability based on financial position
     * Stability affects how likely the car is to flip/crash
     */
    updateStability() {
        // Base stability
        let stability = 1.0;

        // Leverage reduces stability (more leverage = less stable)
        stability -= (this.leverage - 1) * 0.3;

        // Cash buffer increases stability
        stability += this.cashBuffer * 0.4;

        // Drawdown reduces stability
        const drawdown = this.getDrawdown() / 100;
        stability -= drawdown * 0.5;

        // Stress reduces stability
        stability -= (this.stress / this.maxStress) * 0.3;

        this.stability = Math.max(0.1, Math.min(1.5, stability));
        return this.stability;
    }

    /**
     * Get current stability (for crash detection)
     */
    getStability() {
        return this.updateStability();
    }

    /**
     * Add stress (from volatility, rough terrain, near-crashes)
     */
    addStress(amount) {
        this.stress = Math.min(this.maxStress, this.stress + amount);
    }

    /**
     * Reduce stress over time (recovery)
     */
    reduceStress(amount) {
        this.stress = Math.max(0, this.stress - amount);
    }

    /**
     * Check for margin call condition
     * High leverage + high drawdown = forced liquidation
     */
    checkMarginCall() {
        const drawdown = this.getDrawdown() / 100;
        const leverageRisk = (this.leverage - 1) / (this.maxLeverage - 1);

        // Margin call triggered when:
        // - High drawdown (> 30%) AND high leverage (> 1.5x)
        // - Or extreme drawdown (> 50%) at any leverage
        if (drawdown > 0.5) {
            return true;
        }
        if (drawdown > 0.3 && this.leverage > 1.5) {
            return true;
        }
        if (drawdown > this.marginCallThreshold && leverageRisk > 0.3) {
            return true;
        }

        return false;
    }

    /**
     * Trigger a crash (called from game when physical crash detected)
     */
    triggerCrash(crashType) {
        if (!this.isRunning) return;

        this.crashes++;
        this.isRunning = false;
        this.crashReason = crashType;

        switch (crashType) {
            case 'flip':
                // Over-leveraged position got wrecked
                this.gameResult = 'crash_flip';
                this.wealth = Math.max(0, this.wealth * 0.1); // Lose 90%
                break;

            case 'fall':
                // Fell off the market entirely
                this.gameResult = 'crash_fall';
                this.wealth = 0;
                break;

            case 'margin_call':
                // Forced liquidation
                this.gameResult = 'margin_call';
                this.wealth = Math.max(0, this.wealth * 0.2); // Lose 80%
                break;

            case 'stress':
                // System overload from too much volatility
                this.gameResult = 'crash_stress';
                this.wealth = Math.max(0, this.wealth * 0.5); // Lose 50%
                break;

            default:
                this.gameResult = 'crash';
                this.wealth = 0;
        }

        return this.gameResult;
    }

    /**
     * Get crash message for game over screen
     */
    getCrashMessage() {
        switch (this.gameResult) {
            case 'crash_flip':
                return {
                    title: 'OVER-LEVERAGED!',
                    subtitle: 'Your aggressive position flipped on you.',
                    lesson: 'Leverage amplifies gains AND losses. The market humbled you.'
                };
            case 'crash_fall':
                return {
                    title: 'TOTAL WIPEOUT!',
                    subtitle: 'You fell off the market entirely.',
                    lesson: 'When you lose control, there\'s no recovery.'
                };
            case 'margin_call':
                return {
                    title: 'MARGIN CALL!',
                    subtitle: 'Your broker forced liquidation.',
                    lesson: 'Borrowed money comes with strings attached.'
                };
            case 'crash_stress':
                return {
                    title: 'SYSTEM OVERLOAD!',
                    subtitle: 'Too much volatility broke your strategy.',
                    lesson: 'Even good positions fail under extreme stress.'
                };
            case 'bankrupt':
                return {
                    title: 'BANKRUPT!',
                    subtitle: 'Your wealth machine ran out of fuel.',
                    lesson: 'Slow and steady sometimes wins the race.'
                };
            default:
                return {
                    title: 'GAME OVER',
                    subtitle: 'The market claimed another victim.',
                    lesson: 'Try again with a different strategy.'
                };
        }
    }

    /**
     * Update wealth based on current terrain slope
     * @param {number} slope - Terrain slope (-32 to +32)
     * @param {number} velocity - Car velocity (faster = more exposure)
     * @param {number} volatility - Current market volatility (0-1)
     */
    update(slope, velocity = 1, volatility = 0) {
        if (!this.isRunning) return;

        // Normalize slope to return (-1 to +1 range)
        const normalizedSlope = slope / 32;

        // Calculate wealth change
        // Uphill (positive slope) = gains
        // Downhill (negative slope) = losses
        const velocityMultiplier = Math.min(Math.abs(velocity) / 5, 2); // Cap at 2x

        // Apply leverage to returns (amplifies both gains and losses!)
        const leveragedReturn = normalizedSlope * this.sensitivity * velocityMultiplier * this.leverage;

        // Cash buffer reduces exposure (only invest non-cash portion)
        const exposedPortion = 1 - this.cashBuffer;
        const dailyReturn = leveragedReturn * exposedPortion;

        // Add passive income (reward for staying in the game)
        const passiveGain = this.wealth * this.passiveRate;

        // Calculate total change
        const wealthChange = (this.wealth * dailyReturn) + passiveGain;

        // Add stress from volatility and negative returns
        if (volatility > 0.3) {
            this.addStress(volatility * 2);
        }
        if (normalizedSlope < -0.3) {
            this.addStress(Math.abs(normalizedSlope) * 3);
        }
        // Reduce stress slowly during calm periods
        if (volatility < 0.2 && normalizedSlope > 0) {
            this.reduceStress(0.5);
        }

        // Track gains/losses
        if (wealthChange > 0) {
            this.stats.totalGains += wealthChange;
            if (wealthChange > this.stats.bestDay) {
                this.stats.bestDay = wealthChange;
            }
        } else {
            this.stats.totalLosses += Math.abs(wealthChange);
            if (wealthChange < this.stats.worstDay) {
                this.stats.worstDay = wealthChange;
            }
        }

        // Apply wealth change
        this.wealth += wealthChange;
        this.daysTraded++;

        // Update peak and drawdown
        if (this.wealth > this.peakWealth) {
            this.peakWealth = this.wealth;
            this.stats.maxWealth = this.wealth;
        }

        if (this.wealth < this.stats.minWealth) {
            this.stats.minWealth = this.wealth;
        }

        const currentDrawdown = (this.peakWealth - this.wealth) / this.peakWealth;
        if (currentDrawdown > this.stats.maxDrawdown) {
            this.stats.maxDrawdown = currentDrawdown;
        }

        // Record history
        this.wealthHistory.push(this.wealth);
        if (this.wealthHistory.length > this.maxHistoryLength) {
            this.wealthHistory.shift();
        }

        // Check win/lose conditions
        this.checkGameState();

        return wealthChange;
    }

    /**
     * Check for financial freedom or bankruptcy
     */
    checkGameState() {
        // Victory: Reached financial freedom!
        if (this.wealth >= this.financialFreedomTarget) {
            this.isRunning = false;
            this.gameResult = 'freedom';
            return 'freedom';
        }

        // Defeat: Bankruptcy
        if (this.wealth <= this.bankruptcyThreshold) {
            this.isRunning = false;
            this.gameResult = 'bankrupt';
            this.wealth = 0;
            return 'bankrupt';
        }

        return null;
    }

    /**
     * Get progress toward financial freedom (0-100%)
     */
    getProgress() {
        const logStart = Math.log10(this.startingWealth);
        const logTarget = Math.log10(this.financialFreedomTarget);
        const logCurrent = Math.log10(Math.max(this.wealth, 1));

        const progress = (logCurrent - logStart) / (logTarget - logStart);
        return Math.max(0, Math.min(100, progress * 100));
    }

    /**
     * Get current drawdown percentage
     */
    getDrawdown() {
        if (this.peakWealth <= 0) return 0;
        return ((this.peakWealth - this.wealth) / this.peakWealth) * 100;
    }

    /**
     * Get formatted wealth string
     */
    getWealthDisplay() {
        if (this.wealth >= 1000000) {
            return '$' + (this.wealth / 1000000).toFixed(2) + 'M';
        } else if (this.wealth >= 1000) {
            return '$' + (this.wealth / 1000).toFixed(1) + 'K';
        } else {
            return '$' + Math.floor(this.wealth);
        }
    }

    /**
     * Get target display string
     */
    getTargetDisplay() {
        if (this.financialFreedomTarget >= 1000000) {
            return '$' + (this.financialFreedomTarget / 1000000).toFixed(0) + 'M';
        } else {
            return '$' + (this.financialFreedomTarget / 1000).toFixed(0) + 'K';
        }
    }

    /**
     * Get CAGR (Compound Annual Growth Rate)
     */
    getCAGR() {
        if (this.daysTraded < 1) return 0;
        const years = this.daysTraded / 252; // Trading days per year
        if (years < 0.01) return 0;
        const cagr = Math.pow(this.wealth / this.startingWealth, 1 / years) - 1;
        return cagr * 100;
    }

    /**
     * Get game summary for end screen
     */
    getSummary() {
        return {
            result: this.gameResult,
            crashReason: this.crashReason,
            finalWealth: this.wealth,
            startingWealth: this.startingWealth,
            target: this.financialFreedomTarget,
            progress: this.getProgress(),
            daysTraded: this.daysTraded,
            peakWealth: this.peakWealth,
            maxDrawdown: this.stats.maxDrawdown * 100,
            totalGains: this.stats.totalGains,
            totalLosses: this.stats.totalLosses,
            bestDay: this.stats.bestDay,
            worstDay: this.stats.worstDay,
            cagr: this.getCAGR(),
            leverage: this.leverage,
            cashBuffer: this.cashBuffer,
            crashes: this.crashes
        };
    }

    /**
     * Reset for new game
     */
    reset(config = {}) {
        this.startingWealth = config.startingWealth || this.startingWealth;
        this.financialFreedomTarget = config.target || this.financialFreedomTarget;
        this.wealth = this.startingWealth;
        this.peakWealth = this.wealth;
        this.totalDistance = 0;
        this.daysTraded = 0;
        this.crashes = 0;
        this.isRunning = true;
        this.gameResult = null;
        this.crashReason = null;
        this.wealthHistory = [this.wealth];

        // Reset financial position
        this.leverage = config.leverage || 1.0;
        this.cashBuffer = config.cashBuffer || 0.2;
        this.stability = 1.0;
        this.stress = 0;

        this.stats = {
            maxWealth: this.wealth,
            minWealth: this.wealth,
            maxDrawdown: 0,
            totalGains: 0,
            totalLosses: 0,
            bestDay: 0,
            worstDay: 0
        };
    }
}

// Global instance
var wealthEngine = null;
