/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-scene-card.ts
 * 📝 Description   : Composant Web custom:halo-scene-card.
 *                    Tuile d'ambiance et de préréglages visuels (Lumières & Volets)
 *                    Liquid Glass avec halo néon spéculaire réactif, feedback haptique
 *                    et déclenchement séquentiel multi-cibles direct sans script backend.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.0
 * 📅 Date         : 2026-11-01
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.5.0 (2026-11-01) : Création initiale de la carte d'ambiance custom:halo-scene-card :
 *                              - Déclenchement multi-cibles (light & cover) en mode individuel ou harmonisé.
 *                              - Réglages de luminosité (%), température (Kelvin), couleur (RGB) et volets (%).
 *                              - Design System Liquid Glass avec animation d'activation lumineuse.
 *                              - Absence totale de scripts intermédiaires dans Home Assistant.
 * ==============================================================================
 */

import { HomeAssistant, HaloSceneCardConfig, HaloSceneTargetConfig } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';
import { bindTouchActions, fireHaptic } from '../core/action-handler';

export class HaloSceneCard extends HTMLElement {
  private _config!: HaloSceneCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Références DOM
  private _cardEl: HTMLElement | null = null;
  private _iconBtnEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _textColEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _subtitleEl: HTMLElement | null = null;
  private _badgeEl: HTMLElement | null = null;

