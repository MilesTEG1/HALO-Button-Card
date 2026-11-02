/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-counter-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-counter-card.
 *                    Combine le composant natif <ha-form> (mode Volets / Ouvertures,
 *                    entité de groupe, options d'affichage du compteur et des pastilles
 *                    nominatives) et le panneau Liquid Glass de personnalisation des
 *                    teintes d'états et d'épaisseur de bordure.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.6.0-beta.4
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.6.0-beta.4 (2026-11-02) : Création initiale de l'éditeur visuel pour
 *                                     custom:halo-counter-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloCounterCardConfig } from '../types';
import { toHexColor } from '../core/theme-helper';
import { COMMON_EDITOR_STYLES } from './editor-styles';
import { useLocalize, getLang } from '../localize/localize';
import { applyFormI18n, selectOptions, stylePanelHtml, borderBadge, buildChips, colorDisplayName } from './editor-common';

type CounterColorKey = 'color_closed' | 'color_open' | 'color_partial' | 'color_moving';

interface CounterStateDef {
  key: CounterColorKey;
  tk: string;
  icon: string;
  fallback: string;
  stateEntityKey: string;
}

const COUNTER_STATES: CounterStateDef[] = [
  {
    key: 'color_closed',
    tk: 'closed',
    icon: 'mdi:window-shutter',
    fallback: '#FFB69C',
    stateEntityKey: 'input_text.couleur_volet_ferme'
  },
  {
    key: 'color_open',
    tk: 'open',
    icon: 'mdi:window-shutter-open',
    fallback: '#96E1FF',
    stateEntityKey: 'input_text.couleur_volet_ouvert'
  },
  {
    key: 'color_partial',
    tk: 'partial',
    icon: 'mdi:window-shutter-cog',
    fallback: '#38bdf8',
    stateEntityKey: 'input_text.couleur_volet_partiel'
  },
  {
    key: 'color_moving',
    tk: 'moving',
    icon: 'mdi:alert-circle',
    fallback: '#f59e0b',
    stateEntityKey: 'input_text.couleur_volet_en_mouvement'
  }
];

const buildSchema = (t: ReturnType<typeof useLocalize>) => [
  {
    name: 'mode',
    selector: {
      select: {
        mode: 'dropdown',
        options: selectOptions(t, 'counter', [
          ['auto', 'mode_auto'],
          ['cover', 'mode_cover'],
          ['binary', 'mode_binary']
        ])
      }
    }
  },
  { name: 'entity', selector: { entity: { domain: ['cover', 'binary_sensor', 'group'] } } },
  { name: 'name', selector: { text: {} } },
  { name: 'counter_label', selector: { text: {} } },
  { name: 'ok_text', selector: { text: {} } },
  { name: 'show_counter', selector: { boolean: {} } },
  { name: 'show_details', selector: { boolean: {} } }
];

export class HaloCounterCardEditor extends HTMLElement {
  private _config!: HaloCounterCardConfig;
  private _hass!: HomeAssistant;
  private _lang = 'en';
  private _activeStateKey: CounterColorKey = 'color_closed';

  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _stateTitleEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;
  private _borderSliderEl: HTMLInputElement | null = null;
  private _borderValBadgeEl: HTMLElement | null = null;

  public setConfig(config: HaloCounterCardConfig) {
    const isBinary = config?.mode === 'binary'
      || (!config?.mode && config?.entity?.startsWith('binary_sensor.'));
    this._config = {
      mode: 'auto',
      border_width: 1.25,
      show_counter: isBinary ? false : true,
      show_details: isBinary ? true : false,
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

  private _getStateDef(key: CounterColorKey): CounterStateDef {
    return COUNTER_STATES.find(s => s.key === key) || COUNTER_STATES[0];
  }

  private _getStateFallback(key: CounterColorKey): string {
    const def = this._getStateDef(key);
    const isBinary = this._config?.mode === 'binary'
      || (this._config?.mode !== 'cover' && this._config?.entity?.startsWith('binary_sensor.'));
    if (isBinary) {
      if (key === 'color_closed') return '#10b981';
      if (key === 'color_open') return '#f43f5e';
      if (key === 'color_moving') return '#f59e0b';
    }
    const states = this._hass?.states || {};
    return states[def.stateEntityKey]?.state || def.fallback;
  }

  private _getColorHex(key: CounterColorKey): string {
    const raw = this._config?.[key];
    const fallback = this._getStateFallback(key);
    return toHexColor(raw, fallback);
  }

  private _getColorDisplayName(key: CounterColorKey): string {
    return colorDisplayName(this._hass, this._config?.[key], 'editor.color_default_halo');
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

  private _setActiveState(key: CounterColorKey) {
    this._activeStateKey = key;
    this._syncStylePanel();
  }

  private _syncStylePanel() {
    if (!this._config) return;

    COUNTER_STATES.forEach(state => {
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

    const activeDef = this._getStateDef(this._activeStateKey);
    const activeHex = this._getColorHex(this._activeStateKey);
    const activeName = this._getColorDisplayName(this._activeStateKey);

    if (this._stateTitleEl) {
      this._stateTitleEl.textContent = useLocalize(this._hass)(
        'editor.state_color',
        'state',
        useLocalize(this._hass)(`state.${activeDef.tk}`)
      );
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

    if (this._chipsContainerEl) {
      const activeRaw = this._config[this._activeStateKey];
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = chipName === activeRaw || chipHex?.toLowerCase() === activeHex.toLowerCase();
        btn.classList.toggle('active', isActive);
      });
    }

    const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.25;
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
    delete data.color_closed;
    delete data.color_open;
    delete data.color_partial;
    delete data.color_moving;
    delete data.color_unavail;
    return data;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this._config || !ev.detail.value) return;
    const prevMode = this._config.mode;
    const nextVal = ev.detail.value;
    this._config = {
      ...this._config,
      ...nextVal
    };
    if (nextVal.mode && nextVal.mode !== prevMode) {
      if (nextVal.mode === 'cover') {
        this._config.show_counter = true;
        this._config.show_details = false;
      } else if (nextVal.mode === 'binary') {
        this._config.show_counter = false;
        this._config.show_details = true;
      }
      const form = this.querySelector('#form') as any;
      if (form) form.data = this._formMetadata();
    }
    this._syncStylePanel();
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
            tabs: COUNTER_STATES.map(s => ({
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
        applyFormI18n(form, this._hass, 'counter', buildSchema(useLocalize(this._hass)));
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

    COUNTER_STATES.forEach(s => {
      this.querySelector(`#tab-${s.key}`)?.addEventListener('click', () => {
        this._setActiveState(s.key);
      });
    });

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

    if (this._chipsContainerEl) {
      buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
    }

    this._borderSliderEl?.addEventListener('input', (e: Event) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        this._updateBorderWidth(val);
      }
    });
  }
}
