/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-palette-card.ts
 * 📝 Description   : Composant Web custom:halo-palette-card.
 *                    Sélecteur interactif de la palette officielle des 16 teintes HOLM
 *                    (grille 2x8), avec pastilles lumineuses, bordures de focus,
 *                    badges de sélection ✓ et synchronisation temps-réel input_select.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de la carte nuancier HOLM 16 teintes.
 * ==============================================================================
 */

import { HomeAssistant, HaloPaletteCardConfig } from '../types';
import { HOLM_PALETTE, resolveThemeColor } from '../core/theme-helper';
import { fireHaptic } from '../core/action-handler';

interface ColorEntry {
  name: string;
  hex: string;
}

// Ordonnancement exact 2 colonnes x 8 lignes de la capture 22.00.20
const DEFAULT_PALETTE_ORDER: ColorEntry[] = [
  // Ligne 1
  { name: 'Cyan HOLM', hex: '#26c6da' },
  { name: 'Bleu Céleste', hex: '#38bdf8' },
  // Ligne 2
  { name: 'Saphir Océan', hex: '#2f86ff' },
  { name: 'Menthe Givrée', hex: '#00e5a3' },
  // Ligne 3
  { name: 'Émeraude', hex: '#10b981' },
  { name: 'Vert Lime', hex: '#84cc16' },
  // Ligne 4
  { name: 'Jaune Soleil', hex: '#facc15' },
  { name: 'Ambre Doré', hex: '#f59e0b' },
  // Ligne 5
  { name: 'Orange Flamme', hex: '#ff5a1f' },
  { name: 'Corail Pêche', hex: '#fb923c' },
  // Ligne 6
  { name: 'Rose Rubis', hex: '#f43f5e' },
  { name: 'Rose Bonbon', hex: '#f472b6' },
  // Ligne 7
  { name: 'Fuchsia Néon', hex: '#d946ef' },
  { name: 'Améthyste', hex: '#a855f7' },
  // Ligne 8
  { name: 'Violet Nuit', hex: '#8b5cf6' },
  { name: 'Blanc Glace', hex: '#e2e8f0' }
];

export class HaloPaletteCard extends HTMLElement {
  private _config!: HaloPaletteCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Persistent DOM references
  private _containerEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _headerIconEl: HTMLElement | null = null;
  private _headerTitleEl: HTMLElement | null = null;
  private _headerLineEl: HTMLElement | null = null;
  private _gridEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-palette-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      entity: 'input_select.couleur_theme_eclairages'
    };
  }

  public setConfig(config: HaloPaletteCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-palette-card');
    }
    this._config = {
      entity: 'input_select.couleur_theme_eclairages',
      columns: 2,
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
    return 6;
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
    return oldHass.states[entityId] !== newHass.states[entityId];
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
        }

        /* En-tête optionnel */
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

        /* Grille des pastilles */
        .palette-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 10px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Tuile pastille */
        .palette-tile {
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
        .palette-tile:hover {
          filter: brightness(1.1);
        }
        .palette-tile:active {
          transform: scale(0.97);
        }

        .tile-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tile-dot {
          width: 20px;
          height: 20px;
          min-width: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
          transition: box-shadow 0.25s ease;
        }
        .tile-texts {
          display: flex;
          flex-direction: column;
          text-align: left;
          min-width: 0;
        }
        .tile-name {
          font-size: 13px;
          font-weight: 600;
          color: #e6f2f5;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-hex {
          font-size: 11px;
          font-weight: 500;
          font-family: monospace;
          line-height: 1.2;
          margin-top: 1px;
        }

        .tile-check-slot {
          width: 20px;
          height: 20px;
          min-width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile-check-slot ha-icon {
          --mdc-icon-size: 20px;
          width: 20px;
          height: 20px;
        }
      </style>
      <div class="wrapper" id="container">
        <div class="header" id="header" style="display: none;">
          <div class="header-icon">
            <ha-icon id="header-icon"></ha-icon>
          </div>
          <span class="header-title" id="header-title"></span>
          <div class="header-line" id="header-line"></div>
        </div>

        <div class="palette-grid" id="palette-grid"></div>
      </div>
    `;

    this._containerEl = this._root.getElementById('container');
    this._headerEl = this._root.getElementById('header');
    this._headerIconEl = this._root.getElementById('header-icon');
    this._headerTitleEl = this._root.getElementById('header-title');
    this._headerLineEl = this._root.getElementById('header-line');
    this._gridEl = this._root.getElementById('palette-grid');
  }

  private async _selectColor(colorName: string) {
    const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
    if (!this._hass) return;

    fireHaptic('selection');
    await this._hass.callService('input_select', 'select_option', {
      entity_id: entityId,
      option: colorName
    });
  }

  private _render() {
    if (!this._config) return;
    if (!this._containerEl) {
      this._buildDom();
    }

    const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
    const currentState = this._hass?.states?.[entityId]?.state || 'Cyan HOLM';
    const activeColorHex = HOLM_PALETTE[currentState] || '#26c6da';

    // En-tête optionnel
    if (this._headerEl) {
      if (this._config.title) {
        this._headerEl.style.display = 'flex';
        if (this._headerTitleEl) this._headerTitleEl.textContent = this._config.title;
        const icon = this._config.icon || 'mdi:palette';
        if (this._headerIconEl) {
          if (this._headerIconEl.getAttribute('icon') !== icon) {
            this._headerIconEl.setAttribute('icon', icon);
          }
          this._headerIconEl.style.color = activeColorHex;
        }
        if (this._headerLineEl) {
          this._headerLineEl.style.background = `linear-gradient(90deg, ${activeColorHex} 0%, ${activeColorHex}44 60%, transparent 100%)`;
        }
      } else {
        this._headerEl.style.display = 'none';
      }
    }

    // Grille
    if (this._gridEl) {
      this._gridEl.innerHTML = '';
      const cols = this._config.columns || 2;
      this._gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

      const paletteList = this._config.colors || DEFAULT_PALETTE_ORDER;

      paletteList.forEach(color => {
        const isActive = (currentState === color.name);
        const hex = color.hex;

        const tileEl = document.createElement('div');
        tileEl.className = 'palette-tile';

        if (isActive) {
          tileEl.style.background = `linear-gradient(135deg, ${hex}26, rgba(15, 23, 36, 0.85))`;
          tileEl.style.border = `2px solid ${hex}`;
          tileEl.style.boxShadow = `0 0 14px ${hex}66, inset 0 1px 0 rgba(255, 255, 255, 0.12)`;
        } else {
          tileEl.style.background = `linear-gradient(135deg, ${hex}0D, rgba(15, 23, 36, 0.65))`;
          tileEl.style.border = `1px solid rgba(255, 255, 255, 0.08)`;
          tileEl.style.boxShadow = 'none';
        }

        const checkHtml = isActive
          ? `<ha-icon icon="mdi:check-circle" style="color: ${hex};"></ha-icon>`
          : ``;

        tileEl.innerHTML = `
          <div class="tile-left">
            <span class="tile-dot" style="background: ${hex}; box-shadow: 0 0 10px ${hex}88;"></span>
            <div class="tile-texts">
              <span class="tile-name">${color.name}</span>
              <span class="tile-hex" style="color: ${hex};">${hex.toLowerCase()}</span>
            </div>
          </div>
          <div class="tile-check-slot">
            ${checkHtml}
          </div>
        `;

        tileEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this._selectColor(color.name);
        });

        this._gridEl!.appendChild(tileEl);
      });
    }
  }
}
