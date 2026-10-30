/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-button-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-button-card.
 *                    Combine le composant natif <ha-form> pour les métadonnées et un
 *                    panneau Liquid Glass avec médaillon halo interactif, nuancier
 *                    rapide HOLM et curseur d'épaisseur de bordure.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.1
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ✨ v1.2.1 (2026-10-30) : Sélecteur de couleur Mix A+B (Halo Swatch + Nuancier
 *                              rapide HOLM 16 teintes) et curseur d'épaisseur de bordure
 *                              (0 à 3 px) côte à côte en grille responsive.
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-button-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloButtonCardConfig } from '../types';
import { HOLM_PALETTE, toHexColor } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, selectOptions, stylePanelHtml, borderBadge, buildChips, colorDisplayName } from './editor-common';

const buildSchema = (t: ReturnType<typeof useLocalize>) => [
  { name: 'name', selector: { text: {} } },
  { name: 'label', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  {
    name: 'layout',
    selector: {
      select: {
        options: selectOptions(t, 'button', [['horizontal', 'layout_horizontal'], ['vertical', 'layout_vertical']])
      }
    }
  },
  {
    name: 'text_align',
    selector: {
      select: {
        options: selectOptions(t, 'button', [['left', 'align_left'], ['center', 'align_center'], ['right', 'align_right']])
      }
    }
  },
  { name: 'entity', selector: { entity: {} } },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
];

export class HaloButtonCardEditor extends HTMLElement {
  private _config!: HaloButtonCardConfig;
  private _hass!: HomeAssistant;
  private _lang = "en";

  // Références DOM Style Panel
  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;
  private _borderSliderEl: HTMLInputElement | null = null;
  private _borderValBadgeEl: HTMLElement | null = null;

  public setConfig(config: HaloButtonCardConfig) {
    this._config = {
      layout: 'horizontal',
      border_width: 1.5,
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

  private _getColorHex(): string {
    const raw = this._config?.color || 'Cyan HOLM';
    return toHexColor(raw, '#26c6da');
  }

  private _getColorDisplayName(): string {
    return colorDisplayName(this._hass, this._config?.color, 'editor.color_default_cyan');
  }
  private _updateColor(colorValue: string) {
    this._config = {
      ...this._config,
      color: colorValue
    };
    this._syncStylePanel();
    this._fireConfigChanged();
  }

  private _updateBorderWidth(widthValue: number) {
    this._config = {
      ...this._config,
      border_width: widthValue
    };
    this._syncStylePanel();
    this._fireConfigChanged();
  }

  private _syncStylePanel() {
    const hex = this._getColorHex();
    const name = this._getColorDisplayName();
    const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;

    // 1. Swatch Circle & Halo (Option A)
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

    // 2. Nuancier rapide Chips (Option B)
    if (this._chipsContainerEl) {
      const activeRaw = this._config.color || 'Cyan HOLM';
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
        btn.classList.toggle('active', isActive);
      });
    }

    // 3. Border Slider & Badge
    if (this._borderSliderEl) {
      this._borderSliderEl.value = String(bw);
    }
    if (this._borderValBadgeEl) {
      this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
    }
  }

  private _render() {
    if (!this._config) return;

    let form = this.querySelector('#form') as any;
    if (!form) {
      const t = useLocalize(this._hass);
      this._lang = getLang(this._hass);
      this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
            title: t('editor.style_title'),
            leftTitle: t('editor.halo_color'),
            borderTitle: t('editor.border_title')
          })}
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, "button", buildSchema(useLocalize(this._hass)));
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
    this._chipsContainerEl = this.querySelector('#chips-grid');
    this._borderSliderEl = this.querySelector('#border-slider-input');
    this._borderValBadgeEl = this.querySelector('#border-val-text');

    // 1. Déclencheur input color natif
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

    // 2. Génération des chips HOLM (Option B)
    if (this._chipsContainerEl) {
      buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
    }

    // 3. Slider de bordure
    this._borderSliderEl?.addEventListener('input', (e: Event) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        this._updateBorderWidth(val);
      }
    });
  }

  private _formMetadata(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    delete data.color;
    delete data.border_width;
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
}
