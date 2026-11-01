/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-button-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-button-card.
 *                    Combine le composant natif <ha-form> pour les métadonnées et un
 *                    panneau Liquid Glass avec médaillon halo interactif, nuancier
 *                    rapide HALO, onglets d'états dynamiques (Activé / Désactivé)
 *                    et curseur d'épaisseur de bordure.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.1
 * 📅 Date         : 2026-11-01
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ✨ v1.5.1 (2026-11-01) : Support complet des couleurs par état (state_colors, color_on,
 *                              color_off) avec onglets dynamiques Activé / Désactivé dans
 *                              le panneau de style Liquid Glass et synchronisation instantanée.
 *   - ✨ v1.5.0 (2026-11-01) : Ajout des sélecteurs pour `linked_entity`, `linked_attribute`,
 *                              `display_format` et configuration de l'action `tap_action`.
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              (`HALO_PALETTE`, `color_default_halo`).
 *   - ✨ v1.2.1 (2026-10-30) : Sélecteur de couleur Mix A+B (Halo Swatch + Nuancier
 *                              rapide HALO 16 teintes) et curseur d'épaisseur de bordure
 *                              (0 à 3 px) côte à côte en grille responsive.
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-button-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloButtonCardConfig } from '../types';
import { HALO_PALETTE, toHexColor, resolveThemeColor } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, selectOptions, stylePanelHtml, borderBadge, buildChips, colorDisplayName } from './editor-common';

type ButtonColorKey = 'color_on' | 'color_off';

interface ButtonStateDef {
  key: ButtonColorKey;
  tk: string;
  icon: string;
  fallback: string;
}

const BUTTON_STATES: ButtonStateDef[] = [
  {
    key: 'color_on',
    tk: 'active',
    icon: 'mdi:toggle-switch',
    fallback: '#26c6da'
  },
  {
    key: 'color_off',
    tk: 'inactive',
    icon: 'mdi:toggle-switch-off-outline',
    fallback: '#64748b'
  }
];

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
  { name: 'state_colors', selector: { boolean: {} } },
  { name: 'linked_entity', selector: { entity: {} } },
  { name: 'linked_attribute', selector: { text: {} } },
  {
    name: 'display_format',
    selector: {
      select: {
        options: selectOptions(t, 'button', [
          ['raw', 'format_raw'],
          ['date_short', 'format_date_short'],
          ['date_long', 'format_date_long'],
          ['date_time_fr', 'format_date_time_fr'],
          ['time_only', 'format_time_only'],
          ['relative', 'format_relative']
        ])
      }
    }
  },
  { name: 'tap_action', selector: { 'ui-action': {} } },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
];

export class HaloButtonCardEditor extends HTMLElement {
  private _config!: HaloButtonCardConfig;
  private _hass!: HomeAssistant;
  private _lang = "en";
  private _activeStateKey: ButtonColorKey = 'color_on';

  // Références DOM Style Panel
  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _stateTitleEl: HTMLElement | null = null;
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

  private _isStateColorsEnabled(): boolean {
    return Boolean(this._config?.state_colors || this._config?.color_on || this._config?.color_off);
  }

  private _getStateDef(key: ButtonColorKey): ButtonStateDef {
    return BUTTON_STATES.find(s => s.key === key) || BUTTON_STATES[0];
  }

  private _getColorHex(key?: ButtonColorKey): string {
    if (this._isStateColorsEnabled()) {
      const activeKey = key || this._activeStateKey;
      if (activeKey === 'color_on') {
        const raw = this._config?.color_on || this._config?.active_color || this._config?.color;
        if (typeof raw === 'string' && (raw.trim().toLowerCase() === 'theme' || raw.trim().toLowerCase() === 'auto')) {
          return resolveThemeColor(this._hass, 'theme', this._config?.theme_entity, '#26c6da');
        }
        return toHexColor(raw, '#26c6da');
      } else {
        const raw = this._config?.color_off || this._config?.inactive_color;
        if (typeof raw === 'string' && (raw.trim().toLowerCase() === 'theme' || raw.trim().toLowerCase() === 'auto')) {
          return resolveThemeColor(this._hass, 'theme', this._config?.theme_entity, '#64748b');
        }
        return toHexColor(raw, '#64748b');
      }
    }

    const raw = this._config?.color || 'Cyan';
    if (typeof raw === 'string' && (raw.trim().toLowerCase() === 'theme' || raw.trim().toLowerCase() === 'auto')) {
      return resolveThemeColor(this._hass, 'theme', this._config?.theme_entity, '#26c6da');
    }
    return toHexColor(raw, '#26c6da');
  }

