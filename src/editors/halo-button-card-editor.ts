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

const SCHEMA = [
  {
    name: 'name',
    label: 'Titre principal',
    selector: { text: {} }
  },
  {
    name: 'label',
    label: 'Sous-titre / Description',
    selector: { text: {} }
  },
  {
    name: 'icon',
    label: 'Icône MDI',
    selector: { icon: {} }
  },
  {
    name: 'layout',
    label: 'Disposition (Layout)',
    selector: {
      select: {
        options: [
          { value: 'horizontal', label: 'Horizontal (Carte large avec texte à droite)' },
          { value: 'vertical', label: 'Vertical (Carte compacte avec texte centré en dessous)' }
        ]
      }
    }
  },
  {
    name: 'text_align',
    label: 'Alignement du texte',
    selector: {
      select: {
        options: [
          { value: 'left', label: 'Gauche' },
          { value: 'center', label: 'Centré' },
          { value: 'right', label: 'Droite' }
        ]
      }
    }
  },
  {
    name: 'entity',
    label: 'Entité liée (optionnel)',
    selector: { entity: {} }
  },
  {
    name: 'theme_entity',
    label: 'Entité sélecteur de thème (optionnel)',
    selector: { entity: { domain: 'input_select' } }
  }
];

export class HaloButtonCardEditor extends HTMLElement {
  private _config!: HaloButtonCardConfig;
  private _hass!: HomeAssistant;

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
    const raw = this._config?.color;
    if (!raw) return 'Cyan HOLM (Défaut)';
    if (typeof raw === 'string') {
      if (HOLM_PALETTE[raw]) return raw;
      for (const [name, hex] of Object.entries(HOLM_PALETTE)) {
        if (hex.toLowerCase() === raw.toLowerCase()) return name;
      }
      return 'Couleur personnalisée';
    }
    return 'Couleur personnalisée';
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
      let desc = `${bw} px`;
      if (bw === 0) desc = '0 px (Off)';
      else if (bw === 1.5) desc = '1.5 px (Défaut)';
      this._borderValBadgeEl.textContent = desc;
    }
  }

  private _render() {
    if (!this._config) return;

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
              <span>Personnalisation Visuelle (Halo & Bordure)</span>
            </div>

            <div class="halo-style-grid">
              <!-- GAUCHE : Couleur & Nuancier HOLM -->
              <div class="halo-col">
                <div class="halo-col-header">
                  <span class="halo-col-title">Couleur du Halo & Bouton</span>
                </div>

                <!-- Option A : Médaillon Swatch interactif -->
                <div class="halo-swatch-card" id="swatch-card">
                  <div class="halo-swatch-circle-wrap" id="swatch-circle-wrap" title="Ouvrir la palette libre">
                    <div class="halo-swatch-circle" id="swatch-circle"></div>
                    <input type="color" id="native-color-input" class="hidden-color-input" />
                  </div>
                  <div class="halo-swatch-meta">
                    <span class="halo-color-title" id="swatch-name">Cyan HOLM</span>
                    <span class="halo-color-hex" id="swatch-hex">#26C6DA</span>
                  </div>
                  <button type="button" class="halo-pipette-btn" id="pipette-btn" title="Ouvrir la roue chromatique">
                    <ha-icon icon="mdi:eyedropper"></ha-icon>
                  </button>
                </div>

                <!-- Option B : Nuancier rapide HOLM -->
                <div class="halo-chips-label">Nuancier officiel HOLM (Sélection rapide) :</div>
                <div class="halo-chips-grid" id="chips-grid"></div>
              </div>

              <!-- DROITE : Curseur d'épaisseur de bordure -->
              <div class="halo-col">
                <div class="halo-col-header">
                  <span class="halo-col-title">Épaisseur de bordure</span>
                  <span class="halo-badge-val" id="border-val-text">1.5 px</span>
                </div>

                <div class="halo-border-card">
                  <input type="range" id="border-slider-input" min="0" max="3" step="0.25" value="1.5" class="halo-range-slider" />
                  <div class="slider-ticks">
                    <span>0 px<br><small style="opacity: 0.6;">Sans bordure</small></span>
                    <span style="text-align: center;">1.5 px<br><small style="opacity: 0.6;">Défaut</small></span>
                    <span style="text-align: right;">3.0 px<br><small style="opacity: 0.6;">Maxi</small></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      form = this.querySelector('#form') as any;
      if (form) {
        form.schema = SCHEMA;
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
      this._chipsContainerEl.innerHTML = '';
      for (const [name, hex] of Object.entries(HOLM_PALETTE)) {
        const chip = document.createElement('div');
        chip.className = 'halo-chip';
        chip.setAttribute('data-name', name);
        chip.setAttribute('data-hex', hex);
        chip.setAttribute('title', `${name} (${hex})`);
        chip.style.backgroundColor = hex;
        chip.style.color = hex;
        chip.addEventListener('click', () => {
          this._updateColor(name);
        });
        this._chipsContainerEl.appendChild(chip);
      }
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
