/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-cover-color-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-cover-color-card.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-cover-color-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloCoverColorCardConfig } from '../types';
import { hexToRgb, rgbToHex } from '../core/theme-helper';

const SCHEMA = [
  {
    name: 'title',
    label: "Titre de l'en-tête",
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: "Icône de l'en-tête",
    selector: { icon: {} }
  },
  {
    name: 'closed_entity',
    label: 'Entité couleur volet fermé (défaut: input_text.couleur_volet_ferme)',
    selector: { entity: { domain: 'input_text' } }
  },
  {
    name: 'partial_entity',
    label: 'Entité couleur volet partiel (défaut: input_text.couleur_volet_partiel)',
    selector: { entity: { domain: 'input_text' } }
  },
  {
    name: 'open_entity',
    label: 'Entité couleur volet ouvert (défaut: input_text.couleur_volet_ouvert)',
    selector: { entity: { domain: 'input_text' } }
  },
  {
    name: 'moving_entity',
    label: 'Entité couleur mouvement (défaut: input_text.couleur_volet_en_mouvement)',
    selector: { entity: { domain: 'input_text' } }
  },
  {
    name: 'theme_entity',
    label: 'Entité sélecteur de thème pour en-tête (optionnel)',
    selector: { entity: { domain: 'input_select' } }
  }
];

export class HaloCoverColorCardEditor extends HTMLElement {
  private _config!: HaloCoverColorCardConfig;
  private _hass!: HomeAssistant;

  public setConfig(config: HaloCoverColorCardConfig) {
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
    if (data.color && typeof data.color === 'string') {
      const rgb = hexToRgb(data.color);
      if (rgb) data.color = rgb;
    }
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    const val = { ...ev.detail.value };
    if (val.color && Array.isArray(val.color)) {
      val.color = rgbToHex(val.color);
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
