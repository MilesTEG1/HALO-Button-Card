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

const SCHEMA = [
  {
    name: 'entity',
    label: 'Entité sélecteur de thème (défaut: input_select.couleur_theme_eclairages)',
    selector: { entity: { domain: 'input_select' } }
  },
  {
    name: 'title',
    label: 'Titre de la section (optionnel)',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône MDI (optionnel)',
    selector: { icon: {} }
  },
  {
    name: 'columns',
    label: 'Nombre de colonnes',
    selector: {
      number: {
        min: 1,
        max: 4,
        mode: 'box'
      }
    }
  }
];

export class HaloPaletteCardEditor extends HTMLElement {
  private _config!: HaloPaletteCardConfig;
  private _hass!: HomeAssistant;

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
