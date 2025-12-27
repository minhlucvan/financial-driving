/*
game is to be played on full screen, press F to toggle fullscreen.
*/

var VSelectScene = {
    key: 'VSelectScene',
    preload: preloadVS,
    create: createVS,
    //custom property
    VthumbnailKey: 'Vthumbnail',
    resizeHandler: resizeFillHeightEventHandler,
};

function resizeFillHeightEventHandler()
{
    // deviceAspectRatio = window.innerWidth/window.innerHeight;
    // ///extra width is margin which will be added to width so that the aspect ratio matches
    // let extraHeight =  Math.round((logical_width/deviceAspectRatio) - logical_height);

    // screen_height = logical_height + extraHeight;
    // screen_width = logical_width;
    // //console.log('resized ' + screen_width + ' ' + screen_height);
    // game.scale.setGameSize(screen_width, screen_height);
    // console.log(screen_width, screen_height);
}

function preloadVS()
{
    //multiatlas -> key, json file, image file folder
    let VthumbnailKey = VSelectScene.VthumbnailKey;
    this.load.multiatlas(VthumbnailKey, './assets/car/carThumbnail.json', './assets/car');
    this.load.bitmapFont('desyrel-pink', './assets/fonts/desyrel-pink.png', './assets/fonts/desyrel-pink.xml');
    this.load.image('btn-start', './assets/button.png');
}

function createVS()
{
    currentScene = VSelectScene;
    ///fullscreen
    var FKey = this.input.keyboard.addKey('F');
    FKey.on('down', function () {
        this.scale.toggleFullscreen();
    }, this);

    let VthumbnailKey = VSelectScene.VthumbnailKey;
    // console.log(Object.keys(this.textures.get(VthumbnailKey).frames));
    let carThumbnails = [];
    Object.keys(this.textures.get(VthumbnailKey).frames).forEach(imgFName => {
        if(imgFName != '__BASE') //ignore '__BASE' frame
        {
            let img = this.add.image(screen_width/2, screen_height/2, VthumbnailKey, imgFName);
            //console.log(imgFName);
            img.name = imgFName.split('.')[0];
            img.visible = false; //dont show on screen
            carThumbnails.push(img);
        }
    });
    carThumbnails.sort((a, b)=> a.name.localeCompare(b.name));
    // console.log(carThumbnails);
    let selectIdx = 0; //this car is selected
    carThumbnails[selectIdx].visible = true;

    let Iw = 100 + carThumbnails[selectIdx].displayWidth;

    ///create two buttons to shift selectIdx
    this.add.bitmapText(screen_width/2 + Iw/2, screen_height/2, 'desyrel-pink', '>')
    .setOrigin(0.5, 0)
    .setInteractive()
    .on('pointerdown', () => { 
        //right button
        //process selectIdx+1
        if(selectIdx+1 >= carThumbnails.length)
            return ;
        carThumbnails[selectIdx].visible = false;
        selectIdx += 1;
        carThumbnails[selectIdx].visible = true;

    });

    this.add.bitmapText(screen_width/2 - Iw/2, screen_height/2, 'desyrel-pink', '<')
    .setOrigin(0.5, 0).setInteractive()
    .on('pointerdown', () => { 
        //left button
        //process selectIdx-1
        if(selectIdx-1 < 0)
            return ;
        carThumbnails[selectIdx].visible = false;
        selectIdx -= 1;
        carThumbnails[selectIdx].visible = true;
        
    });

    this.add.bitmapText(screen_width/2, screen_height/5, 'desyrel-pink', 'Select Car').setOrigin(0.5, 0);

    
    
    this.add.image(screen_width/2, screen_height*2/3 - 10, 'btn-start')
    .setOrigin(0.5, 0);

    this.add.bitmapText(screen_width/2, screen_height*2/3, 'desyrel-pink', 'Start')
    .setOrigin(0.5, 0)
    .setInteractive()
    .on('pointerdown', () => { 
        //start game
        this.input.stopPropagation();
        vehicleKey = carThumbnails[selectIdx].name;
        this.scene.switch(gameScene.key);
    });


    ///info
    this.add.bitmapText(screen_width/2, screen_height*5/6, 'desyrel-pink', 'Use arrow keys to move car\npress "F" for fullscreen')
    .setOrigin(0.5, 0).setScale(0.8);
    // this.add.bitmapText(screen_width/2, screen_height*7/8, 'desyrel-pink', '').setOrigin(0.5, 0).setScale(0.8);

}

