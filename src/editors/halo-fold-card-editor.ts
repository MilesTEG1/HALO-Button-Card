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
 * 📦 Version      : 1.7.1-beta.1
 * 📅 Date         : 2026-11-03
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🌟 v1.7.1-beta.1 (2026-11-03) : Intégration des contrôles GUI pour le contour en pointillé,
 *                                     le style de ligne (pointillés, points, continu), le halo néon léger,
 *                                     l'épaisseur de bordure et l'espacement interne de l'enclos.
 *   - ✨ v1.6.0-beta.3 (2026-11-02) : Cartes enfants sans YAML : sélecteur natif
 *                                     hui-card-picker + éditeur natif complet
 *                                     hui-card-element-editor par carte enfant.
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
  { name: 'toggle_entity', selector: { entity: { domain: 'input_boolean' } } },
  { name: 'show_border', selector: { boolean: {} } },
  {
    name: 'border_style',
    selector: {
      select: {
        options: selectOptions(t, 'fold', [
          ['dashed', 'style_dashed'],
          ['dotted', 'style_dotted'],
          ['solid', 'style_solid']
        ])
      }
    }
  },
  { name: 'show_halo', selector: { boolean: {} } },
  {
    name: 'border_width',
    selector: {
      number: {
        min: 1,
        max: 4,
        step: 0.5,
        mode: 'slider'
      }
    }
  },
  {
    name: 'enclosure_padding',
    selector: {
      number: {
        min: 0,
        max: 24,
        step: 2,
        mode: 'slider'
      }
    }
  }
];

export class HaloFoldCardEditor extends HTMLElement {
  private _config!: HaloFoldCardConfig;
  private _hass!: HomeAssistant;
  private _lang = 'en';
  private _lovelace: any;
  private _picking = false;
  private _expanded = -1;
  private _renderToken = 0;

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

