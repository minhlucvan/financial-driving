/**
 * Vector Renderer
 *
 * Utility functions for drawing vector graphics in Phaser.
 * Provides clean, simple geometric shapes for all game elements.
 */

import Phaser from 'phaser';
import type { VectorStyle, GradientStop } from './styles';
import type { RoadSegment, RoadConditions, MarketRegime, CarPhysics } from '../../types';
import {
  getRoadStyle,
  getPotholeStyle,
  getBumpStyle,
  getSkyGradient,
  getFogStyle,
  getRainDropStyle,
  ROAD_COLORS,
  WEATHER_COLORS,
  REGIME_COLORS,
} from './styles';

// ============================================
// BASIC SHAPE HELPERS
// ============================================

export function applyStyle(graphics: Phaser.GameObjects.Graphics, style: VectorStyle): void {
  if (style.fillColor !== undefined) {
    graphics.fillStyle(style.fillColor, style.fillAlpha ?? 1);
  }
  if (style.strokeColor !== undefined && style.strokeWidth) {
    graphics.lineStyle(style.strokeWidth, style.strokeColor, style.strokeAlpha ?? 1);
  }
}

// ============================================
// ROAD RENDERING
// ============================================

export interface RoadGeometry {
  x: number;
  y: number;
  width: number;
  slope: number;  // -32 to +32
  height: number; // Terrain height offset
}

/**
 * Draw a single road segment as a parallelogram
 * The slope determines the angle of the road
 */
export function drawRoadSegment(
  graphics: Phaser.GameObjects.Graphics,
  geometry: RoadGeometry,
  segment: RoadSegment,
  conditions: RoadConditions,
  regime: MarketRegime
): void {
  const style = getRoadStyle(conditions, regime);

  // Calculate corner points based on slope
  const slopeOffset = geometry.slope * 1.5; // Convert slope to pixels
  const groundY = geometry.y + geometry.height;

  // Road surface (parallelogram)
  const roadPoints = [
    { x: geometry.x, y: groundY },
    { x: geometry.x + geometry.width, y: groundY - slopeOffset },
    { x: geometry.x + geometry.width, y: groundY - slopeOffset + 80 },
    { x: geometry.x, y: groundY + 80 },
  ];

  applyStyle(graphics, style);
  graphics.beginPath();
  graphics.moveTo(roadPoints[0].x, roadPoints[0].y);
  roadPoints.forEach(point => graphics.lineTo(point.x, point.y));
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();

  // Road marking (center dashed line)
  const markingY = groundY - slopeOffset / 2 + 35;
  graphics.fillStyle(ROAD_COLORS.marking, 0.8);
  for (let i = 0; i < 3; i++) {
    const dashX = geometry.x + 20 + i * 70;
    const dashWidth = 40;
    const dashHeight = 4;
    graphics.fillRect(dashX, markingY, dashWidth, dashHeight);
  }

  // Draw obstacles from candle wicks
  if (segment.hasPothole) {
    drawPothole(graphics, geometry.x + geometry.width * 0.3, groundY + 40, 20);
  }
  if (segment.hasBump) {
    drawBump(graphics, geometry.x + geometry.width * 0.7, groundY + 30, 30, 15);
  }
}

/**
 * Draw a pothole (circular depression)
 */
function drawPothole(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number
): void {
  const style = getPotholeStyle();
  applyStyle(graphics, style);
  graphics.fillCircle(x, y, radius);
  graphics.strokeCircle(x, y, radius);
}

/**
 * Draw a bump (arc/dome shape)
 */
function drawBump(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const style = getBumpStyle();
  applyStyle(graphics, style);

  graphics.beginPath();
  graphics.moveTo(x - width / 2, y);
  graphics.arc(x, y, width / 2, Math.PI, 0, false);
  graphics.closePath();
  graphics.fillPath();
}

// ============================================
// TERRAIN / GROUND RENDERING
// ============================================

/**
 * Draw the ground/earth below the road
 */
export function drawGround(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  regime: MarketRegime
): void {
  const regimeColors = REGIME_COLORS[regime];

  // Main ground fill
  graphics.fillStyle(regimeColors.accent, 0.9);
  graphics.fillRect(x, y, width, height);

  // Ground texture lines (simple hatching)
  graphics.lineStyle(1, regimeColors.secondary, 0.3);
  const lineSpacing = 20;
  for (let i = 0; i < width / lineSpacing; i++) {
    const lineX = x + i * lineSpacing;
    graphics.beginPath();
    graphics.moveTo(lineX, y);
    graphics.lineTo(lineX + 10, y + height);
    graphics.strokePath();
  }
}