var gameScene = {
    key: 'gameScene',
    preload: preload,
    create: create,
    update: update,
    //custom scene
    resizeHandler: resizeFillWidthEventHandler,
};


var config = {
    type: Phaser.AUTO,
    scale:{
        //TODO: .ENVELOP for select scene
        mode: Phaser.Scale.ScaleModes.FIT,
        autoCenter: Phaser.Scale.Center.CENTER_BOTH,
        parent: 'phaser-example',
        width: screen_width,
        height: screen_height,
    },
    
    backgroundColor: '#4488aa',
    
    physics: {
        default: 'matter',
        matter: {
            gravity: {
                y: 1
            },
            debug: false
        }
    },

    scene: [ VSelectScene, gameScene ],

    pixelArt: true
};

game = new Phaser.Game(config);

function resizeFillWidthEventHandler()
{
    deviceAspectRatio = window.innerWidth/window.innerHeight;
    ///extra width is margin which will be added to width so that the aspect ratio matches
    extraWidth =  Math.round((deviceAspectRatio*logical_height) - logical_width);

    screen_width = logical_width + extraWidth;
    screen_height = logical_height;
    //console.log('resized ' + screen_width + ' ' + screen_height);
    game.scale.setGameSize(screen_width, screen_height);
}

window.addEventListener('resize', () => {
    //select handler based on scene
    setTimeout(currentScene.resizeHandler, 100);
}, true);

// Market data key for current session
var currentMarketDataKey = 'sp500';

// HUD elements
var marketHUD = null;
var wealthHUD = null;
var gameOverScreen = null;

// Game state
var gameState = 'playing'; // 'playing', 'victory', 'bankrupt'
var lastTerrainSlope = 0;

function preload ()
{
    //multiatlas -> key, json file, image file folder
    this.load.multiatlas(vehiclePartsKey, './assets/car/carParts.json', './assets/car');
    //custom format for storing car
    this.load.json(vehicleKey, './assets/car/' + vehicleKey + '.json');

    backgroundloader = new BackgroundLoader(this);

    chunkloader = new ChunkLoader();
    chunkloader.preLoadTileset(this);

    // Load market data
    marketDataLoader = new MarketDataLoader();
    marketDataLoader.preload(this, 'sp500', './assets/market/sp500.json');
    marketDataLoader.preload(this, 'bitcoin', './assets/market/bitcoin.json');
    marketDataLoader.preload(this, 'meme_stock', './assets/market/meme_stock.json');
    marketDataLoader.preload(this, 'steady_growth', './assets/market/steady_growth.json');
    marketDataLoader.preload(this, 'crash_2008', './assets/market/scenarios/crash_2008.json');
    marketDataLoader.preload(this, 'covid_2020', './assets/market/scenarios/covid_2020.json');
}

