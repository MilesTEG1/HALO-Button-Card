/**
 * HALO Button Card — Halo Separator Card Component
 * Sleek section divider with neon gradient line and HOLM styling.
 * High-performance persistent DOM architecture (zero flicker).
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloSeparatorCardConfig } from '../types';
import { resolveThemeColor } from '../core/theme-helper';

export class HaloSeparatorCard extends HTMLElement {
  private _config!: HaloSeparatorCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Persistent DOM references
  private _containerEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _lineEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-separator-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      name: 'Section',
      icon: 'mdi:bookmark'
    };
  }

  public setConfig(config: HaloSeparatorCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = config;
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
    return 1;
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    // Check specific theme entity if bound
    if (this._config.theme_entity) {
      if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
        return true;
      }
    }

    // Check standard global theme helpers
    const themeEntities = [
      'input_select.couleur_theme_ouvertures',
      'input_select.couleur_theme_chauffage',
      'input_select.couleur_theme_eclairage',
      'input_select.couleur_theme_eclairages',
      'input_select.couleur_theme_global'
    ];
    for (const te of themeEntities) {
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    return false;
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .halo-separator {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 0px 6px 0px;
          width: 100%;
          box-sizing: border-box;
          user-select: none;
        }
        .halo-separator-icon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-2px);
          flex-shrink: 0;
        }
        .halo-separator-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        .halo-separator-title {
          color: #e6f2f5;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.2px;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .halo-separator-line {
          flex: 1;
          height: 2px;
          min-height: 2px;
          border-radius: 2px;
          transition: background 0.3s ease;
        }
      </style>
      <div class="halo-separator" id="container">
        <div class="halo-separator-icon">
          <ha-icon id="sep-icon"></ha-icon>
        </div>
        <span class="halo-separator-title" id="sep-title"></span>
        <div class="halo-separator-line" id="sep-line"></div>
      </div>
    `;

    this._containerEl = this._root.getElementById('container');
    this._iconEl = this._root.getElementById('sep-icon');
    this._titleEl = this._root.getElementById('sep-title');
    this._lineEl = this._root.getElementById('sep-line');
  }

  private _render() {
    if (!this._config) return;
    if (!this._containerEl) {
      this._buildDom();
    }

    const name = this._config.name || this._config.title || 'Section';
    const icon = this._config.icon || 'mdi:bookmark';
    const col = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity,
      '#26c6da'
    );

    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      if (this._iconEl.style.color !== col) {
        this._iconEl.style.color = col;
      }
    }

    if (this._titleEl && this._titleEl.textContent !== name) {
      this._titleEl.textContent = name;
    }

    if (this._lineEl) {
      const gradient = `linear-gradient(90deg, ${col} 0%, ${col}44 60%, transparent 100%)`;
      if (this._lineEl.style.background !== gradient) {
        this._lineEl.style.background = gradient;
      }
    }
  }
}
