/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-cover-color-card.ts
 * 📝 Description   : Composant Web custom:halo-cover-color-card.
 *                    Carte de personnalisation des couleurs d'états des volets (2x2),
 *                    avec en-tête séparateur, pastilles lumineuses, codes hexadécimaux
 *                    et sous-boutons d'icônes d'état (alignement pixel-perfect capture).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.4.2
 * 📅 Date         : 2026-10-31
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              (`localizeHalo`).
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de la carte cover color.
 * ==============================================================================
 */

import { HomeAssistant, HaloCoverColorCardConfig } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';
import { fireHaptic, fireEvent } from '../core/action-handler';
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

export class HaloCoverColorCard extends HTMLElement {
  private _config!: HaloCoverColorCardConfig;
  private _hass!: HomeAssistant;

  private get _t() {
    return useLocalize(this._hass);
  }
  private _root: ShadowRoot;

  // Persistent DOM references
  private _containerEl: HTMLElement | null = null;
  private _headerIconEl: HTMLElement | null = null;
  private _headerTitleEl: HTMLElement | null = null;
  private _headerLineEl: HTMLElement | null = null;
  private _tilesContainerEl: HTMLElement | null = null;

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
          filter: brightness(1.08);
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
        }
        .tile-sub-btn ha-icon {
          --mdc-icon-size: 16px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="wrapper" id="container">
        <div class="header">
          <div class="header-icon">
            <ha-icon id="header-icon"></ha-icon>
          </div>
          <span class="header-title" id="header-title"></span>
          <div class="header-line" id="header-line"></div>
        </div>

        <div class="grid-container" id="tiles-container"></div>
      </div>
    `;

    this._containerEl = this._root.getElementById('container');
    this._headerIconEl = this._root.getElementById('header-icon');
    this._headerTitleEl = this._root.getElementById('header-title');
    this._headerLineEl = this._root.getElementById('header-line');
    this._tilesContainerEl = this._root.getElementById('tiles-container');
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
    const entKey = `${def.key}_entity` as keyof HaloCoverColorCardConfig;
    const entityId = (this._config[entKey] as string) || def.defaultEntity;
    fireHaptic('light');
    fireEvent(this, 'hass-more-info', { entityId });
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