// ============================================
// SKY / WEATHER RENDERING
// ============================================

/**
 * Draw sky gradient background
 */
export function drawSky(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  weather: RoadConditions['weather']
): void {
  const gradientStops = getSkyGradient(weather);

  // Approximate gradient with horizontal bands
  const bandCount = 20;
  const bandHeight = height / bandCount;

  for (let i = 0; i < bandCount; i++) {
    const position = i / bandCount;

    // Find the two stops we're between
    let stopIndex = 0;
    for (let j = 0; j < gradientStops.length - 1; j++) {
      if (position >= gradientStops[j].position && position < gradientStops[j + 1].position) {
        stopIndex = j;
        break;
      }
    }

    const stop1 = gradientStops[stopIndex];
    const stop2 = gradientStops[Math.min(stopIndex + 1, gradientStops.length - 1)];

    // Interpolate color
    const t = (position - stop1.position) / (stop2.position - stop1.position || 1);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(stop1.color),
      Phaser.Display.Color.IntegerToColor(stop2.color),
      100,
      t * 100
    );

    graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), stop1.alpha);
    graphics.fillRect(0, i * bandHeight, width, bandHeight + 1);
  }
}

/**
 * Draw fog overlay
 */
export function drawFog(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  visibility: number
): void {
  const style = getFogStyle(visibility);

  if (style.fillAlpha && style.fillAlpha > 0.05) {
    applyStyle(graphics, style);
    graphics.fillRect(0, 0, width, height);
  }
}

/**
 * Draw rain effect (simple lines)
 */
export function drawRain(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  intensity: number,  // 0-1
  time: number       // For animation
): void {
  const style = getRainDropStyle();
  const dropCount = Math.floor(intensity * 50);

  graphics.lineStyle(1, style.fillColor ?? 0, style.fillAlpha ?? 0.6);

  for (let i = 0; i < dropCount; i++) {
    // Pseudo-random positioning based on index and time
    const seed = i * 1337;
    const x = (seed + time * 100) % width;
    const y = ((seed * 7) + time * 300) % height;
    const length = 10 + (seed % 20);

    graphics.beginPath();
    graphics.moveTo(x, y);
    graphics.lineTo(x + 2, y + length);
    graphics.strokePath();
  }
}

/**
 * Draw lightning bolt
 */
export function drawLightning(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  height: number
): void {
  graphics.lineStyle(3, WEATHER_COLORS.stormy.lightning, 0.9);

  const segments = 5;
  const segmentHeight = height / segments;

  graphics.beginPath();
  graphics.moveTo(x, y);

  let currentX = x;
  for (let i = 1; i <= segments; i++) {
    const offsetX = (Math.random() - 0.5) * 40;
    currentX += offsetX;
    graphics.lineTo(currentX, y + i * segmentHeight);
  }

  graphics.strokePath();

  // Glow effect
  graphics.lineStyle(8, WEATHER_COLORS.stormy.lightning, 0.3);
  graphics.beginPath();
  graphics.moveTo(x, y);
  currentX = x;
  for (let i = 1; i <= segments; i++) {
    const offsetX = (Math.random() - 0.5) * 40;
    currentX += offsetX;
    graphics.lineTo(currentX, y + i * segmentHeight);
  }
  graphics.strokePath();
}

/**
 * Draw simple clouds
 */
export function drawCloud(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  weather: RoadConditions['weather']
): void {
  const cloudColor = weather === 'stormy' ? 0x374151 : WEATHER_COLORS.cloudy.cloud;
  const alpha = weather === 'stormy' ? 0.9 : 0.7;

  graphics.fillStyle(cloudColor, alpha);

  // Cloud made of overlapping circles
  const circleCount = 5;
  const baseRadius = width / 4;

  for (let i = 0; i < circleCount; i++) {
    const cx = x + (i - 2) * (baseRadius * 0.8);
    const cy = y + Math.sin(i * 1.2) * (baseRadius * 0.3);
    const r = baseRadius * (0.7 + Math.cos(i) * 0.3);
    graphics.fillCircle(cx, cy, r);
  }
}

// ============================================
// VECTOR CAR RENDERING
// ============================================

export interface CarGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  wheelRadius: number;
}

/**
 * Draw a simple vector car
 */
