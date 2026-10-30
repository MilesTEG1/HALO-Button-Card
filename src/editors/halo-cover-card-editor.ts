/**
 * HALO Button Card — Halo Cover Card UI Editor
 * Visual GUI editor powered by native Home Assistant <ha-form>.
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloCoverCardConfig } from '../types';
import { hexToRgb, rgbToHex } from '../core/theme-helper';

const COLOR_KEYS = ['color_closed', 'color_open', 'color_partial', 'color_moving'] as const;

const SCHEMA = [
  {
    name: 'entity',
    label: 'Entité Volet ou Groupe',
    selector: { entity: { domain: 'cover' } }
  },
  {
    name: 'name',
    label: 'Nom personnalisé (optionnel)',
    selector: { text: {} }
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
        name: 'color_closed',
        label: 'Couleur Fermé (optionnel)',
        selector: { color_rgb: {} }
      },
      {
        name: 'color_open',
        label: 'Couleur Ouvert (optionnel)',
        selector: { color_rgb: {} }
      },
      {
        name: 'color_partial',
        label: 'Couleur Partiel (optionnel)',
        selector: { color_rgb: {} }
      },
      {
        name: 'color_moving',
        label: 'Couleur En mouvement (optionnel)',
        selector: { color_rgb: {} }
      }
    ]
  }
];

export class HaloCoverCardEditor extends HTMLElement {
  private _config!: HaloCoverCardConfig;
  private _hass!: HomeAssistant;

  public setConfig(config: HaloCoverCardConfig) {
    this._config = { ...config };
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
        form.data = this._formData();
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }
    } else {
      form.data = this._formData();
      if (this._hass) form.hass = this._hass;
    }
  }
}
