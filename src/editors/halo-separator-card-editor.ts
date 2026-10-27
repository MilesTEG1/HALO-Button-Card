/**
 * HALO Button Card — Halo Separator Card UI Editor
 * Visual GUI editor powered by native Home Assistant <ha-form>.
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloSeparatorCardConfig } from '../types';

const SCHEMA = [
  {
    name: 'name',
    label: 'Titre de la section',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône',
    selector: { icon: {} }
  },
  {
    name: 'color',
    label: 'Couleur personnalisée (optionnel, ex: #26c6da ou Cyan HOLM)',
    selector: { text: {} }
  },
  {
    name: 'theme_entity',
    label: 'Entité sélecteur de thème (optionnel)',
    selector: { entity: { domain: 'input_select' } }
  }
];

export class HaloSeparatorCardEditor extends HTMLElement {
  private _config!: HaloSeparatorCardConfig;
  private _hass!: HomeAssistant;

  public setConfig(config: HaloSeparatorCardConfig) {
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

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    this._config = {
      ...this._config,
      ...ev.detail.value
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
        form.data = this._config;
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }
    } else {
      form.data = this._config;
      if (this._hass) form.hass = this._hass;
    }
  }
}
