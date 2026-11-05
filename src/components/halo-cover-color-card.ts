/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-cover-color-card.ts
 * 📝 Description   : Composant Web custom:halo-cover-color-card.
 *                    Carte de personnalisation des couleurs d'états des volets (2x2)
 *                    avec en-tête séparateur néon, pastilles lumineuses Liquid Glass,
 *                    codes hexadécimaux et roue de sélection chromatique interactive
 *                    (Color Wheel Canvas, curseur tactile, slider luminosité,
 *                    nuancier rapide HALO 16 teintes et sauvegarde directe input_text).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 2.0.0
 * 📅 Date         : 2026-11-05
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🎨 v2.0.0 (2026-11-05) : Intégration de la roue chromatique interactive :
 *                              1) Remplacement du menu austère standard hass-more-info
 *                                 par une boîte modale Liquid Glass avec roue Canvas HSV/HSL.
 *                              2) Curseur tactile/souris fluide 60fps sur le disque couleur.
 *                              3) Curseur de luminosité dynamique et pipette native intégrée.
 *                              4) Nuancier rapide officiel HALO (16 teintes emblématiques).
 *                              5) Application et synchronisation immédiate via input_text.set_value.
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO (`localizeHalo`).
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de la carte cover color.
 * ==============================================================================
 */

import { HomeAssistant, HaloCoverColorCardConfig } from '../types';
import {
  HALO_PALETTE,
  resolveThemeColor,
  hexToHsl,
  hslToHex,
  hslToRgb
} from '../core/theme-helper';
import { fireHaptic } from '../core/action-handler';
import { useLocalize, localizeHalo } from '../localize/localize';

interface StateTileDef {
  key: 'closed' | 'partial' | 'open' | 'moving';
  titleKey: string;
  defaultEntity: string;
  defaultHex: string;
  defaultIcon: string;
}

const TILE_DEFINITIONS: StateTileDef[] = [
  {
    key: 'closed',
    titleKey: 'cover_color.closed',
    defaultEntity: 'input_text.couleur_volet_ferme',
    defaultHex: '#E2E8F0',
    defaultIcon: 'mdi:window-shutter'
  },
  {
    key: 'partial',
    titleKey: 'cover_color.partial',
    defaultEntity: 'input_text.couleur_volet_partiel',
    defaultHex: '#38BDF8',
    defaultIcon: 'mdi:window-shutter-open'
  },
  {
    key: 'open',
    titleKey: 'cover_color.open',
    defaultEntity: 'input_text.couleur_volet_ouvert',
    defaultHex: '#2F86FF',
    defaultIcon: 'mdi:window-shutter-open'
  },
  {
    key: 'moving',
    titleKey: 'cover_color.moving',
    defaultEntity: 'input_text.couleur_volet_en_mouvement',
    defaultHex: '#F59E0B',
    defaultIcon: 'mdi:swap-vertical'
  }
];

const PRESET_HALO_COLORS: Array<{ name: string; hex: string }> = [
  { name: 'Cyan', hex: '#26c6da' },
  { name: 'Bleu Céleste', hex: '#38bdf8' },
  { name: 'Saphir Océan', hex: '#2f86ff' },
  { name: 'Menthe Givrée', hex: '#00e5a3' },
  { name: 'Émeraude', hex: '#10b981' },
  { name: 'Vert Lime', hex: '#84cc16' },
  { name: 'Jaune Soleil', hex: '#facc15' },
  { name: 'Ambre Doré', hex: '#f59e0b' },
  { name: 'Orange Flamme', hex: '#ff5a1f' },
  { name: 'Corail Pêche', hex: '#fb923c' },
  { name: 'Rose Rubis', hex: '#f43f5e' },
  { name: 'Rose Bonbon', hex: '#f472b6' },
  { name: 'Fuchsia Néon', hex: '#d946ef' },
  { name: 'Améthyste', hex: '#a855f7' },
  { name: 'Violet Nuit', hex: '#8b5cf6' },
  { name: 'Blanc Glace', hex: '#e2e8f0' }
];

export class HaloCoverColorCard extends HTMLElement {
  private _config!: HaloCoverColorCardConfig;
  private _hass!: HomeAssistant;

