/**
 * HALO Button Card — TypeScript Type Definitions
 * (c) 2026 MilesTEG1 — MIT License
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
  color_closed?: string;
  color_open?: string;
  color_partial?: string;
  color_moving?: string;
  show_slider?: boolean;
  tap_action?: Record<string, any>;
}

export interface HaloSeparatorCardConfig {
  type: string;
  name?: string;
  title?: string;
  icon?: string;
  color?: string;
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
