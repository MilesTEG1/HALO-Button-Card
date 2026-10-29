/**
 * ==============================================================================
 * 📌 Nom du fichier : src/core/light-helper.ts
 * 📝 Description   : Moteur d'aide et logique métier pour custom:halo-light-card
 *                    (capacités de l'entité, conversion kelvin/rgb, cycles rapides,
 *                    calculs d'états et résolution des styles Liquid Glass).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.0.0
 * 📅 Date         : 2026-10-29
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
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
  // Fallback rétrocompatible HA : SUPPORT_BRIGHTNESS = 1
  const features = entity.attributes.supported_features || 0;
  return (features & 1) !== 0;
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
  // Fallback rétrocompatible HA : SUPPORT_COLOR_TEMP = 2
  const features = entity.attributes.supported_features || 0;
  return (features & 2) !== 0;
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
  // Fallback rétrocompatible HA : SUPPORT_COLOR = 16
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
 * Implémentation standard de l'algorithme de Tanner Helland.
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number, g: number, b: number;

  // Calcul du rouge
  if (temp <= 66) {
    r = 255;
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    r = Math.max(0, Math.min(255, r));
  }

  // Calcul du vert
  if (temp <= 66) {
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    g = Math.max(0, Math.min(255, g));
  } else {
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    g = Math.max(0, Math.min(255, g));
  }

  // Calcul du bleu
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

  // 1. Couleurs RGB directes de l'ampoule
  const rgb = entity.attributes.rgb_color;
  if (Array.isArray(rgb) && rgb.length === 3) {
    return [rgb[0], rgb[1], rgb[2]];
  }

  // 2. Température Kelvin
  const kelvin = getKelvin(entity);
  if (kelvin != null && kelvin > 0) {
    return kelvinToRgb(kelvin);
  }

  return undefined;
}

/**
 * Calcule le prochain palier de luminosité pour le cycle rapide (30% -> 67% -> 100% -> 30%).
 */
export function getNextBrightnessPct(currentPct: number): number {
  if (currentPct < 45) {
    return 67;
  } else if (currentPct < 85) {
    return 100;
  } else {
    return 30;
  }
}

/**
 * Calcule le prochain palier de température Kelvin pour le cycle rapide (2700K -> 4000K -> 5500K -> 2700K).
 */
export function getNextKelvin(currentKelvin?: number): number {
  if (!currentKelvin || currentKelvin < 3300) {
    return 4000;
  } else if (currentKelvin < 4800) {
    return 5500;
  } else {
    return 2700;
  }
}

/**
 * Formate un nombre de Kelvins en libellé court lisible (ex. "2.7k", "4k", "5.5k").
 */
export function formatKelvin(kelvin: number): string {
  if (kelvin >= 1000) {
    const k = (kelvin / 1000).toFixed(1).replace('.0', '');
    return `${k}k`;
  }
  return `${kelvin}K`;
}

/**
 * Génère le statut textuel dynamique de la lumière.
 */
export function formatLightStatus(entity: HassEntity | undefined): string {
  if (!entity) return 'Indisponible';
  const st = entity.state;
  if (st === 'unavailable' || st === 'unknown') return 'Indisponible';
  if (st !== 'on') return 'Éteint';

  const parts: string[] = ['Allumé'];
  const dimmable = isDimmable(entity);

  if (dimmable) {
    const pct = getBrightnessPct(entity);
    parts.push(`${pct} %`);
  }

  const kelvin = getKelvin(entity);
  if (kelvin != null) {
    parts.push(`${kelvin} K`);
  }

  return parts.join(' • ');
}

/**
 * Résout la couleur d'accentuation dynamique de la tuile selon la configuration,
 * l'état réel de l'ampoule et le thème HOLM.
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

  // Si l'ampoule est allumée :
  // 1. Vérifier si l'utilisateur souhaite la couleur réelle de l'ampoule (défaut : true)
  if (config.use_light_color !== false) {
    const realRgb = getLightActualRgb(entity);
    if (realRgb) {
      return rgbToHex(realRgb);
    }
  }

  // 2. Couleur explicite configurée
  if (config.color_on) {
    return toHexColor(config.color_on, '#26c6da');
  }

  // 3. Entité de thème spécifique ou fallback thème d'éclairages HOLM
  return resolveThemeColor(
    hass,
    undefined,
    config.theme_entity || 'input_select.couleur_theme_eclairages',
    '#26c6da'
  );
}

/**
 * Génère les styles CSS Liquid Glass pour le corps de la carte selon l'état de la lumière.
 */
export function getLightCardStyles(
  accentCol: string,
  isOn: boolean,
  isUnavail: boolean
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

  if (isOn) {
    return {
      background: `linear-gradient(135deg, ${accentCol}22, rgba(20, 28, 38, 0.88))`,
      border: `1.5px solid ${accentCol}`,
      boxShadow: `0 0 18px ${accentCol}60, 0 0 6px ${accentCol}40, inset 0 1px 0 rgba(255, 255, 255, 0.22)`
    };
  }

  // État éteint : obsidian discret, bordure subtile, pas de néon excessif
  return {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(15, 20, 28, 0.85))',
    border: '1.5px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  };
}
