/**
 * SVG Car Generator
 *
 * Generates dynamic SVG car sprites that reflect financial state.
 * The car visually responds to P&L, stress, leverage, and market conditions.
 */

import type { CarPhysics } from '../../types';
import { CAR_COLORS, UI_COLORS } from './styles';

// Convert hex number to CSS color string
function hexToCSS(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

// Interpolate between two colors
function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
}

export interface CarSVGConfig {
  width: number;
  height: number;
  pnlPercent: number;
  carPhysics: CarPhysics;
  isAccelerating: boolean;
  isBraking: boolean;
}

/**
 * Generate SVG string for the car based on current state
 */
export function generateCarSVG(config: CarSVGConfig): string {
  const { width, height, pnlPercent, carPhysics, isAccelerating, isBraking } = config;

  // Determine body color based on P&L
  let bodyColor: number = CAR_COLORS.body.neutral;
  if (pnlPercent > 5) {
    bodyColor = lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.profit, Math.min(1, pnlPercent / 20));
  } else if (pnlPercent < -5) {
    bodyColor = lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.loss, Math.min(1, Math.abs(pnlPercent) / 20));
  }

  // Stress affects glow/warning indicators
  const stressColor = carPhysics.engineTemperature > 0.7
    ? UI_COLORS.negative
    : carPhysics.engineTemperature > 0.4
      ? UI_COLORS.warning
      : UI_COLORS.positive;

  // Engine glow based on power
  const engineGlow = isAccelerating ? 0.8 : 0.3;
  const engineColor = carPhysics.engineTemperature > 0.6
    ? UI_COLORS.negative
    : UI_COLORS.warning;

  // Brake glow
  const brakeGlow = isBraking ? 0.9 : 0.2;

  // Fuel indicator position (0-1)
  const fuelLevel = carPhysics.fuelLevel;

  // Durability affects opacity
  const bodyOpacity = 0.7 + carPhysics.durability * 0.3;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Body gradient -->
    <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity}" />
      <stop offset="100%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity * 0.7}" />
    </linearGradient>

    <!-- Window gradient -->
    <linearGradient id="windowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.6" />
    </linearGradient>

    <!-- Engine glow -->
    <radialGradient id="engineGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${hexToCSS(engineColor)};stop-opacity:${engineGlow}" />
      <stop offset="100%" style="stop-color:${hexToCSS(engineColor)};stop-opacity:0" />
    </radialGradient>

    <!-- Brake light glow -->
    <radialGradient id="brakeGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${hexToCSS(UI_COLORS.negative)};stop-opacity:${brakeGlow}" />
      <stop offset="100%" style="stop-color:${hexToCSS(UI_COLORS.negative)};stop-opacity:0" />
    </radialGradient>

    <!-- Stress indicator pulse -->
    <radialGradient id="stressGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${hexToCSS(stressColor)};stop-opacity:${carPhysics.engineTemperature * 0.6}" />
      <stop offset="100%" style="stop-color:${hexToCSS(stressColor)};stop-opacity:0" />
    </radialGradient>
  </defs>

  <!-- Car shadow -->
  <ellipse cx="${width * 0.5}" cy="${height * 0.92}" rx="${width * 0.4}" ry="${height * 0.06}"
           fill="#000" opacity="0.3" />

  <!-- Main body -->
  <g id="carBody">
    <!-- Lower body / chassis -->
    <path d="M ${width * 0.1} ${height * 0.6}
             L ${width * 0.15} ${height * 0.75}
             L ${width * 0.85} ${height * 0.75}
             L ${width * 0.9} ${height * 0.6}
             L ${width * 0.85} ${height * 0.5}
             L ${width * 0.15} ${height * 0.5}
             Z"
          fill="url(#bodyGradient)"
          stroke="${hexToCSS(CAR_COLORS.outline)}"
          stroke-width="2" />

    <!-- Upper body / cabin -->
    <path d="M ${width * 0.22} ${height * 0.5}
             L ${width * 0.28} ${height * 0.28}
             L ${width * 0.72} ${height * 0.28}
             L ${width * 0.78} ${height * 0.5}
             Z"
          fill="url(#bodyGradient)"
          stroke="${hexToCSS(CAR_COLORS.outline)}"
          stroke-width="2" />

    <!-- Windshield -->
    <path d="M ${width * 0.3} ${height * 0.48}
             L ${width * 0.34} ${height * 0.32}
             L ${width * 0.52} ${height * 0.32}
             L ${width * 0.48} ${height * 0.48}
             Z"
          fill="url(#windowGradient)"
          stroke="${hexToCSS(CAR_COLORS.outline)}"
          stroke-width="1" />

    <!-- Rear window -->
    <path d="M ${width * 0.52} ${height * 0.48}
             L ${width * 0.52} ${height * 0.32}
             L ${width * 0.68} ${height * 0.32}
             L ${width * 0.72} ${height * 0.48}
             Z"
          fill="url(#windowGradient)"
          stroke="${hexToCSS(CAR_COLORS.outline)}"
          stroke-width="1" />
  </g>

  <!-- Wheels -->
  <g id="wheels">
    <!-- Front wheel -->
    <circle cx="${width * 0.25}" cy="${height * 0.75}" r="${width * 0.12}"
            fill="${hexToCSS(CAR_COLORS.wheel)}"
            stroke="${hexToCSS(CAR_COLORS.outline)}"
            stroke-width="2" />
    <circle cx="${width * 0.25}" cy="${height * 0.75}" r="${width * 0.06}"
            fill="#666" />

    <!-- Rear wheel -->
    <circle cx="${width * 0.75}" cy="${height * 0.75}" r="${width * 0.12}"
            fill="${hexToCSS(CAR_COLORS.wheel)}"
            stroke="${hexToCSS(CAR_COLORS.outline)}"
            stroke-width="2" />
    <circle cx="${width * 0.75}" cy="${height * 0.75}" r="${width * 0.06}"
            fill="#666" />
  </g>

  <!-- Engine glow (front) -->
  <ellipse cx="${width * 0.12}" cy="${height * 0.6}" rx="${width * 0.08}" ry="${height * 0.12}"
           fill="url(#engineGlow)" />

  <!-- Brake lights (rear) -->
  <ellipse cx="${width * 0.88}" cy="${height * 0.55}" rx="${width * 0.06}" ry="${height * 0.08}"
           fill="url(#brakeGlow)" />

  <!-- Headlight -->
  <rect x="${width * 0.08}" y="${height * 0.52}" width="${width * 0.05}" height="${height * 0.08}"
        rx="2" fill="#fff" opacity="${isAccelerating ? 0.9 : 0.5}" />

  <!-- Tail light -->
  <rect x="${width * 0.87}" y="${height * 0.52}" width="${width * 0.04}" height="${height * 0.08}"
        rx="2" fill="${hexToCSS(UI_COLORS.negative)}" opacity="${isBraking ? 0.9 : 0.4}" />

  <!-- Stress indicator (roof) -->
  ${carPhysics.engineTemperature > 0.3 ? `
  <circle cx="${width * 0.5}" cy="${height * 0.25}" r="${width * 0.04}"
          fill="url(#stressGlow)" />
  ` : ''}

  <!-- Fuel gauge on side -->
  <g id="fuelGauge" transform="translate(${width * 0.4}, ${height * 0.58})">
    <rect x="0" y="0" width="${width * 0.2}" height="${height * 0.06}"
          fill="#222" rx="2" />
    <rect x="1" y="1" width="${(width * 0.2 - 2) * fuelLevel}" height="${height * 0.06 - 2}"
          fill="${fuelLevel > 0.3 ? hexToCSS(UI_COLORS.positive) : hexToCSS(UI_COLORS.negative)}"
          rx="1" />
  </g>

  <!-- Leverage indicator (small bars on top) -->
  ${carPhysics.accelerationBoost > 1.2 ? `
  <g id="leverageIndicator">
    ${Array.from({ length: Math.min(3, Math.floor(carPhysics.accelerationBoost)) }, (_, i) => `
      <rect x="${width * 0.42 + i * width * 0.06}" y="${height * 0.2}"
            width="${width * 0.04}" height="${height * 0.05}"
            fill="${hexToCSS(UI_COLORS.warning)}" opacity="0.8" rx="1" />
    `).join('')}
  </g>
  ` : ''}
