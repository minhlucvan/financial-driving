/**
 * SVG Car Sprites
 *
 * Two distinct car designs with state-based visual variations.
 * Cars reflect P&L, stress, and driving state through color and effects.
 */

import type { CarPhysics } from '../../types';
import { CAR_COLORS, UI_COLORS } from './styles';

// ============================================
// CAR TYPES
// ============================================

export type CarType = 'sedan' | 'sports';

export interface CarState {
  pnlPercent: number;
  carPhysics: CarPhysics;
  isAccelerating: boolean;
  isBraking: boolean;
}

export interface CarDefinition {
  type: CarType;
  name: string;
  description: string;
  width: number;
  height: number;
}

export const CAR_DEFINITIONS: CarDefinition[] = [
  {
    type: 'sedan',
    name: 'Steady Saver',
    description: 'Balanced and reliable - good for steady growth',
    width: 120,
    height: 50,
  },
  {
    type: 'sports',
    name: 'Risk Racer',
    description: 'Fast and agile - for aggressive strategies',
    width: 130,
    height: 45,
  },
];

// ============================================
// COLOR UTILITIES
// ============================================

function hexToCSS(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

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

function getBodyColor(pnlPercent: number): number {
  if (pnlPercent > 5) {
    return lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.profit, Math.min(1, pnlPercent / 20));
  } else if (pnlPercent < -5) {
    return lerpColor(CAR_COLORS.body.neutral, CAR_COLORS.body.loss, Math.min(1, Math.abs(pnlPercent) / 20));
  }
  return CAR_COLORS.body.neutral;
}

function getStressColor(temperature: number): number {
  if (temperature > 0.7) return UI_COLORS.negative;
  if (temperature > 0.4) return UI_COLORS.warning;
  return UI_COLORS.positive;
}

// ============================================
// SEDAN CAR SVG
// ============================================

function generateSedanSVG(state: CarState): string {
  const { pnlPercent, carPhysics, isAccelerating, isBraking } = state;
  const width = 120;
  const height = 50;

  const bodyColor = getBodyColor(pnlPercent);
  const stressColor = getStressColor(carPhysics.engineTemperature);
  const bodyOpacity = 0.75 + carPhysics.durability * 0.25;
  const engineGlow = isAccelerating ? 0.8 : 0.2;
  const brakeGlow = isBraking ? 0.9 : 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sedanBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity}"/>
      <stop offset="100%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity * 0.7}"/>
    </linearGradient>
    <linearGradient id="sedanWindow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.5"/>
    </linearGradient>
  </defs>

  <!-- Shadow -->
  <ellipse cx="60" cy="47" rx="50" ry="4" fill="#000" opacity="0.3"/>

  <!-- Main Body -->
  <path d="M 10 32 L 15 38 L 105 38 L 110 32 L 105 26 L 15 26 Z"
        fill="url(#sedanBody)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>

  <!-- Cabin -->
  <path d="M 30 26 L 38 14 L 82 14 L 90 26 Z"
        fill="url(#sedanBody)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>

  <!-- Front Window -->
  <path d="M 40 24 L 46 16 L 58 16 L 55 24 Z"
        fill="url(#sedanWindow)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Rear Window -->
  <path d="M 58 24 L 58 16 L 78 16 L 84 24 Z"
        fill="url(#sedanWindow)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Wheels -->
  <circle cx="28" cy="38" r="10" fill="${hexToCSS(CAR_COLORS.wheel)}" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>
  <circle cx="28" cy="38" r="5" fill="#555"/>
  <circle cx="92" cy="38" r="10" fill="${hexToCSS(CAR_COLORS.wheel)}" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>
  <circle cx="92" cy="38" r="5" fill="#555"/>

  <!-- Headlight -->
  <rect x="6" y="28" width="5" height="6" rx="1" fill="#fff" opacity="${isAccelerating ? 0.95 : 0.5}"/>

  <!-- Taillight -->
  <rect x="109" y="28" width="4" height="6" rx="1" fill="${hexToCSS(UI_COLORS.negative)}" opacity="${brakeGlow}"/>

  <!-- Engine Glow -->
  <ellipse cx="12" cy="32" rx="8" ry="6" fill="${hexToCSS(UI_COLORS.warning)}" opacity="${engineGlow * 0.5}"/>

  <!-- Stress Indicator -->
  ${carPhysics.engineTemperature > 0.3 ? `
  <circle cx="60" cy="10" r="4" fill="${hexToCSS(stressColor)}" opacity="${carPhysics.engineTemperature * 0.7}"/>
  ` : ''}

  <!-- Fuel Gauge -->
  <rect x="45" y="30" width="30" height="4" fill="#222" rx="1"/>
  <rect x="46" y="31" width="${28 * carPhysics.fuelLevel}" height="2"
        fill="${carPhysics.fuelLevel > 0.3 ? hexToCSS(UI_COLORS.positive) : hexToCSS(UI_COLORS.negative)}" rx="1"/>
