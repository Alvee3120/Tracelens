/** Outline tint palette and color helpers. */
import type { Rgb } from '@/lib/edgeDetector';
import type { TintId, TintOption } from '@/types';
import { strings } from '@/lib/strings';

export const TINTS: TintOption[] = [
  { id: 'black', label: strings.tints.black, hex: '#000000', rgb: { r: 0, g: 0, b: 0 } },
  { id: 'white', label: strings.tints.white, hex: '#ffffff', rgb: { r: 255, g: 255, b: 255 } },
  { id: 'red', label: strings.tints.red, hex: '#ef4444', rgb: { r: 239, g: 68, b: 68 } },
  { id: 'green', label: strings.tints.green, hex: '#22c55e', rgb: { r: 34, g: 197, b: 94 } },
  { id: 'cyan', label: strings.tints.cyan, hex: '#22d3ee', rgb: { r: 34, g: 211, b: 238 } },
];

export const DEFAULT_TINT_HEX = '#000000';

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function hexToRgb(hex: string): Rgb {
  const normalized = hex.trim().replace(/^#/, '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

export function rgbToHex(rgb: Rgb): string {
  const toHex = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/** Relative luminance — used to decide whether a swatch needs a dark border. */
export function isLightColor(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

export function findTintId(hex: string): TintId {
  const match = TINTS.find((tint) => tint.hex.toLowerCase() === hex.toLowerCase());
  return match ? match.id : 'custom';
}

export function tintRgbFor(hex: string): Rgb {
  return hexToRgb(hex);
}
