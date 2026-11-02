/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-fold-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-fold-card.
 *                    Combine <ha-form> (titre, icône, thème, état initial,
 *                    colonnes, libellés et entité synchronisée), le panneau
 *                    visuel Mix A+B 16 teintes HALO et un gestionnaire des
 *                    cartes enfants Lovelace (cards).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.6.0-beta.1
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.6.0-beta.1 (2026-11-02) : Création initiale de l'éditeur visuel
 *                                     halo-fold-card-editor.
 * ==============================================================================
 */

import { HomeAssistant, HaloFoldCardConfig } from '../types';
import { toHexColor, resolveThemeColor } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, selectOptions, buildChips, colorDisplayName } from './editor-common';

const buildSchema = (t: ReturnType<typeof useLocalize>) => [
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } },
  { name: 'initial_collapsed', selector: { boolean: {} } },
  {
    name: 'columns',
    selector: {
      select: {
        options: selectOptions(t, 'fold', [['1', 'cols_1'], ['2', 'cols_2'], ['3', 'cols_3']])
      }
    }
  },
  { name: 'label_on', selector: { text: {} } },
  { name: 'label_off', selector: { text: {} } },
  { name: 'toggle_entity', selector: { entity: { domain: 'input_boolean' } } }
];

export class HaloFoldCardEditor extends HTMLElement {
  private _config!: HaloFoldCardConfig;
  private _hass!: HomeAssistant;
  private _lang = 'en';

  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;

  private get _t() {
    return useLocalize(this._hass);
  }

  public setConfig(config: HaloFoldCardConfig) {
    this._config = {
      columns: 1,
      initial_collapsed: true,
      cards: [],
      ...config
    };
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (this._config && this.querySelector('#form') && getLang(hass) !== this._lang) {
      this.innerHTML = '';
      this._render();
      return;
    }
    const form = this.querySelector('#form') as any;
    if (form) {
      form.hass = hass;
    }
    this._syncStylePanel();
  }

  private _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _getColorHex(): string {
    const raw = this._config?.color || 'Cyan';
    if (typeof raw === 'string' && (raw.trim().toLowerCase() === 'theme' || raw.trim().toLowerCase() === 'auto')) {
      return resolveThemeColor(this._hass, 'theme', this._config?.theme_entity, '#26c6da');
    }
    return toHexColor(raw, '#26c6da');
  }

  private _updateColor(colorValue: string) {
    this._config = {
      ...this._config,
      color: colorValue
    };
    this._syncStylePanel();
    this._fireConfigChanged();
  }

