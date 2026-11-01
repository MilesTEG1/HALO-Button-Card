/**
 * ==============================================================================
 * 📌 Nom du fichier : src/editors/halo-scene-card-editor.ts
 * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-scene-card.
 *                    Combine le composant natif <ha-form> pour les métadonnées,
 *                    un panneau de gestion visuelle des cibles (lumières & volets),
 *                    et le panneau de style Liquid Glass HALO (nuancier & bordure).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.0
 * 📅 Date         : 2026-11-01
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.5.0 (2026-11-01) : Création initiale de l'éditeur halo-scene-card :
 *                              - Sélection d'entités cibles (light & cover).
 *                              - Réglages fins individuels ou harmonisés (luminosité, kelvin, position).
 *                              - Style Panel Mix A+B (Halo Swatch + Nuancier 16 teintes + Curseur bordure).
 * ==============================================================================
 */

import { HomeAssistant, HaloSceneCardConfig, HaloSceneTargetConfig } from '../types';
import { toHexColor } from '../core/theme-helper';
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
        options: selectOptions(t, 'scene', [['horizontal', 'layout_horizontal'], ['vertical', 'layout_vertical']])
      }
    }
  },
  {
    name: 'text_align',
    selector: {
      select: {
        options: selectOptions(t, 'scene', [['left', 'align_left'], ['center', 'align_center'], ['right', 'align_right']])
      }
    }
  },
  {
    name: 'mode',
    selector: {
      select: {
        options: selectOptions(t, 'scene', [['individual', 'mode_individual'], ['common', 'mode_common']])
      }
    }
  },
  { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
];

export class HaloSceneCardEditor extends HTMLElement {
  private _config!: HaloSceneCardConfig;
  private _hass!: HomeAssistant;
  private _lang = 'en';

  // Références DOM Style Panel
  private _swatchCircleEl: HTMLElement | null = null;
  private _colorInputEl: HTMLInputElement | null = null;
  private _swatchNameEl: HTMLElement | null = null;
  private _swatchHexEl: HTMLElement | null = null;
  private _chipsContainerEl: HTMLElement | null = null;
  private _borderSliderEl: HTMLInputElement | null = null;
  private _borderValBadgeEl: HTMLElement | null = null;
  private _targetsContainerEl: HTMLElement | null = null;

