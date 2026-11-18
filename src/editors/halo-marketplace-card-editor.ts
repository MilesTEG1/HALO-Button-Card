/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-marketplace-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-marketplace-card.
 *                    Permet de configurer le titre, l'icône, la teinte HALO et
 *                    les paramètres d'affichage depuis l'éditeur de cartes Lovelace.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.8.0-beta.2
 * 📅 Date         : 2026-11-11
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.8.0-beta.2 (2026-11-11) : Création initiale de l'éditeur custom:halo-marketplace-card-editor.
 * ==============================================================================
 */

import { HomeAssistant, HaloMarketplaceCardConfig } from '../types';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { HALO_PALETTE } from '../core/theme-helper';

const buildSchema = () => [
  { name: 'title', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  {
    name: 'theme_color',
    selector: {
      select: {
        options: Object.keys(HALO_PALETTE).map(name => ({
          value: name,
          label: name
        }))
      }
    }
  },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } },
  { name: 'max_height', selector: { text: {} } },
  { name: 'show_search', selector: { boolean: {} } },
  { name: 'show_select_all', selector: { boolean: {} } }
];

export class HaloMarketplaceCardEditor extends HTMLElement {
  private _config!: HaloMarketplaceCardConfig;
  private _hass!: HomeAssistant;
  private _formEl: HTMLElement | null = null;

  public setConfig(config: HaloMarketplaceCardConfig) {
    this._config = config;
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._formEl) {
      (this._formEl as any).hass = hass;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!this._config) return;

    const target = ev.target as any;
    const value = ev.detail.value;

    const newConfig = {
      ...this._config,
      ...value
    };

    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _render() {
    if (!this._config) return;

    this.innerHTML = `
      <style>
        ${COMMON_EDITOR_STYLES}
        .editor-container {
          padding: 8px 0;
        }
      </style>
      <div class="editor-container">
        <ha-form id="form"></ha-form>
      </div>
    `;

    this._formEl = this.querySelector('#form');
    if (this._formEl) {
      (this._formEl as any).hass = this._hass;
      (this._formEl as any).data = this._config;
      (this._formEl as any).schema = buildSchema();
      (this._formEl as any).computeLabel = (schema: any) => {
        const labels: Record<string, string> = {
          title: 'Titre de la carte',
          icon: 'Icône',
          theme_color: 'Couleur de thème HALO',
          theme_entity: 'Entité de thème dynamique (optionnel)',
          max_height: 'Hauteur maximale de la liste (ex: 320px)',
          show_search: 'Afficher la barre de recherche',
          show_select_all: 'Afficher les boutons Tout cocher / Tout décocher'
        };
        return labels[schema.name] || schema.name;
      };
      this._formEl.addEventListener('value-changed', (e: any) => this._valueChanged(e));
    }
  }
}
