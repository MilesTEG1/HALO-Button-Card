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
          .halo-editor-wrap {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 4px 0 12px 0;
            box-sizing: border-box;
          }

          /* Style Panel Container */
          .halo-style-section {
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 14px 16px;
            background: linear-gradient(145deg, rgba(20, 28, 38, 0.70), rgba(10, 15, 22, 0.90));
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            box-sizing: border-box;
          }
          .halo-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13.5px;
            font-weight: 600;
            color: #e2e8f0;
          }
          .halo-section-header ha-icon {
            --mdc-icon-size: 18px;
            color: #26c6da;
          }

          /* 2 Colonnes : Couleur à gauche, Bordure à droite */
          .halo-style-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            align-items: stretch;
          }
          @media (max-width: 520px) {
            .halo-style-grid {
              grid-template-columns: 1fr;
            }
          }

          .halo-col {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
          }
          .halo-col-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 22px;
          }
          .halo-col-title {
            font-size: 12px;
            font-weight: 600;
            color: rgba(226, 232, 240, 0.90);
          }
          .halo-badge-val {
            font-size: 11px;
            font-weight: 700;
            color: #26c6da;
            background: rgba(38, 198, 218, 0.15);
            border: 1px solid rgba(38, 198, 218, 0.35);
            border-radius: 6px;
            padding: 1px 6px;
          }

          /* Option A : Swatch Card & Pipette */
          .halo-swatch-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            min-height: 44px;
            box-sizing: border-box;
          }
          .halo-swatch-circle-wrap {
            position: relative;
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .halo-swatch-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.5);
            box-sizing: border-box;
            transition: transform 0.15s ease, box-shadow 0.25s ease;
          }
          .halo-swatch-circle:hover {
            transform: scale(1.1);
          }
          .hidden-color-input {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            pointer-events: none;
          }
          .halo-swatch-meta {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-width: 0;
          }
          .halo-color-title {
            font-size: 12px;
            font-weight: 600;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.2;
          }
          .halo-color-hex {
            font-size: 10.5px;
            font-family: monospace;
            color: rgba(226, 232, 240, 0.60);
          }
          .halo-pipette-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            color: #e2e8f0;
            cursor: pointer;
            padding: 5px 7px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, transform 0.1s ease;
          }
          .halo-pipette-btn:hover {
            background: rgba(255, 255, 255, 0.16);
            transform: scale(1.05);
          }
          .halo-pipette-btn ha-icon {
            --mdc-icon-size: 16px;
            width: 16px;
            height: 16px;
          }

          /* Option B : Nuancier rapide HOLM */
          .halo-chips-label {
            font-size: 10.5px;
            color: rgba(226, 232, 240, 0.55);
            margin-top: 2px;
          }
          .halo-chips-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .halo-chip {
            width: 20px;
            height: 20px;
            min-width: 20px;
            border-radius: 50%;
            cursor: pointer;
            box-sizing: border-box;
            border: 1.5px solid rgba(255, 255, 255, 0.25);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .halo-chip:hover {
            transform: scale(1.22);
            box-shadow: 0 0 6px currentColor;
          }
          .halo-chip.active {
            transform: scale(1.25);
            border: 2px solid #ffffff;
            box-shadow: 0 0 10px currentColor;
          }

          /* Colonne Droite : Curseur Bordure */
          .halo-border-card {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
            padding: 10px 12px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            height: 100%;
            box-sizing: border-box;
          }
          .halo-range-slider {
            width: 100%;
            height: 6px;
            accent-color: #26c6da;
            cursor: pointer;
            margin: 4px 0;
          }
          .slider-ticks {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: rgba(226, 232, 240, 0.55);
            line-height: 1.2;
          }
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