  public setConfig(config: HaloSceneCardConfig) {
    this._config = {
      layout: 'horizontal',
      mode: 'individual',
      border_width: 1.5,
      targets: [],
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
    const raw = this._config?.color || 'Améthyste';
    return toHexColor(raw, '#a855f7');
  }

  private _getColorDisplayName(): string {
    return colorDisplayName(this._hass, this._config?.color, 'editor.color_default_halo');
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
      const activeRaw = this._config.color || 'Améthyste';
      const chipButtons = this._chipsContainerEl.querySelectorAll<HTMLElement>('.halo-chip');
      chipButtons.forEach(btn => {
        const chipName = btn.getAttribute('data-name');
        const chipHex = btn.getAttribute('data-hex');
        const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
        btn.classList.toggle('active', isActive);
      });
    }

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
          .scene-targets-section {
            margin-top: 16px;
            background: rgba(15, 23, 42, 0.55);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .scene-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #f1f5f9;
          }
          .scene-section-title ha-icon {
            --mdc-icon-size: 18px;
            color: #a855f7;
          }
          .target-card {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .target-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            color: #e2e8f0;
          }
          .target-controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 8px;
          }
          .control-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 11px;
            color: rgba(226, 232, 240, 0.8);
          }
          .control-group input[type="range"] {
            width: 100%;
          }
          .btn-delete-target {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #ef4444;
            border-radius: 6px;
            padding: 2px 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-delete-target:hover {
            background: rgba(239, 68, 68, 0.3);
          }
          .btn-add-target {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(168, 85, 247, 0.15);
            border: 1px solid rgba(168, 85, 247, 0.4);
            color: #c084fc;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-add-target:hover {
            background: rgba(168, 85, 247, 0.25);
            border-color: #c084fc;
          }
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>

          <!-- Section Targets -->
          <div class="scene-targets-section">
            <div class="scene-section-title">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span>${t('editor.scene.targets_title')}</span>
            </div>
            <div id="targets-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            <button type="button" class="btn-add-target" id="btn-add-target">
              <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
              <span>${t('editor.scene.add_target')}</span>
            </button>
          </div>

          ${stylePanelHtml(t, {
            title: t('editor.style_title'),
            leftTitle: t('editor.halo_color'),
            borderTitle: t('editor.border_title')
          })}
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        applyFormI18n(form, this._hass, 'scene', buildSchema(useLocalize(this._hass)));
        form.data = this._formMetadata();
        if (this._hass) form.hass = this._hass;
        form.addEventListener('value-changed', (ev: CustomEvent) => this._valueChanged(ev));
      }

      this._initDomBindings();
    } else {
      form.data = this._formMetadata();
      if (this._hass) form.hass = this._hass;
    }

    this._renderTargets();
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
    this._targetsContainerEl = this.querySelector('#targets-list');

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

    this.querySelector('#btn-add-target')?.addEventListener('click', () => {
      const targets = [...(this._config.targets || [])];
      targets.push({
        entity: '',
        domain: 'light',
        state: 'on',
        brightness_pct: 50
      });
      this._config = { ...this._config, targets };
      this._renderTargets();
      this._fireConfigChanged();
    });
  }

  private _renderTargets() {
    if (!this._targetsContainerEl) return;
    const targets = this._config.targets || [];
    const t = useLocalize(this._hass);

    if (targets.length === 0) {
      this._targetsContainerEl.innerHTML = `
        <div style="font-size: 11.5px; opacity: 0.6; text-align: center; padding: 8px;">
          ${t('editor.scene.no_targets')}
        </div>
      `;
      return;
    }

    this._targetsContainerEl.innerHTML = '';
    targets.forEach((target, index) => {
      const card = document.createElement('div');
      card.className = 'target-card';

      const domain = target.domain || (target.entity ? target.entity.split('.')[0] : 'light');
      const isLight = domain === 'light';
      const isCover = domain === 'cover';

      card.innerHTML = `
        <div class="target-header">
          <span>#${index + 1} — ${target.entity || t('editor.scene.select_entity')}</span>
          <button type="button" class="btn-delete-target" data-index="${index}">
            ✕ ${t('editor.scene.delete')}
          </button>
        </div>
        <div class="control-group">
          <input type="text" class="input-target-entity" data-index="${index}" value="${target.entity || ''}" placeholder="light.salon ou cover.volet" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px; color: #fff; font-size: 11.5px;" />
        </div>
        ${isLight ? `
          <div class="target-controls">
            <div class="control-group">
              <label>Luminosité : <b class="val-brightness">${target.brightness_pct ?? 100}%</b></label>
              <input type="range" class="input-target-brightness" data-index="${index}" min="0" max="100" value="${target.brightness_pct ?? 100}" />
            </div>
            <div class="control-group">
              <label>Température : <b class="val-kelvin">${target.color_temp_kelvin ?? 2700}K</b></label>
              <input type="range" class="input-target-kelvin" data-index="${index}" min="2000" max="6500" step="100" value="${target.color_temp_kelvin ?? 2700}" />
            </div>
          </div>
        ` : ''}
        ${isCover ? `
          <div class="target-controls">
            <div class="control-group">
              <label>Position volet : <b class="val-position">${target.position ?? 100}%</b></label>
              <input type="range" class="input-target-position" data-index="${index}" min="0" max="100" value="${target.position ?? 100}" />
            </div>
          </div>
        ` : ''}
      `;

      // Handlers
      card.querySelector('.btn-delete-target')?.addEventListener('click', () => {
        const updated = [...targets];
        updated.splice(index, 1);
        this._config = { ...this._config, targets: updated };
        this._renderTargets();
        this._fireConfigChanged();
      });

      card.querySelector('.input-target-entity')?.addEventListener('change', (e: Event) => {
        const val = (e.target as HTMLInputElement).value.trim();
        const updated = [...targets];
        const newDomain = val.startsWith('cover.') ? 'cover' : 'light';
        updated[index] = { ...updated[index], entity: val, domain: newDomain };
        this._config = { ...this._config, targets: updated };
        this._renderTargets();
        this._fireConfigChanged();
      });

      card.querySelector('.input-target-brightness')?.addEventListener('input', (e: Event) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        const valEl = card.querySelector('.val-brightness');
        if (valEl) valEl.textContent = `${val}%`;
        const updated = [...targets];
        updated[index] = { ...updated[index], brightness_pct: val };
        this._config = { ...this._config, targets: updated };
        this._fireConfigChanged();
      });

      card.querySelector('.input-target-kelvin')?.addEventListener('input', (e: Event) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        const valEl = card.querySelector('.val-kelvin');
        if (valEl) valEl.textContent = `${val}K`;
        const updated = [...targets];
        updated[index] = { ...updated[index], color_temp_kelvin: val };
        this._config = { ...this._config, targets: updated };
        this._fireConfigChanged();
      });

      card.querySelector('.input-target-position')?.addEventListener('input', (e: Event) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        const valEl = card.querySelector('.val-position');
        if (valEl) valEl.textContent = `${val}%`;
        const updated = [...targets];
        updated[index] = { ...updated[index], position: val };
        this._config = { ...this._config, targets: updated };
        this._fireConfigChanged();
      });

      this._targetsContainerEl.appendChild(card);
    });
  }

  private _formMetadata(): Record<string, any> {
    if (!this._config) return {};
    const data: Record<string, any> = { ...this._config };
    delete data.color;
    delete data.border_width;
    delete data.targets;
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
