/**
 * MarketTerrainGenerator - Generates terrain from CUMULATIVE market returns
 *
 * KEY CONCEPT: Road height = Cumulative portfolio growth
 * - Starting point = baseline ($10K)
 * - Higher on screen = more wealth accumulated
 * - Climbing up = wealth growing
 * - Going down = wealth shrinking
 *
 * This makes the physical position of the car represent actual progress
 * toward financial freedom. The water level (inflation) rises from below,
 * and you must keep climbing to stay above it.
 *
 * Bull market → steady climb upward
 * Crash → steep descent
 * Chop → sideways with small ups and downs
 */

class MarketTerrainGenerator {

    static debug = false;

    // Market regime thresholds
    static REGIMES = {
        BULL: { minReturn: 0.5, color: 0x4CAF50 },      // Green - climbing
        BEAR: { maxReturn: -0.5, color: 0xF44336 },     // Red - descending
        CHOP: { volatility: 2.0, color: 0xFFC107 },     // Yellow - sideways
        CRASH: { maxReturn: -2.0, color: 0x9C27B0 }     // Purple - cliff
    };

    constructor() {
        this.currentIndex = 0;
        this.cumulativeY = 0;  // Track cumulative Y position
        this.marketData = null;
        this.isActive = false;

        // Pre-calculated cumulative returns for the entire dataset
        this.cumulativeReturns = [];
        this.baselineHeight = 0;  // Starting Y position (represents $10K)

        // Leverage amplification (set from wealthEngine)
        // Higher leverage = terrain appears steeper (amplified returns)
        this.leverageMultiplier = 1.0;

        // Terrain generation settings
        this.settings = {
            // Height scaling: how many pixels per 1% cumulative return
            // Positive return = go UP (negative Y in screen coords)
            heightPerPercent: 8,

            // How much the terrain can vary from cumulative path (volatility noise)
            volatilityNoise: 0.3,

            tilesPerCandle: 3,        // How many tiles per market day
            maxSlopePerTile: 32,      // Maximum slope change per tile

            // Bounds to prevent terrain going off-screen
            maxHeightAboveBaseline: 2000,  // Max pixels above start
            maxHeightBelowBaseline: 1500   // Max pixels below start
        };
    }

    /**
     * Initialize with market data and pre-calculate cumulative returns
     * @param {Object} dataset - Processed market dataset from MarketDataLoader
     */
    setMarketData(dataset) {
        this.marketData = dataset;
        this.currentIndex = 0;
        this.cumulativeY = 0;
        this.isActive = true;

        // Pre-calculate cumulative returns for entire dataset
        this.calculateCumulativeReturns();
    }

    /**
     * Pre-calculate cumulative returns from market data
     * This gives us the "height profile" of the entire market history
     */
    calculateCumulativeReturns() {
        if (!this.marketData || !this.marketData.data) {
            this.cumulativeReturns = [];
            return;
        }

        const data = this.marketData.data;
        this.cumulativeReturns = new Array(data.length);

        // Start at 100 (representing starting wealth)
        let cumulativeValue = 100;

        for (let i = 0; i < data.length; i++) {
            // Apply daily return to cumulative value
            const dailyReturn = data[i].dailyReturn / 100; // Convert from percentage
            cumulativeValue *= (1 + dailyReturn);

            // Store cumulative return as percentage gain/loss from start
            this.cumulativeReturns[i] = (cumulativeValue - 100); // e.g., +50 means +50% gain
        }

        if (MarketTerrainGenerator.debug) {
            console.log('Cumulative returns calculated:', {
                length: this.cumulativeReturns.length,
                min: Math.min(...this.cumulativeReturns).toFixed(2),
                max: Math.max(...this.cumulativeReturns).toFixed(2),
                final: this.cumulativeReturns[this.cumulativeReturns.length - 1]?.toFixed(2)
            });
        }
    }

    /**
     * Reset to beginning of dataset
     */
    reset() {
        this.currentIndex = 0;
        this.cumulativeY = 0;
        this.baselineHeight = 0;
    }

