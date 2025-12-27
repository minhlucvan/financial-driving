/**
 * MarketTerrainGenerator - Generates terrain from market price data
 *
 * Following CONCEPTS.md:
 * - The road is generated from real daily price data
 * - Each candle → road segment
 * - Slope = return (positive = uphill, negative = downhill)
 * - Curvature = volatility
 * - Surface = liquidity & regime
 *
 * Bull market → smooth uphill highway
 * Chop → winding mountain road
 * Crash → steep downhill + fog + potholes
 */

class MarketTerrainGenerator {

    static debug = false;

    // Market regime thresholds
    static REGIMES = {
        BULL: { minReturn: 0.5, color: 0x4CAF50 },      // Green - uphill highway
        BEAR: { maxReturn: -0.5, color: 0xF44336 },     // Red - downhill danger
        CHOP: { volatility: 2.0, color: 0xFFC107 },     // Yellow - winding road
        CRASH: { maxReturn: -2.0, color: 0x9C27B0 }     // Purple - steep cliff
    };

    constructor() {
        this.currentIndex = 0;
        this.cumulativeY = 0;  // Track cumulative Y position
        this.marketData = null;
        this.isActive = false;

        // Terrain generation settings
        this.settings = {
            sensitivity: 10,          // How much slope per 1% return
            maxSlope: 32,             // Maximum slope in pixels
            tilesPerCandle: 3,        // How many tiles per market day
            volatilityEffect: 0.5,    // How much volatility affects roughness
            smoothing: true           // Smooth transitions between days
        };
    }

    /**
     * Initialize with market data
     * @param {Object} dataset - Processed market dataset from MarketDataLoader
     */
    setMarketData(dataset) {
        this.marketData = dataset;
        this.currentIndex = 0;
        this.cumulativeY = 0;
        this.isActive = true;
    }

    /**
     * Reset to beginning of dataset
     */
    reset() {
        this.currentIndex = 0;
        this.cumulativeY = 0;
    }

    /**
     * Check if more market data is available
     */
    hasMoreData() {
        return this.marketData && this.currentIndex < this.marketData.data.length;
    }

    /**
     * Get current market regime based on recent performance
     * @param {number} lookback - Number of candles to analyze
     * @returns {string} Regime name: 'BULL', 'BEAR', 'CHOP', 'CRASH'
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
            avgVolatility += data[i].intradayVolatility;
        }

        totalReturn /= lookback;
        avgVolatility /= lookback;

        // Determine regime
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
     * Convert daily return to terrain slope
     * @param {number} dailyReturn - Daily return percentage
     * @returns {number} Slope in pixels (-32 to +32)
     */
    returnToSlope(dailyReturn) {
        // Invert: positive return = uphill = negative Y delta
        const rawSlope = -dailyReturn * this.settings.sensitivity;

        // Clamp to valid range
        const clampedSlope = Math.max(-this.settings.maxSlope,
                                       Math.min(this.settings.maxSlope, rawSlope));

        // Snap to valid tile slopes: -32, -16, 0, 16, 32
        const validSlopes = [-32, -16, 0, 16, 32];
        let closest = validSlopes[0];

        for (const s of validSlopes) {
            if (Math.abs(clampedSlope - s) < Math.abs(clampedSlope - closest)) {
                closest = s;
            }
        }

        return closest;
    }

    /**
     * Generate height curve from market data (compatible with NoiseGenerator interface)
     * @param {Object} param - Terrain parameters
     * @param {number} tileSize - Size of each tile
     * @returns {Array<number>} Array of Y heights
     */
    generateCurve(param, tileSize) {
        if (!this.marketData || !this.isActive) {
            console.warn('MarketTerrainGenerator: No market data, falling back to flat');
            return this.generateFlatCurve(param, tileSize);
        }

        const heights = [];
        const data = this.marketData.data;
        const tilesNeeded = Math.ceil(param.w / tileSize);

        let currentHeight = param.cummCoord || 0;
        let tileCount = 0;

        while (tileCount < tilesNeeded && this.currentIndex < data.length) {
            const candle = data[this.currentIndex];
            const slope = this.returnToSlope(candle.dailyReturn);
            const volatility = candle.intradayVolatility || 0;

            // Generate multiple tiles per candle for smoother terrain
            for (let t = 0; t < this.settings.tilesPerCandle && tileCount < tilesNeeded; t++) {
                // Add some intra-day variation based on volatility
                let variation = 0;
                if (this.settings.volatilityEffect > 0 && volatility > 0) {
                    // Use seeded random for consistent regeneration
                    const noise = (srand.frac() - 0.5) * volatility * this.settings.volatilityEffect * 16;
                    variation = Math.round(noise / 16) * 16; // Snap to 16-pixel increments
                }

                const tileSlope = slope + variation;
                currentHeight += tileSlope / this.settings.tilesPerCandle;
                heights.push(currentHeight);
                tileCount++;
            }

            this.currentIndex++;
        }

        // Fill remaining tiles if we run out of data
        while (heights.length < tilesNeeded) {
            heights.push(currentHeight);
        }

        this.cumulativeY = currentHeight;

        if (MarketTerrainGenerator.debug) {
            console.log(`MarketTerrain: Generated ${heights.length} tiles from ${this.currentIndex} candles`);
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
     * Get terrain metadata for current segment (for visual effects)
     * @returns {Object} Metadata including regime, volatility, etc.
     */
    getTerrainMetadata() {
        if (!this.marketData || this.currentIndex === 0) {
            return {
                regime: 'CHOP',
                avgReturn: 0,
                avgVolatility: 1,
                trend: 'neutral'
            };
        }

        const idx = Math.min(this.currentIndex - 1, this.marketData.data.length - 1);
        const candle = this.marketData.data[idx];

        return {
            regime: this.getCurrentRegime(),
            date: candle.date,
            dailyReturn: candle.dailyReturn,
            avgVolatility: candle.rollingVolatility || candle.intradayVolatility,
            trend: candle.dailyReturn > 0.5 ? 'bullish' :
                   candle.dailyReturn < -0.5 ? 'bearish' : 'neutral',
            price: candle.close
        };
    }
}

/**
 * Draw terrain from market data (replacement for drawTerrain when using market mode)
 * Uses the same tile placement logic but with market-generated heights
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

    // Generate heights from market data
    const heights = marketGen.generateCurve(param, tileSize);

    // Convert heights to terrain slopes (similar to original drawTerrain)
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
        console.log('Market terrain slopes:', terrainV.slice(0, 20));
    }

    // Tile placement (same logic as original drawTerrain)
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
