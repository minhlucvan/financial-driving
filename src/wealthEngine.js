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
        this.gameResult = null; // 'freedom', 'bankrupt', null

        // Wealth change rate (how fast wealth responds to terrain)
        this.sensitivity = config.sensitivity || 0.02; // 2% per unit slope

        // Passive income rate (small gain just for surviving)
        this.passiveRate = config.passiveRate || 0.0001; // 0.01% per tick

        // Bankruptcy threshold
        this.bankruptcyThreshold = config.bankruptcyThreshold || 100; // Game over below $100

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
     * Update wealth based on current terrain slope
     * @param {number} slope - Terrain slope (-32 to +32)
     * @param {number} velocity - Car velocity (faster = more exposure)
     */
    update(slope, velocity = 1) {
        if (!this.isRunning) return;

        // Normalize slope to return (-1 to +1 range)
        const normalizedSlope = slope / 32;

        // Calculate wealth change
        // Uphill (positive slope) = gains
        // Downhill (negative slope) = losses
        const velocityMultiplier = Math.min(Math.abs(velocity) / 5, 2); // Cap at 2x
        const dailyReturn = normalizedSlope * this.sensitivity * velocityMultiplier;

        // Add passive income (reward for staying in the game)
        const passiveGain = this.wealth * this.passiveRate;

        // Calculate total change
        const wealthChange = (this.wealth * dailyReturn) + passiveGain;

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
            cagr: this.getCAGR()
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
        this.wealthHistory = [this.wealth];

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