  public set lovelace(lovelace: any) {
    this._lovelace = lovelace;
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
    if (data.show_border === undefined) {
      data.show_border = true;
    }
    if (data.border_style === undefined) {
      data.border_style = 'dashed';
    }
    if (data.show_halo === undefined) {
      data.show_halo = true;
    }
    if (data.border_width === undefined) {
      data.border_width = 1.5;
    }
    if (data.enclosure_padding === undefined) {
      data.enclosure_padding = 10;
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
    if (val.border_width !== undefined) {
      val.border_width = parseFloat(String(val.border_width)) || 1.5;
    }
    if (val.enclosure_padding !== undefined) {
      val.enclosure_padding = parseInt(String(val.enclosure_padding), 10);
      if (isNaN(val.enclosure_padding)) val.enclosure_padding = 10;
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

  private _toggleCardPicker() {
    this._picking = !this._picking;
    this._renderCardsManager();
  }

  private _addCardFromPicker(cardConfig: Record<string, any>) {
    if (!cardConfig || !cardConfig.type) return;
    const cards = this._getCards();
    cards.push(cardConfig);
    this._expanded = cards.length - 1;
    this._picking = false;
    this._config = { ...this._config, cards };
    this._fireConfigChanged();
    this._renderCardsManager();
  }

  private _toggleExpand(index: number) {
    this._expanded = this._expanded === index ? -1 : index;
    this._renderCardsManager();
  }

  /** Charge les éditeurs natifs HA (hui-card-picker / hui-card-element-editor), enregistrés paresseusement. */
  private async _ensureHuiEditors(): Promise<void> {
    if (customElements.get('hui-card-picker') && customElements.get('hui-card-element-editor')) return;
    try {
      const helpers = await (window as any).loadCardHelpers();
      const stack = await helpers.createCardElement({ type: 'vertical-stack', cards: [] });
      await stack?.constructor?.getConfigElement?.();
      await Promise.all([
        customElements.whenDefined('hui-card-picker'),
        customElements.whenDefined('hui-card-element-editor')
      ]);
    } catch (_e) {
      /* éditeurs natifs indisponibles : message d'erreur affiché au rendu */
    }
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

  private _cardTitle(c: Record<string, any>): string {
    return c.name || c.title || c.entity || c.type || 'Card';
  }

  private _escape(s: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, ch => map[ch]);
  }

  private async _renderCardsManager() {
    const container = this.querySelector('#cards-container') as HTMLElement | null;
    if (!container) return;
    const token = ++this._renderToken;
    await this._ensureHuiEditors();
    if (token !== this._renderToken) return;

    const cards = this._getCards();
    const t = (k: string) => this._t(`editor.fold.${k}`);
    const nativeOk = !!(customElements.get('hui-card-picker') && customElements.get('hui-card-element-editor'));
    container.innerHTML = '';

    if (!nativeOk) {
      container.innerHTML = '<div style="padding:12px;color:var(--error-color,#f44336);font-size:13px;">hui-card-picker / hui-card-element-editor indisponibles.</div>';
      return;
    }

    if (cards.length === 0 && !this._picking) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; text-align: center; color: var(--secondary-text-color); font-size: 13px;';
      empty.textContent = t('no_cards');
      container.appendChild(empty);
    }

    cards.forEach((c, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'background: var(--card-background-color, rgba(255,255,255,0.05)); border: 1px solid var(--divider-color, rgba(255,255,255,0.1)); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px;';
      const open = this._expanded === idx;

      const header = document.createElement('div');
      header.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
      header.innerHTML = `
        <div class="btn-toggle" style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:12.5px;cursor:pointer;flex:1;">
          <ha-icon icon="${open ? 'mdi:chevron-down' : 'mdi:chevron-right'}" style="--mdc-icon-size:18px;"></ha-icon>
          <span>#${idx + 1} — ${this._escape(this._cardTitle(c))}</span>
          <span style="font-weight:400;font-size:11px;color:var(--secondary-text-color);">${this._escape(c.type || '')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <button type="button" class="btn-up" style="background:none;border:none;color:var(--primary-text-color);cursor:pointer;padding:2px 6px;" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-down" style="background:none;border:none;color:var(--primary-text-color);cursor:pointer;padding:2px 6px;" ${idx === cards.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-del" style="background:none;border:none;color:var(--error-color,#f44336);cursor:pointer;padding:2px 6px;">✕</button>
        </div>`;
      header.querySelector('.btn-toggle')?.addEventListener('click', () => this._toggleExpand(idx));
      header.querySelector('.btn-up')?.addEventListener('click', () => this._moveCard(idx, 'up'));
      header.querySelector('.btn-down')?.addEventListener('click', () => this._moveCard(idx, 'down'));
      header.querySelector('.btn-del')?.addEventListener('click', () => this._removeCard(idx));
      row.appendChild(header);

      if (open) {
        // Éditeur natif HA : bascule GUI/YAML, formulaire complet de la carte enfant
        const ed = document.createElement('hui-card-element-editor') as any;
        ed.hass = this._hass;
        ed.lovelace = this._lovelace;
        ed.value = c;
        ed.addEventListener('config-changed', (ev: CustomEvent) => {
          ev.stopPropagation();
          const newCfg = ev.detail?.config;
          if (!newCfg) return;
          const list = this._getCards();
          list[idx] = newCfg;
          this._config = { ...this._config, cards: list };
          this._fireConfigChanged();
        });
        ed.addEventListener('GUImode-changed', (ev: Event) => ev.stopPropagation());
        row.appendChild(ed);
      }
      container.appendChild(row);
    });

    if (this._picking) {
      const picker = document.createElement('hui-card-picker') as any;
      picker.hass = this._hass;
      picker.lovelace = this._lovelace;
      picker.addEventListener('config-changed', (ev: CustomEvent) => {
        ev.stopPropagation();
        this._addCardFromPicker(ev.detail?.config);
      });
      container.appendChild(picker);
    }
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

      this.querySelector('#btn-add-card')?.addEventListener('click', () => this._toggleCardPicker());
      this._renderCardsManager();
    } else {
      form.data = this._formMetadata();
      if (this._hass) form.hass = this._hass;
      this._renderCardsManager();
    }

    this._syncStylePanel();
  }
}