function create ()
{
    currentScene = gameScene;

    currentScene.resizeHandler(); ///refresh screen

    graphics = this.add.graphics();
    backgroundloader.applyBackground(this);

    ///fullscreen
    var FKey = this.input.keyboard.addKey('F');
    FKey.on('down', function () {
        this.scale.toggleFullscreen();
    }, this);
    var DKey = this.input.keyboard.addKey('D');
    DKey.on('down', function () {
        console.log(game.loop.actualFps);
    }, this);

    // Initialize market data and terrain generator
    initializeMarketTerrain(this);

    // Cycle market datasets with 'N' key
    var NKey = this.input.keyboard.addKey('N');
    NKey.on('down', function () {
        cycleMarketDataset(this);
    }, this);

    vehicle = new Vehicle(this, vehicleKey);

    this.cameras.main.startFollow(vehicle.mainBody, true, 0.2, 0.2, -screen_width/8, screen_height/8);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.roundPixels = true;

    chunkloader.createTileMapSet(this);
    chunkloader.initChunkLoader(this);

    // Create HUD for market info
    createMarketHUD(this);

    // Initialize wealth engine
    wealthEngine = new WealthEngine({
        startingWealth: 10000,
        target: 1000000,
        sensitivity: 0.015,
        passiveRate: 0.0002
    });
    gameState = 'playing';

    // Create wealth HUD
    createWealthHUD(this);

    // Restart key
    var RKey = this.input.keyboard.addKey('R');
    RKey.on('down', function () {
        restartGame(this);
    }, this);

    // Leverage controls (UP/DOWN to adjust)
    var upKey = this.input.keyboard.addKey('UP');
    upKey.on('down', function () {
        if (gameState !== 'playing') {
            // Adjust leverage for next game
            wealthEngine.setLeverage(wealthEngine.leverage + 0.5);
            console.log('Leverage set to: ' + wealthEngine.leverage.toFixed(1) + 'x');
        }
    }, this);

    var downKey = this.input.keyboard.addKey('DOWN');
    downKey.on('down', function () {
        if (gameState !== 'playing') {
            // Adjust leverage for next game
            wealthEngine.setLeverage(wealthEngine.leverage - 0.5);
            console.log('Leverage set to: ' + wealthEngine.leverage.toFixed(1) + 'x');
        }
    }, this);

    this.matter.add.mouseSpring();

    cursors = this.input.keyboard.createCursorKeys();
}

/**
 * Initialize market terrain system
 */
function initializeMarketTerrain(scene) {
    // Load all market datasets
    marketDataLoader.loadDataset(scene, 'sp500');
    marketDataLoader.loadDataset(scene, 'bitcoin');
    marketDataLoader.loadDataset(scene, 'meme_stock');
    marketDataLoader.loadDataset(scene, 'steady_growth');
    marketDataLoader.loadDataset(scene, 'crash_2008');
    marketDataLoader.loadDataset(scene, 'covid_2020');

    // Set default dataset and activate market terrain
    marketDataLoader.setActiveDataset(currentMarketDataKey);
    marketTerrainGenerator.setMarketData(marketDataLoader.datasets[currentMarketDataKey]);

    console.log('Market terrain initialized with dataset:', currentMarketDataKey);
}

/**
 * Cycle through available market datasets
 */
function cycleMarketDataset(scene) {
    const datasets = ['sp500', 'bitcoin', 'meme_stock', 'steady_growth', 'crash_2008', 'covid_2020'];
    const currentIdx = datasets.indexOf(currentMarketDataKey);
    const nextIdx = (currentIdx + 1) % datasets.length;

    currentMarketDataKey = datasets[nextIdx];

    // Update market terrain generator
    marketDataLoader.setActiveDataset(currentMarketDataKey);
    marketTerrainGenerator.setMarketData(marketDataLoader.datasets[currentMarketDataKey]);
    marketTerrainGenerator.reset();

    updateHUDDataset(currentMarketDataKey, marketDataLoader.getDatasetInfo(currentMarketDataKey));

    console.log('Switched to market dataset:', currentMarketDataKey);
}

/**
 * Create HUD overlay for market information and indicators
 */