    /**
     * Set leverage multiplier for terrain amplification
     * Higher leverage = steeper hills (you FEEL the amplified returns)
     *
     * @param {number} leverage - Current leverage level (1.0 = normal, 2.0 = 2x, etc.)
     */
    setLeverage(leverage) {
        this.leverageMultiplier = leverage;
    }

    /**
     * Check if more market data is available
     */
    hasMoreData() {
        return this.marketData && this.currentIndex < this.marketData.data.length;
    }

    /**
     * Get current market regime based on recent performance
     */
    getCurrentRegime(lookback = 5) {
        if (!this.marketData || this.currentIndex < lookback) {
            return 'CHOP';
        }

        const data = this.marketData.data;
        const startIdx = Math.max(0, this.currentIndex - lookback);

        let totalReturn = 0;
        let avgVolatility = 0;

        for (let i = startIdx; i < this.currentIndex; i++) {
            totalReturn += data[i].dailyReturn;
            avgVolatility += data[i].intradayVolatility || 1;
        }

        totalReturn /= lookback;
        avgVolatility /= lookback;

        if (totalReturn < MarketTerrainGenerator.REGIMES.CRASH.maxReturn) {
            return 'CRASH';
        } else if (totalReturn < MarketTerrainGenerator.REGIMES.BEAR.maxReturn) {
            return 'BEAR';
        } else if (avgVolatility > MarketTerrainGenerator.REGIMES.CHOP.volatility) {
            return 'CHOP';
        } else if (totalReturn > MarketTerrainGenerator.REGIMES.BULL.minReturn) {
            return 'BULL';
        }

        return 'CHOP';
    }

    /**
     * Convert cumulative return percentage to Y height
     * Higher returns = LOWER Y (because screen Y increases downward)
     *
     * LEVERAGE EFFECT: Returns are amplified by leverage multiplier
     * This makes the terrain FEEL like leveraged returns:
     * - 2x leverage: hills are 2x steeper
     * - 3x leverage: hills are 3x steeper
     * The car literally experiences amplified market moves!
     *
     * @param {number} cumulativeReturnPercent - Total return from start (e.g., +50 = +50%)
     * @returns {number} Y offset from baseline (negative = higher on screen)
     */
    cumulativeReturnToHeight(cumulativeReturnPercent) {
        // Apply leverage amplification to returns
        // This makes the terrain reflect YOUR leveraged experience, not just the market
        const leveragedReturn = cumulativeReturnPercent * this.leverageMultiplier;

        // Invert: positive return = go UP = negative Y delta
        const rawHeight = -leveragedReturn * this.settings.heightPerPercent;

        // Apply bounds (but scale bounds with leverage too, up to a point)
        const leveragedMaxAbove = this.settings.maxHeightAboveBaseline * Math.min(2, this.leverageMultiplier);
        const leveragedMaxBelow = this.settings.maxHeightBelowBaseline * Math.min(2, this.leverageMultiplier);

        const bounded = Math.max(
            -leveragedMaxAbove,
            Math.min(leveragedMaxBelow, rawHeight)
        );

        return bounded;
    }