</svg>`;

  return svg.trim();
}

/**
 * Convert SVG string to data URL for Phaser texture loading
 */
export function svgToDataURL(svgString: string): string {
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Create a unique texture key based on car state
 * Used for caching textures to avoid regenerating identical SVGs
 */
export function getCarTextureKey(config: CarSVGConfig): string {
  const pnlBucket = Math.floor(config.pnlPercent / 5) * 5;
  const tempBucket = Math.floor(config.carPhysics.engineTemperature * 10);
  const fuelBucket = Math.floor(config.carPhysics.fuelLevel * 10);
  const leverageBucket = Math.floor(config.carPhysics.accelerationBoost);

  return `car_${pnlBucket}_${tempBucket}_${fuelBucket}_${leverageBucket}_${config.isAccelerating ? 1 : 0}_${config.isBraking ? 1 : 0}`;
}

/**
 * Simple top-down car SVG for overhead view
 */
export function generateTopDownCarSVG(config: CarSVGConfig): string {
  const { width, height, pnlPercent, carPhysics } = config;

  let bodyColor: number = CAR_COLORS.body.neutral;
  if (pnlPercent > 5) {
    bodyColor = lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.profit, Math.min(1, pnlPercent / 20));
  } else if (pnlPercent < -5) {
    bodyColor = lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.loss, Math.min(1, Math.abs(pnlPercent) / 20));
  }

  const bodyOpacity = 0.7 + carPhysics.durability * 0.3;

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Car body (top-down) -->
  <rect x="${width * 0.2}" y="${height * 0.1}"
        width="${width * 0.6}" height="${height * 0.8}"
        rx="${width * 0.1}"
        fill="${hexToCSS(bodyColor)}"
        opacity="${bodyOpacity}"
        stroke="${hexToCSS(CAR_COLORS.outline)}"
        stroke-width="2" />

  <!-- Windshield -->
  <rect x="${width * 0.28}" y="${height * 0.15}"
        width="${width * 0.44}" height="${height * 0.2}"
        rx="${width * 0.05}"
        fill="${hexToCSS(CAR_COLORS.window)}"
        opacity="0.7" />

  <!-- Wheels -->
  <rect x="${width * 0.12}" y="${height * 0.2}" width="${width * 0.1}" height="${height * 0.18}"
        rx="3" fill="${hexToCSS(CAR_COLORS.wheel)}" />
  <rect x="${width * 0.78}" y="${height * 0.2}" width="${width * 0.1}" height="${height * 0.18}"
        rx="3" fill="${hexToCSS(CAR_COLORS.wheel)}" />
  <rect x="${width * 0.12}" y="${height * 0.62}" width="${width * 0.1}" height="${height * 0.18}"
        rx="3" fill="${hexToCSS(CAR_COLORS.wheel)}" />
  <rect x="${width * 0.78}" y="${height * 0.62}" width="${width * 0.1}" height="${height * 0.18}"
        rx="3" fill="${hexToCSS(CAR_COLORS.wheel)}" />
</svg>`.trim();
}
