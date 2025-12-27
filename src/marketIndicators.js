/**
 * MarketIndicators - Calculates and tracks market indicators for the HUD
 *
 * Indicator Groups:
 * - Volatility: ATR, Rolling Volatility, VIX-like measure
 * - Momentum: RSI, Trend Direction, Rate of Change
 * - Value: Drawdown, Distance from MA, Relative Value
 *
 * These indicators affect road conditions per CONCEPTS.md:
 * - ATR -> Road roughness
 * - MA slope -> Uphill/downhill
 * - RSI -> Slippery edges
 * - Volume -> Road width
 */

class MarketIndicators {

    constructor() {
        // Indicator configuration (customizable)
        this.config = {
            // Volatility settings
            atrPeriod: 14,
            volatilityPeriod: 20,

            // Momentum settings
            rsiPeriod: 14,
            momentumPeriod: 10,
            trendPeriod: 20,

            // Value settings
            maPeriod: 20,
            drawdownWindow: 50
        };

        // Current indicator values
        this.indicators = {
            // Volatility group
            volatility: {
                atr: 0,
                rollingVol: 0,
                vix: 0,
                label: 'LOW'
            },

            // Momentum group
            momentum: {
                rsi: 50,
                trend: 0,
                roc: 0,
                label: 'NEUTRAL'
            },

            // Value group
            value: {
                drawdown: 0,
                distanceFromMA: 0,
                relativeValue: 0,
                label: 'FAIR'
            }
        };

        // Historical data for calculations
        this.priceHistory = [];
        this.returnHistory = [];
        this.maxHistoryLength = 100;
    }

    /**
     * Update indicators with new candle data
     * @param {Object} candle - Candle data with OHLCV
     */
    update(candle) {
        if (!candle) return;

        // Add to history
        this.priceHistory.push(candle.close);
        this.returnHistory.push(candle.dailyReturn || 0);

        // Trim history if needed
        if (this.priceHistory.length > this.maxHistoryLength) {
            this.priceHistory.shift();
            this.returnHistory.shift();
        }

        // Calculate all indicator groups
        this.calculateVolatility(candle);
        this.calculateMomentum();
        this.calculateValue();
    }

    /**
     * Calculate volatility indicators
     */
    calculateVolatility(candle) {
        const returns = this.returnHistory;

        // ATR (simplified using daily returns)
        if (returns.length >= this.config.atrPeriod) {
            const recentReturns = returns.slice(-this.config.atrPeriod);
            this.indicators.volatility.atr = this.average(recentReturns.map(r => Math.abs(r)));
        }

        // Rolling volatility (standard deviation of returns)
        if (returns.length >= this.config.volatilityPeriod) {
            const recentReturns = returns.slice(-this.config.volatilityPeriod);
            this.indicators.volatility.rollingVol = this.stdDev(recentReturns);
        }

        // VIX-like measure (annualized volatility)
        this.indicators.volatility.vix = this.indicators.volatility.rollingVol * Math.sqrt(252);

        // Volatility label
        const vol = this.indicators.volatility.rollingVol;
        if (vol < 1) {
            this.indicators.volatility.label = 'LOW';
        } else if (vol < 2) {
            this.indicators.volatility.label = 'NORMAL';
        } else if (vol < 4) {
            this.indicators.volatility.label = 'HIGH';
        } else {
            this.indicators.volatility.label = 'EXTREME';
        }
    }

    /**
     * Calculate momentum indicators
     */
    calculateMomentum() {
        const prices = this.priceHistory;
        const returns = this.returnHistory;

        // RSI calculation
        if (returns.length >= this.config.rsiPeriod) {
            const recentReturns = returns.slice(-this.config.rsiPeriod);
            let gains = 0, losses = 0;

            recentReturns.forEach(r => {
                if (r > 0) gains += r;
                else losses += Math.abs(r);
            });

            const avgGain = gains / this.config.rsiPeriod;
            const avgLoss = losses / this.config.rsiPeriod;

            if (avgLoss === 0) {
                this.indicators.momentum.rsi = 100;
            } else {
                const rs = avgGain / avgLoss;
                this.indicators.momentum.rsi = 100 - (100 / (1 + rs));
            }
        }

        // Trend (slope of moving average)
        if (prices.length >= this.config.trendPeriod) {
            const recentPrices = prices.slice(-this.config.trendPeriod);
            const firstHalf = this.average(recentPrices.slice(0, Math.floor(recentPrices.length / 2)));
            const secondHalf = this.average(recentPrices.slice(Math.floor(recentPrices.length / 2)));
            this.indicators.momentum.trend = ((secondHalf - firstHalf) / firstHalf) * 100;
        }

        // Rate of Change
        if (prices.length >= this.config.momentumPeriod) {
            const oldPrice = prices[prices.length - this.config.momentumPeriod];
            const currentPrice = prices[prices.length - 1];
            this.indicators.momentum.roc = ((currentPrice - oldPrice) / oldPrice) * 100;
        }

        // Momentum label
        const rsi = this.indicators.momentum.rsi;
        const trend = this.indicators.momentum.trend;

        if (rsi > 70 && trend > 0) {
            this.indicators.momentum.label = 'OVERBOUGHT';
        } else if (rsi < 30 && trend < 0) {
            this.indicators.momentum.label = 'OVERSOLD';
        } else if (trend > 1) {
            this.indicators.momentum.label = 'BULLISH';
        } else if (trend < -1) {
            this.indicators.momentum.label = 'BEARISH';
        } else {
            this.indicators.momentum.label = 'NEUTRAL';
        }
    }

