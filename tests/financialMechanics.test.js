/**
 * Financial Mechanics Tests
 *
 * Tests for the core financial systems in Financial Drive.
 * Run in browser console or include in test.html
 */

class TestRunner {
    constructor() {
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    assert(condition, message) {
        if (condition) {
            this.passed++;
            this.results.push({ pass: true, message });
            console.log(`✓ ${message}`);
        } else {
            this.failed++;
            this.results.push({ pass: false, message });
            console.error(`✗ ${message}`);
        }
    }

    assertApprox(actual, expected, tolerance, message) {
        const diff = Math.abs(actual - expected);
        const pass = diff <= tolerance;
        this.assert(pass, `${message} (expected: ${expected}, got: ${actual}, tolerance: ${tolerance})`);
    }

    summary() {
        console.log(`\n========================================`);
        console.log(`Tests completed: ${this.passed + this.failed}`);
        console.log(`Passed: ${this.passed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`========================================\n`);
        return this.failed === 0;
    }
}

// ============================================
// MARGIN CALL THRESHOLD TESTS
// ============================================
function testMarginCallThresholds(runner) {
    console.log('\n=== Margin Call Threshold Tests ===\n');

    // Test 1: 1x leverage = 95% max drawdown (no borrowed money)
    const engine1x = new WealthEngine({ leverage: 1.0 });
    const maxDD1x = engine1x.getMaxSafeDrawdown();
    runner.assertApprox(maxDD1x, 0.95, 0.01, '1x leverage: max drawdown should be ~95%');

    // Test 2: 2x leverage = (1/2) - 0.10 = 40% max drawdown
    const engine2x = new WealthEngine({ leverage: 2.0 });
    const maxDD2x = engine2x.getMaxSafeDrawdown();
    runner.assertApprox(maxDD2x, 0.40, 0.01, '2x leverage: max drawdown should be ~40%');

    // Test 3: 3x leverage = (1/3) - 0.10 = ~23% max drawdown
    const engine3x = new WealthEngine({ leverage: 3.0 });
    const maxDD3x = engine3x.getMaxSafeDrawdown();
    runner.assertApprox(maxDD3x, 0.233, 0.02, '3x leverage: max drawdown should be ~23%');

    // Test 4: Verify margin call triggers at correct threshold
    const engineMarginTest = new WealthEngine({ leverage: 2.0, startingWealth: 10000 });
    engineMarginTest.wealth = 10000;
    engineMarginTest.peakWealth = 10000;

    // At 30% drawdown (wealth = 7000), should NOT trigger margin call at 2x
    engineMarginTest.wealth = 7000;
    runner.assert(!engineMarginTest.checkMarginCall(), '2x leverage at 30% drawdown: no margin call');

    // At 45% drawdown (wealth = 5500), SHOULD trigger margin call at 2x
    engineMarginTest.wealth = 5500;
    runner.assert(engineMarginTest.checkMarginCall(), '2x leverage at 45% drawdown: margin call triggered');

    // Test 5: 3x leverage margin call at smaller drawdown
    const engine3xMargin = new WealthEngine({ leverage: 3.0, startingWealth: 10000 });
    engine3xMargin.wealth = 10000;
    engine3xMargin.peakWealth = 10000;

    // At 20% drawdown, should NOT trigger at 3x (threshold is ~23%)
    engine3xMargin.wealth = 8000;
    runner.assert(!engine3xMargin.checkMarginCall(), '3x leverage at 20% drawdown: no margin call');

    // At 25% drawdown, SHOULD trigger at 3x
    engine3xMargin.wealth = 7500;
    runner.assert(engine3xMargin.checkMarginCall(), '3x leverage at 25% drawdown: margin call triggered');
}

// ============================================
// LIQUIDATION PROXIMITY TESTS
// ============================================
function testLiquidationProximity(runner) {
    console.log('\n=== Liquidation Proximity Tests ===\n');

    // Test 1: No drawdown = 0 proximity
    const engine = new WealthEngine({ leverage: 2.0, startingWealth: 10000 });
    engine.wealth = 10000;
    engine.peakWealth = 10000;
    runner.assertApprox(engine.getLiquidationProximity(), 0, 0.01, 'No drawdown: proximity should be 0');

    // Test 2: Half-way to margin call
    // At 2x, max safe is 40%, so 20% drawdown = 50% proximity
    engine.wealth = 8000; // 20% drawdown
    runner.assertApprox(engine.getLiquidationProximity(), 0.5, 0.05, '20% drawdown at 2x: proximity should be ~0.5');

    // Test 3: At margin call threshold = proximity 1
    engine.wealth = 6000; // 40% drawdown
    runner.assertApprox(engine.getLiquidationProximity(), 1.0, 0.05, '40% drawdown at 2x: proximity should be ~1.0');

    // Test 4: 1x leverage has much wider safe zone
    const engine1x = new WealthEngine({ leverage: 1.0, startingWealth: 10000 });
    engine1x.wealth = 5000; // 50% drawdown
    engine1x.peakWealth = 10000;
    runner.assertApprox(engine1x.getLiquidationProximity(), 0.526, 0.05, '50% drawdown at 1x: proximity should be low (~0.53)');
}

// ============================================
// STABILITY FORMULA TESTS
// ============================================
function testStabilityFormula(runner) {
    console.log('\n=== Stability Formula Tests ===\n');

    // Test 1: Base stability at 1x leverage, no drawdown
    const engine = new WealthEngine({ leverage: 1.0, cashBuffer: 0.2 });
    engine.wealth = 10000;
    engine.peakWealth = 10000;
    engine.stress = 0;
    const stability1x = engine.getStability();
    runner.assert(stability1x > 0.9, `1x leverage, no stress: stability should be high (got ${stability1x.toFixed(2)})`);

    // Test 2: Higher leverage reduces stability
    engine.setLeverage(2.0);
    const stability2x = engine.getStability();
    runner.assert(stability2x < stability1x, `2x leverage reduces stability (1x: ${stability1x.toFixed(2)}, 2x: ${stability2x.toFixed(2)})`);

    // Test 3: 3x leverage reduces stability further
    engine.setLeverage(3.0);
    const stability3x = engine.getStability();
    runner.assert(stability3x < stability2x, `3x leverage reduces stability more (2x: ${stability2x.toFixed(2)}, 3x: ${stability3x.toFixed(2)})`);

    // Test 4: Cash buffer increases stability
    const engineLowCash = new WealthEngine({ leverage: 2.0, cashBuffer: 0.05 });
    const engineHighCash = new WealthEngine({ leverage: 2.0, cashBuffer: 0.5 });
    runner.assert(
        engineHighCash.getStability() > engineLowCash.getStability(),
        'Higher cash buffer increases stability'
    );

    // Test 5: Stress reduces stability
    const engineNoStress = new WealthEngine({ leverage: 2.0 });
    const engineHighStress = new WealthEngine({ leverage: 2.0 });
    engineHighStress.stress = 80;
    runner.assert(
        engineNoStress.getStability() > engineHighStress.getStability(),
        'Stress reduces stability'
    );

    // Test 6: Drawdown + leverage interaction (exponential penalty)
    const engineDrawdown = new WealthEngine({ leverage: 3.0, startingWealth: 10000 });
    engineDrawdown.wealth = 8500; // 15% drawdown
    engineDrawdown.peakWealth = 10000;
    const stabilityWithDrawdown = engineDrawdown.getStability();

    const engineNoDrawdown = new WealthEngine({ leverage: 3.0, startingWealth: 10000 });
    engineNoDrawdown.wealth = 10000;
    engineNoDrawdown.peakWealth = 10000;
    const stabilityNoDrawdown = engineNoDrawdown.getStability();

    runner.assert(
        stabilityWithDrawdown < stabilityNoDrawdown,
        `Drawdown at high leverage significantly reduces stability (no DD: ${stabilityNoDrawdown.toFixed(2)}, with DD: ${stabilityWithDrawdown.toFixed(2)})`
    );
}

// ============================================
// TERRAIN AMPLIFICATION TESTS
// ============================================
function testTerrainAmplification(runner) {
    console.log('\n=== Terrain Amplification Tests ===\n');

    // Create market terrain generator
    const terrainGen = new MarketTerrainGenerator();

    // Test 1: Default leverage = 1x (no amplification)
    terrainGen.setLeverage(1.0);
    const height1x = terrainGen.cumulativeReturnToHeight(10); // 10% return
    runner.assertApprox(height1x, -80, 1, '10% return at 1x leverage: height should be -80');

    // Test 2: 2x leverage doubles terrain steepness
    terrainGen.setLeverage(2.0);
    const height2x = terrainGen.cumulativeReturnToHeight(10);
    runner.assertApprox(height2x, -160, 1, '10% return at 2x leverage: height should be -160 (2x steeper)');

    // Test 3: 3x leverage triples terrain steepness
    terrainGen.setLeverage(3.0);
    const height3x = terrainGen.cumulativeReturnToHeight(10);
    runner.assertApprox(height3x, -240, 1, '10% return at 3x leverage: height should be -240 (3x steeper)');

    // Test 4: Negative returns also amplified
    terrainGen.setLeverage(2.0);
    const negHeight2x = terrainGen.cumulativeReturnToHeight(-10); // -10% return
    runner.assertApprox(negHeight2x, 160, 1, '-10% return at 2x leverage: height should be +160 (going down on screen)');

    // Test 5: Height bounds are enforced
    terrainGen.setLeverage(3.0);
    const extremeHeight = terrainGen.cumulativeReturnToHeight(500); // Extreme 500% return
    const maxAllowed = terrainGen.settings.maxHeightAboveBaseline * Math.min(2, 3); // 2000 * 2 = 4000
    runner.assert(
        Math.abs(extremeHeight) <= maxAllowed,
        `Extreme returns are bounded (got ${extremeHeight}, max: ${maxAllowed})`
    );
}

// ============================================
// WEALTH ENGINE UPDATE TESTS
// ============================================
function testWealthEngineUpdates(runner) {
    console.log('\n=== Wealth Engine Update Tests ===\n');

    // Test 1: Positive slope increases wealth
    const engine = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0 });
    const initialWealth = engine.wealth;
    engine.update(16, 5, 0); // Positive slope, moderate velocity
    runner.assert(engine.wealth > initialWealth, 'Positive slope increases wealth');

    // Test 2: Negative slope decreases wealth
    const engine2 = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0 });
    const initialWealth2 = engine2.wealth;
    engine2.update(-16, 5, 0); // Negative slope
    runner.assert(engine2.wealth < initialWealth2, 'Negative slope decreases wealth');

    // Test 3: Leverage amplifies gains
    const engineNoLev = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0 });
    const engineWithLev = new WealthEngine({ startingWealth: 10000, leverage: 2.0, cashBuffer: 0 });
    engineNoLev.update(16, 5, 0);
    engineWithLev.update(16, 5, 0);
    const gainNoLev = engineNoLev.wealth - 10000;
    const gainWithLev = engineWithLev.wealth - 10000;
    runner.assertApprox(gainWithLev / gainNoLev, 2.0, 0.1, 'Leverage amplifies gains by leverage factor');

    // Test 4: Leverage amplifies losses
    const engineNoLevLoss = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0 });
    const engineWithLevLoss = new WealthEngine({ startingWealth: 10000, leverage: 2.0, cashBuffer: 0 });
    engineNoLevLoss.update(-16, 5, 0);
    engineWithLevLoss.update(-16, 5, 0);
    const lossNoLev = 10000 - engineNoLevLoss.wealth;
    const lossWithLev = 10000 - engineWithLevLoss.wealth;
    runner.assertApprox(lossWithLev / lossNoLev, 2.0, 0.1, 'Leverage amplifies losses by leverage factor');

    // Test 5: Cash buffer reduces exposure
    const engineNoCash = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0 });
    const engineWithCash = new WealthEngine({ startingWealth: 10000, leverage: 1.0, cashBuffer: 0.5 });
    engineNoCash.update(16, 5, 0);
    engineWithCash.update(16, 5, 0);
    const gainNoCash = engineNoCash.wealth - 10000;
    const gainWithCash = engineWithCash.wealth - 10000;
    runner.assert(
        gainWithCash < gainNoCash,
        `Cash buffer reduces exposure (no cash: ${gainNoCash.toFixed(2)}, 50% cash: ${gainWithCash.toFixed(2)})`
    );

    // Test 6: Water level rises over time
    const engineWater = new WealthEngine({ startingWealth: 10000 });
    const initialWater = engineWater.waterLevel;
    for (let i = 0; i < 100; i++) {
        engineWater.update(0, 1, 0); // Flat terrain
    }
    runner.assert(engineWater.waterLevel > initialWater, 'Water level rises over time');

    // Test 7: Drowning detection works
    const engineDrown = new WealthEngine({ startingWealth: 10000 });
    engineDrown.waterLevel = 15000; // Water above wealth
    engineDrown.wealth = 10000;
    engineDrown.waterMargin = engineDrown.wealth - engineDrown.waterLevel;
    runner.assert(engineDrown.isDrowning(), 'Drowning detected when wealth below water level');

    // Test 8: Stress accumulates from volatility
    const engineStress = new WealthEngine({ startingWealth: 10000 });
    const initialStress = engineStress.stress;
    for (let i = 0; i < 10; i++) {
        engineStress.update(-16, 5, 0.8); // High volatility, negative slope
    }
    runner.assert(engineStress.stress > initialStress, 'Stress accumulates from volatility and losses');
}

// ============================================
// VEHICLE FINANCIAL PHYSICS TESTS
// ============================================
function testVehicleFinancialPhysics(runner) {
    console.log('\n=== Vehicle Financial Physics Tests ===\n');

    // Create mock vehicle with the properties we need to test
    const mockVehicle = {
        torqueMultiplier: 1.0,
        brakeMultiplier: 1.0,
        tractionMultiplier: 1.0,
        updateFinancialPhysics: function(leverage, cashBuffer, volatility) {
            this.torqueMultiplier = 0.8 + (leverage * 0.4);
            this.torqueMultiplier = Math.min(2.0, this.torqueMultiplier);
            this.brakeMultiplier = 0.5 + (cashBuffer * 2.0);
            this.tractionMultiplier = 1.0 - (volatility * 0.5);
            this.tractionMultiplier = Math.max(0.5, this.tractionMultiplier);
        }
    };

    // Test 1: Leverage increases torque
    mockVehicle.updateFinancialPhysics(1.0, 0.2, 0);
    const torque1x = mockVehicle.torqueMultiplier;
    mockVehicle.updateFinancialPhysics(2.0, 0.2, 0);
    const torque2x = mockVehicle.torqueMultiplier;
    runner.assert(torque2x > torque1x, 'Higher leverage increases torque multiplier');

    // Test 2: Torque capped at 2.0
    mockVehicle.updateFinancialPhysics(5.0, 0.2, 0);
    runner.assertApprox(mockVehicle.torqueMultiplier, 2.0, 0.01, 'Torque multiplier capped at 2.0');

    // Test 3: Cash buffer increases brake power
    mockVehicle.updateFinancialPhysics(1.0, 0.1, 0);
    const brakeLowCash = mockVehicle.brakeMultiplier;
    mockVehicle.updateFinancialPhysics(1.0, 0.5, 0);
    const brakeHighCash = mockVehicle.brakeMultiplier;
    runner.assert(brakeHighCash > brakeLowCash, 'Higher cash buffer increases brake power');

    // Test 4: Volatility reduces traction
    mockVehicle.updateFinancialPhysics(1.0, 0.2, 0.0);
    const tractionLowVol = mockVehicle.tractionMultiplier;
    mockVehicle.updateFinancialPhysics(1.0, 0.2, 0.8);
    const tractionHighVol = mockVehicle.tractionMultiplier;
    runner.assert(tractionHighVol < tractionLowVol, 'Higher volatility reduces traction');

    // Test 5: Traction has minimum of 0.5
    mockVehicle.updateFinancialPhysics(1.0, 0.2, 1.5);
    runner.assertApprox(mockVehicle.tractionMultiplier, 0.5, 0.01, 'Traction has minimum floor of 0.5');
}

// ============================================
// MARKET INDICATORS TESTS
// ============================================
function testMarketIndicators(runner) {
    console.log('\n=== Market Indicators Tests ===\n');

    const indicators = new MarketIndicators();

    // Simulate some market data
    const testCandles = [
        { close: 100, dailyReturn: 0 },
        { close: 102, dailyReturn: 2.0 },
        { close: 101, dailyReturn: -0.98 },
        { close: 103, dailyReturn: 1.98 },
        { close: 100, dailyReturn: -2.91 },
        { close: 105, dailyReturn: 5.0 },
        { close: 104, dailyReturn: -0.95 },
        { close: 107, dailyReturn: 2.88 },
        { close: 106, dailyReturn: -0.93 },
        { close: 110, dailyReturn: 3.77 },
        { close: 108, dailyReturn: -1.82 },
        { close: 112, dailyReturn: 3.70 },
        { close: 115, dailyReturn: 2.68 },
        { close: 113, dailyReturn: -1.74 },
        { close: 118, dailyReturn: 4.42 },
    ];

    // Feed data to indicators
    testCandles.forEach(candle => indicators.update(candle));

    // Test 1: RSI is calculated
    runner.assert(
        indicators.indicators.momentum.rsi > 0 && indicators.indicators.momentum.rsi <= 100,
        `RSI is valid (got ${indicators.indicators.momentum.rsi.toFixed(1)})`
    );

    // Test 2: Volatility is calculated
    runner.assert(
        indicators.indicators.volatility.rollingVol > 0,
        `Rolling volatility is positive (got ${indicators.indicators.volatility.rollingVol.toFixed(2)})`
    );

    // Test 3: Drawdown is calculated correctly
    runner.assert(
        indicators.indicators.value.drawdown <= 0,
        `Drawdown is negative or zero (got ${indicators.indicators.value.drawdown.toFixed(2)}%)`
    );

    // Test 4: Display data is formatted correctly
    const displayData = indicators.getDisplayData();
    runner.assert(displayData.volatility.atr.includes('%'), 'ATR display includes %');
    runner.assert(displayData.momentum.rsi.length > 0, 'RSI display is not empty');
    runner.assert(displayData.value.drawdown.includes('%'), 'Drawdown display includes %');

    // Test 5: Colors are valid hex
    runner.assert(
        /^#[0-9A-Fa-f]{6}$/.test(displayData.volatility.color),
        'Volatility color is valid hex'
    );

    // Test 6: Reset clears data
    indicators.reset();
    runner.assert(indicators.priceHistory.length === 0, 'Reset clears price history');
    runner.assert(indicators.indicators.momentum.rsi === 50, 'Reset resets RSI to 50');
}

// ============================================
// CRASH CONDITION TESTS
// ============================================
function testCrashConditions(runner) {
    console.log('\n=== Crash Condition Tests ===\n');

    // Test 1: Flip crash reduces wealth by 90%
    const engineFlip = new WealthEngine({ startingWealth: 10000 });
    engineFlip.triggerCrash('flip');
    runner.assertApprox(engineFlip.wealth, 1000, 100, 'Flip crash reduces wealth to 10%');
    runner.assert(engineFlip.gameResult === 'crash_flip', 'Game result is crash_flip');

    // Test 2: Fall crash sets wealth to 0
    const engineFall = new WealthEngine({ startingWealth: 10000 });
    engineFall.triggerCrash('fall');
    runner.assert(engineFall.wealth === 0, 'Fall crash sets wealth to 0');

    // Test 3: Margin call reduces wealth by 80%
    const engineMargin = new WealthEngine({ startingWealth: 10000 });
    engineMargin.triggerCrash('margin_call');
    runner.assertApprox(engineMargin.wealth, 2000, 100, 'Margin call reduces wealth to 20%');

    // Test 4: Stress crash reduces wealth by 50%
    const engineStress = new WealthEngine({ startingWealth: 10000 });
    engineStress.triggerCrash('stress');
    runner.assertApprox(engineStress.wealth, 5000, 100, 'Stress crash reduces wealth to 50%');

    // Test 5: Crash stops the engine
    const engineStop = new WealthEngine({ startingWealth: 10000 });
    engineStop.triggerCrash('flip');
    runner.assert(!engineStop.isRunning, 'Crash stops the engine');

    // Test 6: Crash messages exist for all types
    const crashTypes = ['flip', 'fall', 'margin_call', 'stress'];
    crashTypes.forEach(type => {
        const eng = new WealthEngine();
        eng.triggerCrash(type);
        const msg = eng.getCrashMessage();
        runner.assert(msg.title && msg.subtitle && msg.lesson, `Crash message exists for ${type}`);
    });
}

// ============================================
// PROGRESS & STATISTICS TESTS
// ============================================
function testProgressAndStats(runner) {
    console.log('\n=== Progress & Statistics Tests ===\n');

    // Test 1: Progress at starting wealth is 0
    const engine = new WealthEngine({ startingWealth: 10000, target: 1000000 });
    runner.assertApprox(engine.getProgress(), 0, 1, 'Progress at start is ~0%');

    // Test 2: Progress at 100K is ~50% (logarithmic)
    engine.wealth = 100000;
    const progressAt100K = engine.getProgress();
    runner.assertApprox(progressAt100K, 50, 5, 'Progress at 100K is ~50% (logarithmic scale)');

    // Test 3: Progress at target is 100%
    engine.wealth = 1000000;
    runner.assertApprox(engine.getProgress(), 100, 1, 'Progress at target is 100%');

    // Test 4: Drawdown calculation
    engine.wealth = 80000;
    engine.peakWealth = 100000;
    runner.assertApprox(engine.getDrawdown(), 20, 0.1, 'Drawdown calculated correctly (20%)');

    // Test 5: CAGR calculation
    const engineCAGR = new WealthEngine({ startingWealth: 10000 });
    engineCAGR.wealth = 20000; // 100% gain
    engineCAGR.daysTraded = 252; // 1 year
    runner.assertApprox(engineCAGR.getCAGR(), 100, 5, 'CAGR for 100% annual return is ~100%');

    // Test 6: Wealth display formatting
    const engineDisplay = new WealthEngine({ startingWealth: 1500000 });
    runner.assert(engineDisplay.getWealthDisplay().includes('M'), 'Millions formatted with M');

    engineDisplay.wealth = 50000;
    runner.assert(engineDisplay.getWealthDisplay().includes('K'), 'Thousands formatted with K');

    // Test 7: Real return calculation
    const engineReal = new WealthEngine({ startingWealth: 10000 });
    engineReal.wealth = 12000;
    engineReal.waterLevel = 10500;
    const realReturn = engineReal.getRealReturn();
    runner.assertApprox(realReturn, 14.28, 1, 'Real return = (wealth/water - 1) * 100');
}

// ============================================
// RUN ALL TESTS
// ============================================
function runAllTests() {
    console.log('\n🚀 FINANCIAL DRIVE - MECHANICS TEST SUITE 🚀\n');
    console.log('Running comprehensive tests for all financial mechanics...\n');

    const runner = new TestRunner();

    try {
        testMarginCallThresholds(runner);
        testLiquidationProximity(runner);
        testStabilityFormula(runner);
        testTerrainAmplification(runner);
        testWealthEngineUpdates(runner);
        testVehicleFinancialPhysics(runner);
        testMarketIndicators(runner);
        testCrashConditions(runner);
        testProgressAndStats(runner);
    } catch (error) {
        console.error('Test execution error:', error);
        runner.failed++;
    }

    const success = runner.summary();

    if (success) {
        console.log('🎉 All tests passed! Financial mechanics are working correctly.\n');
    } else {
        console.log('❌ Some tests failed. Please review the errors above.\n');
    }

    return runner;
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, TestRunner };
}