  private _getColorDisplayName(key?: ButtonColorKey): string {
    if (this._isStateColorsEnabled()) {
      const activeKey = key || this._activeStateKey;
      if (activeKey === 'color_on') {
        const raw = this._config?.color_on || this._config?.active_color || this._config?.color;
        return colorDisplayName(this._hass, raw, 'editor.color_active_theme');
      } else {
        const raw = this._config?.color_off || this._config?.inactive_color;
        return colorDisplayName(this._hass, raw, 'editor.color_default_grey');
      }
    }
    return colorDisplayName(this._hass, this._config?.color, 'editor.color_default_cyan');
  }

  private _updateColor(colorValue: string) {
    if (this._isStateColorsEnabled()) {
      this._config = {
        ...this._config,
        [this._activeStateKey]: colorValue
      };
    } else {
      this._config = {
        ...this._config,
        color: colorValue
      };
    }
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

  private _setActiveState(key: ButtonColorKey) {
    this._activeStateKey = key;
    this._syncStylePanel();
  }

  private _syncStylePanel() {
    if (!this._config) return;
    const isStateMode = this._isStateColorsEnabled();

    // 1. Si mode par état : synchroniser les onglets
    if (isStateMode) {
      BUTTON_STATES.forEach(state => {
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
    }

    const hex = this._getColorHex(isStateMode ? this._activeStateKey : undefined);
    const name = this._getColorDisplayName(isStateMode ? this._activeStateKey : undefined);
    const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;

    // 2. Titre de colonne
    if (this._stateTitleEl) {
      const t = useLocalize(this._hass);
      if (isStateMode) {
        const activeDef = this._getStateDef(this._activeStateKey);
        this._stateTitleEl.textContent = t('editor.state_color', 'state', t(`state.${activeDef.tk}`));
      } else {
        this._stateTitleEl.textContent = t('editor.halo_color');
      }
    }

    // 3. Swatch Circle & Halo (Option A)
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

    // 4. Nuancier rapide Chips (Option B)
    if (this._chipsContainerEl) {
      const activeRaw = isStateMode
        ? this._config[this._activeStateKey]
        : (this._config.color || 'Cyan');
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
        btn.classList.toggle('active', isActive);
      });
    }

    // 5. Border Slider & Badge
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
      const isStateMode = this._isStateColorsEnabled();
      const first = this._getStateDef(this._activeStateKey);

      this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
            title: isStateMode ? t('editor.style_title_colors') : t('editor.style_title'),
            tabs: isStateMode ? BUTTON_STATES.map(s => ({
              key: s.key,
              icon: s.icon,
              label: t(`state.${s.tk}`),
              active: s.key === this._activeStateKey
            })) : undefined,
            leftTitle: isStateMode
              ? t('editor.state_color', 'state', t(`state.${first.tk}`))
              : t('editor.halo_color'),
            borderTitle: isStateMode
              ? t('editor.border_title_single')
              : t('editor.border_title')
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
    this._stateTitleEl = this.querySelector('#state-title');
    this._chipsContainerEl = this.querySelector('#chips-grid');
    this._borderSliderEl = this.querySelector('#border-slider-input');
    this._borderValBadgeEl = this.querySelector('#border-val-text');

    // 1. Clics sur les onglets d'états
    if (this._isStateColorsEnabled()) {
      BUTTON_STATES.forEach(s => {
        this.querySelector(`#tab-${s.key}`)?.addEventListener('click', () => {
          this._setActiveState(s.key);
        });
      });
    }

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

    // 3. Génération des chips HALO (Option B)
    if (this._chipsContainerEl) {
      buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
    }

    // 4. Slider de bordure
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
    delete data.color_on;
    delete data.color_off;
    delete data.active_color;
    delete data.inactive_color;
    delete data.border_width;
    data.state_colors = this._isStateColorsEnabled();
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;

    const oldStateColors = this._isStateColorsEnabled();
    const newStateColors = Boolean(ev.detail.value.state_colors);

    this._config = {
      ...this._config,
      ...ev.detail.value
    };

    // Si bascule de l'option Couleurs par état, réinitialiser la vue pour afficher/masquer les onglets
    if (oldStateColors !== newStateColors) {
      if (newStateColors) {
        if (!this._config.color_on) this._config.color_on = this._config.color || 'Cyan';
        if (!this._config.color_off) this._config.color_off = '#64748b';
      }
      this.innerHTML = '';
      this._render();
      this._fireConfigChanged();
      return;
    }

    this._fireConfigChanged();
  }
}
