/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-light-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-light-card.
 *                    Combine le composant natif <ha-form> pour les métadonnées et un
 *                    panneau Liquid Glass avec sélecteur d'états (Allumé, Éteint),
 *                    médaillon halo interactif (Option A), nuancier rapide HOLM
 *                    16 teintes (Option B) et curseur unique d'épaisseur de bordure.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.3.1
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ✨ v1.3.1 (2026-10-30) : Intégration du sélecteur Mix A+B pour les états Allumé
 *                              et Éteint, pastille halo dynamique, nuancier rapide HOLM
 *                              et curseur unique d'épaisseur de bordure.
 *   - 💡 v1.3.0 (2026-10-30) : Ajout du curseur d'épaisseur de bordure (0 à 3 px).
 *   - 💡 v1.1.0 (2026-10-29) : Alignement des sélecteurs sur les sous-boutons HOLM.
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card-editor.
 * ==============================================================================
 */

import { HomeAssistant, HaloLightCardConfig } from '../types';
import { HOLM_PALETTE, toHexColor, resolveThemeColor } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, stylePanelHtml, borderBadge, buildChips, colorDisplayName } from './editor-common';

type LightColorKey = 'color_on' | 'color_off';

interface LightStateDef {
  key: LightColorKey;
  tk: string;
  icon: string;
  fallback: string;
}

const LIGHT_STATES: LightStateDef[] = [
  {
    key: 'color_on',
    tk: 'on',
    icon: 'mdi:lightbulb-on',
    fallback: '#26c6da'
  },
  {
    key: 'color_off',
    tk: 'off',
    icon: 'mdi:lightbulb-off',
    fallback: '#64748b'
  }
];

const buildSchema = (_t: ReturnType<typeof useLocalize>) => [
  { name: 'entity', selector: { entity: { domain: 'light' } } },
  { name: 'name', selector: { text: {} } },
  { name: 'icon', selector: { icon: {} } },
  { name: 'sub_toggle_entity', selector: { entity: {} } },
  { name: 'use_light_color', selector: { boolean: {} } },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'show_brightness', selector: { boolean: {} } },
      { name: 'show_kelvin', selector: { boolean: {} } },
      { name: 'show_toggle', selector: { boolean: {} } }
    ]
  }
];

export class HaloLightCardEditor extends HTMLElement {
  private _config!: HaloLightCardConfig;
  private _hass!: HomeAssistant;
  private _lang = "en";
  private _activeStateKey: LightColorKey = 'color_on';

  // Références DOM
  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _stateTitleEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;
  private _borderSliderEl: HTMLInputElement | null = null;
  private _borderValBadgeEl: HTMLElement | null = null;

  public setConfig(config: HaloLightCardConfig) {
    this._config = {
      use_light_color: false,
      show_brightness: true,
      show_kelvin: true,
      show_toggle: true,
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

  private _getStateDef(key: LightColorKey): LightStateDef {
    return LIGHT_STATES.find(s => s.key === key) || LIGHT_STATES[0];
  }

  private _getStateFallback(key: LightColorKey): string {
    if (key === 'color_on') {
      return resolveThemeColor(
        this._hass,
        undefined,
        this._config?.theme_entity || 'input_select.couleur_theme_eclairages',
        '#26c6da'
      );
    }
    return '#64748b';
  }

  private _getColorHex(key: LightColorKey): string {
    const raw = this._config?.[key];
    const fallback = this._getStateFallback(key);
    return toHexColor(raw, fallback);
  }

  private _getColorDisplayName(key: LightColorKey): string {
    return colorDisplayName(
      this._hass,
      this._config?.[key],
      key === 'color_on' ? 'editor.color_active_theme' : 'editor.color_default_grey'
    );
  }
  private _updateColor(colorValue: string) {
    this._config = {
      ...this._config,
      [this._activeStateKey]: colorValue
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

  private _setActiveState(key: LightColorKey) {
    this._activeStateKey = key;
    this._syncStylePanel();
  }

  private _syncStylePanel() {
    if (!this._config) return;

    // 1. Mise à jour des onglets Allumé / Éteint
    LIGHT_STATES.forEach(state => {
      const tabEl = this.querySelector(`#tab-${state.key}`) as HTMLElement | null;
      const dotEl = this.querySelector(`#tab-dot-${state.key}`) as HTMLElement | null;
      const hex = this._getColorHex(state.key);

      if (tabEl) {
        tabEl.classList.toggle('active', state.key === this._activeStateKey);
      }
      if (dotEl) {
        dotEl.style.backgroundColor = hex;
        dotEl.style.boxShadow = `0 0 6px ${hex}88`;
      }
    });

    // 2. Swatch de l'état actif (Option A)
    const activeDef = this._getStateDef(this._activeStateKey);
    const activeHex = this._getColorHex(this._activeStateKey);
    const activeName = this._getColorDisplayName(this._activeStateKey);

    if (this._stateTitleEl) {
      this._stateTitleEl.textContent = useLocalize(this._hass)('editor.state_color', 'state', useLocalize(this._hass)(`state.${activeDef.tk}`));
    }
    if (this._swatchCircleEl) {
      this._swatchCircleEl.style.background = activeHex;
      this._swatchCircleEl.style.boxShadow = `0 0 12px ${activeHex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
      this._swatchCircleEl.style.borderColor = activeHex;
    }
    if (this._colorInputEl) {
      this._colorInputEl.value = activeHex;
    }
    if (this._swatchNameEl) {
      this._swatchNameEl.textContent = activeName;
    }
    if (this._swatchHexEl) {
      this._swatchHexEl.textContent = activeHex.toUpperCase();
    }

    // 3. Nuancier rapide Chips (Option B)
    if (this._chipsContainerEl) {
      const activeRaw = this._config[this._activeStateKey];
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === activeHex.toLowerCase());
        btn.classList.toggle('active', isActive);
      });
    }

    // 4. Curseur unique d'épaisseur de bordure
    const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;
    if (this._borderSliderEl) {
      this._borderSliderEl.value = String(bw);
    }
    if (this._borderValBadgeEl) {
      this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
    }
  }

  private _formMetadata(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    delete data.border_width;
    delete data.color_on;
    delete data.color_off;
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
    if (!this._config) return;

    let form = this.querySelector('#form') as any;
    if (!form) {
      const t = useLocalize(this._hass);
      this._lang = getLang(this._hass);
      const first = this._getStateDef(this._activeStateKey);
      this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
            title: t('editor.style_title_colors'),
            tabs: LIGHT_STATES.map(s => ({
              key: s.key,
              icon: s.icon,
              label: t(`state.${s.tk}`),
              active: s.key === this._activeStateKey
            })),
            leftTitle: t('editor.state_color', 'state', t(`state.${first.tk}`)),
            borderTitle: t('editor.border_title_single')
          })}
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, "light", buildSchema(useLocalize(this._hass)));
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
    this._stateTitleEl = this.querySelector('#state-title');
    this._chipsContainerEl = this.querySelector('#chips-grid');
    this._borderSliderEl = this.querySelector('#border-slider-input');
    this._borderValBadgeEl = this.querySelector('#border-val-text');

    // 1. Clics sur les onglets d'états
    LIGHT_STATES.forEach(s => {
      this.querySelector(`#tab-${s.key}`)?.addEventListener('click', () => {
        this._setActiveState(s.key);
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

    // 3. Génération des chips HOLM (Option B)
    if (this._chipsContainerEl) {
      buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
    }

    // 4. Slider unique de bordure
    this._borderSliderEl?.addEventListener('input', (e: Event) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        this._updateBorderWidth(val);
      }
    });
  }
}