</svg>`;
}

// ============================================
// SPORTS CAR SVG
// ============================================

function generateSportsSVG(state: CarState): string {
  const { pnlPercent, carPhysics, isAccelerating, isBraking } = state;
  const width = 130;
  const height = 45;

  const bodyColor = getBodyColor(pnlPercent);
  const stressColor = getStressColor(carPhysics.engineTemperature);
  const bodyOpacity = 0.75 + carPhysics.durability * 0.25;
  const engineGlow = isAccelerating ? 0.9 : 0.2;
  const brakeGlow = isBraking ? 0.95 : 0.2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sportsBody" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity}"/>
      <stop offset="100%" style="stop-color:${hexToCSS(bodyColor)};stop-opacity:${bodyOpacity * 0.6}"/>
    </linearGradient>
    <linearGradient id="sportsWindow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.85"/>
      <stop offset="100%" style="stop-color:${hexToCSS(CAR_COLORS.window)};stop-opacity:0.4"/>
    </linearGradient>
  </defs>

  <!-- Shadow -->
  <ellipse cx="65" cy="42" rx="55" ry="4" fill="#000" opacity="0.35"/>

  <!-- Main Body - Sleek profile -->
  <path d="M 5 28
           C 5 32, 10 35, 20 35
           L 110 35
           C 120 35, 125 32, 125 28
           L 120 24
           L 10 24
           Z"
        fill="url(#sportsBody)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>

  <!-- Front Hood - Low and aerodynamic -->
  <path d="M 10 24 L 5 28 L 25 28 L 25 24 Z"
        fill="url(#sportsBody)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Cabin - Low-slung cockpit -->
  <path d="M 45 24 L 55 12 L 85 12 L 95 24 Z"
        fill="url(#sportsBody)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>

  <!-- Windshield - Raked angle -->
  <path d="M 50 22 L 58 14 L 72 14 L 68 22 Z"
        fill="url(#sportsWindow)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Rear Window -->
  <path d="M 72 22 L 72 14 L 82 14 L 88 22 Z"
        fill="url(#sportsWindow)" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Spoiler -->
  <path d="M 105 20 L 120 18 L 122 22 L 105 24 Z"
        fill="${hexToCSS(bodyColor)}" opacity="${bodyOpacity * 0.9}" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="1"/>

  <!-- Wheels - Larger for sports car -->
  <circle cx="30" cy="35" r="11" fill="${hexToCSS(CAR_COLORS.wheel)}" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>
  <circle cx="30" cy="35" r="5" fill="#666"/>
  <circle cx="100" cy="35" r="11" fill="${hexToCSS(CAR_COLORS.wheel)}" stroke="${hexToCSS(CAR_COLORS.outline)}" stroke-width="2"/>
  <circle cx="100" cy="35" r="5" fill="#666"/>

  <!-- Dual Headlights -->
  <rect x="3" y="24" width="4" height="4" rx="1" fill="#fff" opacity="${isAccelerating ? 0.95 : 0.5}"/>
  <rect x="3" y="29" width="4" height="3" rx="1" fill="#fff" opacity="${isAccelerating ? 0.85 : 0.4}"/>

  <!-- Dual Taillights -->
  <rect x="123" y="24" width="3" height="4" rx="1" fill="${hexToCSS(UI_COLORS.negative)}" opacity="${brakeGlow}"/>
  <rect x="123" y="29" width="3" height="3" rx="1" fill="${hexToCSS(UI_COLORS.negative)}" opacity="${brakeGlow * 0.8}"/>

  <!-- Engine Glow - More intense for sports car -->
  <ellipse cx="15" cy="28" rx="10" ry="5" fill="${hexToCSS(UI_COLORS.warning)}" opacity="${engineGlow * 0.6}"/>

  <!-- Exhaust flame when accelerating -->
  ${isAccelerating ? `
  <ellipse cx="125" cy="32" rx="6" ry="3" fill="${hexToCSS(UI_COLORS.warning)}" opacity="0.6"/>
  ` : ''}

  <!-- Stress Indicator - On spoiler -->
  ${carPhysics.engineTemperature > 0.3 ? `
  <circle cx="112" cy="20" r="3" fill="${hexToCSS(stressColor)}" opacity="${carPhysics.engineTemperature * 0.8}"/>
  ` : ''}

  <!-- Fuel Gauge - Racing style -->
  <rect x="55" y="26" width="24" height="3" fill="#111" rx="1"/>
  <rect x="56" y="27" width="${22 * carPhysics.fuelLevel}" height="1"
        fill="${carPhysics.fuelLevel > 0.3 ? hexToCSS(UI_COLORS.positive) : hexToCSS(UI_COLORS.negative)}" rx="0.5"/>

  <!-- Leverage indicator bars -->
  ${carPhysics.accelerationBoost > 1.2 ? `
  <g>
    ${Array.from({ length: Math.min(3, Math.floor(carPhysics.accelerationBoost)) }, (_, i) =>
      `<rect x="${60 + i * 8}" y="8" width="5" height="3" fill="${hexToCSS(UI_COLORS.warning)}" opacity="0.8" rx="0.5"/>`
    ).join('')}
  </g>
  ` : ''}
</svg>`;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Generate SVG string for a car based on type and state
 */
