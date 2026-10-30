/**
 * HALO Button Card — Theme & Styling Engine
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloCoverCardConfig } from '../types';

export interface CoverColors {
  closed: string;
  open: string;
  partial: string;
  moving: string;
}

export const HOLM_PALETTE: Record<string, string> = {
  'Cyan HOLM': '#26c6da',
  'Bleu Céleste': '#38bdf8',
  'Saphir Océan': '#2f86ff',
  'Menthe Givrée': '#00e5a3',
  'Émeraude': '#10b981',
  'Vert Lime': '#84cc16',
  'Jaune Soleil': '#facc15',
  'Ambre Doré': '#f59e0b',
  'Orange Flamme': '#ff5a1f',
  'Corail Pêche': '#fb923c',
  'Rose Rubis': '#f43f5e',
  'Rose Bonbon': '#f472b6',
  'Fuchsia Néon': '#d946ef',
  'Améthyste': '#a855f7',
  'Violet Nuit': '#8b5cf6',
  'Blanc Glace': '#e2e8f0'
};

export function hexToRgb(hex: string): [number, number, number] | undefined {
  if (!hex || typeof hex !== 'string') return undefined;
  if (HOLM_PALETTE[hex]) {
    hex = HOLM_PALETTE[hex];
  }
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (clean.length === 6 || clean.length === 8) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return [r, g, b];
    }
  }
  return undefined;
}

export function rgbToHex(rgb: [number, number, number] | number[]): string {
  if (!Array.isArray(rgb) || rgb.length < 3) return '#26c6da';
  const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2])));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function toHexColor(color: any, fallback: string): string {
  if (!color) return fallback;
  if (Array.isArray(color)) return rgbToHex(color);
  if (typeof color === 'string') {
    const trimmed = color.trim();
    if (HOLM_PALETTE[trimmed]) return HOLM_PALETTE[trimmed];
    if (trimmed.startsWith('#')) {
      const clean = trimmed.replace('#', '');
      if (clean.length === 3) {
        return '#' + clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
      }
      if (clean.length >= 6) {
        return '#' + clean.substring(0, 6);
      }
    }
    if (trimmed.startsWith('rgb')) {
      const match = trimmed.match(/\d+/g);
      if (match && match.length >= 3) {
        return rgbToHex([parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)]);
      }
    }
  }
  return fallback;
}

export function resolveThemeColor(
  hass: HomeAssistant,
  explicitColor?: string | [number, number, number],
  themeEntity?: string,
  fallback: string = '#26c6da'
): string {
  if (explicitColor && typeof explicitColor === 'string' && explicitColor.trim() !== '') {
    return toHexColor(explicitColor, fallback);
  }
  const states = hass?.states || {};
  if (themeEntity && states[themeEntity]?.state) {
    const val = states[themeEntity].state;
    if (HOLM_PALETTE[val]) return HOLM_PALETTE[val];
    if (val.startsWith('#')) return val;
  }
  const commonEntities = [
    'input_select.couleur_theme_eclairages',
    'input_select.couleur_theme_eclairage',
    'input_select.couleur_theme_ouvertures',
    'input_select.couleur_theme_chauffage',
    'input_select.couleur_theme_global'
  ];
  for (const ent of commonEntities) {
    const st = states[ent]?.state;
    if (st && HOLM_PALETTE[st]) return HOLM_PALETTE[st];
  }
  return fallback;
}

export function getCoverColors(
  hass: HomeAssistant,
  config?: HaloCoverCardConfig
): CoverColors {
  const states = hass?.states || {};
  return {
    closed: toHexColor(
      config?.color_closed,
      states['input_text.couleur_volet_ferme']?.state || '#FFB69C'
    ),
    open: toHexColor(
      config?.color_open,
      states['input_text.couleur_volet_ouvert']?.state || '#96E1FF'
    ),
    partial: toHexColor(
      config?.color_partial,
      states['input_text.couleur_volet_partiel']?.state || '#38bdf8'
    ),
    moving: toHexColor(
      config?.color_moving,
      states['input_text.couleur_volet_en_mouvement']?.state || '#f59e0b'
    )
  };
}

export function getHaloCardStyles(
  accentCol: string,
  isUnavail: boolean,
  isMoving: boolean
): {
  background: string;
  border: string;
  boxShadow: string;
} {
  if (isUnavail) {
    return {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(20, 28, 38, 0.90))',
      border: '1.5px solid #f59e0b',
      boxShadow: '0 0 18px rgba(245, 158, 11, 0.55), 0 0 6px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.20)'
    };
  }

  if (isMoving) {
    return {
      background: `linear-gradient(135deg, ${accentCol}26, rgba(20, 28, 38, 0.90))`,
      border: `1.5px solid ${accentCol}`,
      boxShadow: `0 0 22px ${accentCol}77, 0 0 8px ${accentCol}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
    };
  }

  return {
    background: `linear-gradient(135deg, ${accentCol}1A, rgba(20, 28, 38, 0.88))`,
    border: `1.5px solid ${accentCol}`,
    boxShadow: `0 0 18px ${accentCol}60, 0 0 6px ${accentCol}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`
  };
}