    /**
     * Generate height curve from CUMULATIVE market returns
     * @param {Object} param - Terrain parameters
     * @param {number} tileSize - Size of each tile
     * @returns {Array<number>} Array of Y heights
     */
    generateCurve(param, tileSize) {
        if (!this.marketData || !this.isActive || this.cumulativeReturns.length === 0) {
            console.warn('MarketTerrainGenerator: No market data, falling back to flat');
            return this.generateFlatCurve(param, tileSize);
        }

        const heights = [];
        const data = this.marketData.data;
        const tilesNeeded = Math.ceil(param.w / tileSize);

        // Start from previous cumulative position
        let currentHeight = param.cummCoord || 0;
        let tileCount = 0;

        // Track previous height for slope calculation
        let previousCumulativeHeight = this.currentIndex > 0
            ? this.cumulativeReturnToHeight(this.cumulativeReturns[this.currentIndex - 1])
            : 0;

        while (tileCount < tilesNeeded && this.currentIndex < data.length) {
            const candle = data[this.currentIndex];
            const cumulativeReturn = this.cumulativeReturns[this.currentIndex];

            // Get target height based on cumulative return
            const targetHeight = this.cumulativeReturnToHeight(cumulativeReturn);

            // Calculate slope (change from previous day)
            const heightChange = targetHeight - previousCumulativeHeight;

            // Get volatility for noise
            const volatility = candle.intradayVolatility || 1;

            // Generate tiles for this candle
            for (let t = 0; t < this.settings.tilesPerCandle && tileCount < tilesNeeded; t++) {
                // Interpolate height across tiles for this candle
                const progress = (t + 1) / this.settings.tilesPerCandle;
                const interpolatedChange = heightChange * progress / this.settings.tilesPerCandle;

                // Add volatility noise (small random variation)
                let noise = 0;
                if (this.settings.volatilityNoise > 0) {
                    noise = (srand.frac() - 0.5) * volatility * this.settings.volatilityNoise * 8;
                }

                // Clamp slope per tile
                let tileSlope = interpolatedChange + noise;
                tileSlope = Math.max(-this.settings.maxSlopePerTile,
                                     Math.min(this.settings.maxSlopePerTile, tileSlope));

                // Snap to valid tile heights (multiples of 16)
                tileSlope = Math.round(tileSlope / 16) * 16;

                currentHeight += tileSlope;
                heights.push(currentHeight);
                tileCount++;
            }

            previousCumulativeHeight = targetHeight;
            this.currentIndex++;
        }

        // Fill remaining tiles if we run out of data (flat continuation)
        while (heights.length < tilesNeeded) {
            heights.push(currentHeight);
        }

        this.cumulativeY = currentHeight;

        if (MarketTerrainGenerator.debug) {
            console.log(`MarketTerrain: Generated ${heights.length} tiles, cumulative Y: ${currentHeight}`);
        }

        return heights;
    }

    /**
     * Generate flat curve fallback
     */
    generateFlatCurve(param, tileSize) {
        const heights = [];
        const tilesNeeded = Math.ceil(param.w / tileSize);
        const baseHeight = param.cummCoord || 0;

        for (let i = 0; i < tilesNeeded; i++) {
            heights.push(baseHeight);
        }

        return heights;
    }

    /**
     * Get terrain metadata including cumulative progress
     * @returns {Object} Metadata including regime, cumulative return, etc.
     */
    getTerrainMetadata() {
        if (!this.marketData || this.currentIndex === 0) {
            return {
                regime: 'CHOP',
                dailyReturn: 0,
                cumulativeReturn: 0,
                avgVolatility: 1,
                trend: 'neutral',
                daysCompleted: 0,
                totalDays: 0
            };
        }

        const idx = Math.min(this.currentIndex - 1, this.marketData.data.length - 1);
        const candle = this.marketData.data[idx];
        const cumulativeReturn = this.cumulativeReturns[idx] || 0;

        return {
            regime: this.getCurrentRegime(),
            date: candle.date,
            dailyReturn: candle.dailyReturn,
            cumulativeReturn: cumulativeReturn,
            avgVolatility: candle.rollingVolatility || candle.intradayVolatility,
            trend: candle.dailyReturn > 0.5 ? 'bullish' :
                   candle.dailyReturn < -0.5 ? 'bearish' : 'neutral',
            price: candle.close,
            daysCompleted: this.currentIndex,
            totalDays: this.marketData.data.length
        };
    }

    /**
     * Get the maximum and minimum cumulative returns in the dataset
     * Useful for visualizing the full journey
     */
    getCumulativeRange() {
        if (this.cumulativeReturns.length === 0) {
            return { min: 0, max: 0, final: 0 };
        }

        return {
            min: Math.min(...this.cumulativeReturns),
            max: Math.max(...this.cumulativeReturns),
            final: this.cumulativeReturns[this.cumulativeReturns.length - 1]
        };
    }
}

