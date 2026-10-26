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

export function getCoverColors(
  hass: HomeAssistant,
  config?: HaloCoverCardConfig
): CoverColors {
  const states = hass?.states || {};
  return {
    closed:
      config?.color_closed ||
      states['input_text.couleur_volet_ferme']?.state ||
      '#FFB69C',
    open:
      config?.color_open ||
      states['input_text.couleur_volet_ouvert']?.state ||
      '#96E1FF',
    partial:
      config?.color_partial ||
      states['input_text.couleur_volet_partiel']?.state ||
      '#38bdf8',
    moving:
      config?.color_moving ||
      states['input_text.couleur_volet_en_mouvement']?.state ||
      '#f59e0b'
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
      border: '1.25px solid rgba(245, 158, 11, 0.55)',
      boxShadow: '0 0 16px rgba(245, 158, 11, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
    };
  }

  if (isMoving) {
    return {
      background: `linear-gradient(135deg, ${accentCol}26, rgba(20, 28, 38, 0.90))`,
      border: `1.25px solid ${accentCol}77`,
      boxShadow: `0 0 20px ${accentCol}55, inset 0 1px 0 rgba(255, 255, 255, 0.20)`
    };
  }

  return {
    background: `linear-gradient(135deg, ${accentCol}18, rgba(20, 28, 38, 0.88))`,
    border: `1.25px solid ${accentCol}44`,
    boxShadow: `0 0 16px ${accentCol}33, inset 0 1px 0 rgba(255, 255, 255, 0.15)`
  };
}
