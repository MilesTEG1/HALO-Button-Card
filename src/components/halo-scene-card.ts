/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-scene-card.ts
 * 📝 Description   : Composant Web custom:halo-scene-card.
 *                    Tuile d'ambiance et de préréglages visuels (Lumières & Volets)
 *                    Liquid Glass avec halo néon spéculaire réactif, feedback haptique,
 *                    bascule extinction au re-clic et déclenchement multi-cibles direct.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.6.0-beta.2
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ✨ v1.6.0-beta.2 (2026-11-02) : Améliorations ergonomiques de la tuile d'ambiance :
 *                                     1) Retrait par défaut de la pastille compteur de cibles
 *                                        (show_badge: false par défaut) pour dégager la lecture.
 *                                     2) Extinction des lumières commandées lors d'un second clic
 *                                        sur une tuile déjà active (toggle_on_reclick: true par défaut).
 *                                     3) Typographie compacte multi-lignes sans troncature en layout
 *                                        vertical, hauteur uniforme des cartes en grille (height: 100%)
 *                                        et options title_size / label_size / min_height.
 *   - 🩹 v1.5.1 (2026-11-01) : Ajout du cycle de vie connectedCallback pour restaurer les interactions
 *                              après reconnexion DOM sans changement d'état.
 *   - 🆕 v1.5.0 (2026-11-01) : Création initiale de la carte d'ambiance custom:halo-scene-card :
 *                              - Déclenchement multi-cibles (light & cover) en mode individuel ou harmonisé.
 *                              - Réglages de luminosité (%), température (Kelvin), couleur (RGB) et volets (%).
 *                              - Design System Liquid Glass avec animation d'activation lumineuse.
 *                              - Absence totale de scripts intermédiaires dans Home Assistant.
 * ==============================================================================
 */

