/**
 * HALO Button Card — Halo Cover Card UI Editor
 * Visual GUI editor powered by native Home Assistant <ha-form>.
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloCoverCardConfig } from '../types';

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
    type: 'grid',
    name: '',
    schema: [
      {
        name: 'color_closed',
        label: 'Couleur Fermé (optionnel)',
        selector: { text: {} }
      },
      {
        name: 'color_open',
        label: 'Couleur Ouvert (optionnel)',
        selector: { text: {} }
      },
      {
        name: 'color_partial',
        label: 'Couleur Partiel (optionnel)',
        selector: { text: {} }
      },
      {
        name: 'color_moving',
        label: 'Couleur En mouvement (optionnel)',
        selector: { text: {} }
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
