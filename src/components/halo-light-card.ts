/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-light-card.ts
 * 📝 Description   : Composant Web custom:halo-light-card
 *                    Tuile d'éclairage unifiée avec sous-boutons intégrés,
 *                    reproduisant au pixel près la référence tuile_avec_sous_boutons
 *                    (dashboard-eclairage/lights).
 *                    Persistent DOM, zéro scintillement, réactivité instantanée.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.4.2
 * 📅 Date         : 2026-10-31
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              (`localizeHalo`).
 *   - 💡 v1.1.1 (2026-10-29) : Hauteur de carte calibrée à 64px constants (padding
 *                              9px 12px) et centrage vertical absolu des icônes
 *                              des sous-boutons (luminosité, kelvin, power toggle).
 *   - 💡 v1.1.0 (2026-10-29) : Alignement 1:1 strict avec tuile_avec_sous_boutons
 *                              (layout grid 44px 1fr auto auto auto, sous-boutons
 *                              sub_brightness, sub_kelvin, sub_toggle).
 *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card.
 * ==============================================================================
 */

import { HomeAssistant, HaloLightCardConfig, HassEntity } from '../types';
import {
  isDimmable,
  supportsColorTemp,
  getBrightnessPct,
  getKelvin,
  getNextBrightnessPct,
  getNextKelvin,
  formatKelvinShort,
  formatLightStatus,
  getLightAccentColor,
  getLightCardStyles
} from '../core/light-helper';
import { useLocalize, localizeHalo } from '../localize/localize';

export class HaloLightCard extends HTMLElement {
  private _config!: HaloLightCardConfig;
  private _hass!: HomeAssistant;

  private get _t() {
    return useLocalize(this._hass);
  }
  private _root: ShadowRoot;

  // Persistent DOM references
  private _cardEl: HTMLElement | null = null;
  private _unavailEl: HTMLElement | null = null;
  private _mainIconBtnEl: HTMLElement | null = null;
  private _mainIconEl: HTMLElement | null = null;
  private _nameEl: HTMLElement | null = null;
  private _labelEl: HTMLElement | null = null;
  private _subBrightnessEl: HTMLElement | null = null;
  private _subBrightnessIconEl: HTMLElement | null = null;
  private _subBrightnessLabelEl: HTMLElement | null = null;
  private _subKelvinEl: HTMLElement | null = null;
  private _subKelvinIconEl: HTMLElement | null = null;
  private _subKelvinLabelEl: HTMLElement | null = null;
  private _subToggleEl: HTMLElement | null = null;
  private _subToggleIconEl: HTMLElement | null = null;