import { HomeAssistant, HaloSceneCardConfig } from '../types';
import { resolveThemeColor } from '../core/theme-helper';
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
  private _badgeWrapEl: HTMLElement | null = null;
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
      toggle_on_reclick: true,
      show_badge: false,
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
      toggle_on_reclick: true,
      show_badge: false,
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

  public connectedCallback() {
    if (this._cardEl && !this._unbindCardTouch) {
      this._bindInteractions();
    }
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

    // Changement de thème d'interface ou langue
    if (oldHass.themes !== newHass.themes || oldHass.language !== newHass.language) {
      return true;
    }

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

  /**
   * Détermine si les lumières contrôlées par la scène sont actuellement allumées (`on`).
   */
  private _areSceneLightsActive(): boolean {
    if (!this._hass || !this._config?.targets) return false;

    const activeLightTargets = this._config.targets.filter(t => {
      if (!t.entity) return false;
      const domain = t.domain || t.entity.split('.')[0];
      return domain === 'light' && t.state !== 'off';
    });

    if (activeLightTargets.length === 0) return false;

    return activeLightTargets.some(t => {
      const stateObj = this._hass.states[t.entity];
      return stateObj && stateObj.state === 'on';
    });
  }

  private _formatCssSize(val?: number | string): string {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') return `${val}px`;
    const trimmed = String(val).trim();
    if (!trimmed) return '';
    return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
        }
        ha-card {
          position: relative;
          display: flex;
          height: 100%;
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

        /* Layout Vertical (Tuile carrée / grille d'ambiances) */
        ha-card.layout-vertical {
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 6px;
          gap: 5px;
          min-height: 112px;
        }
        ha-card.layout-vertical .main-icon-btn {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
        }
        ha-card.layout-vertical .text-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 2px;
        }
        ha-card.layout-vertical .badge-container {
          position: absolute;
          top: 8px;
          right: 8px;
        }

        /* Typography */
        .title {
          font-size: 13.5px;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: 0.15px;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        ha-card.layout-vertical .title {
          font-size: 11px;
          text-align: center;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.2;
          width: 100%;
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
          font-size: 9.5px;
          text-align: center;
          white-space: normal;
          overflow: visible;
          text-overflow: clip;
          word-break: break-word;
          overflow-wrap: anywhere;
          line-height: 1.15;
          width: 100%;
        }

        @media (max-width: 480px) {
          ha-card.layout-vertical {
            padding: 8px 4px;
            gap: 4px;
            min-height: 106px;
          }
          ha-card.layout-vertical .main-icon-btn {
            width: 38px;
            height: 38px;
            min-width: 38px;
            border-radius: 10px;
          }
          ha-card.layout-vertical .title {
            font-size: 10.5px;
          }
          ha-card.layout-vertical .subtitle {
            font-size: 9px;
          }
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

        /* Badge indicator (optionnel) */
        .scene-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 22px;
          padding: 0 7px;
          border-radius: 11px;
          font-size: 10.5px;
          font-weight: 600;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .scene-badge ha-icon {
          --mdc-icon-size: 13px;
          width: 13px;
          height: 13px;
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
        <div class="badge-container" id="badge-wrap" style="display: none;">
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
    this._badgeWrapEl = this._root.getElementById('badge-wrap');
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
    const isSceneActive = this._areSceneLightsActive();

    // Classes & Layout
    this._cardEl!.className = `${isVertical ? 'layout-vertical' : 'layout-horizontal'} ${this._isActivating ? 'activating' : ''} ${isSceneActive ? 'scene-active' : ''}`;

    // Hauteur minimale personnalisée éventuelle
    const customMinHeight = this._formatCssSize(this._config.min_height);
    this._cardEl!.style.minHeight = customMinHeight;

    // Card styling (Border & Glowing Specular Halo)
    const bw = (typeof this._config.border_width === 'number' && !isNaN(this._config.border_width))
      ? this._config.border_width
      : 1.5;
    const cardBorder = bw > 0
      ? `${bw}px solid ${isSceneActive ? color : `${color}B3`}`
      : 'none';
    const cardShadow = this._isActivating
      ? `0 0 28px ${color}AA, 0 0 10px ${color}88, inset 0 1px 0 rgba(255, 255, 255, 0.35)`
      : isSceneActive
        ? `0 0 22px ${color}80, 0 0 8px ${color}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
        : `0 0 16px ${color}45, 0 0 5px ${color}30, inset 0 1px 0 rgba(255, 255, 255, 0.14)`;

    this._cardEl!.style.border = cardBorder;
    this._cardEl!.style.boxShadow = cardShadow;

    // Icon button styling
    if (this._iconBtnEl) {
      this._iconBtnEl.style.background = isSceneActive ? `${color}30` : `${color}1A`;
      this._iconBtnEl.style.border = `1px solid ${isSceneActive ? `${color}88` : `${color}40`}`;
      this._iconBtnEl.style.boxShadow = isSceneActive ? `0 0 14px ${color}55` : `0 0 10px ${color}26`;
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
      this._titleEl.style.textAlign = this._config.text_align || (isVertical ? 'center' : 'left');
      this._titleEl.style.fontSize = this._formatCssSize(this._config.title_size);
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
      this._subtitleEl.style.textAlign = this._config.text_align || (isVertical ? 'center' : 'left');
      this._subtitleEl.style.fontSize = this._formatCssSize(this._config.label_size);
    }

    // Pastille compteur : désactivée par défaut (show_badge === true uniquement)
    const showBadge = this._config.show_badge === true;
    if (this._badgeWrapEl && this._badgeEl) {
      const targetsCount = (this._config.targets || []).length;
      if (showBadge && targetsCount > 0) {
        this._badgeWrapEl.style.display = isVertical ? 'block' : 'flex';
        this._badgeEl.style.display = 'inline-flex';
        this._badgeEl.style.background = `${color}20`;
        this._badgeEl.style.border = `1px solid ${color}44`;
        this._badgeEl.style.color = color;
        this._badgeEl.innerHTML = `<ha-icon icon="mdi:check-all"></ha-icon><span>${targetsCount}</span>`;
      } else {
        this._badgeWrapEl.style.display = 'none';
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
      const toggleOnReclick = this._config.toggle_on_reclick !== false;

      // Si le mode bascule au re-clic est actif (par défaut) et qu'au moins une lumière
      // contrôlée par la tuile est déjà allumée, le second clic éteint toutes les lumières de la scène.
      const shouldTurnOffLights = toggleOnReclick && this._areSceneLightsActive();

      if (shouldTurnOffLights) {
        const lightEntityIds = targets
          .filter(t => t.entity && (t.domain || t.entity.split('.')[0]) === 'light')
          .map(t => t.entity);

        for (const entityId of lightEntityIds) {
          await this._hass.callService('light', 'turn_off', {
            entity_id: entityId
          });
        }
        return;
      }

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
