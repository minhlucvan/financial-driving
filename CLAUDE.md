# CLAUDE.md - AI Assistant Guide for Financial Drive

## Project Overview

**Financial Drive** is a browser-based driving game built with Phaser 3 and Matter.js physics engine. The game features a procedurally generated terrain car game with physics simulation. The project is being evolved from a basic terrain driving game into a financial education game where market data drives the terrain generation.

### Vision
The ultimate goal is to create an educational simulation where:
- The **road terrain** represents market price history (candle data)
- The **car** represents a financial position (assets, cash, debt)
- **Driving mechanics** teach financial concepts through physical feedback

## Repository Structure

```
financial-driving/
├── index.html           # Entry point - loads Phaser and all game scripts
├── src/                 # JavaScript source files
│   ├── base.js          # Global variables and initialization (loaded first)
│   ├── noiseGenerator.js # Curve generation algorithms for terrain
│   ├── terrainGenerator.js # Tile placement from noise curves
│   ├── chunk.js         # Chunk class for terrain segments
│   ├── chunkLoader.js   # Manages chunk creation/destruction
│   ├── vehicle.js       # Vehicle class with physics-based movement
│   ├── backgroundLoader.js # Parallax background management
│   └── main.js          # Game scenes and Phaser configuration
├── assets/              # Game assets
│   ├── car/            # Vehicle sprites and physics data (JSON)
│   ├── fonts/          # Bitmap fonts (desyrel-pink)
│   ├── game_background_1/layers/ # Parallax background layers
│   ├── favicon/        # Browser favicon
│   ├── land_ext.png    # Tileset image
│   ├── land_ext.json   # Tileset collision data
│   └── land_tilemap_ext.json # Premade tilemap data (Tiled format)
├── readme-img/          # README screenshots
├── CONCEPT.md          # Game design concept document
├── CONCEPTS.md         # Duplicate of concept document
├── README.md           # Original project documentation
└── LICENSE             # MIT License
```

## Architecture Overview

### Script Loading Order (Critical)
Scripts must be loaded in this specific order in `index.html`:
1. `base.js` - Global variables and constants
2. `noiseGenerator.js` - Noise/curve generation
3. `terrainGenerator.js` - Terrain tile placement
4. `chunk.js` - Chunk class definition
5. `chunkLoader.js` - Chunk management
6. `vehicle.js` - Vehicle class
7. `backgroundLoader.js` - Background handling
8. `main.js` - Game initialization and scenes

### Key Classes

#### `NoiseGenerator` (noiseGenerator.js)
- Static class for procedural curve generation
- Uses cosine interpolation for smooth terrain curves
- Provides `getCurve()` factory method to select generation algorithm

#### `Chunk` (chunk.js)
- Represents a terrain segment with tilemap layer
- Handles procedural generation or loading from premade tilemaps
- Manages physics bodies for terrain collision
- Key methods: `initChunk()`, `nextChunk()`, `destroyChunk()`

#### `ChunkLoader` (chunkLoader.js)
- Manages two chunks in a circular buffer pattern
- Handles chunk swapping as vehicle progresses
- Loads premade chunks from Tiled JSON files
- Key methods: `initChunkLoader()`, `processChunk()`

#### `Vehicle` (vehicle.js)
- Data-driven vehicle system using JSON configuration
- Physics-based with Matter.js bodies and joints
- Keyboard input mapped to physics properties (torque, force)
- Vehicle parts defined in `assets/car/*.json`

#### `BackgroundLoader` (backgroundLoader.js)
- Parallax scrolling background with multiple layers
- Uses circular buffer for efficient image repositioning
- Each layer has configurable scroll factor and offset

### Game Scenes

1. **VSelectScene** - Vehicle selection screen
   - Displays car thumbnails from multiatlas
   - Arrow buttons to cycle through vehicles
   - Start button to launch game

2. **gameScene** - Main gameplay
   - Camera follows vehicle
   - Continuous terrain generation
   - Physics simulation with Matter.js

## Technical Specifications

### Framework & Dependencies
- **Phaser 3.55.2** - Game framework (loaded via CDN)
- **Matter.js** - Physics engine (bundled with Phaser)
- No build system - vanilla JavaScript with direct script loading
- No npm/package.json - static file serving only

### Display Configuration
- Logical dimensions: 1536 x 864 pixels
- Dynamic width adjustment based on device aspect ratio
- Scale mode: FIT with center alignment
- Fullscreen toggle: Press 'F' key

### Physics Configuration
- Engine: Matter.js
- Gravity: y = 1
- Debug mode available (toggle in config)
- Mouse spring interaction enabled