  // État d'animation
  private _isActivating = false;
  private _unbindCardTouch: (() => void) | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-scene-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      name: 'Ambiance Soirée',
      label: 'Ambiance tamisée',
      icon: 'mdi:weather-night',
      layout: 'horizontal',
      color: 'Améthyste',
      mode: 'individual',
      targets: []
    };
  }

  public setConfig(config: HaloSceneCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-scene-card');
    }
    this._config = {
      layout: 'horizontal',
      mode: 'individual',
      text_align: config.layout === 'vertical' ? 'center' : 'left',
      targets: [],
      ...config
    };
    if (this._hass) {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!this._cardEl) {
      this._render();
      return;
    }

    if (this._hasChanged(oldHass, hass)) {
      this._render();
    }
  }

  public getCardSize(): number {
    return this._config?.layout === 'vertical' ? 2 : 1;
  }

  public disconnectedCallback() {
    this._cleanupBindings();
  }

  private _cleanupBindings() {
    if (this._unbindCardTouch) {
      this._unbindCardTouch();
      this._unbindCardTouch = null;
    }
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    // Cibles configurées
    if (this._config.targets) {
      for (const target of this._config.targets) {
        if (target.entity && oldHass.states[target.entity] !== newHass.states[target.entity]) {
          return true;
        }
      }
    }

    // Entité de thème
    if (this._config.theme_entity) {
      if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
        return true;
      }
    }

    // Thèmes globaux HALO
    const commonThemeEntities = [
      'input_select.couleur_theme_eclairages',
      'input_select.couleur_theme_ouvertures',
      'input_select.couleur_theme_chauffage',
      'input_select.couleur_theme_global'
    ];
    for (const te of commonThemeEntities) {
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    return false;
  }

  private _getEffectiveColor(): string {
    const explicit = this._config.color || this._config.halo_color || this._config.accent_color;
    if (explicit) {
      return resolveThemeColor(this._hass, explicit, this._config.theme_entity, '#a855f7');
    }

    return resolveThemeColor(
      this._hass,
      undefined,
      this._config.theme_entity || 'input_select.couleur_theme_eclairages',
      '#a855f7'
    );
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
        ha-card {
          position: relative;
          display: flex;
          box-sizing: border-box;
          border-radius: 16px;
          border: 1.5px solid transparent;
          background: linear-gradient(160deg, rgba(20, 28, 38, 0.85), rgba(10, 15, 22, 0.92));
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: border 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.15s ease,
                      filter 0.15s ease;
          overflow: hidden;
          cursor: pointer;
        }
        ha-card:hover {
          filter: brightness(1.06);
        }
        ha-card:active {
          transform: scale(0.985);
        }
        ha-card.activating {
          filter: brightness(1.25);
          transform: scale(0.99);
        }

        /* Layout Horizontal */
        ha-card.layout-horizontal {
          flex-direction: row;
          align-items: center;
          padding: 12px 14px;
          gap: 12px;
          min-height: 64px;
        }
        ha-card.layout-horizontal .main-icon-btn {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        ha-card.layout-horizontal .text-column {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          gap: 2px;
        }
        ha-card.layout-horizontal .badge-container {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        /* Layout Vertical */
        ha-card.layout-vertical {
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 10px 12px 10px;
          gap: 8px;
          min-height: 108px;
        }
        ha-card.layout-vertical .main-icon-btn {
          width: 46px;
          height: 46px;
          min-width: 46px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        ha-card.layout-vertical .text-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 2px;
        }
        ha-card.layout-vertical .badge-container {
          position: absolute;
          top: 10px;
          right: 10px;
        }

        /* Typography */
        .title {
          font-size: 13.5px;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: 0.2px;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        ha-card.layout-vertical .title {
          font-size: 13px;
          text-align: center;
        }

        .subtitle {
          font-size: 11.5px;
          font-weight: 400;
          color: rgba(220, 235, 240, 0.65);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
        }
        ha-card.layout-vertical .subtitle {
          font-size: 10.5px;
          text-align: center;
        }

        /* Icon styling */
        ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.25s ease, transform 0.25s ease;
        }
        ha-card.activating ha-icon {
          transform: scale(1.12);
        }

        /* Badge indicator */
        .scene-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 24px;
          padding: 0 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .scene-badge ha-icon {
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
        }
      </style>

      <ha-card id="card">
        <div class="main-icon-btn" id="icon-btn">
          <ha-icon id="main-icon"></ha-icon>
        </div>
        <div class="text-column" id="text-col">
          <div class="title" id="title"></div>
          <div class="subtitle" id="subtitle"></div>
        </div>
        <div class="badge-container" id="badge-wrap">
          <div class="scene-badge" id="scene-badge"></div>
        </div>
      </ha-card>
    `;

    this._cardEl = this._root.getElementById('card');
    this._iconBtnEl = this._root.getElementById('icon-btn');
    this._iconEl = this._root.getElementById('main-icon');
    this._textColEl = this._root.getElementById('text-col');
    this._titleEl = this._root.getElementById('title');
    this._subtitleEl = this._root.getElementById('subtitle');
    this._badgeEl = this._root.getElementById('scene-badge');
  }

  private _render() {
    if (!this._config) return;
    if (!this._cardEl) {
      this._buildDom();
    }

    const color = this._getEffectiveColor();
    const layout = this._config.layout || 'horizontal';
    const isVertical = layout === 'vertical';

    // Classes & Layout
    this._cardEl!.className = `${isVertical ? 'layout-vertical' : 'layout-horizontal'} ${this._isActivating ? 'activating' : ''}`;

    // Card styling (Border & Glowing Specular Halo)
    const bw = (typeof this._config.border_width === 'number' && !isNaN(this._config.border_width))
      ? this._config.border_width
      : 1.5;
    const cardBorder = bw > 0 ? `${bw}px solid ${color}` : 'none';
    const cardShadow = this._isActivating
      ? `0 0 28px ${color}99, 0 0 10px ${color}80, inset 0 1px 0 rgba(255, 255, 255, 0.35)`
      : `0 0 18px ${color}60, 0 0 6px ${color}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;

    this._cardEl!.style.border = cardBorder;
    this._cardEl!.style.boxShadow = cardShadow;

    // Icon button styling
    if (this._iconBtnEl) {
      this._iconBtnEl.style.background = `${color}1A`;
      this._iconBtnEl.style.border = `1px solid ${color}40`;
      this._iconBtnEl.style.boxShadow = `0 0 10px ${color}30`;
    }

    // Icon
    const icon = this._config.icon || 'mdi:palette-swatch-outline';
    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      this._iconEl.style.color = color;
    }

    // Name / Title
    const title = this._config.name || 'Ambiance HALO';
    if (this._titleEl) {
      this._titleEl.textContent = title;
      if (this._config.text_align) {
        this._titleEl.style.textAlign = this._config.text_align;
      }
    }

    // Subtitle / Targets count & description
    let subtitle = this._config.label || this._config.subtitle;
    if (!subtitle) {
      const targets = this._config.targets || [];
      const lightCount = targets.filter(t => (t.domain || t.entity.split('.')[0]) === 'light').length;
      const coverCount = targets.filter(t => (t.domain || t.entity.split('.')[0]) === 'cover').length;

      const parts: string[] = [];
      if (lightCount > 0) parts.push(`${lightCount} éclairage${lightCount > 1 ? 's' : ''}`);
      if (coverCount > 0) parts.push(`${coverCount} volet${coverCount > 1 ? 's' : ''}`);
      subtitle = parts.length > 0 ? parts.join(' • ') : 'Appuyer pour appliquer';
    }

    if (this._subtitleEl) {
      this._subtitleEl.textContent = subtitle;
      if (this._config.text_align) {
        this._subtitleEl.style.textAlign = this._config.text_align;
      }
    }

    // Badge
    if (this._badgeEl) {
      const targetsCount = (this._config.targets || []).length;
      if (targetsCount > 0) {
        this._badgeEl.style.display = 'inline-flex';
        this._badgeEl.style.background = `${color}20`;
        this._badgeEl.style.border = `1px solid ${color}44`;
        this._badgeEl.style.color = color;
        this._badgeEl.innerHTML = `<ha-icon icon="mdi:check-all"></ha-icon><span>${targetsCount}</span>`;
      } else {
        this._badgeEl.style.display = 'none';
      }
    }

    // Rebind touch gestures
    this._bindInteractions();
  }

  private _bindInteractions() {
    this._cleanupBindings();

    if (this._cardEl) {
      this._unbindCardTouch = bindTouchActions(this._cardEl, {
        onTap: () => {
          this._applyScene();
        }
      });
    }
  }

  private async _applyScene(): Promise<void> {
    if (!this._config || !this._hass) return;

    fireHaptic('medium');
    this._isActivating = true;
    this._render();

    try {
      const targets = this._config.targets || [];
      const mode = this._config.mode || 'individual';

      for (const target of targets) {
        if (!target.entity) continue;

        const domain = target.domain || target.entity.split('.')[0];

        if (domain === 'light') {
          if (target.state === 'off') {
            await this._hass.callService('light', 'turn_off', {
              entity_id: target.entity
            });
          } else {
            const serviceData: Record<string, any> = {
              entity_id: target.entity
            };

            // Mode commun ou individuel
            if (mode === 'common') {
              if (typeof this._config.common_light_brightness === 'number') {
                serviceData.brightness_pct = this._config.common_light_brightness;
              }
              if (typeof this._config.common_light_kelvin === 'number') {
                serviceData.color_temp_kelvin = this._config.common_light_kelvin;
              }
              if (this._config.common_light_rgb) {
                serviceData.rgb_color = this._config.common_light_rgb;
              }
            } else {
              if (typeof target.brightness_pct === 'number') {
                serviceData.brightness_pct = target.brightness_pct;
              }
              if (typeof target.color_temp_kelvin === 'number') {
                serviceData.color_temp_kelvin = target.color_temp_kelvin;
              }
              if (target.rgb_color) {
                serviceData.rgb_color = target.rgb_color;
              }
            }

            await this._hass.callService('light', 'turn_on', serviceData);
          }
        } else if (domain === 'cover') {
          let position: number | undefined;
          if (mode === 'common' && typeof this._config.common_cover_position === 'number') {
            position = this._config.common_cover_position;
          } else if (typeof target.position === 'number') {
            position = target.position;
          }

          if (position !== undefined) {
            await this._hass.callService('cover', 'set_cover_position', {
              entity_id: target.entity,
              position: position
            });
          }
        }
      }
    } catch (err) {
      console.error('[halo-scene-card] Erreur lors de l\'application de la scène :', err);
      fireHaptic('failure');
    } finally {
      setTimeout(() => {
        this._isActivating = false;
        this._render();
      }, 500);
    }
  }
}