  private get _t() {
    return useLocalize(this._hass);
  }
  private _root: ShadowRoot;

  // Persistent DOM references (Main Card)
  private _containerEl: HTMLElement | null = null;
  private _headerIconEl: HTMLElement | null = null;
  private _headerTitleEl: HTMLElement | null = null;
  private _headerLineEl: HTMLElement | null = null;
  private _tilesContainerEl: HTMLElement | null = null;

  // Persistent DOM references (Color Wheel Modal)
  private _backdropEl: HTMLElement | null = null;
  private _dialogEl: HTMLElement | null = null;
  private _dialogBadgeEl: HTMLElement | null = null;
  private _dialogIconEl: HTMLElement | null = null;
  private _dialogTitleEl: HTMLElement | null = null;
  private _dialogSubtitleEl: HTMLElement | null = null;
  private _wheelContainerEl: HTMLElement | null = null;
  private _wheelCanvasEl: HTMLCanvasElement | null = null;
  private _wheelCursorEl: HTMLElement | null = null;
  private _brightnessSliderEl: HTMLInputElement | null = null;
  private _sliderValTextEl: HTMLElement | null = null;
  private _previewSwatchEl: HTMLElement | null = null;
  private _previewHexEl: HTMLElement | null = null;
  private _nativePickerEl: HTMLInputElement | null = null;
  private _chipsGridEl: HTMLElement | null = null;
  private _btnApplyEl: HTMLElement | null = null;
  private _btnCancelEl: HTMLElement | null = null;
  private _btnCloseEl: HTMLElement | null = null;

  // Active state for color picker
  private _activeDef: StateTileDef | null = null;
  private _currentHue: number = 190;
  private _currentSat: number = 70;
  private _currentLightness: number = 50;
  private _currentHex: string = '#26c6da';
  private _isDragging: boolean = false;
  private _cachedCanvasLightness: number = -1;

