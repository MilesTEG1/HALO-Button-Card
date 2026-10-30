/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-separator-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-separator-card
 *                    avec support des options accordéon / volet légende.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Ajout des contrôles accordéon (collapsible, labels, toggle_entity).
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale de l'éditeur séparateur.
 * ==============================================================================
 */

import { HomeAssistant, HaloSeparatorCardConfig } from '../types';
import { hexToRgb, rgbToHex } from '../core/theme-helper';

const SCHEMA = [
  {
    name: 'name',
    label: 'Titre de la section',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône MDI',
    selector: { icon: {} }
  },
  {
    name: 'collapsible',
    label: 'Activer le volet accordéon escamotable',
    selector: { boolean: {} }
  },
  {
    name: 'initial_collapsed',
    label: 'Initialement replié / masqué',
    selector: { boolean: {} }
  },
  {
    name: 'label_on',
    label: 'Libellé bouton quand ouvert (ex: Masquer)',
    selector: { text: {} }
  },
  {
    name: 'label_off',
    label: 'Libellé bouton quand fermé (ex: Afficher)',
    selector: { text: {} }
  },
  {
    name: 'toggle_entity',
    label: 'Entité externe synchronisée (optionnel)',
    selector: { entity: { domain: 'input_boolean' } }
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
