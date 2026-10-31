/**
 * ==============================================================================
 * 📌 Nom du fichier : src/core/light-helper.ts
 * 📝 Description   : Moteur d'aide et logique métier pour custom:halo-light-card
 *                    Reproduit fidèlement les spécifications, calculs et styles
 *                    de la référence tuile_avec_sous_boutons (dashboard-eclairage/lights).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.4.2
 * 📅 Date         : 2026-10-31
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              dans la documentation et la résolution des couleurs.
 *   - 💡 v1.1.0 (2026-10-29) : Alignement 1:1 strict avec tuile_avec_sous_boutons.
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale du moteur light-helper.
 * ==============================================================================
 */

import { HomeAssistant, HassEntity, HaloLightCardConfig } from '../types';
import { toHexColor, resolveThemeColor, rgbToHex } from './theme-helper';

/**
 * Détecte si l'entité supporte la gradation de luminosité.
 */
export function isDimmable(entity: HassEntity | undefined): boolean {
  if (!entity || !entity.attributes) return false;
  const modes = entity.attributes.supported_color_modes;
  if (Array.isArray(modes)) {
    if (modes.length === 1 && modes[0] === 'onoff') {
      return false;
    }
    return modes.length > 0;
  }
  const features = entity.attributes.supported_features || 0;
  return (features & 1) !== 0 || entity.attributes.brightness !== undefined;
}

/**
 * Détecte si l'entité supporte la température de couleur (Kelvin).
 */
export function supportsColorTemp(entity: HassEntity | undefined): boolean {
  if (!entity || !entity.attributes) return false;
  const modes = entity.attributes.supported_color_modes;
  if (Array.isArray(modes)) {
    return modes.includes('color_temp');
  }
  const features = entity.attributes.supported_features || 0;
  return (features & 2) !== 0 || entity.attributes.color_temp_kelvin !== undefined || entity.attributes.color_temp !== undefined;
}

/**
 * Détecte si l'entité supporte la couleur RGB / HS / XY.
 */
export function supportsColor(entity: HassEntity | undefined): boolean {
  if (!entity || !entity.attributes) return false;
  const modes = entity.attributes.supported_color_modes;
  if (Array.isArray(modes)) {
    return modes.some(m => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m));
  }
  const features = entity.attributes.supported_features || 0;
  return (features & 16) !== 0;
}

/**
 * Extrait le pourcentage de luminosité actuel (0-100%).
 */
export function getBrightnessPct(entity: HassEntity | undefined): number {
  if (!entity || !entity.attributes || entity.state !== 'on') return 0;
  const b = entity.attributes.brightness;
  if (b == null) return 100;
  return Math.max(0, Math.min(100, Math.round((Number(b) / 255) * 100)));
}

/**
 * Extrait la température de couleur en Kelvin si disponible.
 */
export function getKelvin(entity: HassEntity | undefined): number | undefined {
  if (!entity || !entity.attributes || entity.state !== 'on') return undefined;
  if (entity.attributes.color_temp_kelvin != null) {
    return Math.round(entity.attributes.color_temp_kelvin);
  }
  if (entity.attributes.color_temp != null) {
    const mireds = Number(entity.attributes.color_temp);
    if (mireds > 0) {
      return Math.round(1000000 / mireds);
    }
  }
  return undefined;
}

/**
 * Convertit une température Kelvin (1000K-40000K) en couleur RGB [r, g, b].
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = temp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    b = Math.max(0, Math.min(255, b));
  }

  return [Math.round(r), Math.round(g), Math.round(b)];
}

/**
 * Détermine la couleur RGB physique réelle émise par l'ampoule si allumée.
 */
export function getLightActualRgb(entity: HassEntity | undefined): [number, number, number] | undefined {
  if (!entity || entity.state !== 'on' || !entity.attributes) return undefined;

  const rgb = entity.attributes.rgb_color;
  if (Array.isArray(rgb) && rgb.length === 3) {
    return [rgb[0], rgb[1], rgb[2]];
  }

  const kelvin = getKelvin(entity);
  if (kelvin != null && kelvin > 0) {
    return kelvinToRgb(kelvin);
  }

  return undefined;
}

/**
 * Calcule le prochain palier de luminosité pour le cycle rapide :
 * Alignement strict avec tuile_avec_sous_boutons :
 * if (cur >= 90) return 30;
 * if (cur >= 60) return 100;
 * if (cur >= 25) return 67;
 * return 100;
 */
export function getNextBrightnessPct(currentPct: number, isOn: boolean): number {
  if (!isOn) return 100;
  if (currentPct >= 90) return 30;
  if (currentPct >= 60) return 100;
  if (currentPct >= 25) return 67;
  return 100;
}