  // Wheel canvas geometry
  private readonly _wheelSize: number = 200;
  private readonly _wheelRadius: number = 100;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-cover-color-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      icon: 'mdi:window-shutter-cog'
    };
  }

  public setConfig(config: HaloCoverColorCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-cover-color-card');
    }
    this._config = {
      icon: 'mdi:window-shutter-cog',
      ...config
    };
    if (this._hass) {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!this._containerEl) {
      this._render();
      return;
    }

    if (this._hasChanged(oldHass, hass)) {
      this._render();
    }
  }

  public getCardSize(): number {
    return 3;
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    for (const def of TILE_DEFINITIONS) {
      const entKey = `${def.key}_entity` as keyof HaloCoverColorCardConfig;
      const entityId = (this._config[entKey] as string) || def.defaultEntity;
      if (oldHass.states[entityId] !== newHass.states[entityId]) {
        return true;
      }
    }

    // Thème général
    const commonThemeEntities = [
      'input_select.couleur_theme_ouvertures',
      'input_select.couleur_theme_eclairages',
      'input_select.couleur_theme_global'
    ];
    for (const te of commonThemeEntities) {
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    return false;
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 0;
          position: relative;
        }

        /* Header Separator */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .header-icon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-2px);
          flex-shrink: 0;
        }
        .header-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
        }
        .header-title {
          color: #e6f2f5;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.2px;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .header-line {
          flex: 1;
          height: 2px;
          min-height: 2px;
          border-radius: 2px;
          transition: background 0.3s ease;
        }

        /* 2x2 Grid */
        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px 12px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Single Color Tile */
        .color-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px;
          padding: 8px 10px;
          min-height: 48px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .color-tile:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .color-tile:active {
          transform: scale(0.97);
        }

        .tile-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .color-dot {
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 50%;
          border: 1.25px solid rgba(255, 255, 255, 0.40);
          flex-shrink: 0;
          display: inline-block;
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .tile-texts {
          display: flex;
          flex-direction: column;
          text-align: left;
          min-width: 0;
        }
        .tile-title {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-hex {
          font-size: 11px;
          font-weight: 600;
          font-family: monospace;
          letter-spacing: 0.5px;
          line-height: 1.2;
          margin-top: 1px;
        }

        .tile-sub-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          flex-shrink: 0;
          transition: background 0.2s ease;
        }
        .color-tile:hover .tile-sub-btn {
          background: rgba(255, 255, 255, 0.16);
        }
        .tile-sub-btn ha-icon {
          --mdc-icon-size: 16px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ====================================================================
           🎨 Modal Color Wheel Picker (Liquid Glass)
           ==================================================================== */
        .color-picker-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.24s ease;
          padding: 16px;
          box-sizing: border-box;
        }
        .color-picker-backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .color-picker-dialog {
          background: linear-gradient(145deg, rgba(20, 28, 38, 0.96), rgba(10, 15, 22, 0.98));
          border: 1.5px solid var(--accent-color, #26c6da);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 28px var(--accent-glow, rgba(38, 198, 218, 0.35)), inset 0 1px 0 rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 18px 20px;
          width: 100%;
          max-width: 330px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transform: scale(0.90) translateY(8px);
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: #e6f2f5;
        }
        .color-picker-backdrop.open .color-picker-dialog {
          transform: scale(1) translateY(0);
        }

        /* Dialog Header */
        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .dialog-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .dialog-badge {
          width: 32px;
          height: 32px;
          min-width: 32px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dialog-badge ha-icon {
          --mdc-icon-size: 20px;
          width: 20px;
          height: 20px;
        }
        .dialog-title-wrap {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .dialog-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dialog-subtitle {
          font-size: 11px;
          font-family: monospace;
          color: rgba(220, 235, 240, 0.65);
          line-height: 1.2;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dialog-close-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.10);
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .dialog-close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }
        .dialog-close-btn ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
        }

        /* Wheel Container */
        .wheel-section {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 4px 0;
        }
        .wheel-canvas-container {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          cursor: crosshair;
          touch-action: none;
        }
        .wheel-canvas {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 8px rgba(0, 0, 0, 0.4);
          display: block;
        }
        .wheel-cursor {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.8), inset 0 0 2px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          transform: translate(-50%, -50%);
          left: 100px;
          top: 100px;
          box-sizing: border-box;
          transition: border-color 0.15s ease;
        }

        /* Brightness Slider */
        .slider-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: rgba(220, 235, 240, 0.85);
        }
        .slider-val {
          font-family: monospace;
          color: #ffffff;
        }
        .halo-slider {
          width: 100%;
          height: 10px;
          border-radius: 6px;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
          margin: 0;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .halo-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #0f172a;
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }
        .halo-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #0f172a;
          box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
          cursor: pointer;
        }

        /* Color Preview Row */
        .color-preview-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .preview-swatch-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .preview-swatch {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          display: inline-block;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        .preview-hex {
          font-family: monospace;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .preview-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pipette-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          cursor: pointer;
          color: #ffffff;
          transition: background 0.2s ease;
        }
        .pipette-btn:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .pipette-btn ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          pointer-events: none;
        }
        .hidden-native-picker {
          position: absolute;
          inset: 0;
          opacity: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        /* Chips Grid (HALO 16 Palette) */
        .chips-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
        }
        .chips-title {
          font-size: 11px;
          font-weight: 600;
          color: rgba(220, 235, 240, 0.65);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chips-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 6px;
          width: 100%;
        }
        .halo-chip {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          cursor: pointer;
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          box-sizing: border-box;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .halo-chip:hover {
          transform: scale(1.22);
          box-shadow: 0 0 10px currentColor;
          z-index: 2;
        }
        .halo-chip:active {
          transform: scale(0.95);
        }

        /* Dialog Footer */
        .dialog-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 4px;
        }
        .dialog-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .dialog-btn:active {
          transform: scale(0.96);
        }
        .btn-cancel {
          background: transparent;
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .btn-cancel:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }
        .btn-apply {
          background: var(--accent-color, #26c6da);
          color: #ffffff;
          box-shadow: 0 0 14px var(--accent-glow, rgba(38, 198, 218, 0.4));
        }
        .btn-apply:hover {
          filter: brightness(1.15);
        }
      </style>

      <div class="wrapper" id="container">
        <!-- Main Header -->
        <div class="header">
          <div class="header-icon">
            <ha-icon id="header-icon"></ha-icon>
          </div>
          <span class="header-title" id="header-title"></span>
          <div class="header-line" id="header-line"></div>
        </div>

        <!-- 2x2 Tiles Grid -->
        <div class="grid-container" id="tiles-container"></div>
      </div>

      <!-- Color Wheel Dialog (Liquid Glass Modal) -->
      <div class="color-picker-backdrop" id="picker-backdrop">
        <div class="color-picker-dialog" id="picker-dialog">
          <!-- Dialog Header -->
          <div class="dialog-header">
            <div class="dialog-header-left">
              <div class="dialog-badge" id="dialog-badge">
                <ha-icon id="dialog-icon"></ha-icon>
              </div>
              <div class="dialog-title-wrap">
                <span class="dialog-title" id="dialog-title"></span>
                <span class="dialog-subtitle" id="dialog-subtitle"></span>
              </div>
            </div>
            <button class="dialog-close-btn" id="dialog-btn-close" type="button" title="${this._t('cover_color.cancel') || 'Fermer'}">
              <ha-icon icon="mdi:close"></ha-icon>
            </button>
          </div>

          <!-- Color Wheel Canvas Section -->
          <div class="wheel-section">
            <div class="wheel-canvas-container" id="wheel-container">
              <canvas id="wheel-canvas" width="200" height="200" class="wheel-canvas"></canvas>
              <div class="wheel-cursor" id="wheel-cursor"></div>
            </div>
          </div>

          <!-- Brightness Slider Section -->
          <div class="slider-section">
            <div class="slider-header">
              <span>${this._t('cover_color.brightness') || 'Luminosité'}</span>
              <span class="slider-val" id="slider-val-text">50%</span>
            </div>
            <input type="range" min="10" max="92" value="50" step="1" id="brightness-slider" class="halo-slider" />
          </div>

          <!-- Current Color Swatch & Native Pipette -->
          <div class="color-preview-row">
            <div class="preview-swatch-wrap">
              <span class="preview-swatch" id="preview-swatch"></span>
              <span class="preview-hex" id="preview-hex"></span>
            </div>
            <div class="preview-actions">
              <label class="pipette-btn" title="${this._t('cover_color.native_picker') || 'Ouvrir la pipette / sélecteur natif'}">
                <ha-icon icon="mdi:eyedropper"></ha-icon>
                <input type="color" id="native-color-picker" class="hidden-native-picker" />
              </label>
            </div>
          </div>

          <!-- Quick HALO 16 Palette Chips -->
          <div class="chips-section">
            <span class="chips-title">${this._t('cover_color.halo_presets') || 'Nuancier officiel HALO'}</span>
            <div class="chips-grid" id="halo-chips-grid"></div>
          </div>

          <!-- Dialog Footer Actions -->
          <div class="dialog-footer">
            <button class="dialog-btn btn-cancel" id="dialog-btn-cancel" type="button">
              ${this._t('cover_color.cancel') || 'Annuler'}
            </button>
            <button class="dialog-btn btn-apply" id="dialog-btn-apply" type="button">
              ${this._t('cover_color.apply') || 'Appliquer'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind DOM References
    this._containerEl = this._root.getElementById('container');
    this._headerIconEl = this._root.getElementById('header-icon');
    this._headerTitleEl = this._root.getElementById('header-title');
    this._headerLineEl = this._root.getElementById('header-line');
    this._tilesContainerEl = this._root.getElementById('tiles-container');

    this._backdropEl = this._root.getElementById('picker-backdrop');
    this._dialogEl = this._root.getElementById('picker-dialog');
    this._dialogBadgeEl = this._root.getElementById('dialog-badge');
    this._dialogIconEl = this._root.getElementById('dialog-icon');
    this._dialogTitleEl = this._root.getElementById('dialog-title');
    this._dialogSubtitleEl = this._root.getElementById('dialog-subtitle');
    this._wheelContainerEl = this._root.getElementById('wheel-container');
    this._wheelCanvasEl = this._root.getElementById('wheel-canvas') as HTMLCanvasElement;
    this._wheelCursorEl = this._root.getElementById('wheel-cursor');
    this._brightnessSliderEl = this._root.getElementById('brightness-slider') as HTMLInputElement;
    this._sliderValTextEl = this._root.getElementById('slider-val-text');
    this._previewSwatchEl = this._root.getElementById('preview-swatch');
    this._previewHexEl = this._root.getElementById('preview-hex');
    this._nativePickerEl = this._root.getElementById('native-color-picker') as HTMLInputElement;
    this._chipsGridEl = this._root.getElementById('halo-chips-grid');
    this._btnApplyEl = this._root.getElementById('dialog-btn-apply');
    this._btnCancelEl = this._root.getElementById('dialog-btn-cancel');
    this._btnCloseEl = this._root.getElementById('dialog-btn-close');

    this._bindDialogEvents();
    this._buildHaloChips();
  }

  private _bindDialogEvents() {
    // Backdrop click outside to close
    this._backdropEl?.addEventListener('click', (e) => {
      if (e.target === this._backdropEl) {
        this._closeColorModal();
      }
    });

    this._btnCloseEl?.addEventListener('click', () => this._closeColorModal());
    this._btnCancelEl?.addEventListener('click', () => this._closeColorModal());
    this._btnApplyEl?.addEventListener('click', () => this._applyColor());

    // Wheel canvas pointer interaction
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this._isDragging = true;
      this._handleWheelPointer(e);
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!this._isDragging) return;
      e.preventDefault();
      this._handleWheelPointer(e);
    };

    const onPointerUp = () => {
      if (this._isDragging) {
        this._isDragging = false;
      }
    };

    this._wheelContainerEl?.addEventListener('mousedown', onPointerDown);
    this._wheelContainerEl?.addEventListener('touchstart', onPointerDown, { passive: false });

    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    // Brightness Slider
    this._brightnessSliderEl?.addEventListener('input', () => {
      const val = parseInt(this._brightnessSliderEl!.value, 10);
      this._handleBrightnessChange(val);
    });

    // Native color picker (eyedropper)
    this._nativePickerEl?.addEventListener('input', () => {
      const val = this._nativePickerEl!.value;
      if (val) {
        this._setColorFromHex(val);
      }
    });
  }

  private _buildHaloChips() {
    if (!this._chipsGridEl) return;
    this._chipsGridEl.innerHTML = '';

    PRESET_HALO_COLORS.forEach(preset => {
      const chip = document.createElement('div');
      chip.className = 'halo-chip';
      chip.style.backgroundColor = preset.hex;
      chip.style.color = preset.hex;
      chip.setAttribute('title', `${localizeHalo(this._hass, preset.name)} (${preset.hex})`);
      chip.addEventListener('click', () => {
        fireHaptic('selection');
        this._setColorFromHex(preset.hex);
      });
      this._chipsGridEl!.appendChild(chip);
    });
  }

  private _handleWheelPointer(e: MouseEvent | TouchEvent) {
    if (!this._wheelCanvasEl) return;
    const rect = this._wheelCanvasEl.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const radius = this._wheelRadius;
    const dx = x - radius;
    const dy = y - radius;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const sat = Math.min(100, Math.round((Math.min(dist, radius) / radius) * 100));
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const hue = Math.round(angle);

    this._currentHue = hue;
    this._currentSat = sat;
    this._syncColorFromHsl();
  }

  private _handleBrightnessChange(lightness: number) {
    this._currentLightness = Math.max(10, Math.min(92, lightness));
    this._syncColorFromHsl(true);
  }

  private _setColorFromHex(hex: string) {
    const cleanHex = hex.trim().startsWith('#') ? hex.trim() : '#' + hex.trim();
    const [h, s, l] = hexToHsl(cleanHex);
    this._currentHue = h;
    this._currentSat = s;
    this._currentLightness = Math.max(10, Math.min(92, l));
    this._syncColorFromHsl(true);
  }

  private _syncColorFromHsl(redrawWheel: boolean = false) {
    this._currentHex = hslToHex(this._currentHue, this._currentSat, this._currentLightness);

    // Update wheel canvas if lightness changed
    if (redrawWheel || this._cachedCanvasLightness !== this._currentLightness) {
      this._drawWheelCanvas();
    }

    // Update cursor position on the wheel
    this._updateCursorPosition();

    // Update UI elements in modal
    if (this._sliderValTextEl) {
      this._sliderValTextEl.textContent = `${this._currentLightness}%`;
    }
    if (this._brightnessSliderEl && parseInt(this._brightnessSliderEl.value, 10) !== this._currentLightness) {
      this._brightnessSliderEl.value = String(this._currentLightness);
    }
    if (this._brightnessSliderEl) {
      const pureHueHex = hslToHex(this._currentHue, 100, 50);
      this._brightnessSliderEl.style.background = `linear-gradient(to right, #000000, ${pureHueHex}, #ffffff)`;
    }
    if (this._previewSwatchEl) {
      this._previewSwatchEl.style.backgroundColor = this._currentHex;
      this._previewSwatchEl.style.boxShadow = `0 0 12px ${this._currentHex}99`;
    }
    if (this._previewHexEl) {
      this._previewHexEl.textContent = this._currentHex.toUpperCase();
      this._previewHexEl.style.color = this._currentHex;
    }
    if (this._dialogEl) {
      this._dialogEl.style.setProperty('--accent-color', this._currentHex);
      this._dialogEl.style.setProperty('--accent-glow', `${this._currentHex}55`);
    }
    if (this._dialogBadgeEl) {
      this._dialogBadgeEl.style.borderColor = `${this._currentHex}66`;
      this._dialogBadgeEl.style.boxShadow = `0 0 10px ${this._currentHex}55`;
    }
    if (this._dialogIconEl) {
      this._dialogIconEl.style.color = this._currentHex;
    }
    if (this._nativePickerEl) {
      this._nativePickerEl.value = this._currentHex;
    }
  }

  private _drawWheelCanvas() {
    if (!this._wheelCanvasEl) return;
    const ctx = this._wheelCanvasEl.getContext('2d');
    if (!ctx) return;

    const size = this._wheelSize;
    const radius = this._wheelRadius;
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const lightness = this._currentLightness;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;

        if (dist <= radius) {
          const sat = Math.min(100, (dist / radius) * 100);
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const rgb = hslToRgb(angle, sat, lightness);
          let alpha = 255;
          if (dist > radius - 1.2) {
            alpha = Math.max(0, Math.min(255, Math.round(255 * (radius - dist) / 1.2)));
          }

          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = alpha;
        } else {
          data[idx + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    this._cachedCanvasLightness = lightness;
  }

  private _updateCursorPosition() {
    if (!this._wheelCursorEl) return;
    const rad = (this._currentHue * Math.PI) / 180;
    const r = (this._currentSat / 100) * this._wheelRadius;
    const cx = this._wheelRadius + r * Math.cos(rad);
    const cy = this._wheelRadius + r * Math.sin(rad);

    this._wheelCursorEl.style.left = `${cx}px`;
    this._wheelCursorEl.style.top = `${cy}px`;
    this._wheelCursorEl.style.backgroundColor = this._currentHex;
  }

  private _openColorModal(def: StateTileDef) {
    this._activeDef = def;
    const currentHex = this._getTileHex(def);
    const [h, s, l] = hexToHsl(currentHex);

    this._currentHue = h;
    this._currentSat = s;
    this._currentLightness = Math.max(10, Math.min(92, l));
    this._currentHex = currentHex;

    const titleKey = `${def.key}_name` as keyof HaloCoverColorCardConfig;
    const iconKey = `${def.key}_icon` as keyof HaloCoverColorCardConfig;
    const entKey = `${def.key}_entity` as keyof HaloCoverColorCardConfig;

    const tileTitle = (this._config[titleKey] as string) || this._t(def.titleKey);
    const tileIcon = (this._config[iconKey] as string) || def.defaultIcon;
    const entityId = (this._config[entKey] as string) || def.defaultEntity;

    if (this._dialogTitleEl) {
      this._dialogTitleEl.textContent = tileTitle;
    }
    if (this._dialogSubtitleEl) {
      this._dialogSubtitleEl.textContent = entityId;
    }
    if (this._dialogIconEl) {
      this._dialogIconEl.setAttribute('icon', tileIcon);
    }

    this._syncColorFromHsl(true);

    if (this._backdropEl) {
      this._backdropEl.classList.add('open');
    }
  }

  private _closeColorModal() {
    if (this._backdropEl) {
      this._backdropEl.classList.remove('open');
    }
    this._activeDef = null;
    this._isDragging = false;
  }

  private async _applyColor() {
    if (!this._activeDef || !this._hass) {
      this._closeColorModal();
      return;
    }

    const def = this._activeDef;
    const entKey = `${def.key}_entity` as keyof HaloCoverColorCardConfig;
    const entityId = (this._config[entKey] as string) || def.defaultEntity;

    fireHaptic('medium');

    try {
      await this._hass.callService('input_text', 'set_value', {
        entity_id: entityId,
        value: this._currentHex
      });
    } catch (err) {
      console.error('Erreur lors de la mise à jour de couleur volet:', err);
    }

    this._closeColorModal();
  }

  private _getTileHex(def: StateTileDef): string {
    const entKey = `${def.key}_entity` as keyof HaloCoverColorCardConfig;
    const defKey = `${def.key}_default_color` as keyof HaloCoverColorCardConfig;
    const entityId = (this._config[entKey] as string) || def.defaultEntity;
    const defaultColor = (this._config[defKey] as string) || def.defaultHex;

    let hex = this._hass?.states?.[entityId]?.state || defaultColor;
    if (typeof hex === 'string') {
      hex = hex.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      return hex;
    }
    return defaultColor;
  }

  private _handleTileClick(def: StateTileDef) {
    fireHaptic('light');
    this._openColorModal(def);
  }

  private _render() {
    if (!this._config) return;
    if (!this._containerEl) {
      this._buildDom();
    }

    const title = this._config.title || this._t('cover_color.title');
    const icon = this._config.icon || 'mdi:window-shutter-cog';
    const headerColor = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity || 'input_select.couleur_theme_ouvertures',
      '#26c6da'
    );

    // Header
    if (this._headerIconEl) {
      if (this._headerIconEl.getAttribute('icon') !== icon) {
        this._headerIconEl.setAttribute('icon', icon);
      }
      this._headerIconEl.style.color = headerColor;
    }
    if (this._headerTitleEl) {
      this._headerTitleEl.textContent = title;
    }
    if (this._headerLineEl) {
      this._headerLineEl.style.background = `linear-gradient(90deg, ${headerColor} 0%, ${headerColor}44 60%, transparent 100%)`;
    }

    // Grid Tiles
    if (this._tilesContainerEl) {
      this._tilesContainerEl.innerHTML = '';

      TILE_DEFINITIONS.forEach(def => {
        const titleKey = `${def.key}_name` as keyof HaloCoverColorCardConfig;
        const iconKey = `${def.key}_icon` as keyof HaloCoverColorCardConfig;

        const tileTitle = (this._config[titleKey] as string) || this._t(def.titleKey);
        const tileIcon = (this._config[iconKey] as string) || def.defaultIcon;
        const hex = this._getTileHex(def);

        const tileEl = document.createElement('div');
        tileEl.className = 'color-tile';
        tileEl.style.background = `linear-gradient(135deg, ${hex}26, rgba(15, 23, 36, 0.88))`;
        tileEl.style.border = `1.25px solid ${hex}`;
        tileEl.style.boxShadow = `0 0 14px ${hex}55, inset 0 1px 0 rgba(255, 255, 255, 0.15)`;

        tileEl.innerHTML = `
          <div class="tile-left">
            <span class="color-dot" style="background: ${hex}; box-shadow: 0 0 10px ${hex}88;"></span>
            <div class="tile-texts">
              <span class="tile-title">${tileTitle}</span>
              <span class="tile-hex" style="color: ${hex};">${hex.toUpperCase()}</span>
            </div>
          </div>
          <div class="tile-sub-btn">
            <ha-icon icon="${tileIcon}" style="color: ${hex};"></ha-icon>
          </div>
        `;

        tileEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this._handleTileClick(def);
        });

        this._tilesContainerEl!.appendChild(tileEl);
      });
    }
  }
}