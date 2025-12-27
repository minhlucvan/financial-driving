/**
 * NoiseGenerator - Generates terrain curves from market data
 *
 * This generator uses financial market data to create terrain:
 * - Slope = daily return (positive = uphill, negative = downhill)
 * - Curvature = volatility
 * - Surface conditions based on market regime
 */

class NoiseGenerator
{
    static curve_debug = false;

    /**
     * Check if market terrain generator is ready
     */
    static isReady() {
        return typeof marketTerrainGenerator !== 'undefined' &&
               marketTerrainGenerator.isActive;
    }

    /**
     * Get the curve generator function
     * @returns {Function} Market terrain generator function
     */
    static getCurve()
    {
        if (NoiseGenerator.isReady()) {
            return (param, tileSize) => marketTerrainGenerator.generateCurve(param, tileSize);
        }

        // Fallback: flat terrain if market data not ready
        console.warn('Market terrain not ready, using flat terrain');
        return NoiseGenerator.flatCurve;
    }

    /**
     * Fallback flat curve when market data is not available
     */
    static flatCurve(param, tileSize)
    {
        const height = [];
        const tilesNeeded = Math.ceil(param.w / tileSize);
        const baseHeight = param.cummCoord || 0;

        for (let i = 0; i < tilesNeeded; i++) {
            height.push(baseHeight);
        }

        return height;
    }
}