function createMarketHUD(scene) {
    const textStyle = {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
    };

    const headerStyle = {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00ff00',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 4 }
    };

    // Create HUD container
    marketHUD = {
        // Top left - Dataset info
        dataset: null,
        regime: null,

        // Right side - Indicator panels
        volatility: { header: null, content: null },
        momentum: { header: null, content: null },
        value: { header: null, content: null }
    };

    // === TOP LEFT: Dataset and Regime ===
    const datasetInfo = marketDataLoader.getDatasetInfo(currentMarketDataKey);
    const infoText = datasetInfo ? datasetInfo.name + ' (' + datasetInfo.symbol + ')' : 'Loading...';

    marketHUD.dataset = scene.add.text(16, 16, infoText, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    marketHUD.regime = scene.add.text(16, 48, 'Regime: -- | Date: --', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ffff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // === RIGHT SIDE: Indicator Panels ===
    const panelX = screen_width - 180;
    let panelY = 16;
    const panelSpacing = 90;

    // Volatility Panel
    marketHUD.volatility.header = scene.add.text(panelX, panelY, 'VOLATILITY', headerStyle)
        .setScrollFactor(0).setDepth(1000);
    marketHUD.volatility.content = scene.add.text(panelX, panelY + 22,
        'ATR:  --\nVol:  --\nVIX:  --', textStyle)
        .setScrollFactor(0).setDepth(1000);

    panelY += panelSpacing;

    // Momentum Panel
    marketHUD.momentum.header = scene.add.text(panelX, panelY, 'MOMENTUM', headerStyle)
        .setScrollFactor(0).setDepth(1000);
    marketHUD.momentum.content = scene.add.text(panelX, panelY + 22,
        'RSI:   --\nTrend: --\nROC:   --', textStyle)
        .setScrollFactor(0).setDepth(1000);

    panelY += panelSpacing;

    // Value Panel
    marketHUD.value.header = scene.add.text(panelX, panelY, 'VALUE', headerStyle)
        .setScrollFactor(0).setDepth(1000);
    marketHUD.value.content = scene.add.text(panelX, panelY + 22,
        'DD:    --\nDist:  --\nZ:     --', textStyle)
        .setScrollFactor(0).setDepth(1000);

    // Controls hint (bottom left)
    scene.add.text(16, screen_height - 40, 'Arrows: Drive | R: Restart | N: Dataset | F: Fullscreen', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#888888',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
}

/**
 * Update HUD dataset info
 */
function updateHUDDataset(datasetKey, datasetInfo) {
    if (marketHUD && marketHUD.dataset && datasetInfo) {
        marketHUD.dataset.setText(datasetInfo.name + ' (' + datasetInfo.symbol + ')');
    }
    // Reset indicators when dataset changes
    if (marketIndicators) {
        marketIndicators.reset();
    }
}

/**
 * Update HUD with current market data and indicators
 */
function updateHUDRegime() {
    if (!marketHUD || !NoiseGenerator.isReady()) {
        return;
    }

    const metadata = marketTerrainGenerator.getTerrainMetadata();

    // Update indicators with current candle data
    if (metadata && marketIndicators) {
        const currentCandle = marketTerrainGenerator.marketData ?
            marketTerrainGenerator.marketData.data[marketTerrainGenerator.currentIndex - 1] : null;
        if (currentCandle) {
            marketIndicators.update(currentCandle);
        }
    }

    // === Update Regime Display ===
    if (marketHUD.regime) {
        let regimeText = 'Regime: ' + (metadata.regime || '--');
        let regimeColor = '#ffffff';

        switch (metadata.regime) {
            case 'BULL': regimeColor = '#4CAF50'; break;
            case 'BEAR': regimeColor = '#F44336'; break;
            case 'CRASH': regimeColor = '#9C27B0'; break;
            case 'CHOP': regimeColor = '#FFC107'; break;
        }

        if (metadata.date) {
            regimeText += ' | ' + metadata.date;
        }
        if (metadata.dailyReturn !== undefined) {
            const returnStr = metadata.dailyReturn >= 0 ? '+' : '';
            regimeText += ' | ' + returnStr + metadata.dailyReturn.toFixed(2) + '%';
        }

        marketHUD.regime.setText(regimeText);
        marketHUD.regime.setColor(regimeColor);
    }

    // === Update Indicator Panels ===
    const data = marketIndicators.getDisplayData();

    // Volatility Panel
    if (marketHUD.volatility.content) {
        marketHUD.volatility.content.setText(
            'ATR:  ' + data.volatility.atr + '\n' +
            'Vol:  ' + data.volatility.vol + '\n' +
            'VIX:  ' + data.volatility.vix
        );
        marketHUD.volatility.header.setColor(data.volatility.color);
        marketHUD.volatility.header.setText('VOLATILITY [' + data.volatility.label + ']');
    }

    // Momentum Panel
    if (marketHUD.momentum.content) {
        marketHUD.momentum.content.setText(
            'RSI:   ' + data.momentum.rsi + '\n' +
            'Trend: ' + data.momentum.trend + '\n' +
            'ROC:   ' + data.momentum.roc
        );
        marketHUD.momentum.header.setColor(data.momentum.color);
        marketHUD.momentum.header.setText('MOMENTUM [' + data.momentum.label + ']');
    }

    // Value Panel
    if (marketHUD.value.content) {
        marketHUD.value.content.setText(
            'DD:    ' + data.value.drawdown + '\n' +
            'Dist:  ' + data.value.distMA + '\n' +
            'Z:     ' + data.value.zScore
        );
        marketHUD.value.header.setColor(data.value.color);
        marketHUD.value.header.setText('VALUE [' + data.value.label + ']');
    }
}

/**
 * Create Wealth HUD - Progress toward financial freedom
 */
function createWealthHUD(scene) {
    wealthHUD = {
        container: null,
        progressBar: null,
        progressFill: null,
        wealthText: null,
        targetText: null,
        drawdownText: null,
        leverageText: null,
        stressBar: null,
        stressFill: null
    };

    const hudY = 85;
    const barWidth = 250;
    const barHeight = 20;

    // Wealth display
    wealthHUD.wealthText = scene.add.text(16, hudY, '$10,000', {
        fontFamily: 'monospace',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#00ff88',
        backgroundColor: '#000000cc',
        padding: { x: 10, y: 6 }
    }).setScrollFactor(0).setDepth(1001);

    // Progress bar background
    wealthHUD.progressBar = scene.add.graphics();
    wealthHUD.progressBar.setScrollFactor(0).setDepth(1001);
    wealthHUD.progressBar.fillStyle(0x333333, 0.9);
    wealthHUD.progressBar.fillRoundedRect(16, hudY + 40, barWidth, barHeight, 4);

    // Progress bar fill
    wealthHUD.progressFill = scene.add.graphics();
    wealthHUD.progressFill.setScrollFactor(0).setDepth(1002);

    // Target text
    wealthHUD.targetText = scene.add.text(16 + barWidth + 10, hudY + 40, 'Target: $1M', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffcc00',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
    }).setScrollFactor(0).setDepth(1001);

    // Stats row
    wealthHUD.drawdownText = scene.add.text(16, hudY + 68, 'DD: 0% | Days: 0', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
    }).setScrollFactor(0).setDepth(1001);

    // Leverage and stability display
    wealthHUD.leverageText = scene.add.text(16, hudY + 92, 'Leverage: 1.0x | Stability: 100%', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#88aaff',
        backgroundColor: '#000000aa',
        padding: { x: 6, y: 3 }
    }).setScrollFactor(0).setDepth(1001);

    // Stress bar background
    wealthHUD.stressBar = scene.add.graphics();
    wealthHUD.stressBar.setScrollFactor(0).setDepth(1001);
    wealthHUD.stressBar.fillStyle(0x333333, 0.7);
    wealthHUD.stressBar.fillRoundedRect(16, hudY + 116, 120, 8, 2);

    // Stress bar fill
    wealthHUD.stressFill = scene.add.graphics();
    wealthHUD.stressFill.setScrollFactor(0).setDepth(1002);

    // Stress label
    scene.add.text(140, hudY + 113, 'STRESS', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#666666'
    }).setScrollFactor(0).setDepth(1001);

    // Goal label
    scene.add.text(16, hudY + 130, 'GOAL: FINANCIAL FREEDOM', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
        padding: { x: 6, y: 2 }
    }).setScrollFactor(0).setDepth(1001);
}