### Tile System
- Tile size: 32x32 pixels
- Tileset: `land_ext.png` with collision data
- Slopes supported: -32, -16, 0, 16, 32 (pixel offsets)
- Premade chunks created in Tiled Map Editor

## Development Workflow

### Running the Game
This is a static web application. To run locally:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in a browser.

### Live Demo
The game is hosted on GitHub Pages: https://ankit-4129.github.io/phaser3-matterjs-car/

### Creating New Vehicles
1. Create sprite images in `assets/car/`
2. Generate multiatlas JSON using Texture Packer
3. Create physics body JSON using Physics Editor
4. Add vehicle-specific JSON with:
   - `image`: Array of part names
   - `joint`: Array of joint definitions
   - `mainBody`: Name of the main physics body
   - `processKey`: Keyboard input to physics mapping

### Creating Premade Chunks
1. Open `assets/land_tilemap_ext.json` in Tiled
2. Create new layer with terrain design
3. Add layer properties: `start`, `end` (Y-coordinates), `weight` (spawn probability)
4. Weight = 0 designates starting chunk

## Code Conventions

### Global Variables (base.js)
- `game` - Phaser.Game instance
- `vehicle` - Current Vehicle instance
- `chunkloader` - ChunkLoader instance
- `backgroundloader` - BackgroundLoader instance
- `cursors` - Keyboard cursor keys
- `graphics` - Graphics object for debug drawing
- `srand` - Phaser's seeded random generator

### Naming Conventions
- Classes: PascalCase (`ChunkLoader`, `Vehicle`)
- Functions: camelCase (`processChunk`, `drawTerrain`)
- Constants: SCREAMING_SNAKE_CASE (though not strictly followed)
- Global variables: camelCase with descriptive names

### Debug Flags
Several classes have static debug flags:
- `Chunk.debug` - Chunk border visualization
- `Chunk.debug_spacechunk` - Gap between chunks
- `NoiseGenerator.curve_debug` - Curve point rendering
- `terrainGenerator.js` has local `debug`, `curve_debug`, `bound_debug` flags

## Guidelines for AI Assistants

### When Modifying This Codebase

1. **Script Loading Order**: Any new scripts must be added to `index.html` in correct dependency order

2. **No Build System**: Changes are immediately effective - no compilation step required

3. **Physics Tuning**: Vehicle behavior is data-driven through JSON files. Modify `assets/car/*.json` for physics adjustments

4. **Terrain Generation**: The terrain pipeline is:
   ```
   NoiseGenerator.getCurve() → drawTerrain() → Chunk.initChunk()
   ```

5. **Memory Management**: Chunks must properly destroy physics bodies when removed (see `Chunk.destroyChunk()`)

### Financial Drive Evolution

When implementing the "Financial Drive" concept:

1. **Market Data Integration**: Replace `NoiseGenerator` with market price data to generate terrain slopes

2. **Financial Metaphors**:
   - Engine power = Asset allocation
   - Brake strength = Cash percentage
   - Acceleration = Debt/leverage ratio
   - Road conditions = Market volatility indicators

3. **Scoring System**: Implement real financial metrics (CAGR, Sharpe ratio, Max Drawdown)

4. **Visual Feedback**: Add car state indicators for over-leverage, margin stress, etc.

### Testing Approach
- Test in browser with DevTools console open
- Use 'D' key to log FPS
- Enable debug flags to visualize:
  - Chunk boundaries
  - Terrain curves
  - Physics bodies

### Key Files to Modify for Features

| Feature | Primary Files |
|---------|--------------|
| Terrain shape | `noiseGenerator.js`, `terrainGenerator.js` |
| Vehicle physics | `vehicle.js`, `assets/car/*.json` |
| New vehicle | `assets/car/` (add images + JSON) |
| Game UI | `main.js` (VSelectScene, gameScene) |
| Background | `backgroundLoader.js`, `assets/game_background_1/` |
| Chunk behavior | `chunk.js`, `chunkLoader.js` |

## Known Limitations

1. No mobile touch controls implemented
2. Single player only
3. No save/load functionality
4. Audio not implemented
5. No build/bundle optimization

## External Tools Used

- **Texture Packer** - Sprite atlas generation (codeandweb.com)
- **Physics Editor** - Matter.js body shapes (codeandweb.com)
- **Tiled** - Tilemap creation (mapeditor.org)
- **Pixilart** - Pixel art creation (pixilart.com)
- **Online PNG Tools** - Transparency conversion

## License

MIT License - See LICENSE file for details.
