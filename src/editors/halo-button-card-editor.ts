/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-button-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-button-card
 *                    utilisant le composant natif <ha-form> de Home Assistant.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-button-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloButtonCardConfig } from '../types';
import { hexToRgb, rgbToHex } from '../core/theme-helper';

const SCHEMA = [
  {
    name: 'name',
    label: 'Titre principal',
    selector: { text: {} }
  },
  {
    name: 'label',
    label: 'Sous-titre / Description',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône MDI',
    selector: { icon: {} }
  },
  {
    name: 'layout',
    label: 'Disposition (Layout)',
    selector: {
      select: {
        options: [
          { value: 'horizontal', label: 'Horizontal (Carte large avec texte à droite)' },
          { value: 'vertical', label: 'Vertical (Carte compacte avec texte centré en dessous)' }
        ]
      }
    }
  },
  {
    name: 'text_align',
    label: 'Alignement du texte',
    selector: {
      select: {
        options: [
          { value: 'left', label: 'Gauche' },
          { value: 'center', label: 'Centré' },
          { value: 'right', label: 'Droite' }
        ]
      }
    }
  },
  {
    name: 'entity',
    label: 'Entité liée (optionnel)',
    selector: { entity: {} }
  },
  {
    name: 'color',
    label: 'Couleur personnalisée (optionnel)',
    selector: { color_rgb: {} }
  },
  {
    name: 'theme_entity',
    label: 'Entité sélecteur de thème (optionnel)',
    selector: { entity: { domain: 'input_select' } }
  }
];

export class HaloButtonCardEditor extends HTMLElement {
  private _config!: HaloButtonCardConfig;
  private _hass!: HomeAssistant;

  public setConfig(config: HaloButtonCardConfig) {
    this._config = {
      layout: 'horizontal',
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