/**
 * Update Wealth HUD each frame
 */
function updateWealthHUD() {
    if (!wealthHUD || !wealthEngine) return;

    // Update wealth text
    const wealth = wealthEngine.getWealthDisplay();
    wealthHUD.wealthText.setText(wealth);

    // Color based on performance
    const progress = wealthEngine.getProgress();
    if (wealthEngine.wealth >= wealthEngine.startingWealth * 1.1) {
        wealthHUD.wealthText.setColor('#00ff88'); // Green - profit
    } else if (wealthEngine.wealth < wealthEngine.startingWealth * 0.9) {
        wealthHUD.wealthText.setColor('#ff4444'); // Red - loss
    } else {
        wealthHUD.wealthText.setColor('#ffcc00'); // Yellow - near start
    }

    // Update progress bar
    const barWidth = 250;
    const barHeight = 20;
    const fillWidth = Math.max(4, (progress / 100) * barWidth);

    wealthHUD.progressFill.clear();

    // Gradient effect based on progress
    let fillColor = 0x4CAF50; // Green
    if (progress < 25) fillColor = 0xFFC107; // Yellow
    if (progress < 10) fillColor = 0xFF5722; // Orange
    if (wealthEngine.getDrawdown() > 20) fillColor = 0xF44336; // Red during drawdown

    wealthHUD.progressFill.fillStyle(fillColor, 1);
    wealthHUD.progressFill.fillRoundedRect(16, 125, fillWidth, barHeight, 4);

    // Update stats
    const drawdown = wealthEngine.getDrawdown().toFixed(1);
    const days = wealthEngine.daysTraded;
    wealthHUD.drawdownText.setText('DD: ' + drawdown + '% | Days: ' + days + ' | Progress: ' + progress.toFixed(1) + '%');

    // Update leverage and stability
    const leverage = wealthEngine.leverage.toFixed(1);
    const stability = (wealthEngine.getStability() * 100).toFixed(0);
    wealthHUD.leverageText.setText('Leverage: ' + leverage + 'x | Stability: ' + stability + '%');

    // Color leverage text based on risk
    if (wealthEngine.leverage > 2) {
        wealthHUD.leverageText.setColor('#ff6666'); // High risk
    } else if (wealthEngine.leverage > 1.5) {
        wealthHUD.leverageText.setColor('#ffaa66'); // Medium risk
    } else {
        wealthHUD.leverageText.setColor('#88aaff'); // Low risk
    }

    // Update stress bar
    const stressPercent = wealthEngine.stress / wealthEngine.maxStress;
    const stressWidth = Math.max(0, stressPercent * 120);

    wealthHUD.stressFill.clear();

    // Stress bar color
    let stressColor = 0x4CAF50; // Green - low stress
    if (stressPercent > 0.7) stressColor = 0xF44336; // Red - danger
    else if (stressPercent > 0.4) stressColor = 0xFF9800; // Orange - warning
    else if (stressPercent > 0.2) stressColor = 0xFFC107; // Yellow - caution

    wealthHUD.stressFill.fillStyle(stressColor, 1);
    wealthHUD.stressFill.fillRoundedRect(16, 201, stressWidth, 8, 2);
}

