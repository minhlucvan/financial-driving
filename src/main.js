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

    // Toggle terrain mode with 'M' key
    var MKey = this.input.keyboard.addKey('M');
    MKey.on('down', function () {
        toggleTerrainMode(this);
    }, this);

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

    // Set default dataset and activate market mode
    marketDataLoader.setActiveDataset(currentMarketDataKey);
    marketTerrainGenerator.setMarketData(marketDataLoader.datasets[currentMarketDataKey]);

    // Start in market mode by default
    NoiseGenerator.setMode('market');

    console.log('Market terrain initialized with dataset:', currentMarketDataKey);
}

/**
 * Toggle between procedural and market terrain modes
 */
function toggleTerrainMode(scene) {
    if (NoiseGenerator.mode === 'procedural') {
        NoiseGenerator.setMode('market');
        updateHUDMode('MARKET: ' + currentMarketDataKey.toUpperCase());
    } else {
        NoiseGenerator.setMode('procedural');
        updateHUDMode('PROCEDURAL');
    }
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

    // Ensure we're in market mode
    NoiseGenerator.setMode('market');

    updateHUDMode('MARKET: ' + currentMarketDataKey.toUpperCase());
    updateHUDDataset(marketDataLoader.getDatasetInfo(currentMarketDataKey));

    console.log('Switched to market dataset:', currentMarketDataKey);
}

/**
 * Create HUD overlay for market information
 */
function createMarketHUD(scene) {
    // Create HUD container (fixed to camera)
    marketHUD = {
        mode: null,
        dataset: null,
        regime: null,
        price: null,
        container: null
    };

    // Mode indicator
    marketHUD.mode = scene.add.text(16, 16, 'MARKET: ' + currentMarketDataKey.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#00ff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // Dataset info
    const datasetInfo = marketDataLoader.getDatasetInfo(currentMarketDataKey);
    const infoText = datasetInfo ? datasetInfo.name : 'Loading...';
    marketHUD.dataset = scene.add.text(16, 48, infoText, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // Market regime indicator
    marketHUD.regime = scene.add.text(16, 80, 'Regime: --', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffff00',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);

    // Controls hint
    scene.add.text(16, screen_height - 40, 'M: Toggle Mode | N: Next Dataset | F: Fullscreen', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
}

/**
 * Update HUD mode display
 */
function updateHUDMode(modeText) {
    if (marketHUD && marketHUD.mode) {
        marketHUD.mode.setText(modeText);

        // Color based on mode
        if (modeText.includes('MARKET')) {
            marketHUD.mode.setColor('#00ff00');
        } else {
            marketHUD.mode.setColor('#ffaa00');
        }
    }
}

/**
 * Update HUD dataset info
 */
function updateHUDDataset(datasetInfo) {
    if (marketHUD && marketHUD.dataset && datasetInfo) {
        marketHUD.dataset.setText(datasetInfo.name + ' (' + datasetInfo.symbol + ')');
    }
}

/**
 * Update HUD with current market regime
 */
function updateHUDRegime() {
    if (!marketHUD || !marketHUD.regime || !NoiseGenerator.isMarketMode()) {
        return;
    }

    const metadata = marketTerrainGenerator.getTerrainMetadata();

    let regimeText = 'Regime: ' + metadata.regime;
    let regimeColor = '#ffffff';

    switch (metadata.regime) {
        case 'BULL':
            regimeColor = '#4CAF50'; // Green
            break;
        case 'BEAR':
            regimeColor = '#F44336'; // Red
            break;
        case 'CRASH':
            regimeColor = '#9C27B0'; // Purple
            break;
        case 'CHOP':
            regimeColor = '#FFC107'; // Yellow
            break;
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

function update()
{
    vehicle.processKey(cursors);
    chunkloader.processChunk(this, vehicle.mainBody.x);
    backgroundloader.updateBackground(this, vehicle.mainBody.x);

    // Update market HUD
    updateHUDRegime();
}



