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

        // === MARGIN CALL MECHANICS ===
        // In real trading, leverage determines how much drawdown you can survive:
        // - 1x leverage: No margin call from drawdown (you own everything)
        // - 2x leverage: 50% drawdown = 100% equity loss = margin call
        // - 3x leverage: 33% drawdown = 100% equity loss = margin call
        // Formula: max_safe_drawdown = (1 / leverage) - buffer
        // We add a 10% buffer so margin call triggers slightly before total wipeout
        this.marginCallBuffer = 0.10; // 10% safety buffer before actual wipeout

        // === GAIN-LOSS ASYMMETRY (Core Financial Truth) ===
        //
        // MATHEMATICAL LAW: A loss of L% requires a gain of L/(1-L)% to recover
        //   -20% loss → need +25% gain to recover
        //   -50% loss → need +100% gain to recover (!)
        //   -90% loss → need +900% gain to recover (!!)
        //
        // PSYCHOLOGICAL LAW (Prospect Theory / Kahneman-Tversky):
        //   Losses are felt ~2.25x more intensely than equivalent gains
        //   λ ≈ 2.25 (loss aversion coefficient)
        //
        // This asymmetry is WHY drawdown control dominates long-term performance.
        this.lossAversionLambda = 2.25; // Kahneman-Tversky empirical value

        // Track recovery state
        this.inRecoveryMode = false;  // True when in drawdown
        this.recoveryTarget = 0;      // The gain % needed to recover

        // Liquidation proximity (0 = safe, 1 = margin call imminent)
        this.liquidationProximity = 0;

        // Stability: affected by leverage and volatility
        // Lower stability = higher chance of crash on rough terrain
        this.stability = 1.0;

        // Stress level: accumulates during volatile periods
        this.stress = 0;
        this.maxStress = 100;

        // === WATER LEVEL (Baseline Interest) ===
        // The water represents what your money SHOULD be worth
        // if it just grew at the baseline rate (inflation + risk-free rate)
        // You must beat this to have REAL gains!
        this.baselineRate = config.baselineRate || 0.0003; // ~7.5% annual (0.03% per day)
        this.waterLevel = this.startingWealth; // Starts at same level as wealth
        this.waterRiseSpeed = 1.0; // Multiplier for water rise speed

        // How far above/below water you are (for visual positioning)
        this.waterMargin = 0; // positive = above water, negative = drowning

        // Grace period before drowning kills you (in ticks)
        this.drowningTimer = 0;
        this.maxDrowningTime = 60; // ~1 second at 60fps before game over

        // History for charts
        this.wealthHistory = [this.wealth];
        this.waterHistory = [this.waterLevel];
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
     *
     * KEY INSIGHT: Leverage makes you MORE sensitive to drawdowns
     * A 20% drawdown at 3x leverage is MUCH more destabilizing than at 1x
     */
    updateStability() {
        // Base stability
        let stability = 1.0;

        // === LEVERAGE EFFECT ON STABILITY ===
        // Higher leverage = less stable (borrowed money makes you nervous)
        // But the REAL danger is leverage COMBINED with drawdown
        const leveragePenalty = (this.leverage - 1) * 0.2;
        stability -= leveragePenalty;

        // === LIQUIDATION PROXIMITY EFFECT ===
        // As you approach margin call, stability drops dramatically
        // This creates the "walking on thin ice" feeling
        const proximity = this.getLiquidationProximity();
        const proximityPenalty = proximity * proximity * 0.6; // Exponential - gets scary fast
        stability -= proximityPenalty;

        // === DRAWDOWN + LEVERAGE INTERACTION ===
        // Drawdown hurts more when leveraged (psychological pressure)
        const drawdown = this.getDrawdown() / 100;
        const leveragedDrawdownPenalty = drawdown * this.leverage * 0.3;
        stability -= leveragedDrawdownPenalty;

        // Cash buffer increases stability (safety cushion)
        stability += this.cashBuffer * 0.5;

        // Stress reduces stability
        stability -= (this.stress / this.maxStress) * 0.2;

        // Clamp to valid range
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

    // ========================================
    // GAIN-LOSS ASYMMETRY METHODS
    // ========================================

    /**
     * Calculate the gain required to recover from a loss (Mathematical Law)
     *
     * Formula: Recovery% = L / (1 - L)
     *
     * Examples:
     *   -10% loss → need +11.1% to recover
     *   -20% loss → need +25% to recover
     *   -50% loss → need +100% to recover
     *   -90% loss → need +900% to recover
     *
     * @param {number} lossPercent - Loss as decimal (0.20 = 20% loss)
     * @returns {number} Required gain as decimal
     */
    calculateRecoveryNeeded(lossPercent) {
        if (lossPercent <= 0) return 0;
        if (lossPercent >= 1) return Infinity;
        return lossPercent / (1 - lossPercent);
    }

    /**
     * Get current recovery needed to reach peak wealth
     * @returns {Object} Recovery info with percentage and multiplier
     */
    getRecoveryInfo() {
        const drawdown = this.getDrawdown() / 100; // Convert to decimal

        if (drawdown <= 0) {
            this.inRecoveryMode = false;
            this.recoveryTarget = 0;
            return {
                inRecovery: false,
                drawdownPercent: 0,
                recoveryNeeded: 0,
                recoveryMultiplier: 1,
                difficultyLabel: 'AT PEAK'
            };
        }

        this.inRecoveryMode = true;
        const recoveryNeeded = this.calculateRecoveryNeeded(drawdown);
        this.recoveryTarget = recoveryNeeded * 100;

        // The "multiplier" shows how much harder recovery is than the loss
        // e.g., 50% loss needs 100% gain = 2x harder
        const multiplier = recoveryNeeded / drawdown;

        // Label the difficulty
        let difficultyLabel = 'EASY';
        if (recoveryNeeded > 0.5) difficultyLabel = 'MODERATE';
        if (recoveryNeeded > 1.0) difficultyLabel = 'HARD';
        if (recoveryNeeded > 2.0) difficultyLabel = 'BRUTAL';
        if (recoveryNeeded > 5.0) difficultyLabel = 'NEARLY IMPOSSIBLE';

        return {
            inRecovery: true,
            drawdownPercent: drawdown * 100,
            recoveryNeeded: recoveryNeeded * 100,
            recoveryMultiplier: multiplier,
            difficultyLabel: difficultyLabel
        };
    }

    /**
     * Apply loss aversion weighting to a value change (Psychological Law)
     *
     * Prospect Theory value function (simplified):
     *   v(x) = x^α           if x >= 0 (gains)
     *   v(x) = -λ|x|^α       if x < 0  (losses)
     *
     * With λ ≈ 2.25, losses FEEL 2.25x more painful than equivalent gains feel good
     *
     * @param {number} change - The raw wealth change
     * @returns {number} The "felt" psychological impact
     */
    applyLossAversion(change) {
        const alpha = 0.88; // Risk aversion parameter (empirical)

        if (change >= 0) {
            // Gains: diminishing sensitivity
            return Math.pow(change, alpha);
        } else {
            // Losses: amplified by lambda, diminishing sensitivity
            return -this.lossAversionLambda * Math.pow(Math.abs(change), alpha);
        }
    }

    /**
     * Get the "recovery drag" - how much harder the climb feels when in drawdown
     *
     * This simulates the PHYSICAL feeling that:
     * - Falling is fast (gravity helps)
     * - Climbing back is slow (fighting gravity)
     *
     * Used to modify car physics in recovery mode.
     *
     * @returns {number} Drag multiplier (1.0 = normal, >1 = harder to accelerate)
     */
    getRecoveryDrag() {
        if (!this.inRecoveryMode) return 1.0;

        const recovery = this.getRecoveryInfo();

        // The further into drawdown, the harder to climb back
        // At 50% drawdown (needs 100% recovery), drag = 1.5x
        // At 90% drawdown (needs 900% recovery), drag = 2.0x (capped)
        const drag = 1.0 + (recovery.recoveryMultiplier - 1) * 0.25;

        return Math.min(2.0, Math.max(1.0, drag));
    }

    /**
     * Get the maximum drawdown before margin call based on leverage
     * This is the core realistic leverage mechanic:
     * - 1x leverage: 100% drawdown allowed (no borrowed money)
     * - 2x leverage: 50% drawdown = wipeout
     * - 3x leverage: 33% drawdown = wipeout
     *
     * @returns {number} Maximum safe drawdown as decimal (0-1)
     */
    getMaxSafeDrawdown() {
        if (this.leverage <= 1) {
            // No leverage = can survive any drawdown (just lose your own money)
            return 0.95; // 95% - leave some buffer before bankruptcy
        }

        // With leverage: max_drawdown = 1 / leverage
        // Example: 3x leverage means 33% drop wipes you out
        const theoreticalMax = 1 / this.leverage;

        // Apply buffer so we trigger margin call BEFORE total wipeout
        // This gives player a chance to see it coming
        const safeMax = theoreticalMax - this.marginCallBuffer;

        return Math.max(0.05, safeMax); // At least 5% buffer
    }

    /**
     * Get how close we are to margin call (0 = safe, 1 = margin call)
     * This creates the "danger zone" feeling as you approach liquidation
     */
    getLiquidationProximity() {
        const drawdown = this.getDrawdown() / 100;
        const maxSafe = this.getMaxSafeDrawdown();

        if (maxSafe <= 0) return 1;

        // Calculate proximity: 0 = no drawdown, 1 = at margin call threshold
        this.liquidationProximity = Math.min(1, drawdown / maxSafe);

        return this.liquidationProximity;
    }

    /**
     * Check for margin call condition
     * REALISTIC: High leverage = small drawdown triggers margin call
     *
     * Example scenarios:
     * - 1x leverage, 40% drawdown: SAFE (you just lost 40% of your own money)
     * - 2x leverage, 40% drawdown: MARGIN CALL (40% > 50%-buffer = ~40%)
     * - 3x leverage, 25% drawdown: MARGIN CALL (25% > 33%-buffer = ~23%)
     */
    checkMarginCall() {
        const drawdown = this.getDrawdown() / 100;
        const maxSafe = this.getMaxSafeDrawdown();

        // Update liquidation proximity for HUD display
        this.getLiquidationProximity();

        // Margin call if drawdown exceeds safe threshold for our leverage level
        if (drawdown >= maxSafe) {
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
                const maxDD = (this.getMaxSafeDrawdown() * 100).toFixed(0);
                return {
                    title: 'MARGIN CALL!',
                    subtitle: 'At ' + this.leverage.toFixed(1) + 'x leverage, ' + maxDD + '% drawdown = liquidation.',
                    lesson: 'Higher leverage = smaller margin for error. The market doesn\'t care about your leverage.'
                };
            case 'crash_stress':
                return {
                    title: 'SYSTEM OVERLOAD!',
                    subtitle: 'Too much volatility broke your strategy.',
                    lesson: 'Even good positions fail under extreme stress.'
                };
            case 'drowned':
                return {
                    title: 'DROWNED!',
                    subtitle: 'The rising tide of inflation consumed you.',
                    lesson: 'Your returns must beat the baseline. Standing still is sinking.'
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

        // === APPLY LOSS AVERSION TO STRESS (Prospect Theory) ===
        // Losses create ~2.25x more stress than gains reduce it
        // This makes drawdowns FEEL much worse than gains feel good

        if (volatility > 0.3) {
            this.addStress(volatility * 2);
        }

        if (normalizedSlope < -0.3) {
            // LOSSES: Apply loss aversion - stress accumulates faster
            const rawStress = Math.abs(normalizedSlope) * 3;
            const aversionStress = rawStress * this.lossAversionLambda; // 2.25x more painful
            this.addStress(aversionStress);
        }

        // Reduce stress slowly during calm periods
        // NOTE: Stress reduction is NOT amplified - gains feel normal, losses feel amplified
        if (volatility < 0.2 && normalizedSlope > 0) {
            this.reduceStress(0.5); // Normal rate, not amplified
        }

        // Update recovery tracking
        this.getRecoveryInfo();

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

        // === WATER LEVEL RISES (Baseline Interest) ===
        // The water always rises - this is the minimum return you need to beat
        this.waterLevel *= (1 + this.baselineRate * this.waterRiseSpeed);

        // Record water history
        this.waterHistory.push(this.waterLevel);
        if (this.waterHistory.length > this.maxHistoryLength) {
            this.waterHistory.shift();
        }

        // Calculate margin (how far above/below water)
        this.waterMargin = this.wealth - this.waterLevel;

        // Check drowning status
        if (this.waterMargin < 0) {
            // Below water - drowning!
            this.drowningTimer++;
        } else {
            // Above water - reset drowning timer
            this.drowningTimer = Math.max(0, this.drowningTimer - 2);
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

        // Defeat: Drowned (below water too long)
        if (this.drowningTimer >= this.maxDrowningTime) {
            this.isRunning = false;
            this.gameResult = 'drowned';
            return 'drowned';
        }

        return null;
    }

    /**
     * Check if currently drowning (below water level)
     */
    isDrowning() {
        return this.waterMargin < 0;
    }

    /**
     * Get drowning progress (0-1, 1 = about to drown)
     */
    getDrowningProgress() {
        return Math.min(1, this.drowningTimer / this.maxDrowningTime);
    }

    /**
     * Get water level percentage relative to wealth
     */
    getWaterPercentage() {
        if (this.wealth <= 0) return 100;
        return (this.waterLevel / this.wealth) * 100;
    }

    /**
     * Get real return (return above water/baseline)
     */
    getRealReturn() {
        return ((this.wealth / this.waterLevel) - 1) * 100;
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
            crashes: this.crashes,
            // Water level stats
            waterLevel: this.waterLevel,
            realReturn: this.getRealReturn(),
            aboveWater: this.waterMargin > 0,
            // Margin call stats
            maxSafeDrawdown: this.getMaxSafeDrawdown() * 100,
            liquidationProximity: this.liquidationProximity,
            // Recovery asymmetry stats
            recoveryInfo: this.getRecoveryInfo(),
            lossAversionLambda: this.lossAversionLambda
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
        this.liquidationProximity = 0;

        // Reset recovery tracking
        this.inRecoveryMode = false;
        this.recoveryTarget = 0;

        // Reset water level
        this.waterLevel = this.startingWealth;
        this.waterMargin = 0;
        this.drowningTimer = 0;
        this.waterHistory = [this.waterLevel];

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
