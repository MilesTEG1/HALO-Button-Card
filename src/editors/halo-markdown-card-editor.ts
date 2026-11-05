/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-markdown-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-markdown-card.
 *                    Combine le composant natif <ha-form> pour le contenu Markdown
 *                    et les options générales avec le panneau de style Liquid Glass
 *                    HALO (onglets Barre / Dégradé, nuancier 16 teintes et curseur).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.2
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.5.2 (2026-11-02) : Création initiale de l'éditeur halo-markdown-card :
 *                              - Saisie du Markdown riche via champ multiligne natif.
 *                              - Panneau Liquid Glass avec onglets dédiés Barre / Dégradé.
 *                              - Sélecteur de couleur Mix A+B (Médaillon halo + Nuancier 16 teintes + Pipette).
 *                              - Curseur interactif de largeur de barre (0 à 8 px).
 * ==============================================================================
 */

import { HomeAssistant, HaloMarkdownCardConfig } from '../types';
import { toHexColor, HALO_PALETTE } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, stylePanelHtml, buildChips, colorDisplayName } from './editor-common';

type MarkdownColorTab = 'bar' | 'gradient';

interface TabDef {
  key: MarkdownColorTab;
  icon: string;
  labelKey: string;
}

const TABS: TabDef[] = [
  { key: 'bar', icon: 'mdi:border-left-variant', labelKey: 'bar_tab' },
  { key: 'gradient', icon: 'mdi:gradient-horizontal', labelKey: 'gradient_tab' }
];

const buildSchema = (_t: ReturnType<typeof useLocalize>) => [
  { name: 'title', selector: { text: {} } },
  { name: 'content', selector: { text: { multiline: true } } },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
];

export class HaloMarkdownCardEditor extends HTMLElement {
  private _config!: HaloMarkdownCardConfig;
  private _hass!: HomeAssistant;
  private _lang = 'en';
  private _activeTab: MarkdownColorTab = 'bar';

  // Références DOM Style Panel
  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _targetTitleEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;
  private _barSliderEl: HTMLInputElement | null = null;
  private _barValBadgeEl: HTMLElement | null = null;

  public setConfig(config: HaloMarkdownCardConfig) {
    this._config = {
      content: '',
      bar_width: 4,
      border_radius: 12,
      gradient_opacity: 0.10,
      text_color: 'rgba(230, 242, 245, 0.90)',
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
  }

  private _fireConfigChanged() {
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }

  private _getCurrentTabColor(): string {
    if (this._activeTab === 'bar') {
      const raw = this._config?.bar_color || this._config?.color || 'Cyan';
      return toHexColor(raw, '#26c6da');
    }
    const raw = this._config?.gradient_color || this._config?.color || 'Cyan';
    return toHexColor(raw, '#26c6da');
  }

  private _getCurrentTabRawColor(): any {
    if (this._activeTab === 'bar') {
      return this._config?.bar_color || this._config?.color || 'Cyan';
    }
    return this._config?.gradient_color || this._config?.color || 'Cyan';
  }

  private _getColorDisplayName(): string {
    const raw = this._getCurrentTabRawColor();
    return colorDisplayName(this._hass, raw, 'editor.color_default_halo');
  }

  private _updateColor(colorValue: string) {
    if (this._activeTab === 'bar') {
      this._config = {
        ...this._config,
        bar_color: colorValue
      };
    } else {
      this._config = {
        ...this._config,
        gradient_color: colorValue
      };
    }
    this._syncStylePanel();
    this._fireConfigChanged();
  }

  private _updateBarWidth(widthValue: number) {
    this._config = {
      ...this._config,
      bar_width: widthValue
    };
    this._syncStylePanel();
    this._fireConfigChanged();
  }

  private _setActiveTab(tabKey: MarkdownColorTab) {
    this._activeTab = tabKey;

    TABS.forEach(tab => {
      const tabEl = this.querySelector(`#tab-${tab.key}`);
      if (tabEl) {
        if (tab.key === tabKey) {
          tabEl.classList.add('active');
        } else {
          tabEl.classList.remove('active');
        }
      }
    });

    const t = useLocalize(this._hass);
    if (this._targetTitleEl) {
      const activeDef = TABS.find(tDef => tDef.key === tabKey)!;
      this._targetTitleEl.textContent = t('editor.markdown.target_color', 'target', t(`editor.markdown.${activeDef.labelKey}`));
    }

    this._syncStylePanel();
  }

  private _barBadgeText(bw: number): string {
    const t = useLocalize(this._hass);
    if (bw === 0) return t('editor.markdown.bar_badge_off');
    if (bw === 4) return t('editor.markdown.bar_badge_default', 'v', String(bw));
    return `${bw} px`;
  }

  private _syncStylePanel() {
    const hex = this._getCurrentTabColor();
    const name = this._getColorDisplayName();
    const bw = typeof this._config?.bar_width === 'number' ? this._config.bar_width : 4;

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

    // Pastilles témoins d'onglets
    const barHex = toHexColor(this._config?.bar_color || this._config?.color || 'Cyan', '#26c6da');
    const gradHex = toHexColor(this._config?.gradient_color || this._config?.color || 'Cyan', '#26c6da');

    const dotBar = this.querySelector('#tab-dot-bar') as HTMLElement;
    if (dotBar) {
      dotBar.style.backgroundColor = barHex;
      dotBar.style.boxShadow = `0 0 6px ${barHex}`;
    }
    const dotGrad = this.querySelector('#tab-dot-gradient') as HTMLElement;
    if (dotGrad) {
      dotGrad.style.backgroundColor = gradHex;
      dotGrad.style.boxShadow = `0 0 6px ${gradHex}`;
    }

    // Nuancier rapide
    if (this._chipsContainerEl) {
      const activeRaw = this._getCurrentTabRawColor();
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
        btn.classList.toggle('active', Boolean(isActive));
      });
    }

