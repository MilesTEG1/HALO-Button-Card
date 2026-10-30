/**
 * ==============================================================================
 * 📌 Nom du fichier : src/types.ts
 * 📝 Description   : Définitions des types et interfaces TypeScript pour HALO Button Card
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Ajout des types pour custom:halo-button-card, accordéon
 *                              séparateur et cartes de personnalisation de couleurs.
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

export interface ActionConfig {
  action?: 'call-service' | 'perform-action' | 'more-info' | 'navigate' | 'url' | 'toggle' | 'none';
  service?: string;
  service_data?: Record<string, any>;
  data?: Record<string, any>;
  target?: {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
    [key: string]: any;
  };
  navigation_path?: string;
  url_path?: string;
  entity?: string;
  confirmation?: {
    text?: string;
    exemptions?: Array<{ user?: string }>;
  };
  [key: string]: any;
}

export interface SubButtonConfig {
  icon?: string;
  name?: string;
  label?: string;
  badge?: string;
  color?: string | [number, number, number];
  entity?: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface HaloButtonCardConfig {
  type: string;
  entity?: string;
  name?: string;
  title?: string;
  label?: string;
  subtitle?: string;
  icon?: string;
  color?: string | [number, number, number];
  halo_color?: string | [number, number, number];
  accent_color?: string | [number, number, number];
  theme_entity?: string;
  layout?: 'horizontal' | 'vertical';
  text_align?: 'left' | 'center' | 'right';
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
  card_tap_action?: ActionConfig;
  card_hold_action?: ActionConfig;
  card_double_tap_action?: ActionConfig;
  icon_tap_action?: ActionConfig;
  icon_hold_action?: ActionConfig;
  icon_double_tap_action?: ActionConfig;
  sub_buttons?: SubButtonConfig[];
}

export interface LegendItemConfig {
  icon?: string;
  badge?: string;
  label?: string;
  desc?: string;
  color?: string | [number, number, number];
  tap_action?: ActionConfig;
}

export interface HaloSeparatorCardConfig {
  type: string;
  name?: string;
  title?: string;
  icon?: string;
  color?: string | [number, number, number];
  theme_entity?: string;
  collapsible?: boolean;
  expanded?: boolean;
  initial_collapsed?: boolean;
  label_on?: string;
  label_off?: string;
  toggle_entity?: string;
  columns?: number | string;
  content?: string;
  legend_items?: boolean | LegendItemConfig[];
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
  tap_action?: ActionConfig;
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
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

export interface HaloCoverColorCardConfig {
  type: string;
  title?: string;
  icon?: string;
  color?: string | [number, number, number];
  theme_entity?: string;
  closed_entity?: string;
  partial_entity?: string;
  open_entity?: string;
  moving_entity?: string;
  closed_name?: string;
  partial_name?: string;
  open_name?: string;
  moving_name?: string;
  closed_icon?: string;
  partial_icon?: string;
  open_icon?: string;
  moving_icon?: string;
  closed_default_color?: string;
  partial_default_color?: string;
  open_default_color?: string;
  moving_default_color?: string;
}

export interface HaloPaletteCardConfig {
  type: string;
  entity?: string;
  title?: string;
  icon?: string;
  columns?: number;
  colors?: Array<{ name: string; hex: string }>;
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
