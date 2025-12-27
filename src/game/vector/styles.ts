/**
 * Vector Graphics Style System
 *
 * A simple, clean vector-based design system for the financial driving game.
 * All visuals are defined as colors, gradients, and geometric properties.
 * This keeps the focus on financial concepts rather than flashy game art.
 */

import type { MarketRegime, RoadConditions, CarPhysics } from '../../types';

// ============================================
// COLOR PALETTE
// ============================================

// Market Regime Colors
export const REGIME_COLORS = {
  BULL: {
    primary: 0x10b981,    // Emerald green
    secondary: 0x34d399,  // Light green
    accent: 0x059669,     // Dark green
    glow: 0x6ee7b7,       // Bright green
  },
  BEAR: {
    primary: 0xef4444,    // Red
    secondary: 0xf87171,  // Light red
    accent: 0xdc2626,     // Dark red
    glow: 0xfca5a5,       // Bright red
  },
  CRASH: {
    primary: 0x7f1d1d,    // Dark red
    secondary: 0xb91c1c,  // Blood red
    accent: 0x450a0a,     // Very dark red
    glow: 0xef4444,       // Bright red
  },
  CHOP: {
    primary: 0x6b7280,    // Gray
    secondary: 0x9ca3af,  // Light gray
    accent: 0x4b5563,     // Dark gray
    glow: 0xd1d5db,       // Bright gray
  },
  RECOVERY: {
    primary: 0x0ea5e9,    // Sky blue
    secondary: 0x38bdf8,  // Light blue
    accent: 0x0284c7,     // Dark blue
    glow: 0x7dd3fc,       // Bright blue
  },
} as const;

// Road Surface Colors
export const ROAD_COLORS = {
  asphalt: 0x374151,      // Dark gray
  marking: 0xffffff,      // White
  edge: 0x1f2937,         // Very dark gray
  shoulder: 0x4b5563,     // Medium gray
  pothole: 0x111827,      // Almost black
  bump: 0x6b7280,         // Light gray
} as const;

// Car Colors based on state
export const CAR_COLORS = {
  body: {
    neutral: 0x3b82f6,    // Blue
    profit: 0x10b981,     // Green
    loss: 0xef4444,       // Red
    stress: 0xf59e0b,     // Amber warning
  },
  wheel: 0x1f2937,        // Dark gray
  window: 0x93c5fd,       // Light blue
  outline: 0x111827,      // Almost black
} as const;

// Weather Colors
export const WEATHER_COLORS = {
  clear: {
    sky: 0x38bdf8,        // Light blue sky
    sun: 0xfbbf24,        // Golden sun
    horizon: 0x7dd3fc,    // Pale blue
  },
  cloudy: {
    sky: 0x94a3b8,        // Gray sky
    cloud: 0xcbd5e1,      // Light gray clouds
    horizon: 0x64748b,    // Dark gray
  },
  rainy: {
    sky: 0x475569,        // Dark gray
    rain: 0x94a3b8,       // Gray raindrops
    horizon: 0x334155,    // Very dark
  },
  stormy: {
    sky: 0x1e293b,        // Near black
    lightning: 0xfbbf24,  // Yellow
    horizon: 0x0f172a,    // Black
  },
  foggy: {
    sky: 0xd1d5db,        // Light gray
    fog: 0xe5e7eb,        // Lighter gray
    horizon: 0x9ca3af,    // Medium gray
  },
} as const;

// UI Colors
export const UI_COLORS = {
  background: 0x0f172a,   // Dark blue
  panel: 0x1e293b,        // Slightly lighter
  border: 0x334155,       // Border gray
  text: 0xf8fafc,         // White text
  textSecondary: 0x94a3b8, // Gray text
  positive: 0x10b981,     // Green
  negative: 0xef4444,     // Red
  warning: 0xf59e0b,      // Amber
} as const;

// ============================================
// GEOMETRY HELPERS
// ============================================

export interface VectorStyle {
  fillColor?: number;
  fillAlpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
  strokeAlpha?: number;
}

export interface GradientStop {
  position: number;  // 0-1
  color: number;
  alpha: number;
}

// ============================================
// ROAD SEGMENT STYLES
// ============================================

export function getRoadStyle(conditions: RoadConditions, regime: MarketRegime): VectorStyle {
  const regimeColors = REGIME_COLORS[regime];

  // Roughness affects stroke width (rougher = thicker edges)
  const strokeWidth = 2 + conditions.roughness * 4;

  // Grip affects alpha (less grip = more transparent/icy look)
  const fillAlpha = 0.7 + conditions.grip * 0.3;

  return {
    fillColor: regimeColors.primary,
    fillAlpha,
    strokeColor: ROAD_COLORS.edge,
    strokeWidth,
    strokeAlpha: 0.8,
  };
}

export function getRoadMarkingStyle(): VectorStyle {
  return {
    fillColor: ROAD_COLORS.marking,
    fillAlpha: 0.9,
    strokeColor: 0,
    strokeWidth: 0,
  };
}

export function getPotholeStyle(): VectorStyle {
  return {
    fillColor: ROAD_COLORS.pothole,
    fillAlpha: 0.9,
    strokeColor: ROAD_COLORS.edge,
    strokeWidth: 2,
    strokeAlpha: 0.6,
  };
}