  // Hold timer for card hold action
  private _cardHoldTimer: any = null;
  private _cardIsHold = false;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-light-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      entity: 'light.salon'
    };
  }

  public setConfig(config: HaloLightCardConfig) {
    if (!config || !config.entity) {
      throw new Error('Please define a valid light entity (e.g. light.mon_ampoule)');
    }
    this._config = config;
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
    return 2;
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;
    const id = this._config.entity;
    if (!id) return true;

    // Entité de la lumière
    if (oldHass.states[id] !== newHass.states[id]) return true;

    // Entité de sous-toggle si distincte
    if (this._config.sub_toggle_entity) {
      const ste = this._config.sub_toggle_entity;
      if (oldHass.states[ste] !== newHass.states[ste]) return true;
    }

    // Entité de thème spécifique si configurée
    if (this._config.theme_entity) {
      const te = this._config.theme_entity;
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    // Sélecteur de thème d'éclairages global HALO
    const commonThemeEntities = [
      'input_select.couleur_theme_eclairages',
      'input_select.couleur_theme_eclairage',
      'input_select.couleur_theme_global'
    ];
    for (const te of commonThemeEntities) {
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    return false;
  }

  private _fireEvent(type: string, detail: any) {
    const event = new CustomEvent(type, {
      bubbles: true,
      composed: true,
      detail: detail
    });
    this.dispatchEvent(event);
  }

  private _fireHaptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'failure' | 'success') {
    const event = new CustomEvent('haptic', {
      bubbles: true,
      composed: true,
      detail: type
    });
    window.dispatchEvent(event);
  }

  // --- Gestionnaires d'actions ---

  private _handleMoreInfo(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id) return;
    this._fireHaptic('light');
    this._fireEvent('hass-more-info', { entityId: id });
  }

  private _handleMainIconToggle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;
    this._fireHaptic('light');
    this._hass.callService('light', 'toggle', { entity_id: id });
  }

  private _handleSubToggle(e: Event) {
    e.stopPropagation();
    const id = this._config.sub_toggle_entity || this._config.entity;
    if (!id || !this._hass) return;
    this._fireHaptic('light');
    const domain = id.split('.')[0] || 'light';
    this._hass.callService(domain, 'toggle', { entity_id: id });
  }

  private _handleBrightnessCycle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;

    const entity = this._hass.states[id];
    const isOn = entity?.state === 'on';
    const currentPct = getBrightnessPct(entity);
    const nextPct = getNextBrightnessPct(currentPct, isOn);

    this._fireHaptic('light');
    this._hass.callService('light', 'turn_on', {
      entity_id: id,
      brightness_pct: nextPct
    });
  }

  private _handleKelvinCycle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;

    const entity = this._hass.states[id];
    const isOn = entity?.state === 'on';
    const currentK = getKelvin(entity);
    const nextK = getNextKelvin(currentK, isOn);

    this._fireHaptic('light');
    this._hass.callService('light', 'turn_on', {
      entity_id: id,
      color_temp_kelvin: nextK
    });
  }

  // --- Gestion du Hold / Tap sur le conteneur ha-card ---

  private _onCardPointerDown(e: PointerEvent) {
    // Si l'utilisateur clique sur un sous-bouton ou le main-icon, ne pas armer le hold de la carte
    const target = e.target as HTMLElement;
    if (target.closest('.sub-btn') || target.closest('.main-icon-btn') || target.closest('.sub-buttons-container')) {
      return;
    }

    this._cardIsHold = false;
    this._cardHoldTimer = setTimeout(() => {
      this._cardIsHold = true;
      this._fireHaptic('heavy');
      // Hold action de la tuile de référence : toggle
      this._handleMainIconToggle(e);
    }, 500);
  }

  private _onCardPointerUp(e: PointerEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('.sub-btn') || target.closest('.main-icon-btn') || target.closest('.sub-buttons-container')) {
      return;
    }

    if (this._cardHoldTimer) {
      clearTimeout(this._cardHoldTimer);
      this._cardHoldTimer = null;
    }

    if (!this._cardIsHold) {
      // Tap action de la tuile de référence : more-info
      this._handleMoreInfo(e);
    }
  }

  private _onCardPointerCancel() {
    if (this._cardHoldTimer) {
      clearTimeout(this._cardHoldTimer);
      this._cardHoldTimer = null;
    }
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
          --ha-card-border-width: 0px !important;
          --ha-card-box-shadow: none !important;
        }
        ha-card.halo-light-card {
          position: relative;
          display: grid;
          grid-template-areas: "main_icon info actions";
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 0 10px;
          border-radius: 16px;
          padding: 9px 12px;
          height: 64px;
          min-height: 64px;
          box-sizing: border-box;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          cursor: pointer;
          overflow: hidden;
          outline: none;
        }
        ha-card.halo-light-card:hover {
          filter: brightness(1.02);
        }

        /* 1. Main Icon (gauche) */
        .main-icon-btn {
          grid-area: main_icon;
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          transition: all 0.25s ease;
          cursor: pointer;
          box-sizing: border-box;
          outline: none;
        }
        .main-icon-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .main-icon-btn:active {
          transform: translateY(1px) scale(0.96);
        }
        .main-icon-btn ha-icon {
          --mdc-icon-size: 24px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.25s ease;
          pointer-events: none;
        }

        /* 2. Nom & Label (centre) */
        .light-info {
          grid-area: info;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-self: center;
          min-width: 0;
          overflow: hidden;
          cursor: pointer;
        }
        .light-name {
          font-size: 14px;
          font-weight: 600;
          color: #e6f2f5;
          letter-spacing: -0.2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
        }
        .light-label {
          font-size: 12px;
          font-weight: 400;
          color: rgba(220, 235, 240, 0.65);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
          margin-top: 2px;
        }

        /* 3. Conteneur Sous-Boutons (droite) */
        .sub-buttons-container {
          grid-area: actions;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          align-self: center;
          flex-shrink: 0;
        }

        .sub-btn {
          height: 36px;
          border-radius: 10px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.25s ease;
          outline: none;
          user-select: none;
          line-height: 1;
        }
        .sub-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-1px);
        }
        .sub-btn:active {
          transform: translateY(1px) scale(0.96);
        }

        /* Sub Brightness */
        .sub-brightness {
          min-width: 48px;
          padding: 0 6px;
          display: inline-grid;
          grid-template-areas: "i l";
          grid-template-columns: 14px auto;
          align-items: center;
          justify-content: center;
          gap: 0 4px;
          box-shadow: none;
        }
        .sub-brightness ha-icon {
          grid-area: i;
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          margin: auto;
          pointer-events: none;
          transition: color 0.25s ease;
        }
        .sub-brightness span {
          grid-area: l;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          display: flex;
          align-items: center;
          pointer-events: none;
          white-space: nowrap;
          transition: color 0.25s ease;
        }

        /* Sub Kelvin */
        .sub-kelvin {
          min-width: 52px;
          padding: 0 6px;
          display: inline-grid;
          grid-template-areas: "i l";
          grid-template-columns: 14px auto;
          align-items: center;
          justify-content: center;
          gap: 0 4px;
          box-shadow: none;
        }
        .sub-kelvin ha-icon {
          grid-area: i;
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          margin: auto;
          pointer-events: none;
          transition: color 0.25s ease;
        }
        .sub-kelvin span {
          grid-area: l;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          display: flex;
          align-items: center;
          pointer-events: none;
          white-space: nowrap;
          transition: color 0.25s ease;
        }

        /* Sub Toggle */
        .sub-toggle {
          width: 36px;
          min-width: 36px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sub-toggle ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 0;
          margin: auto;
          pointer-events: none;
          transition: color 0.25s ease;
        }

        .unavailable-box {
          display: none;
          padding: 14px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid #f59e0b;
          border-radius: 16px;
          color: #ffffff;
          font-size: 13px;
        }
      </style>

      <div class="unavailable-box" id="unavail-box"></div>

      <ha-card class="halo-light-card" id="card-body">
        <div class="main-icon-btn" id="main-icon-btn" role="button" tabindex="0" title="${this._t('light.toggle')}">
          <ha-icon id="main-icon"></ha-icon>
        </div>

        <div class="light-info" id="light-info" role="button" tabindex="0" title="${this._t('light.details')}">
          <div class="light-name" id="light-name"></div>
          <div class="light-label" id="light-label"></div>
        </div>

        <div class="sub-buttons-container" id="sub-buttons-container">
          <div class="sub-btn sub-brightness" id="sub-brightness" role="button" tabindex="0" title="${this._t('light.cycle_brightness')}">
            <ha-icon icon="mdi:white-balance-sunny" id="sub-brightness-icon"></ha-icon>
            <span id="sub-brightness-label"></span>
          </div>

          <div class="sub-btn sub-kelvin" id="sub-kelvin" role="button" tabindex="0" title="${this._t('light.cycle_kelvin')}">
            <ha-icon icon="mdi:palette-outline" id="sub-kelvin-icon"></ha-icon>
            <span id="sub-kelvin-label"></span>
          </div>

          <div class="sub-btn sub-toggle" id="sub-toggle" role="button" tabindex="0" title="${this._t('light.power')}">
            <ha-icon icon="mdi:power" id="sub-toggle-icon"></ha-icon>
          </div>
        </div>
      </ha-card>
    `;

    // Récupération des références Persistent DOM
    this._cardEl = this._root.getElementById('card-body');
    this._unavailEl = this._root.getElementById('unavail-box');
    this._mainIconBtnEl = this._root.getElementById('main-icon-btn');
    this._mainIconEl = this._root.getElementById('main-icon');
    this._nameEl = this._root.getElementById('light-name');
    this._labelEl = this._root.getElementById('light-label');
    this._subBrightnessEl = this._root.getElementById('sub-brightness');
    this._subBrightnessIconEl = this._root.getElementById('sub-brightness-icon');
    this._subBrightnessLabelEl = this._root.getElementById('sub-brightness-label');
    this._subKelvinEl = this._root.getElementById('sub-kelvin');
    this._subKelvinIconEl = this._root.getElementById('sub-kelvin-icon');
    this._subKelvinLabelEl = this._root.getElementById('sub-kelvin-label');
    this._subToggleEl = this._root.getElementById('sub-toggle');
    this._subToggleIconEl = this._root.getElementById('sub-toggle-icon');

    // Événements sur ha-card (Tap = more-info, Hold = toggle)
    this._cardEl?.addEventListener('pointerdown', (e) => this._onCardPointerDown(e));
    this._cardEl?.addEventListener('pointerup', (e) => this._onCardPointerUp(e));
    this._cardEl?.addEventListener('pointercancel', () => this._onCardPointerCancel());

    // Événement Info (Clic = more-info)
    this._root.getElementById('light-info')?.addEventListener('click', (e) => this._handleMoreInfo(e));

    // Événement Main Icon (Clic = toggle)
    this._mainIconBtnEl?.addEventListener('click', (e) => this._handleMainIconToggle(e));

    // Événements Sous-boutons
    this._subBrightnessEl?.addEventListener('click', (e) => this._handleBrightnessCycle(e));
    this._subKelvinEl?.addEventListener('click', (e) => this._handleKelvinCycle(e));
    this._subToggleEl?.addEventListener('click', (e) => this._handleSubToggle(e));
  }

  private _render() {
    if (!this._config || !this._hass) return;
    if (!this._cardEl) {
      this._buildDom();
    }

    const id = this._config.entity;
    const entity = this._hass.states[id] as HassEntity | undefined;

    if (!entity) {
      if (this._unavailEl) {
        this._unavailEl.textContent = this._t('light.not_found', 'id', id);
        this._unavailEl.style.display = 'block';
      }
      if (this._cardEl) {
        this._cardEl.style.display = 'none';
      }
      return;
    }

    if (this._unavailEl) this._unavailEl.style.display = 'none';
    if (this._cardEl) this._cardEl.style.display = 'grid';

    const attrs = entity.attributes || {};
    const st = entity.state;
    const isUnavail = st === 'unavailable' || st === 'unknown';
    const isOn = st === 'on';

    const dimmable = isDimmable(entity);
    const colorTempSupported = supportsColorTemp(entity);
    const currentPct = getBrightnessPct(entity);
    const currentKelvin = getKelvin(entity);

    const accentCol = getLightAccentColor(this._hass, this._config, entity);
    const cardStyles = getLightCardStyles(accentCol, isOn, isUnavail, this._config.border_width);

    // 1. Mise à jour de ha-card (fond, bordure, box-shadow)
    if (this._cardEl) {
      if (this._cardEl.style.background !== cardStyles.background) {
        this._cardEl.style.background = cardStyles.background;
      }
      if (this._cardEl.style.border !== cardStyles.border) {
        this._cardEl.style.border = cardStyles.border;
      }
      if (this._cardEl.style.boxShadow !== cardStyles.boxShadow) {
        this._cardEl.style.boxShadow = cardStyles.boxShadow;
      }
    }

    // 2. Main Icon Button
    if (this._mainIconBtnEl && this._mainIconEl) {
      let iconBg = 'rgba(255, 255, 255, 0.04)';
      let iconBorder = '1px solid rgba(255, 255, 255, 0.08)';
      let iconShadow = 'none';
      let iconCol = '#94a3b8';

      if (isUnavail) {
        iconBg = 'rgba(245, 158, 11, 0.20)';
        iconBorder = '1px solid rgba(245, 158, 11, 0.50)';
        iconShadow = '0 0 10px rgba(245, 158, 11, 0.40)';
        iconCol = '#f59e0b';
      } else if (isOn) {
        iconBg = `${accentCol}26`;
        iconBorder = `1px solid ${accentCol}66`;
        iconShadow = `0 0 10px ${accentCol}40`;
        iconCol = accentCol;
      }

      if (this._mainIconBtnEl.style.background !== iconBg) this._mainIconBtnEl.style.background = iconBg;
      if (this._mainIconBtnEl.style.border !== iconBorder) this._mainIconBtnEl.style.border = iconBorder;
      if (this._mainIconBtnEl.style.boxShadow !== iconShadow) this._mainIconBtnEl.style.boxShadow = iconShadow;

      let iconName = this._config.icon || attrs.icon;
      if (!iconName) {
        iconName = isUnavail ? 'mdi:alert-circle' : 'mdi:lightbulb';
      }
      if (this._mainIconEl.getAttribute('icon') !== iconName) {
        this._mainIconEl.setAttribute('icon', iconName);
      }
      if (this._mainIconEl.style.color !== iconCol) {
        this._mainIconEl.style.color = iconCol;
      }
    }

    // 3. Nom
    if (this._nameEl) {
      const name = this._config.name || attrs.friendly_name || this._t('light.default_name');
      if (this._nameEl.textContent !== name) {
        this._nameEl.textContent = name;
      }
    }

    // 4. Label (statut textuel "Allumé • 80 % • 2700 K" ou "Éteint")
    if (this._labelEl) {
      const statusText = formatLightStatus(entity, this._t);
      if (this._labelEl.textContent !== statusText) {
        this._labelEl.textContent = statusText;
      }
    }

    // 5. Sous-bouton 1 : Luminosité (%)
    const showBrightness =
      dimmable &&
      this._config.show_brightness !== false &&
      this._config.show_brightness_btn !== false;

    if (this._subBrightnessEl) {
      this._subBrightnessEl.style.display = showBrightness ? 'inline-grid' : 'none';

      if (showBrightness) {
        let bBg = 'rgba(255, 255, 255, 0.04)';
        let bBorder = '1px solid rgba(255, 255, 255, 0.08)';
        let bIconCol = '#64748b';
        let bLabelCol = 'rgba(220, 235, 240, 0.50)';
        let bText = '—';

        if (isOn) {
          bBg = 'rgba(245, 158, 11, 0.16)';
          bBorder = '1px solid rgba(245, 158, 11, 0.40)';
          bIconCol = '#f59e0b';
          bLabelCol = '#fef3c7';
          bText = `${currentPct} %`;
        }

        if (this._subBrightnessEl.style.background !== bBg) this._subBrightnessEl.style.background = bBg;
        if (this._subBrightnessEl.style.border !== bBorder) this._subBrightnessEl.style.border = bBorder;
        if (this._subBrightnessIconEl && this._subBrightnessIconEl.style.color !== bIconCol) {
          this._subBrightnessIconEl.style.color = bIconCol;
        }
        if (this._subBrightnessLabelEl) {
          if (this._subBrightnessLabelEl.style.color !== bLabelCol) this._subBrightnessLabelEl.style.color = bLabelCol;
          if (this._subBrightnessLabelEl.textContent !== bText) this._subBrightnessLabelEl.textContent = bText;
        }
      }
    }

    // 6. Sous-bouton 2 : Température Kelvin (K)
    const showKelvin =
      colorTempSupported &&
      this._config.show_kelvin !== false &&
      this._config.show_temp_btn !== false;

    if (this._subKelvinEl) {
      this._subKelvinEl.style.display = showKelvin ? 'inline-grid' : 'none';

      if (showKelvin) {
        let kBg = 'rgba(255, 255, 255, 0.04)';
        let kBorder = '1px solid rgba(255, 255, 255, 0.08)';
        let kIconCol = '#64748b';
        let kLabelCol = 'rgba(220, 235, 240, 0.50)';
        let kText = '—';

        if (isOn) {
          kBg = 'rgba(249, 115, 22, 0.16)';
          kBorder = '1px solid rgba(249, 115, 22, 0.40)';
          kIconCol = '#f97316';
          kLabelCol = '#ffedd5';
          kText = formatKelvinShort(currentKelvin);
        }

        if (this._subKelvinEl.style.background !== kBg) this._subKelvinEl.style.background = kBg;
        if (this._subKelvinEl.style.border !== kBorder) this._subKelvinEl.style.border = kBorder;
        if (this._subKelvinIconEl && this._subKelvinIconEl.style.color !== kIconCol) {
          this._subKelvinIconEl.style.color = kIconCol;
        }
        if (this._subKelvinLabelEl) {
          if (this._subKelvinLabelEl.style.color !== kLabelCol) this._subKelvinLabelEl.style.color = kLabelCol;
          if (this._subKelvinLabelEl.textContent !== kText) this._subKelvinLabelEl.textContent = kText;
        }
      }
    }

    // 7. Sous-bouton 3 : Power Toggle
    const showToggle =
      this._config.show_toggle !== false &&
      this._config.show_power_btn !== false;

    if (this._subToggleEl) {
      this._subToggleEl.style.display = showToggle ? 'flex' : 'none';

      if (showToggle) {
        // Si sub_toggle_entity est spécifié, vérifier son état propre
        const toggleTargetId = this._config.sub_toggle_entity || id;
        const toggleTargetEntity = this._hass.states[toggleTargetId];
        const isToggleOn = toggleTargetEntity ? toggleTargetEntity.state === 'on' : isOn;

        let tBg = 'rgba(255, 255, 255, 0.04)';
        let tBorder = '1px solid rgba(255, 255, 255, 0.08)';
        let tShadow = 'none';
        let tIconCol = '#64748b';

        if (isToggleOn) {
          tBg = `${accentCol}26`;
          tBorder = `1px solid ${accentCol}66`;
          tShadow = `0 0 10px ${accentCol}40`;
          tIconCol = accentCol;
        }

        if (this._subToggleEl.style.background !== tBg) this._subToggleEl.style.background = tBg;
        if (this._subToggleEl.style.border !== tBorder) this._subToggleEl.style.border = tBorder;
        if (this._subToggleEl.style.boxShadow !== tShadow) this._subToggleEl.style.boxShadow = tShadow;
        if (this._subToggleIconEl && this._subToggleIconEl.style.color !== tIconCol) {
          this._subToggleIconEl.style.color = tIconCol;
        }
      }
    }
  }
}
