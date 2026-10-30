/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-palette-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-palette-card.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-palette-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloPaletteCardConfig } from '../types';
import { getLang } from '../localize/localize';
import { applyFormI18n } from './editor-common';

const SCHEMA = [
  { name: 'entity', selector: { entity: { domain: 'input_select' } } },
  { name: 'title', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  { name: 'columns', selector: { number: { min: 1, max: 4, mode: 'box' } } }
];

export class HaloPaletteCardEditor extends HTMLElement {
  private _config!: HaloPaletteCardConfig;
  private _hass!: HomeAssistant;
  private _lang = "en";

  public setConfig(config: HaloPaletteCardConfig) {
    this._config = {
      entity: 'input_select.couleur_theme_eclairages',
      columns: 2,
      ...config
    };
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._config && this.querySelector('ha-form') && getLang(hass) !== this._lang) {
      this.innerHTML = '';
      this._render();
      return;
    }
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
      this._lang = getLang(this._hass);
      this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, "palette", SCHEMA);
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