export function getBumpStyle(): VectorStyle {
  return {
    fillColor: ROAD_COLORS.bump,
    fillAlpha: 0.7,
    strokeColor: ROAD_COLORS.edge,
    strokeWidth: 1,
    strokeAlpha: 0.5,
  };
}

// ============================================
// CAR STYLES
// ============================================

export function getCarBodyStyle(carPhysics: CarPhysics, pnlPercent: number): VectorStyle {
  let fillColor: number = CAR_COLORS.body.neutral;

  if (pnlPercent > 5) {
    fillColor = CAR_COLORS.body.profit;
  } else if (pnlPercent < -5) {
    fillColor = CAR_COLORS.body.loss;
  }

  // Stress affects alpha (more stress = more transparent/fragile)
  const stressLevel = carPhysics.engineTemperature;
  const fillAlpha = 0.9 - stressLevel * 0.3;

  return {
    fillColor,
    fillAlpha,
    strokeColor: CAR_COLORS.outline,
    strokeWidth: 2,
    strokeAlpha: 1,
  };
}

export function getWheelStyle(): VectorStyle {
  return {
    fillColor: CAR_COLORS.wheel,
    fillAlpha: 1,
    strokeColor: CAR_COLORS.outline,
    strokeWidth: 1,
    strokeAlpha: 1,
  };
}

// ============================================
// WEATHER EFFECT STYLES
// ============================================

export function getSkyGradient(weather: RoadConditions['weather']): GradientStop[] {
  const colors = WEATHER_COLORS[weather];

  return [
    { position: 0, color: colors.sky, alpha: 1 },
    { position: 0.7, color: colors.horizon, alpha: 0.9 },
    { position: 1, color: colors.horizon, alpha: 0.7 },
  ];
}

export function getFogStyle(visibility: number): VectorStyle {
  // Less visibility = more opaque fog
  const fogAlpha = Math.max(0, 0.8 - visibility * 0.8);

  return {
    fillColor: WEATHER_COLORS.foggy.fog,
    fillAlpha: fogAlpha,
  };
}

export function getRainDropStyle(): VectorStyle {
  return {
    fillColor: WEATHER_COLORS.rainy.rain,
    fillAlpha: 0.6,
    strokeColor: WEATHER_COLORS.rainy.rain,
    strokeWidth: 1,
    strokeAlpha: 0.8,
  };
}

export function getLightningStyle(): VectorStyle {
  return {
    fillColor: WEATHER_COLORS.stormy.lightning,
    fillAlpha: 0.9,
    strokeColor: 0xffffff,
    strokeWidth: 2,
    strokeAlpha: 1,
  };
}

// ============================================
// HUD / UI STYLES
// ============================================

export function getHUDPanelStyle(): VectorStyle {
  return {
    fillColor: UI_COLORS.panel,
    fillAlpha: 0.85,
    strokeColor: UI_COLORS.border,
    strokeWidth: 1,
    strokeAlpha: 0.5,
  };
}

export function getProgressBarStyle(value: number, max: number): {
  background: VectorStyle;
  fill: VectorStyle;
} {
  const ratio = value / max;
  let fillColor: number = UI_COLORS.positive;

  if (ratio < 0.3) {
    fillColor = UI_COLORS.negative;
  } else if (ratio < 0.6) {
    fillColor = UI_COLORS.warning;
  }

  return {
    background: {
      fillColor: UI_COLORS.background,
      fillAlpha: 0.8,
      strokeColor: UI_COLORS.border,
      strokeWidth: 1,
    },
    fill: {
      fillColor,
      fillAlpha: 0.9,
    },
  };
}

// ============================================
// STRESS / WARNING INDICATORS
// ============================================

export function getStressIndicatorStyle(stressLevel: number): VectorStyle {
  // Interpolate between neutral and warning colors based on stress
  let fillColor: number = UI_COLORS.positive;

  if (stressLevel > 0.7) {
    fillColor = UI_COLORS.negative;
  } else if (stressLevel > 0.4) {
    fillColor = UI_COLORS.warning;
  }

  // Pulse effect - higher stress = more visible
  const fillAlpha = 0.5 + stressLevel * 0.5;

  return {
    fillColor,
    fillAlpha,
    strokeColor: fillColor,
    strokeWidth: 2,
    strokeAlpha: fillAlpha,
  };
}

// ============================================
// FINANCIAL INDICATOR COLORS
// ============================================

export function getPnLColor(pnlPercent: number): number {
  if (pnlPercent >= 0) {
    return UI_COLORS.positive;
  }
  return UI_COLORS.negative;
}

export function getDrawdownColor(drawdown: number): number {
  if (drawdown < 0.1) {
    return UI_COLORS.positive;
  } else if (drawdown < 0.2) {
    return UI_COLORS.warning;
  }
  return UI_COLORS.negative;
}

export function getRecoveryNeededColor(recoveryNeeded: number): number {
  if (recoveryNeeded < 15) {
    return UI_COLORS.positive;
  } else if (recoveryNeeded < 50) {
    return UI_COLORS.warning;
  }
  return UI_COLORS.negative;
}
