/**
 * SVG Texture Loader for Phaser
 *
 * Utilities for dynamically loading and updating SVG textures in Phaser.
 * Supports caching and efficient texture updates.
 */

import Phaser from 'phaser';

/**
 * Load an SVG string as a Phaser texture
 */
export function loadSVGTexture(
  scene: Phaser.Scene,
  key: string,
  svgString: string,
  width: number,
  height: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Remove existing texture if it exists
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }

    // Create an image element from SVG
    const img = new Image();
    img.width = width;
    img.height = height;

    img.onload = () => {
      // Add the loaded image as a texture
      scene.textures.addImage(key, img);
      resolve();
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load SVG texture: ${err}`));
    };

    // Convert SVG to data URL
    const encoded = encodeURIComponent(svgString)
      .replace(/'/g, '%27')
      .replace(/"/g, '%22');
    img.src = `data:image/svg+xml,${encoded}`;
  });
}

/**
 * Load SVG texture synchronously using canvas
 * This is faster for frequent updates
 */
export function loadSVGTextureSync(
  scene: Phaser.Scene,
  key: string,
  svgString: string,
  width: number,
  height: number
): void {
  // Remove existing texture if it exists
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  // Create a canvas to render the SVG
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('Failed to get canvas context');
    return;
  }

  // Create an image from SVG
  const img = new Image();
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  img.src = `data:image/svg+xml,${encoded}`;

  // When image loads, draw to canvas and create texture
  img.onload = () => {
    ctx.drawImage(img, 0, 0, width, height);
    scene.textures.addCanvas(key, canvas);
  };
}

/**
 * SVG Sprite Manager
 * Manages dynamic SVG-based sprites with efficient caching
 */
export class SVGSpriteManager {
  private scene: Phaser.Scene;
  private cache: Map<string, string> = new Map();
  private pendingLoads: Map<string, Promise<void>> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Get or create a texture from SVG
   * Returns the texture key
   */
  async getTexture(
    key: string,
    svgGenerator: () => string,
    width: number,
    height: number
  ): Promise<string> {
    // Check if texture already exists
    if (this.scene.textures.exists(key)) {
      return key;
    }

    // Check if already loading
    const pending = this.pendingLoads.get(key);
    if (pending) {
      await pending;
      return key;
    }

    // Generate and load SVG
    const svgString = svgGenerator();
    const loadPromise = loadSVGTexture(this.scene, key, svgString, width, height);

    this.pendingLoads.set(key, loadPromise);
    await loadPromise;
    this.pendingLoads.delete(key);

    this.cache.set(key, svgString);
    return key;
  }

  /**
   * Update a texture with new SVG content
   */
  async updateTexture(
    key: string,
    svgString: string,
    width: number,
    height: number
  ): Promise<void> {
    await loadSVGTexture(this.scene, key, svgString, width, height);
    this.cache.set(key, svgString);
  }

  /**
   * Clear all cached textures
   */
  clearCache(): void {
    for (const key of this.cache.keys()) {
      if (this.scene.textures.exists(key)) {
        this.scene.textures.remove(key);
      }
    }
    this.cache.clear();
  }

  /**
   * Remove a specific texture
   */
  removeTexture(key: string): void {
    if (this.scene.textures.exists(key)) {
      this.scene.textures.remove(key);
    }
    this.cache.delete(key);
  }
}

/**
 * Create a Phaser sprite from SVG string
 */
export async function createSVGSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  svgString: string,
  width: number,
  height: number,
  key?: string
): Promise<Phaser.GameObjects.Sprite> {
  const textureKey = key || `svg_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await loadSVGTexture(scene, textureKey, svgString, width, height);

  return scene.add.sprite(x, y, textureKey);
}

/**
 * Update an existing sprite with new SVG content
 */
export async function updateSVGSprite(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  svgString: string,
  width: number,
  height: number
): Promise<void> {
  const textureKey = sprite.texture.key;
  await loadSVGTexture(scene, textureKey, svgString, width, height);
  sprite.setTexture(textureKey);
}
