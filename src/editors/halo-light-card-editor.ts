/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-light-card-editor.ts
 * 📝 Description   : Éditeur visuel pour custom:halo-light-card
 *                    Propulsé par le composant natif Home Assistant <ha-form>.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.1.0
 * 📅 Date         : 2026-10-29
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.1.0 (2026-10-29) : Alignement des sélecteurs sur les sous-boutons HOLM.
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card-editor.
 * ==============================================================================
 */

import { HomeAssistant, HaloLightCardConfig } from '../types';
import { hexToRgb, rgbToHex } from '../core/theme-helper';

const COLOR_KEYS = ['color_on', 'color_off'] as const;

const SCHEMA = [
  {
    name: 'entity',
    label: 'Entité Lumière ou Groupe d’éclairages',
    selector: { entity: { domain: 'light' } }
  },
  {
    name: 'name',
    label: 'Nom personnalisé (optionnel)',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône personnalisée (optionnel)',
    selector: { icon: {} }
  },
  {
    name: 'sub_toggle_entity',
    label: 'Entité dédiée pour le bouton Power (optionnel)',
    selector: { entity: {} }
  },
  {
    name: 'use_light_color',
    label: 'Teinter la tuile avec la couleur réelle de l’ampoule (RGB / Kelvin)',
    selector: { boolean: {} }
  },
  {
    name: 'theme_entity',
    label: 'Entité sélecteur de thème (défaut : input_select.couleur_theme_eclairages)',
    selector: { entity: { domain: 'input_select' } }
  },
  {
    name: 'border_width',
    label: 'Épaisseur de bordure (px)',
    selector: {
      number: {
        min: 0,
        max: 3,
        step: 0.25,
        unit_of_measurement: 'px',
        mode: 'slider'
      }
    }
  },
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'color_on',
        label: 'Couleur Allumé personnalisée',
        selector: { color_rgb: {} }
      },
      {
        name: 'color_off',
        label: 'Couleur Éteint personnalisée',
        selector: { color_rgb: {} }
      }
    ]
  },
  {
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'show_brightness',
        label: 'Sous-bouton Luminosité (%)',
        selector: { boolean: {} }
      },
      {
        name: 'show_kelvin',
        label: 'Sous-bouton Température (K)',
        selector: { boolean: {} }
      },
      {
        name: 'show_toggle',
        label: 'Sous-bouton Power (On/Off)',
        selector: { boolean: {} }
      }
    ]
  }
];

export class HaloLightCardEditor extends HTMLElement {
  private _config!: HaloLightCardConfig;
  private _hass!: HomeAssistant;

  public setConfig(config: HaloLightCardConfig) {
    this._config = {
      use_light_color: false,
      show_brightness: true,
      show_kelvin: true,
      show_toggle: true,
      ...config
    };
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    const form = this.querySelector('ha-form') as any;
    if (form) {
      form.hass = hass;
    }
  }

  private _formData(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    for (const k of COLOR_KEYS) {
      if (data[k] && typeof data[k] === 'string') {
        const rgb = hexToRgb(data[k]);
        if (rgb) data[k] = rgb;
      }
    }
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    const val = { ...ev.detail.value };
    for (const k of COLOR_KEYS) {
      if (val[k] && Array.isArray(val[k])) {
        val[k] = rgbToHex(val[k]);
      }
    }
    this._config = {
      ...this._config,
      ...val
    };
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _render() {
    if (!this._config) return;

    let form = this.querySelector('ha-form') as any;
    if (!form) {
      this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
      form = this.querySelector('#form') as any;
      if (form) {
        form.schema = SCHEMA;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }
    }

    if (form) {
      form.hass = this._hass;
      form.data = this._formData();
    }
  }
}