  private _syncStylePanel() {
    if (!this._config) return;
    const hex = this._getColorHex();
    const name = colorDisplayName(this._hass, this._config.color, 'editor.color_default_cyan');

    if (this._swatchCircleEl) {
      this._swatchCircleEl.style.background = hex;
      this._swatchCircleEl.style.boxShadow = `0 0 12px ${hex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
      this._swatchCircleEl.style.borderColor = hex;
    }
    if (this._colorInputEl) {
      this._colorInputEl.value = hex;
    }
    if (this._swatchNameEl) {
      this._swatchNameEl.textContent = name;
    }
    if (this._swatchHexEl) {
      this._swatchHexEl.textContent = hex.toUpperCase();
    }

    if (this._chipsContainerEl) {
      const activeRaw = this._config.color || 'Cyan';
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
        btn.classList.toggle('active', Boolean(isActive));
      });
    }
  }

  private _formMetadata(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    if (data.columns !== undefined) {
      data.columns = String(data.columns);
    }
    delete data.color;
    delete data.cards;
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    const val = { ...ev.detail.value };
    if (val.columns !== undefined) {
      val.columns = parseInt(String(val.columns), 10) || 1;
    }
    this._config = {
      ...this._config,
      ...val
    };
    this._fireConfigChanged();
  }

  private _getCards(): Array<Record<string, any>> {
    return Array.isArray(this._config?.cards) ? [...this._config.cards] : [];
  }

  private _addCard() {
    const cards = this._getCards();
    cards.push({
      type: 'custom:halo-light-card',
      entity: '',
      name: ''
    });
    this._config = {
      ...this._config,
      cards
    };
    this._fireConfigChanged();
    this._renderCardsManager();
  }

  private _removeCard(index: number) {
    const cards = this._getCards();
    cards.splice(index, 1);
    this._config = {
      ...this._config,
      cards
    };
    this._fireConfigChanged();
    this._renderCardsManager();
  }

  private _moveCard(index: number, direction: 'up' | 'down') {
    const cards = this._getCards();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cards.length) return;
    const tmp = cards[index];
    cards[index] = cards[targetIndex];
    cards[targetIndex] = tmp;
    this._config = {
      ...this._config,
      cards
    };
    this._fireConfigChanged();
    this._renderCardsManager();
  }

  private _updateCardField(index: number, field: string, value: string) {
    const cards = this._getCards();
    if (!cards[index]) return;
    cards[index] = {
      ...cards[index],
      [field]: value
    };
    this._config = {
      ...this._config,
      cards
    };
    this._fireConfigChanged();
  }

  private _renderCardsManager() {
    const container = this.querySelector('#cards-container');
    if (!container) return;

    const cards = this._getCards();
    const t = (k: string) => this._t(`editor.fold.${k}`);

    if (cards.length === 0) {
      container.innerHTML = `
        <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; text-align: center; color: var(--secondary-text-color); font-size: 13px;">
          ${t('no_cards')}
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    cards.forEach((c, idx) => {
      const row = document.createElement('div');
      row.style.cssText = `
        background: var(--card-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;

      const header = document.createElement('div');
      header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;';
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px;">
          <ha-icon icon="${c.icon || 'mdi:card-bulleted-outline'}" style="color: #26c6da; --mdc-icon-size: 16px;"></ha-icon>
          <span>#${idx + 1} — ${c.name || c.entity || c.type || 'Card'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="btn-up" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px;" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-down" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px;" ${idx === cards.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-del" style="background: none; border: none; color: var(--error-color, #f44336); cursor: pointer; padding: 2px 6px;">✕</button>
        </div>
      `;

      header.querySelector('.btn-up')?.addEventListener('click', () => this._moveCard(idx, 'up'));
      header.querySelector('.btn-down')?.addEventListener('click', () => this._moveCard(idx, 'down'));
      header.querySelector('.btn-del')?.addEventListener('click', () => this._removeCard(idx));

      const fields = document.createElement('div');
      fields.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;';
      fields.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Type</label>
          <input type="text" class="inp-type" value="${c.type || ''}" placeholder="custom:halo-light-card" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Entity</label>
          <input type="text" class="inp-entity" value="${c.entity || ''}" placeholder="light.exemple" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">Nom</label>
          <input type="text" class="inp-name" value="${c.name || ''}" placeholder="Lampe" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;

      fields.querySelector('.inp-type')?.addEventListener('change', (e: any) => this._updateCardField(idx, 'type', e.target.value));
      fields.querySelector('.inp-entity')?.addEventListener('change', (e: any) => this._updateCardField(idx, 'entity', e.target.value));
      fields.querySelector('.inp-name')?.addEventListener('change', (e: any) => this._updateCardField(idx, 'name', e.target.value));

      row.appendChild(header);
      row.appendChild(fields);
      container.appendChild(row);
    });
  }

  private _render() {
    if (!this._config) return;
    const t = this._t;
    this._lang = getLang(this._hass);

    let form = this.querySelector('#form') as any;
    if (!form) {
      this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>
        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>

          <div class="halo-style-section">
            <div class="halo-section-header">
              <ha-icon icon="mdi:palette-swatch"></ha-icon>
              <span>${t('editor.style_title')}</span>
            </div>
            <div class="halo-col">
              <div class="halo-col-header">
                <span class="halo-col-title">${t('editor.halo_color')}</span>
              </div>
              <div class="halo-swatch-card" id="swatch-card">
                <div class="halo-swatch-circle-wrap" id="swatch-circle-wrap" title="${t('editor.open_palette')}">
                  <div class="halo-swatch-circle" id="swatch-circle"></div>
                  <input type="color" id="native-color-input" class="hidden-color-input" />
                </div>
                <div class="halo-swatch-meta">
                  <span class="halo-color-title" id="swatch-name"></span>
                  <span class="halo-color-hex" id="swatch-hex"></span>
                </div>
                <button type="button" class="halo-pipette-btn" id="pipette-btn" title="${t('editor.open_wheel')}">
                  <ha-icon icon="mdi:eyedropper"></ha-icon>
                </button>
              </div>
              <div class="halo-chips-label">${t('editor.chips_label')}</div>
              <div class="halo-chips-grid" id="chips-grid"></div>
            </div>
          </div>

          <div id="fold-cards-manager" style="margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <div>
                <span style="font-weight: 600; font-size: 14px; color: var(--primary-text-color);">${t('editor.fold.cards_title')}</span>
                <span style="display: block; font-size: 11px; color: var(--secondary-text-color);">${t('editor.fold.cards_subtitle')}</span>
              </div>
              <button type="button" id="btn-add-card" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; background: var(--primary-color, #0288d1); color: #fff; border: none; cursor: pointer; font-size: 12px; font-weight: 600;">
                <span>${t('editor.fold.add_card')}</span>
              </button>
            </div>
            <div id="cards-container"></div>
          </div>
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, 'fold', buildSchema(t));
        form.data = this._formMetadata();
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }

      this._swatchCircleEl = this.querySelector('#swatch-circle');
      this._colorInputEl = this.querySelector('#native-color-input');
      this._swatchNameEl = this.querySelector('#swatch-name');
      this._swatchHexEl = this.querySelector('#swatch-hex');
      this._chipsContainerEl = this.querySelector('#chips-grid');

      const triggerColor = () => this._colorInputEl?.click();
      this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
      this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);

      this._colorInputEl?.addEventListener('input', (e: Event) => {
        const val = (e.target as HTMLInputElement).value;
        if (val) this._updateColor(val);
      });

      if (this._chipsContainerEl) {
        buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
      }

      this.querySelector('#btn-add-card')?.addEventListener('click', () => this._addCard());
      this._renderCardsManager();
    } else {
      form.data = this._formMetadata();
      if (this._hass) form.hass = this._hass;
      this._renderCardsManager();
    }

    this._syncStylePanel();
  }
}