/**
 * Draw terrain from cumulative market returns
 * The terrain height now represents total portfolio progress
 */
function drawMarketTerrain(marketGen, layer, param) {
    var debug = MarketTerrainGenerator.debug;
    var tileSize = 32;

    param = {
        x: param.x ?? 0,
        h: param.h ?? 500,
        w: param.w ?? 2000,
        y: param.y ?? 500/2,
        cummCoord: param.cummCoord ?? 0,
        upperBound: param.upperBound ?? tileSize * 20,
        lowerBound: param.lowerBound ?? tileSize * 20
    };

    let endParam = {
        cummCoord: 0,
        tileCount: 0,
        metadata: null
    };

    // Generate heights from cumulative market data
    const heights = marketGen.generateCurve(param, tileSize);

    // Convert heights to terrain slopes
    var terrainV = [];
    var approx = [-32, -16, 0, 16, 32];
    var cummCoord = param.cummCoord;

    for (let i = 1; i < heights.length; i++) {
        let p = heights[i] - heights[i-1];

        // Find closest valid slope
        let minyidx = 0;
        approx.forEach((d, idx) => {
            if (Math.abs(p - d) < Math.abs(p - approx[minyidx])) {
                minyidx = idx;
            }
        });

        p = approx[minyidx];

        // Apply bounds checking
        if (cummCoord + p <= -param.upperBound) {
            let smoothidx = Math.min(approx.length - 1, minyidx + 2);
            p = approx[smoothidx];
        }
        if (cummCoord + p >= param.lowerBound) {
            let smoothidx = Math.max(0, minyidx - 2);
            p = approx[smoothidx];
        }

        cummCoord += p;
        terrainV.push(p);
    }

    if (debug) {
        console.log('Cumulative terrain slopes:', terrainV.slice(0, 20));
    }

    // Tile placement (same logic as original)
    let yCoordOffset = param.y + param.h / 2;
    let py = param.cummCoord ?? 0;

    let stepMap = {
        'fill': 15,
        '0_0': [1, 15],
        '0_-32': [2, 30],
        '0_16': [19, 15],
        '0_32': [3, 29],
        '0_-16': [6, 30],
        '16_0': [4, 15],
        '16_32': [21, 29],
        '16_16': [16, 15],
        '16_48': [35, 32],
        '16_-16': [33, 31],
    };

    let xCoord = param.x;
    let yCoord = yCoordOffset + py;
    let yTileCount = param.h / tileSize;

    for (let i = 0; i < terrainV.length; i++) {
        let posY = py % tileSize != 0;
        let v = terrainV[i];
        py += v;

        let key = (posY * 16) + '_' + (posY * 16 + v);

        yCoord += (v > 0) ? 0 : v;

        if (debug && graphics) {
            graphics.fillStyle(0xff6340, 1);
            graphics.fillCircle(xCoord, yCoord, 5);
        }

        let tileCoord = layer.worldToTileXY(xCoord, yCoord);
        let xTCoord = tileCoord.x;
        let yTCoord = tileCoord.y;

        // Place terrain tiles
        if (stepMap[key]) {
            for (let j = 0; j < stepMap[key].length; j++) {
                layer.putTileAt(stepMap[key][j], xTCoord, yTCoord + j, false);
            }

            // Fill below
            for (let j = stepMap[key].length; j < yTileCount - yTCoord; j++) {
                layer.putTileAt(stepMap['fill'], xTCoord, yTCoord + j, false);
            }
        }

        xCoord += tileSize;
        yCoord += (v > 0) ? v : 0;
    }

    endParam.cummCoord = py;
    endParam.tileCount = terrainV.length;
    endParam.metadata = marketGen.getTerrainMetadata();

    return endParam;
}

// Global instance
var marketTerrainGenerator = new MarketTerrainGenerator();
