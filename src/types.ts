/**
 * ==============================================================================
 * 📌 Nom du fichier : src/types.ts
 * 📝 Description   : Définitions des types et interfaces TypeScript pour HALO Button Card
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.1.0
 * 📅 Date         : 2026-10-29
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.1.0 (2026-10-29) : Ajout du type HaloLightCardConfig pour custom:halo-light-card.
 *   - 🆕 v1.0.0 (2026-10-29) : Création initiale des types cover et separator.
 * ==============================================================================
 */

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  callService: (domain: string, service: string, serviceData?: Record<string, any>) => Promise<void>;
  themes?: {
    darkMode?: boolean;
    theme?: string;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    current_position?: number | null;
    entity_id?: string[];
    group_entities?: string[];
    device_class?: string;
    supported_color_modes?: string[];
    supported_features?: number;
    brightness?: number;
    color_temp_kelvin?: number;
    color_temp?: number;
    min_color_temp_kelvin?: number;
    max_color_temp_kelvin?: number;
    rgb_color?: [number, number, number];
    hs_color?: [number, number];
    xy_color?: [number, number];
    [key: string]: any;
  };
  last_updated?: string;
  last_changed?: string;
}

export interface HaloCoverCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  color_closed?: string | [number, number, number];
  color_open?: string | [number, number, number];
  color_partial?: string | [number, number, number];
  color_moving?: string | [number, number, number];
  show_slider?: boolean;
  tap_action?: Record<string, any>;
}

export interface HaloLightCardConfig {
  type: string;
  entity: string;
  name?: string;
  icon?: string;
  color_on?: string | [number, number, number];
  color_off?: string | [number, number, number];
  theme_entity?: string;
  use_light_color?: boolean;
  sub_toggle_entity?: string;
  show_brightness?: boolean;
  show_kelvin?: boolean;
  show_toggle?: boolean;
  show_brightness_btn?: boolean;
  show_temp_btn?: boolean;
  show_power_btn?: boolean;
  tap_action?: Record<string, any>;
  hold_action?: Record<string, any>;
}

export interface HaloSeparatorCardConfig {
  type: string;
  name?: string;
  title?: string;
  icon?: string;
  color?: string | [number, number, number];
  theme_entity?: string;
}

export interface VoletTrack {
  lastPos: number | null;
  lastLu: number;
  moving: boolean;
  dir: 'opening' | 'closing' | null;
  until: number;
  timer: any;
  ignoreUntil?: number;
}