    /**
     * Calculate value indicators
     */
    calculateValue() {
        const prices = this.priceHistory;

        if (prices.length < 2) return;

        // Drawdown from peak
        const windowPrices = prices.slice(-this.config.drawdownWindow);
        const peak = Math.max(...windowPrices);
        const current = prices[prices.length - 1];
        this.indicators.value.drawdown = ((current - peak) / peak) * 100;

        // Distance from moving average
        if (prices.length >= this.config.maPeriod) {
            const ma = this.average(prices.slice(-this.config.maPeriod));
            this.indicators.value.distanceFromMA = ((current - ma) / ma) * 100;
        }

        // Relative value (simplified mean reversion indicator)
        if (prices.length >= this.config.maPeriod) {
            const ma = this.average(prices.slice(-this.config.maPeriod));
            const std = this.stdDev(prices.slice(-this.config.maPeriod));
            if (std > 0) {
                this.indicators.value.relativeValue = (current - ma) / std;
            }
        }

        // Value label
        const distMA = this.indicators.value.distanceFromMA;
        const drawdown = this.indicators.value.drawdown;

        if (drawdown < -20) {
            this.indicators.value.label = 'CRASHED';
        } else if (drawdown < -10) {
            this.indicators.value.label = 'CORRECTION';
        } else if (distMA > 10) {
            this.indicators.value.label = 'EXTENDED';
        } else if (distMA < -10) {
            this.indicators.value.label = 'UNDERVALUED';
        } else {
            this.indicators.value.label = 'FAIR';
        }
    }

    /**
     * Get all indicators for HUD display
     */
    getDisplayData() {
        return {
            volatility: {
                atr: this.indicators.volatility.atr.toFixed(2) + '%',
                vol: this.indicators.volatility.rollingVol.toFixed(2) + '%',
                vix: this.indicators.volatility.vix.toFixed(1),
                label: this.indicators.volatility.label,
                color: this.getVolatilityColor()
            },
            momentum: {
                rsi: this.indicators.momentum.rsi.toFixed(0),
                trend: (this.indicators.momentum.trend >= 0 ? '+' : '') + this.indicators.momentum.trend.toFixed(2) + '%',
                roc: (this.indicators.momentum.roc >= 0 ? '+' : '') + this.indicators.momentum.roc.toFixed(2) + '%',
                label: this.indicators.momentum.label,
                color: this.getMomentumColor()
            },
            value: {
                drawdown: this.indicators.value.drawdown.toFixed(2) + '%',
                distMA: (this.indicators.value.distanceFromMA >= 0 ? '+' : '') + this.indicators.value.distanceFromMA.toFixed(2) + '%',
                zScore: this.indicators.value.relativeValue.toFixed(2),
                label: this.indicators.value.label,
                color: this.getValueColor()
            }
        };
    }

    /**
     * Get color for volatility level
     */
    getVolatilityColor() {
        switch (this.indicators.volatility.label) {
            case 'LOW': return '#4CAF50';      // Green
            case 'NORMAL': return '#8BC34A';   // Light green
            case 'HIGH': return '#FFC107';     // Yellow
            case 'EXTREME': return '#F44336';  // Red
            default: return '#ffffff';
        }
    }

    /**
     * Get color for momentum
     */
    getMomentumColor() {
        switch (this.indicators.momentum.label) {
            case 'BULLISH': return '#4CAF50';     // Green
            case 'OVERBOUGHT': return '#FF9800';  // Orange
            case 'BEARISH': return '#F44336';     // Red
            case 'OVERSOLD': return '#9C27B0';    // Purple
            case 'NEUTRAL': return '#2196F3';     // Blue
            default: return '#ffffff';
        }
    }

    /**
     * Get color for value
     */
    getValueColor() {
        switch (this.indicators.value.label) {
            case 'FAIR': return '#4CAF50';        // Green
            case 'EXTENDED': return '#FF9800';    // Orange
            case 'UNDERVALUED': return '#2196F3'; // Blue
            case 'CORRECTION': return '#FFC107';  // Yellow
            case 'CRASHED': return '#F44336';     // Red
            default: return '#ffffff';
        }
    }

    /**
     * Update indicator configuration
     * @param {Object} newConfig - New configuration values
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Reset all indicators
     */
    reset() {
        this.priceHistory = [];
        this.returnHistory = [];
        this.indicators.volatility = { atr: 0, rollingVol: 0, vix: 0, label: 'LOW' };
        this.indicators.momentum = { rsi: 50, trend: 0, roc: 0, label: 'NEUTRAL' };
        this.indicators.value = { drawdown: 0, distanceFromMA: 0, relativeValue: 0, label: 'FAIR' };
    }

    // Utility functions
    average(arr) {
        return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    }

    stdDev(arr) {
        const avg = this.average(arr);
        const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(this.average(squareDiffs));
    }
}

// Global instance
var marketIndicators = new MarketIndicators();
