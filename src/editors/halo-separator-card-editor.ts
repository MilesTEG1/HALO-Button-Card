/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-separator-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-separator-card
 *                    avec support des options accordéon, colonnes (1/2/3) et
 *                    gestionnaire visuel d'éléments de légendes.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.3.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.3.0 (2026-10-30) : Support complet des colonnes (1, 2, 3) et gestionnaire
 *                              dynamique des éléments de légende (ajout, édition,
 *                              réordonnancement, suppression).
 *   - 💡 v1.2.0 (2026-10-30) : Ajout des contrôles accordéon (collapsible, labels, toggle_entity).
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale de l'éditeur séparateur.
 * ==============================================================================
 */

import { HomeAssistant, HaloSeparatorCardConfig, LegendItemConfig } from '../types';
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
    name: 'columns',
    label: 'Nombre de colonnes du volet',
    selector: {
      select: {
        options: [
          { value: '1', label: '1 colonne (Largeur complète / Texte détaillé)' },
          { value: '2', label: '2 colonnes (Standard équilibré)' },
          { value: '3', label: '3 colonnes (Compact / 3 éléments par ligne)' }
        ]
      }
    }
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
    name: 'content',
    label: 'Note ou texte explicatif libre (optionnel)',
    selector: { text: { multiline: true } }
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
    this._config = {
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

  private _formData(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    if (data.columns !== undefined) {
      data.columns = String(data.columns);
    }
    if (data.color && typeof data.color === 'string') {
      const rgb = hexToRgb(data.color);
      if (rgb) data.color = rgb;
    }
    return data;
  }

  private _fireChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    const val = { ...ev.detail.value };
    if (val.columns !== undefined) {
      val.columns = parseInt(String(val.columns), 10) || 2;
    }
    if (val.color && Array.isArray(val.color)) {
      val.color = rgbToHex(val.color);
    }
    this._config = {
      ...this._config,
      ...val
    };
    this._fireChanged();
  }

  private _getItems(): LegendItemConfig[] {
    if (Array.isArray(this._config.legend_items)) {
      return [...this._config.legend_items];
    }
    return [];
  }

  private _addItem() {
    const items = this._getItems();
    items.push({
      icon: 'mdi:information-outline',
      label: 'Nouvel élément',
      desc: 'Description',
      color: ''
    });
    this._config = {
      ...this._config,
      legend_items: items
    };
    this._fireChanged();
    this._renderItemsManager();
  }

  private _removeItem(index: number) {
    const items = this._getItems();
    items.splice(index, 1);
    this._config = {
      ...this._config,
      legend_items: items
    };
    this._fireChanged();
    this._renderItemsManager();
  }

  private _moveItem(index: number, direction: 'up' | 'down') {
    const items = this._getItems();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    this._config = {
      ...this._config,
      legend_items: items
    };
    this._fireChanged();
    this._renderItemsManager();
  }

  private _updateItemField(index: number, field: keyof LegendItemConfig, value: string) {
    const items = this._getItems();
    if (!items[index]) return;
    (items[index] as any)[field] = value;
    this._config = {
      ...this._config,
      legend_items: items
    };
    this._fireChanged();
  }

  private _renderItemsManager() {
    const container = this.querySelector('#items-container');
    if (!container) return;

    const items = this._getItems();

    if (items.length === 0) {
      container.innerHTML = `
        <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; text-align: center; color: var(--secondary-text-color); font-size: 13px;">
          Aucun élément de légende personnalisé défini.<br>
          <small>Cliquez sur "Ajouter un élément" pour personnaliser le volet.</small>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    items.forEach((it, idx) => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--card-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      // Header row
      const headerRow = document.createElement('div');
      headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;';
      headerRow.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px;">
          <ha-icon icon="${it.icon || 'mdi:circle-small'}" style="color: ${it.color || 'var(--primary-color)'}; --mdc-icon-size: 18px;"></ha-icon>
          <span>${it.label || `Élément #${idx + 1}`}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="btn-up" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px; font-size: 14px;" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-down" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px; font-size: 14px;" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-del" style="background: none; border: none; color: var(--error-color, #f44336); cursor: pointer; padding: 2px 6px; font-size: 16px;">✕</button>
        </div>
      `;

      headerRow.querySelector('.btn-up')?.addEventListener('click', () => this._moveItem(idx, 'up'));
      headerRow.querySelector('.btn-down')?.addEventListener('click', () => this._moveItem(idx, 'down'));
      headerRow.querySelector('.btn-del')?.addEventListener('click', () => this._removeItem(idx));

      // Fields row 1 (Icon & Badge)
      const row1 = document.createElement('div');
      row1.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
      row1.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Icône (ex: mdi:power)</label>
          <input type="text" class="input-icon" value="${it.icon || ''}" placeholder="mdi:tag" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Badge court (ex: %, K, °C)</label>
          <input type="text" class="input-badge" value="${it.badge || ''}" placeholder="%, K..." style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;
      row1.querySelector('.input-icon')?.addEventListener('change', (e: any) => this._updateItemField(idx, 'icon', e.target.value));
      row1.querySelector('.input-badge')?.addEventListener('change', (e: any) => this._updateItemField(idx, 'badge', e.target.value));

      // Fields row 2 (Label & Desc)
      const row2 = document.createElement('div');
      row2.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
      row2.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Libellé / Titre (en gras)</label>
          <input type="text" class="input-label" value="${it.label || ''}" placeholder="ex: Appui court" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Description</label>
          <input type="text" class="input-desc" value="${it.desc || ''}" placeholder="ex: Allumage" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;
      row2.querySelector('.input-label')?.addEventListener('change', (e: any) => this._updateItemField(idx, 'label', e.target.value));
      row2.querySelector('.input-desc')?.addEventListener('change', (e: any) => this._updateItemField(idx, 'desc', e.target.value));

      // Fields row 3 (Color)
      const row3 = document.createElement('div');
      row3.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 8px;';
      row3.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Couleur personnalisée HEX (optionnel, hérite de la carte si vide)</label>
          <input type="text" class="input-color" value="${it.color || ''}" placeholder="ex: #38bdf8" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;
      row3.querySelector('.input-color')?.addEventListener('change', (e: any) => this._updateItemField(idx, 'color', e.target.value));

      card.appendChild(headerRow);
      card.appendChild(row1);
      card.appendChild(row2);
      card.appendChild(row3);
      container.appendChild(card);
    });
  }

  private _render() {
    if (!this._config) return;

    let form = this.querySelector('ha-form') as any;
    if (!form) {
      this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
          <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-weight: 600; font-size: 14px; color: var(--primary-text-color);">Éléments de Légende & Guide</span>
              <button type="button" id="btn-add-item" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; background: var(--primary-color, #0288d1); color: #fff; border: none; cursor: pointer; font-size: 12px; font-weight: 600;">
                <span>+ Ajouter un élément</span>
              </button>
            </div>
            <div id="items-container"></div>
          </div>
        </div>
      `;
      form = this.querySelector('#form') as any;
      if (form) {
        form.schema = SCHEMA;
        form.data = this._formData();
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }

      this.querySelector('#btn-add-item')?.addEventListener('click', () => this._addItem());
      this._renderItemsManager();
    } else {
      form.data = this._formData();
      if (this._hass) form.hass = this._hass;
      this._renderItemsManager();
    }
  }
}