/**
 * Show game over / victory screen
 */
function showGameOverScreen(scene, result) {
    gameOverScreen = {};

    const summary = wealthEngine.getSummary();
    const isVictory = result === 'freedom';
    const isCrash = result.startsWith('crash_') || result === 'margin_call';

    // Get crash-specific messages
    const crashMsg = wealthEngine.getCrashMessage();

    // Overlay color based on result type
    let overlayColor = 0x440000; // Default red
    if (isVictory) overlayColor = 0x004400; // Green
    else if (result === 'margin_call') overlayColor = 0x440044; // Purple
    else if (result === 'crash_flip') overlayColor = 0x442200; // Orange
    else if (result === 'crash_stress') overlayColor = 0x444400; // Yellow

    gameOverScreen.overlay = scene.add.rectangle(
        screen_width / 2, screen_height / 2,
        screen_width, screen_height,
        overlayColor, 0.9
    ).setScrollFactor(0).setDepth(2000);

    // Title from crash message or victory
    const titleText = isVictory ? 'FINANCIAL FREEDOM!' : crashMsg.title;
    const titleColor = isVictory ? '#00ff00' : '#ff4444';

    gameOverScreen.title = scene.add.text(screen_width / 2, 60, titleText, {
        fontFamily: 'monospace',
        fontSize: '42px',
        fontStyle: 'bold',
        color: titleColor
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Subtitle
    const subtitle = isVictory
        ? 'You built your wealth machine!'
        : crashMsg.subtitle;

    gameOverScreen.subtitle = scene.add.text(screen_width / 2, 110, subtitle, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#cccccc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Lesson learned (for crashes)
    if (!isVictory) {
        gameOverScreen.lesson = scene.add.text(screen_width / 2, 140, crashMsg.lesson, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#ffcc00',
            fontStyle: 'italic'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
    }

    // Stats panel
    const statsY = isVictory ? 160 : 180;
    const stats = [
        'Final Wealth: ' + wealthEngine.getWealthDisplay(),
        'Starting: $' + summary.startingWealth.toLocaleString(),
        'Progress: ' + summary.progress.toFixed(1) + '%',
        '',
        'Days Traded: ' + summary.daysTraded,
        'Peak Wealth: $' + Math.floor(summary.peakWealth).toLocaleString(),
        'Max Drawdown: ' + summary.maxDrawdown.toFixed(1) + '%',
        '',
        'Leverage: ' + summary.leverage.toFixed(1) + 'x',
        'Cash Buffer: ' + (summary.cashBuffer * 100).toFixed(0) + '%',
        '',
        'Total Gains: $' + Math.floor(summary.totalGains).toLocaleString(),
        'Total Losses: $' + Math.floor(summary.totalLosses).toLocaleString()
    ];

    gameOverScreen.stats = scene.add.text(screen_width / 2, statsY, stats.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        lineSpacing: 6,
        align: 'center'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001);

    // Restart prompt
    gameOverScreen.restart = scene.add.text(screen_width / 2, screen_height - 100,
        'Press R to restart', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffff00',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Controls hint
    gameOverScreen.controls = scene.add.text(screen_width / 2, screen_height - 60,
        'Use UP/DOWN to adjust leverage before restart', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#888888'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);

    // Market info
    const datasetInfo = marketDataLoader.getDatasetInfo(currentMarketDataKey);
    gameOverScreen.market = scene.add.text(screen_width / 2, screen_height - 35,
        'Market: ' + (datasetInfo ? datasetInfo.name : currentMarketDataKey), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#666666'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(2001);
}

/**
 * Hide game over screen
 */
function hideGameOverScreen() {
    if (!gameOverScreen) return;

    if (gameOverScreen.overlay) gameOverScreen.overlay.destroy();
    if (gameOverScreen.title) gameOverScreen.title.destroy();
    if (gameOverScreen.subtitle) gameOverScreen.subtitle.destroy();
    if (gameOverScreen.lesson) gameOverScreen.lesson.destroy();
    if (gameOverScreen.stats) gameOverScreen.stats.destroy();
    if (gameOverScreen.restart) gameOverScreen.restart.destroy();
    if (gameOverScreen.controls) gameOverScreen.controls.destroy();
    if (gameOverScreen.market) gameOverScreen.market.destroy();

    gameOverScreen = null;
}

/**
 * Restart the game
 */
function restartGame(scene) {
    // Hide game over screen
    hideGameOverScreen();

    // Reset wealth engine
    wealthEngine.reset();

    // Reset terrain
    marketTerrainGenerator.reset();
    marketIndicators.reset();

    // Reset game state
    gameState = 'playing';

    console.log('Game restarted!');
}

/**
 * Get current terrain slope from market data
 */
function getCurrentTerrainSlope() {
    if (!NoiseGenerator.isReady()) return 0;

    const metadata = marketTerrainGenerator.getTerrainMetadata();
    if (metadata && metadata.dailyReturn !== undefined) {
        // Convert daily return percentage to slope value
        // -5% to +5% maps to -32 to +32
        return (metadata.dailyReturn / 5) * 32;
    }
    return 0;
}

/**
 * Get current market volatility (0-1 scale)
 */
function getCurrentVolatility() {
    if (!marketIndicators) return 0;
    const data = marketIndicators.getDisplayData();
    // Normalize ATR to 0-1 scale (assuming ATR of 50+ is very high)
    return Math.min(1, parseFloat(data.volatility.atr) / 50 || 0);
}

/**
 * Check for physical crash conditions
 * Returns crash type or null if no crash
 */
function checkCrashConditions() {
    if (!vehicle || !vehicle.mainBody || !vehicle.mainBody.body) return null;

    const body = vehicle.mainBody.body;
    const rotation = vehicle.mainBody.rotation;
    const y = vehicle.mainBody.y;

    // Get stability (affected by leverage, drawdown, etc.)
    const stability = wealthEngine.getStability();

    // === FLIP DETECTION ===
    // Car is considered flipped if rotated more than 90 degrees
    // Lower stability = easier to flip (smaller angle threshold)
    const flipThreshold = Math.PI * (0.4 + stability * 0.3); // 72-126 degrees based on stability

    // Normalize rotation to -PI to PI range
    let normalizedRotation = rotation % (2 * Math.PI);
    if (normalizedRotation > Math.PI) normalizedRotation -= 2 * Math.PI;
    if (normalizedRotation < -Math.PI) normalizedRotation += 2 * Math.PI;

    if (Math.abs(normalizedRotation) > flipThreshold) {
        return 'flip';
    }

    // === FALL DETECTION ===
    // Car fell too far below expected terrain level
    const fallThreshold = 2000; // Pixels below spawn point
    if (y > fallThreshold) {
        return 'fall';
    }

    // === MARGIN CALL CHECK ===
    if (wealthEngine.checkMarginCall()) {
        return 'margin_call';
    }

    // === STRESS OVERLOAD ===
    if (wealthEngine.stress >= wealthEngine.maxStress) {
        return 'stress';
    }

    return null;
}

/**
 * Apply leverage effects to vehicle physics
 * Higher leverage = faster but less stable
 */
function applyLeverageEffects() {
    if (!vehicle || !vehicle.mainBody) return;

    const leverage = wealthEngine.leverage;
    const stability = wealthEngine.getStability();

    // Visual feedback: tint car based on stress/stability
    const stress = wealthEngine.stress / wealthEngine.maxStress;

    if (stress > 0.7) {
        // High stress: red tint
        vehicle.mainBody.setTint(0xff6666);
    } else if (stress > 0.4) {
        // Medium stress: orange tint
        vehicle.mainBody.setTint(0xffaa66);
    } else if (leverage > 2) {
        // High leverage: yellow tint
        vehicle.mainBody.setTint(0xffff88);
    } else {
        // Normal: clear tint
        vehicle.mainBody.clearTint();
    }
}

function update()
{
    // Only process game logic if playing
    if (gameState === 'playing') {
        vehicle.processKey(cursors);
        chunkloader.processChunk(this, vehicle.mainBody.x);
        backgroundloader.updateBackground(this, vehicle.mainBody.x);

        // Update market HUD
        updateHUDRegime();

        // Get terrain data
        const slope = getCurrentTerrainSlope();
        const velocity = vehicle.mainBody.body.velocity.x;
        const volatility = getCurrentVolatility();

        // Only update wealth when car is moving
        if (Math.abs(velocity) > 0.5) {
            wealthEngine.update(slope, velocity, volatility);
        }

        // Apply leverage visual effects
        applyLeverageEffects();

        // Check for crash conditions
        const crashType = checkCrashConditions();
        if (crashType) {
            wealthEngine.triggerCrash(crashType);
        }

        // Update wealth HUD
        updateWealthHUD();

        // Check for game end
        if (wealthEngine.gameResult) {
            gameState = wealthEngine.gameResult;
            showGameOverScreen(this, wealthEngine.gameResult);
        }
    }
}