    // Slider barre
    if (this._barSliderEl && parseFloat(this._barSliderEl.value) !== bw) {
      this._barSliderEl.value = String(bw);
    }
    if (this._barValBadgeEl) {
      this._barValBadgeEl.textContent = this._barBadgeText(bw);
    }
  }

  private _formMetadata(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    delete data.color;
    delete data.bar_color;
    delete data.gradient_color;
    delete data.bar_width;
    delete data.border_radius;
    delete data.gradient_opacity;
    delete data.text_color;
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;

    this._config = {
      ...this._config,
      ...ev.detail.value
    };

    this._fireConfigChanged();
  }

  private _render() {
    this._lang = getLang(this._hass);
    const t = useLocalize(this._hass);

    let form = this.querySelector('#form') as any;

    if (!form) {
      const activeDef = TABS.find(tab => tab.key === this._activeTab)!;
      const small = (k: string) => `<small style="opacity: 0.6;">${t(`editor.markdown.${k}`)}</small>`;

      this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>

          <div class="halo-style-section">
            <div class="halo-section-header">
              <ha-icon icon="mdi:palette-swatch"></ha-icon>
              <span>${t('editor.style_title_colors')}</span>
            </div>

            <div class="halo-state-tabs">
              ${TABS.map(tab => `
                <div class="halo-state-tab ${tab.key === this._activeTab ? 'active' : ''}" id="tab-${tab.key}" data-key="${tab.key}">
                  <span class="halo-state-tab-dot" id="tab-dot-${tab.key}"></span>
                  <ha-icon icon="${tab.icon}"></ha-icon>
                  <span>${t(`editor.markdown.${tab.labelKey}`)}</span>
                </div>
              `).join('')}
            </div>

            <div class="halo-style-grid">
              <div class="halo-col">
                <div class="halo-col-header">
                  <span class="halo-col-title" id="state-title">
                    ${t('editor.markdown.target_color', 'target', t(`editor.markdown.${activeDef.labelKey}`))}
                  </span>
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

              <div class="halo-col">
                <div class="halo-col-header">
                  <span class="halo-col-title">${t('editor.markdown.bar_width_title')}</span>
                  <span class="halo-badge-val" id="border-val-text"></span>
                </div>
                <div class="halo-border-card">
                  <input type="range" id="border-slider-input" min="0" max="8" step="0.5" value="4" class="halo-range-slider" />
                  <div class="slider-ticks">
                    <span>0 px<br>${small('bar_none')}</span>
                    <span style="text-align: center;">4 px<br>${small('bar_default')}</span>
                    <span style="text-align: right;">8 px<br>${small('bar_max')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, 'markdown', buildSchema(useLocalize(this._hass)));
        form.data = this._formMetadata();
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }

      this._initDomBindings();
    } else {
      form.data = this._formMetadata();
      if (this._hass) form.hass = this._hass;
    }

    this._syncStylePanel();
  }

  private _initDomBindings() {
    this._swatchCircleEl = this.querySelector('#swatch-circle');
    this._colorInputEl = this.querySelector('#native-color-input');
    this._swatchNameEl = this.querySelector('#swatch-name');
    this._swatchHexEl = this.querySelector('#swatch-hex');
    this._targetTitleEl = this.querySelector('#state-title');
    this._chipsContainerEl = this.querySelector('#chips-grid');
    this._barSliderEl = this.querySelector('#border-slider-input');
    this._barValBadgeEl = this.querySelector('#border-val-text');

    // 1. Clics sur les onglets (Barre latérale / Dégradé de fond)
    TABS.forEach(tab => {
      this.querySelector(`#tab-${tab.key}`)?.addEventListener('click', () => {
        this._setActiveTab(tab.key);
      });
    });

    // 2. Déclencheur input color natif
    const triggerColor = () => {
      if (this._colorInputEl) {
        this._colorInputEl.click();
      }
    };
    this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
    this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);

    this._colorInputEl?.addEventListener('input', (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      if (val) this._updateColor(val);
    });

    // 3. Nuancier officiel HALO 16 teintes
    if (this._chipsContainerEl) {
      buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
    }

    // 4. Curseur de largeur de barre
    this._barSliderEl?.addEventListener('input', (e: Event) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        this._updateBarWidth(val);
      }
    });
  }
}
