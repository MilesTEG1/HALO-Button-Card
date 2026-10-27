/**
 * HALO Button Card — Halo Separator Card Component
 * Sleek section divider with neon gradient line and HOLM styling.
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloSeparatorCardConfig } from '../types';
import { resolveThemeColor } from '../core/theme-helper';

export class HaloSeparatorCard extends HTMLElement {
  private _config!: HaloSeparatorCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

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
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    this._render();
  }

  public getCardSize(): number {
    return 1;
  }

  private _render() {
    if (!this._config) return;

    const name = this._config.name || this._config.title || 'Section';
    const icon = this._config.icon || 'mdi:bookmark';
    const col = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity,
      '#26c6da'
    );

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
          color: ${col};
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
          background: linear-gradient(90deg, ${col} 0%, ${col}44 60%, transparent 100%);
          transition: background 0.3s ease;
        }
      </style>
      <div class="halo-separator">
        <div class="halo-separator-icon">
          <ha-icon icon="${icon}"></ha-icon>
        </div>
        <span class="halo-separator-title">${name}</span>
        <div class="halo-separator-line"></div>
      </div>
    `;
  }
}