export function drawVectorCar(
  graphics: Phaser.GameObjects.Graphics,
  geometry: CarGeometry,
  carPhysics: CarPhysics,
  pnlPercent: number
): void {
  const { x, y, width, height, rotation, wheelRadius } = geometry;

  // Save current transform
  graphics.save();
  graphics.translateCanvas(x, y);
  graphics.rotateCanvas(rotation);

  // Car body color based on P&L
  let bodyColor = 0x3b82f6; // Blue neutral
  if (pnlPercent > 5) {
    bodyColor = 0x10b981; // Green profit
  } else if (pnlPercent < -5) {
    bodyColor = 0xef4444; // Red loss
  }

  // Body alpha based on stress
  const bodyAlpha = 0.9 - carPhysics.engineTemperature * 0.3;

  // Main body (rounded rectangle approximation)
  graphics.fillStyle(bodyColor, bodyAlpha);
  graphics.lineStyle(2, 0x111827, 1);

  // Body shape
  graphics.beginPath();
  graphics.moveTo(-width / 2 + 10, -height / 2);
  graphics.lineTo(width / 2 - 10, -height / 2);
  graphics.lineTo(width / 2, -height / 4);
  graphics.lineTo(width / 2, height / 2 - 5);
  graphics.lineTo(-width / 2, height / 2 - 5);
  graphics.lineTo(-width / 2, -height / 4);
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();

  // Windshield
  graphics.fillStyle(0x93c5fd, 0.7);
  graphics.beginPath();
  graphics.moveTo(-width / 4, -height / 2 + 5);
  graphics.lineTo(width / 4, -height / 2 + 5);
  graphics.lineTo(width / 3, -height / 4);
  graphics.lineTo(-width / 4, -height / 4);
  graphics.closePath();
  graphics.fillPath();

  // Wheels
  graphics.fillStyle(0x1f2937, 1);
  graphics.lineStyle(1, 0x111827, 1);

  // Front wheel
  graphics.fillCircle(width / 3, height / 2, wheelRadius);
  graphics.strokeCircle(width / 3, height / 2, wheelRadius);

  // Back wheel
  graphics.fillCircle(-width / 3, height / 2, wheelRadius);
  graphics.strokeCircle(-width / 3, height / 2, wheelRadius);

  // Wheel centers (rims)
  graphics.fillStyle(0x6b7280, 1);
  graphics.fillCircle(width / 3, height / 2, wheelRadius * 0.4);
  graphics.fillCircle(-width / 3, height / 2, wheelRadius * 0.4);

  // Engine glow (if overheating)
  if (carPhysics.engineTemperature > 0.5) {
    const glowAlpha = (carPhysics.engineTemperature - 0.5) * 0.6;
    graphics.fillStyle(0xf59e0b, glowAlpha);
    graphics.fillCircle(width / 4, 0, width / 4);
  }

  graphics.restore();
}

// ============================================
// HUD / INDICATOR RENDERING
// ============================================

/**
 * Draw a gauge/meter
 */
export function drawGauge(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  radius: number,
  value: number,  // 0-1
  color: number
): void {
  // Background arc
  graphics.lineStyle(6, 0x374151, 0.5);
  graphics.beginPath();
  graphics.arc(x, y, radius, Math.PI * 0.75, Math.PI * 2.25, false);
  graphics.strokePath();

  // Value arc
  const endAngle = Math.PI * 0.75 + value * Math.PI * 1.5;
  graphics.lineStyle(6, color, 0.9);
  graphics.beginPath();
  graphics.arc(x, y, radius, Math.PI * 0.75, endAngle, false);
  graphics.strokePath();

  // Center dot
  graphics.fillStyle(color, 1);
  graphics.fillCircle(x, y, 4);
}

/**
 * Draw a horizontal bar
 */
export function drawBar(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,  // 0-1
  fillColor: number,
  bgColor: number = 0x374151
): void {
  // Background
  graphics.fillStyle(bgColor, 0.6);
  graphics.fillRoundedRect(x, y, width, height, height / 2);

  // Fill
  const fillWidth = width * Math.max(0, Math.min(1, value));
  if (fillWidth > 0) {
    graphics.fillStyle(fillColor, 0.9);
    graphics.fillRoundedRect(x, y, fillWidth, height, height / 2);
  }

  // Border
  graphics.lineStyle(1, 0x4b5563, 0.5);
  graphics.strokeRoundedRect(x, y, width, height, height / 2);
}