export function generateCarSVG(carType: CarType, state: CarState): string {
  switch (carType) {
    case 'sedan':
      return generateSedanSVG(state);
    case 'sports':
      return generateSportsSVG(state);
    default:
      return generateSedanSVG(state);
  }
}

/**
 * Get car definition by type
 */
export function getCarDefinition(carType: CarType): CarDefinition {
  return CAR_DEFINITIONS.find(c => c.type === carType) || CAR_DEFINITIONS[0];
}

/**
 * Generate a unique texture key for caching
 */
export function getCarTextureKey(carType: CarType, state: CarState): string {
  const pnlBucket = Math.floor(state.pnlPercent / 5) * 5;
  const tempBucket = Math.floor(state.carPhysics.engineTemperature * 10);
  const fuelBucket = Math.floor(state.carPhysics.fuelLevel * 10);
  const leverageBucket = Math.floor(state.carPhysics.accelerationBoost);

  return `car_${carType}_${pnlBucket}_${tempBucket}_${fuelBucket}_${leverageBucket}_${state.isAccelerating ? 1 : 0}_${state.isBraking ? 1 : 0}`;
}

/**
 * Generate preview SVG for car selection screen
 */
export function generateCarPreviewSVG(carType: CarType): string {
  const neutralState: CarState = {
    pnlPercent: 0,
    carPhysics: {
      enginePower: 1,
      brakeStrength: 1,
      accelerationBoost: 1,
      traction: 1,
      durability: 1,
      recoveryDrag: 1,
      engineTemperature: 0,
      fuelLevel: 1,
    },
    isAccelerating: false,
    isBraking: false,
  };

  return generateCarSVG(carType, neutralState);
}