/**
 * Calcule le prochain palier de température Kelvin pour le cycle rapide :
 * Alignement strict avec tuile_avec_sous_boutons :
 * if (cur >= 4500) return 2200;
 * if (cur >= 3000) return 5000;
 * if (cur >= 2400) return 3500;
 * return 2700;
 */
export function getNextKelvin(currentKelvin: number | undefined, isOn: boolean): number {
  if (!isOn) return 2700;
  const cur = currentKelvin || 2700;
  if (cur >= 4500) return 2200;
  if (cur >= 3000) return 5000;
  if (cur >= 2400) return 3500;
  return 2700;
}

/**
 * Formate un nombre de Kelvins en libellé court pour le sous-bouton :
 * Math.round(Number(ct) / 100) / 10 + 'k' -> e.g. "2.7k", "3.5k", "5k", "2.2k"
 */
export function formatKelvinShort(kelvin: number | undefined): string {
  if (kelvin == null) return '—';
  return Math.round(Number(kelvin) / 100) / 10 + 'k';
}

/**
 * Génère le statut textuel dynamique de la lumière :
 * Alignement strict avec tuile_avec_sous_boutons :
 * - 'Indisponible' si unavailable
 * - 'Inconnu' si unknown
 * - 'Éteint' si pas on
 * - 'Allumé [• X %] [• Y K]' si on
 */
export function formatLightStatus(
  entity: HassEntity | undefined,
  t: (key: string) => string
): string {
  if (!entity) return '—';
  const st = entity.state;
  if (st === 'unavailable') return t('state.unavailable');
  if (st === 'unknown') return t('state.unknown');
  if (st !== 'on') return t('state.off');

  const parts: string[] = [t('state.on')];
  const b = entity.attributes?.brightness;
  if (b != null) {
    const pct = Math.round((Number(b) / 255) * 100);
    parts.push(`${pct} %`);
  }

  const k = entity.attributes?.color_temp_kelvin;
  if (k != null) {
    parts.push(`${k} K`);
  }

  return parts.join(' • ');
}

/**
 * Résout la couleur d'accentuation dynamique de la tuile selon la configuration,
 * l'état réel de l'ampoule et le sélecteur de thème HALO.
 */
export function getLightAccentColor(
  hass: HomeAssistant,
  config: HaloLightCardConfig,
  entity: HassEntity | undefined
): string {
  const isUnavail = !entity || entity.state === 'unavailable' || entity.state === 'unknown';
  if (isUnavail) return '#f59e0b';

  const isOn = entity.state === 'on';

  if (!isOn) {
    if (config.color_off) {
      return toHexColor(config.color_off, '#64748b');
    }
    return '#64748b';
  }

  // Si allumé :
  // 1. Teinte avec la couleur réelle si use_light_color est true (et disponible)
  if (config.use_light_color === true) {
    const realRgb = getLightActualRgb(entity);
    if (realRgb) {
      return rgbToHex(realRgb);
    }
  }

  // 2. Couleur fixe si configurée
  if (config.color_on) {
    return toHexColor(config.color_on, '#26c6da');
  }

  // 3. Sélecteur de thème HALO
  return resolveThemeColor(
    hass,
    undefined,
    config.theme_entity || 'input_select.couleur_theme_eclairages',
    '#26c6da'
  );
}

/**
 * Génère les styles CSS pour le conteneur ha-card :
 * Alignement strict 1:1 avec tuile_avec_sous_boutons.
 */
export function getLightCardStyles(
  accentCol: string,
  isOn: boolean,
  isUnavail: boolean,
  borderWidth?: number
): {
  background: string;
  border: string;
  boxShadow: string;
} {
  const bw = (typeof borderWidth === 'number' && !isNaN(borderWidth)) ? borderWidth : 1.5;
  const borderStr = (color: string) => bw > 0 ? `${bw}px solid ${color}` : 'none';

  if (isUnavail) {
    return {
      background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
      border: borderStr('rgba(245, 158, 11, 0.50)'),
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 22px rgba(0, 0, 0, 0.40), 0 0 16px rgba(245, 158, 11, 0.30)'
    };
  }

  if (isOn) {
    return {
      background: 'linear-gradient(160deg, rgba(22, 34, 48, 0.90), rgba(12, 18, 28, 0.95))',
      border: borderStr(accentCol),
      boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 6px 20px rgba(0, 0, 0, 0.38), 0 0 14px ${accentCol}26`
    };
  }

  // Éteint : compact, sobre et discret, sans halo bleuté parasite
  return {
    background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
    border: borderStr('rgba(255, 255, 255, 0.08)'),
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.35)'
  };
}
