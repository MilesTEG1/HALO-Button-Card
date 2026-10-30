/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-button-card.ts
 * 📝 Description   : Composant Web custom:halo-button-card.
 *                    Bouton multi-usage universel Liquid Glass avec halo spéculaire,
 *                    mises en page horizontale/verticale, dissociation d'actions icône/carte,
 *                    et support complet des sous-boutons interactifs.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale de halo-button-card polyvalente.
 * ==============================================================================
 */

import { HomeAssistant, HaloButtonCardConfig, SubButtonConfig, ActionConfig } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';
import { handleAction, bindTouchActions, fireHaptic } from '../core/action-handler';

export class HaloButtonCard extends HTMLElement {
  private _config!: HaloButtonCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Persistent DOM references
  private _cardEl: HTMLElement | null = null;
  private _iconBtnEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _textColEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _subtitleEl: HTMLElement | null = null;
  private _subButtonsContainerEl: HTMLElement | null = null;
  private _subButtonEls: HTMLElement[] = [];

  // Cleanup touch bindings
  private _unbindCardTouch: (() => void) | null = null;
  private _unbindIconTouch: (() => void) | null = null;
  private _unbindSubTouch: Array<() => void> = [];

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-button-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      name: 'Bouton HALO',
      label: 'Description du bouton',
      icon: 'mdi:gesture-tap-button',
      layout: 'horizontal',
      color: 'Cyan HOLM',
      tap_action: {
        action: 'toggle'
      }
    };
  }

  public setConfig(config: HaloButtonCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-button-card');
    }
    this._config = {
      layout: 'horizontal',
      text_align: config.layout === 'vertical' ? 'center' : 'left',
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
    if (this._unbindIconTouch) {
      this._unbindIconTouch();
      this._unbindIconTouch = null;
    }
    this._unbindSubTouch.forEach(fn => fn());
    this._unbindSubTouch = [];
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    // Entité principale
    if (this._config.entity) {
      if (oldHass.states[this._config.entity] !== newHass.states[this._config.entity]) {
        return true;
      }
    }

    // Entité de thème
    if (this._config.theme_entity) {
      if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
        return true;
      }
    }

    // Sous-boutons entités
    if (this._config.sub_buttons) {
      for (const sb of this._config.sub_buttons) {
        if (sb.entity && oldHass.states[sb.entity] !== newHass.states[sb.entity]) {
          return true;
        }
      }
    }

    // Thèmes globaux HOLM
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
      return resolveThemeColor(this._hass, explicit, this._config.theme_entity, '#26c6da');
    }

    // Si entité liée (ex: light ou switch)
    if (this._config.entity && this._hass?.states?.[this._config.entity]) {
      const stateObj = this._hass.states[this._config.entity];
      if (stateObj.state === 'off') {
        return '#94a3b8';
      }
    }

    return resolveThemeColor(
      this._hass,
      undefined,
      this._config.theme_entity || 'input_select.couleur_theme_eclairages',
      '#26c6da'
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
          background: linear-gradient(160deg, rgba(20, 28, 38, 0.85), rgba(10, 15, 22, 0.92));
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.15s ease;
          overflow: hidden;
          cursor: pointer;
        }
        ha-card:active {
          transform: scale(0.985);
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
          cursor: pointer;
        }
        ha-card.layout-horizontal .text-column {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          gap: 2px;
        }
        ha-card.layout-horizontal .sub-buttons-container {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        /* Layout Vertical */
        ha-card.layout-vertical {
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 8px 10px 8px;
          gap: 6px;
          text-align: center;
          min-height: 84px;
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
          cursor: pointer;
        }
        ha-card.layout-vertical .text-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 2px;
        }
        ha-card.layout-vertical .sub-buttons-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          margin-top: 4px;
        }

        /* Typography */
        .title {
          font-size: 14px;
          font-weight: 600;
          color: #e6f2f5;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
          word-break: break-word;
        }
        ha-card.layout-vertical .title {
          font-size: 12px;
          text-align: center;
        }
        .subtitle {
          font-size: 12px;
          color: rgba(220, 235, 240, 0.60);
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
          transition: color 0.25s ease;
        }

        /* Sub-buttons */
        .sub-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          height: 30px;
          min-width: 30px;
          padding: 0 6px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          box-sizing: border-box;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .sub-btn:hover {
          filter: brightness(1.15);
        }
        .sub-btn:active {
          transform: scale(0.94);
        }
        .sub-btn ha-icon {
          --mdc-icon-size: 16px;
          width: 16px;
          height: 16px;
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
        <div class="sub-buttons-container" id="sub-buttons"></div>
      </ha-card>
    `;

    this._cardEl = this._root.getElementById('card');
    this._iconBtnEl = this._root.getElementById('icon-btn');
    this._iconEl = this._root.getElementById('main-icon');
    this._textColEl = this._root.getElementById('text-col');
    this._titleEl = this._root.getElementById('title');
    this._subtitleEl = this._root.getElementById('subtitle');
    this._subButtonsContainerEl = this._root.getElementById('sub-buttons');
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
    this._cardEl!.className = isVertical ? 'layout-vertical' : 'layout-horizontal';

    // Card styling (Border & Glowing Specular Halo)
    this._cardEl!.style.borderColor = `${color}40`;
    this._cardEl!.style.boxShadow = `inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 14px ${color}26`;

    // Icon button styling
    if (this._iconBtnEl) {
      this._iconBtnEl.style.background = `${color}1A`;
      this._iconBtnEl.style.borderColor = `${color}40`;
      this._iconBtnEl.style.border = `1px solid ${color}40`;
      this._iconBtnEl.style.boxShadow = `0 0 10px ${color}30`;
    }

    // Icon
    let icon = this._config.icon;
    if (!icon && this._config.entity && this._hass?.states?.[this._config.entity]) {
      icon = this._hass.states[this._config.entity].attributes?.icon || 'mdi:gesture-tap-button';
    }
    if (!icon) icon = 'mdi:gesture-tap-button';

    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      this._iconEl.style.color = color;
    }

    // Name / Title
    let title = this._config.name || this._config.title;
    if (!title && this._config.entity && this._hass?.states?.[this._config.entity]) {
      title = this._hass.states[this._config.entity].attributes?.friendly_name || this._config.entity;
    }
    if (this._titleEl) {
      this._titleEl.textContent = title || '';
      this._titleEl.style.display = title ? 'block' : 'none';
      if (this._config.text_align) {
        this._titleEl.style.textAlign = this._config.text_align;
      }
    }

    // Subtitle / Label
    const subtitle = this._config.label || this._config.subtitle;
    if (this._subtitleEl) {
      this._subtitleEl.textContent = subtitle || '';
      this._subtitleEl.style.display = subtitle ? 'block' : 'none';
      if (this._config.text_align) {
        this._subtitleEl.style.textAlign = this._config.text_align;
      }
    }

    // Render Sub-buttons
    this._renderSubButtons(color);

    // Rebind touch gestures
    this._bindInteractions();
  }

  private _renderSubButtons(cardColor: string) {
    if (!this._subButtonsContainerEl) return;

    const subButtons = this._config.sub_buttons;
    if (!subButtons || subButtons.length === 0) {
      this._subButtonsContainerEl.style.display = 'none';
      this._subButtonsContainerEl.innerHTML = '';
      this._subButtonEls = [];
      return;
    }

    this._subButtonsContainerEl.style.display = 'flex';
    this._subButtonsContainerEl.innerHTML = '';
    this._subButtonEls = [];

    subButtons.forEach((sb, idx) => {
      const btnEl = document.createElement('div');
      btnEl.className = 'sub-btn';
      btnEl.setAttribute('data-index', String(idx));

      const sbColor = sb.color ? toHexColor(sb.color, cardColor) : cardColor;
      btnEl.style.background = `${sbColor}1A`;
      btnEl.style.border = `1px solid ${sbColor}40`;
      btnEl.style.boxShadow = `0 0 8px ${sbColor}26`;
      btnEl.style.color = sbColor;

      let contentHtml = '';
      if (sb.icon) {
        contentHtml += `<ha-icon icon="${sb.icon}" style="color: ${sbColor};"></ha-icon>`;
      }
      const labelText = sb.badge || sb.name || sb.label;
      if (labelText) {
        contentHtml += `<span>${labelText}</span>`;
      }
      btnEl.innerHTML = contentHtml;

      this._subButtonsContainerEl!.appendChild(btnEl);
      this._subButtonEls.push(btnEl);
    });
  }

  private _bindInteractions() {
    this._cleanupBindings();

    // 1. Actions sur la carte globale
    const cardTapAction = this._config.card_tap_action || this._config.tap_action;
    const cardHoldAction = this._config.card_hold_action || this._config.hold_action;
    const cardDoubleTapAction = this._config.card_double_tap_action || this._config.double_tap_action;

    if (this._cardEl) {
      this._unbindCardTouch = bindTouchActions(this._cardEl, {
        onTap: () => {
          handleAction(this, this._hass, cardTapAction, this._config.entity);
        },
        onHold: cardHoldAction ? () => {
          handleAction(this, this._hass, cardHoldAction, this._config.entity);
        } : undefined,
        onDoubleTap: cardDoubleTapAction ? () => {
          handleAction(this, this._hass, cardDoubleTapAction, this._config.entity);
        } : undefined
      });
    }

    // 2. Actions dissociées sur l'icône principale
    const iconTapAction = this._config.icon_tap_action;
    const iconHoldAction = this._config.icon_hold_action;
    const iconDoubleTapAction = this._config.icon_double_tap_action;

    if (this._iconBtnEl && (iconTapAction || iconHoldAction || iconDoubleTapAction)) {
      this._unbindIconTouch = bindTouchActions(this._iconBtnEl, {
        onTap: () => {
          if (iconTapAction) {
            handleAction(this, this._hass, iconTapAction, this._config.entity);
          } else {
            handleAction(this, this._hass, cardTapAction, this._config.entity);
          }
        },
        onHold: iconHoldAction ? () => {
          handleAction(this, this._hass, iconHoldAction, this._config.entity);
        } : undefined,
        onDoubleTap: iconDoubleTapAction ? () => {
          handleAction(this, this._hass, iconDoubleTapAction, this._config.entity);
        } : undefined
      });

      // Stop propagation pour ne pas déclencher le tap carte
      this._iconBtnEl.addEventListener('pointerdown', (e) => e.stopPropagation());
      this._iconBtnEl.addEventListener('click', (e) => e.stopPropagation());
    }

    // 3. Actions sur les sous-boutons
    if (this._config.sub_buttons && this._subButtonEls.length > 0) {
      this._config.sub_buttons.forEach((sb, idx) => {
        const el = this._subButtonEls[idx];
        if (!el) return;

        el.addEventListener('pointerdown', (e) => e.stopPropagation());
        el.addEventListener('click', (e) => e.stopPropagation());

        const unbind = bindTouchActions(el, {
          onTap: () => {
            const act = sb.tap_action || { action: 'toggle', entity: sb.entity || this._config.entity };
            handleAction(this, this._hass, act, sb.entity || this._config.entity);
          },
          onHold: sb.hold_action ? () => {
            handleAction(this, this._hass, sb.hold_action, sb.entity || this._config.entity);
          } : undefined,
          onDoubleTap: sb.double_tap_action ? () => {
            handleAction(this, this._hass, sb.double_tap_action, sb.entity || this._config.entity);
          } : undefined
        });

        this._unbindSubTouch.push(unbind);
      });
    }
  }
}
