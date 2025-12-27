/**
 * MarketDataLoader - Loads and processes market data for terrain generation
 *
 * Market data format:
 * {
 *   symbol: "SPY",
 *   name: "S&P 500 ETF",
 *   description: "...",
 *   data: [
 *     { date: "2020-01-02", open: 100, high: 102, low: 99, close: 101, volume: 1000000 },
 *     ...
 *   ]
 * }
 */

class MarketDataLoader {

    constructor() {
        this.datasets = {};      // Loaded datasets by key
        this.currentDataset = null;
        this.currentIndex = 0;   // Current position in data
    }

    /**
     * Preload market data file
     * @param {Phaser.Scene} scene - Phaser scene for loading
     * @param {string} key - Unique key for this dataset
     * @param {string} path - Path to JSON file
     */
    preload(scene, key, path) {
        scene.load.json(key, path);
    }

    /**
     * Load dataset from cache after preload
     * @param {Phaser.Scene} scene - Phaser scene
     * @param {string} key - Dataset key
     */
    loadDataset(scene, key) {
        const rawData = scene.cache.json.get(key);
        if (!rawData) {
            console.error(`MarketDataLoader: Dataset '${key}' not found in cache`);
            return null;
        }

        // Process and enrich the data
        const processedData = this.processData(rawData);
        this.datasets[key] = processedData;
        return processedData;
    }

    /**
     * Process raw market data and calculate derived values
     * @param {Object} rawData - Raw market data object
     * @returns {Object} Processed data with returns and volatility
     */
    processData(rawData) {
        const data = rawData.data;
        const processed = [];

        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            const prevClose = i > 0 ? data[i - 1].close : candle.open;

            // Calculate daily return (percentage)
            const dailyReturn = ((candle.close - prevClose) / prevClose) * 100;

            // Calculate intraday volatility (high-low range as % of open)
            const intradayVolatility = ((candle.high - candle.low) / candle.open) * 100;

            // Calculate ATR-like measure (simplified)
            const trueRange = Math.max(
                candle.high - candle.low,
                i > 0 ? Math.abs(candle.high - prevClose) : 0,
                i > 0 ? Math.abs(candle.low - prevClose) : 0
            );

            processed.push({
                ...candle,
                dailyReturn: dailyReturn,
                intradayVolatility: intradayVolatility,
                trueRange: trueRange,
                index: i
            });
        }

        // Calculate rolling volatility (20-day)
        const windowSize = 20;
        for (let i = 0; i < processed.length; i++) {
            if (i < windowSize - 1) {
                processed[i].rollingVolatility = processed[i].intradayVolatility;
            } else {
                let sum = 0;
                for (let j = i - windowSize + 1; j <= i; j++) {
                    sum += Math.pow(processed[j].dailyReturn, 2);
                }
                processed[i].rollingVolatility = Math.sqrt(sum / windowSize);
            }
        }

        return {
            symbol: rawData.symbol,
            name: rawData.name,
            description: rawData.description,
            startDate: data[0]?.date,
            endDate: data[data.length - 1]?.date,
            totalDays: data.length,
            data: processed,
            stats: this.calculateStats(processed)
        };
    }

    /**
     * Calculate overall statistics for the dataset
     * @param {Array} data - Processed data array
     * @returns {Object} Statistics object
     */
    calculateStats(data) {
        const returns = data.map(d => d.dailyReturn);
        const volatilities = data.map(d => d.intradayVolatility);

        return {
            avgReturn: this.average(returns),
            maxReturn: Math.max(...returns),
            minReturn: Math.min(...returns),
            stdReturn: this.stdDev(returns),
            avgVolatility: this.average(volatilities),
            maxVolatility: Math.max(...volatilities),
            totalReturn: data.length > 0 ?
                ((data[data.length - 1].close - data[0].open) / data[0].open) * 100 : 0
        };
    }

    /**
     * Set the active dataset for terrain generation
     * @param {string} key - Dataset key
     * @param {number} startIndex - Starting position (default 0)
     */
    setActiveDataset(key, startIndex = 0) {
        if (!this.datasets[key]) {
            console.error(`MarketDataLoader: Dataset '${key}' not loaded`);
            return false;
        }
        this.currentDataset = this.datasets[key];
        this.currentIndex = startIndex;
        return true;
    }

    /**
     * Get next N candles from current position
     * @param {number} count - Number of candles to get
     * @returns {Array} Array of candle data
     */
    getNextCandles(count) {
        if (!this.currentDataset) return [];

        const result = [];
        const data = this.currentDataset.data;

        for (let i = 0; i < count && this.currentIndex < data.length; i++) {
            result.push(data[this.currentIndex]);
            this.currentIndex++;
        }

        return result;
    }

    /**
     * Peek at upcoming candles without advancing position
     * @param {number} count - Number of candles to peek
     * @returns {Array} Array of candle data
     */
    peekCandles(count) {
        if (!this.currentDataset) return [];

        const data = this.currentDataset.data;
        const endIndex = Math.min(this.currentIndex + count, data.length);
        return data.slice(this.currentIndex, endIndex);
    }

    /**
     * Get candle at specific index
     * @param {number} index - Index in dataset
     * @returns {Object|null} Candle data or null
     */
    getCandleAt(index) {
        if (!this.currentDataset || index < 0 || index >= this.currentDataset.data.length) {
            return null;
        }
        return this.currentDataset.data[index];
    }

    /**
     * Check if more data is available
     * @returns {boolean}
     */
    hasMoreData() {
        return this.currentDataset && this.currentIndex < this.currentDataset.data.length;
    }

    /**
     * Reset position to start
     */
    reset() {
        this.currentIndex = 0;
    }

    /**
     * Convert daily return to terrain slope
     * Maps return percentage to pixel offset (-32 to +32)
     * @param {number} dailyReturn - Daily return percentage
     * @param {number} sensitivity - How sensitive slope is to returns (default 8)
     * @returns {number} Slope in pixels
     */
    returnToSlope(dailyReturn, sensitivity = 8) {
        // Clamp and scale return to slope
        // 4% return = max slope (32 pixels)
        const maxReturn = 4; // 4% daily move = max slope
        const normalized = Math.max(-1, Math.min(1, dailyReturn / maxReturn));
        const slope = Math.round(normalized * 32);

        // Snap to valid slope values: -32, -16, 0, 16, 32
        const validSlopes = [-32, -16, 0, 16, 32];
        let closest = validSlopes[0];
        for (const s of validSlopes) {
            if (Math.abs(slope - s) < Math.abs(slope - closest)) {
                closest = s;
            }
        }
        return closest;
    }

    /**
     * Convert volatility to terrain roughness factor
     * @param {number} volatility - Volatility percentage
     * @returns {number} Roughness factor 0-1
     */
    volatilityToRoughness(volatility) {
        // 0-1% volatility = smooth, 5%+ = very rough
        return Math.min(1, volatility / 5);
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

    /**
     * Get all loaded dataset keys
     * @returns {Array<string>}
     */
    getDatasetKeys() {
        return Object.keys(this.datasets);
    }

    /**
     * Get dataset info without full data
     * @param {string} key - Dataset key
     * @returns {Object|null}
     */
    getDatasetInfo(key) {
        const ds = this.datasets[key];
        if (!ds) return null;
        return {
            symbol: ds.symbol,
            name: ds.name,
            description: ds.description,
            startDate: ds.startDate,
            endDate: ds.endDate,
            totalDays: ds.totalDays,
            stats: ds.stats
        };
    }
}

// Make available globally
var marketDataLoader = null;
