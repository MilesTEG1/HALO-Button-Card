/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-light-card.ts
 * 📝 Description   : Composant Web custom:halo-light-card
 *                    Tuile d'éclairage unifiée clé en main avec esthétique HOLM
 *                    Liquid Glass, halo spéculaire dynamique néon, slider horizontal
 *                    interactif de luminosité, micro-boutons adaptatifs et Persistent DOM.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.0.0
 * 📅 Date         : 2026-10-29
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
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
  formatKelvin,
  formatLightStatus,
  getLightAccentColor,
  getLightCardStyles
} from '../core/light-helper';

export class HaloLightCard extends HTMLElement {
  private _config!: HaloLightCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Persistent DOM references
  private _cardEl: HTMLElement | null = null;
  private _unavailEl: HTMLElement | null = null;
  private _badgeEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _infoEl: HTMLElement | null = null;
  private _nameEl: HTMLElement | null = null;
  private _statusEl: HTMLElement | null = null;
  private _sliderWrapperEl: HTMLElement | null = null;
  private _sliderTrackEl: HTMLElement | null = null;
  private _sliderFillEl: HTMLElement | null = null;
  private _sliderThumbEl: HTMLElement | null = null;
  private _btnBrightnessEl: HTMLElement | null = null;
  private _btnBrightnessLabelEl: HTMLElement | null = null;
  private _btnTempEl: HTMLElement | null = null;
  private _btnTempLabelEl: HTMLElement | null = null;
  private _btnPowerEl: HTMLElement | null = null;
  private _btnPowerIconEl: HTMLElement | null = null;

  // Slider dragging state
  private _isDragging = false;
  private _dragPct = 0;

  // Long press timer for badge
  private _holdTimer: any = null;
  private _isLongPress = false;

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

    // Entité de thème spécifique si configurée
    if (this._config.theme_entity) {
      const te = this._config.theme_entity;
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    // Helper de thème d'éclairages global HOLM
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

  private _handleBadgePointerDown(e: PointerEvent) {
    e.stopPropagation();
    this._isLongPress = false;
    this._holdTimer = setTimeout(() => {
      this._isLongPress = true;
      this._fireHaptic('heavy');
      this._fireEvent('hass-more-info', { entityId: this._config.entity });
    }, 500);
  }

  private _handleBadgePointerUp(e: PointerEvent) {
    e.stopPropagation();
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
    if (!this._isLongPress) {
      this._handleToggle(e);
    }
  }

  private _handleBadgePointerCancel(e: PointerEvent) {
    if (this._holdTimer) {
      clearTimeout(this._holdTimer);
      this._holdTimer = null;
    }
  }

  private _handleInfoTap(e: Event) {
    e.stopPropagation();
    this._fireEvent('hass-more-info', { entityId: this._config.entity });
  }

  private _handleToggle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;
    this._fireHaptic('light');
    this._hass.callService('light', 'toggle', { entity_id: id });
  }

  private _handleBrightnessCycle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;

    const entity = this._hass.states[id];
    const currentPct = getBrightnessPct(entity);
    const nextPct = getNextBrightnessPct(currentPct);

    this._fireHaptic('light');
    this._hass.callService('light', 'turn_on', {
      entity_id: id,
      brightness_pct: nextPct
    });
  }

  private _handleTempCycle(e: Event) {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;

    const entity = this._hass.states[id];
    const currentK = getKelvin(entity);
    const nextK = getNextKelvin(currentK);

    this._fireHaptic('light');
    this._hass.callService('light', 'turn_on', {
      entity_id: id,
      color_temp_kelvin: nextK
    });
  }

  // --- Gestion du Slider Interactif (Pointer Events) ---

  private _onSliderPointerDown(e: PointerEvent) {
    e.stopPropagation();
    this._isDragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this._updateSliderFromPointer(e);
  }

  private _onSliderPointerMove(e: PointerEvent) {
    if (!this._isDragging) return;
    e.stopPropagation();
    this._updateSliderFromPointer(e);
  }

  private _onSliderPointerUp(e: PointerEvent) {
    if (!this._isDragging) return;
    e.stopPropagation();
    this._isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    this._commitBrightness(this._dragPct);
  }

  private _onSliderPointerCancel(e: PointerEvent) {
    if (!this._isDragging) return;
    this._isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    this._render();
  }

  private _updateSliderFromPointer(e: PointerEvent) {
    if (!this._sliderTrackEl) return;
    const rect = this._sliderTrackEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let pct = Math.round((x / rect.width) * 100);
    pct = Math.max(0, Math.min(100, pct));
    this._dragPct = pct;

    if (this._sliderFillEl) {
      this._sliderFillEl.style.width = `${pct}%`;
    }
    if (this._sliderThumbEl) {
      this._sliderThumbEl.style.left = `${pct}%`;
    }
    if (this._statusEl) {
      this._statusEl.textContent = pct === 0 ? 'Éteint' : `Luminosité : ${pct} %`;
    }
  }

  private _commitBrightness(pct: number) {
    const id = this._config.entity;
    if (!id || !this._hass) return;

    this._fireHaptic('light');
    if (pct === 0) {
      this._hass.callService('light', 'turn_off', { entity_id: id });
    } else {
      this._hass.callService('light', 'turn_on', {
        entity_id: id,
        brightness_pct: pct
      });
    }
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card.halo-light-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 14px;
          padding: 10px 14px;
          min-height: 64px;
          box-sizing: border-box;
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          cursor: pointer;
          user-select: none;
          transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      border 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                      filter 0.15s ease;
          overflow: hidden;
        }
        ha-card.halo-light-card:hover {
          filter: brightness(1.05);
        }
        .halo-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .halo-icon-badge {
          width: 38px;
          height: 38px;
          min-width: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          cursor: pointer;
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.1s ease;
        }
        .halo-icon-badge:active {
          transform: scale(0.92);
        }
        .halo-icon-badge ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
          pointer-events: none;
        }
        .halo-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-align: left;
          cursor: pointer;
        }
        .halo-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.25;
        }
        .halo-status {
          font-size: 11.5px;
          font-weight: 600;
          line-height: 1.15;
          transition: color 0.3s ease;
        }
        .halo-slider-wrapper {
          width: 100%;
          max-width: 130px;
          height: 16px;
          display: flex;
          align-items: center;
          cursor: pointer;
          touch-action: none;
          position: relative;
          margin-top: 2px;
        }
        .halo-slider-track {
          width: 100%;
          height: 4px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.12);
          position: relative;
          pointer-events: none;
        }
        .halo-slider-fill {
          height: 100%;
          border-radius: 4px;
          position: absolute;
          left: 0;
          top: 0;
          pointer-events: none;
          transition: width 0.15s ease, background 0.3s ease, box-shadow 0.3s ease;
        }
        .halo-slider-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.6);
          transition: left 0.15s ease, background 0.3s ease, box-shadow 0.3s ease;
        }
        .halo-buttons {
          display: flex;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          margin-left: 8px;
        }
        .halo-btn {
          width: 34px;
          height: 32px;
          min-width: 34px;
          border-radius: 9px;
          padding: 0;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          box-sizing: border-box;
          font-size: 11px;
          font-weight: 700;
          color: #ffffff;
          font-family: inherit;
        }
        .halo-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.25);
          transform: translateY(-1px);
        }
        .halo-btn:active {
          transform: translateY(1px) scale(0.96);
          background: rgba(255, 255, 255, 0.22);
        }
        .halo-btn ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          color: #ffffff;
          pointer-events: none;
        }
        .unavailable-box {
          display: none;
          padding: 14px;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid #f59e0b;
          border-radius: 14px;
          color: #ffffff;
          font-size: 13px;
        }
      </style>

      <div class="unavailable-box" id="unavail-box"></div>

      <ha-card class="halo-light-card" id="card-body">
        <div class="halo-left">
          <div class="halo-icon-badge" id="icon-badge" title="Basculer / Maintenir pour détails">
            <ha-icon id="light-icon"></ha-icon>
          </div>
          <div class="halo-info" id="info-zone" title="Ouvrir les détails">
            <span class="halo-name" id="light-name"></span>
            <span class="halo-status" id="light-status"></span>
            <div class="halo-slider-wrapper" id="slider-wrapper" title="Régler la luminosité">
              <div class="halo-slider-track" id="slider-track">
                <div class="halo-slider-fill" id="slider-fill"></div>
                <div class="halo-slider-thumb" id="slider-thumb"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="halo-buttons" id="buttons-zone">
          <button class="halo-btn" id="btn-brightness" title="Cycle luminosité" type="button">
            <span id="btn-brightness-label"></span>
          </button>
          <button class="halo-btn" id="btn-temp" title="Cycle température" type="button">
            <span id="btn-temp-label"></span>
          </button>
          <button class="halo-btn" id="btn-power" title="Marche / Arrêt" type="button">
            <ha-icon id="btn-power-icon" icon="mdi:power"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    // Attachement des références Persistent DOM
    this._cardEl = this._root.getElementById('card-body');
    this._unavailEl = this._root.getElementById('unavail-box');
    this._badgeEl = this._root.getElementById('icon-badge');
    this._iconEl = this._root.getElementById('light-icon');
    this._infoEl = this._root.getElementById('info-zone');
    this._nameEl = this._root.getElementById('light-name');
    this._statusEl = this._root.getElementById('light-status');
    this._sliderWrapperEl = this._root.getElementById('slider-wrapper');
    this._sliderTrackEl = this._root.getElementById('slider-track');
    this._sliderFillEl = this._root.getElementById('slider-fill');
    this._sliderThumbEl = this._root.getElementById('slider-thumb');
    this._btnBrightnessEl = this._root.getElementById('btn-brightness');
    this._btnBrightnessLabelEl = this._root.getElementById('btn-brightness-label');
    this._btnTempEl = this._root.getElementById('btn-temp');
    this._btnTempLabelEl = this._root.getElementById('btn-temp-label');
    this._btnPowerEl = this._root.getElementById('btn-power');
    this._btnPowerIconEl = this._root.getElementById('btn-power-icon');

    // Événements Badge (Clic court = Toggle, Long press = More-Info)
    this._badgeEl?.addEventListener('pointerdown', (e) => this._handleBadgePointerDown(e));
    this._badgeEl?.addEventListener('pointerup', (e) => this._handleBadgePointerUp(e));
    this._badgeEl?.addEventListener('pointercancel', (e) => this._handleBadgePointerCancel(e));

    // Événements Info Zone (Clic = More-Info)
    this._infoEl?.addEventListener('click', (e) => this._handleInfoTap(e));

    // Événements Slider Interactif (Pointer Events)
    this._sliderWrapperEl?.addEventListener('pointerdown', (e) => this._onSliderPointerDown(e));
    this._sliderWrapperEl?.addEventListener('pointermove', (e) => this._onSliderPointerMove(e));
    this._sliderWrapperEl?.addEventListener('pointerup', (e) => this._onSliderPointerUp(e));
    this._sliderWrapperEl?.addEventListener('pointercancel', (e) => this._onSliderPointerCancel(e));

    // Événements Micro-boutons
    this._btnBrightnessEl?.addEventListener('click', (e) => this._handleBrightnessCycle(e));
    this._btnTempEl?.addEventListener('click', (e) => this._handleTempCycle(e));
    this._btnPowerEl?.addEventListener('click', (e) => this._handleToggle(e));
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
        this._unavailEl.textContent = `Entité introuvable : ${id}`;
        this._unavailEl.style.display = 'block';
      }
      if (this._cardEl) {
        this._cardEl.style.display = 'none';
      }
      return;
    }

    if (this._unavailEl) this._unavailEl.style.display = 'none';
    if (this._cardEl) this._cardEl.style.display = 'flex';

    const attrs = entity.attributes || {};
    const st = entity.state;
    const isUnavail = st === 'unavailable' || st === 'unknown';
    const isOn = st === 'on';

    const dimmable = isDimmable(entity);
    const colorTempSupported = supportsColorTemp(entity);
    const currentPct = getBrightnessPct(entity);
    const currentKelvin = getKelvin(entity);

    const accentCol = getLightAccentColor(this._hass, this._config, entity);
    const cardStyles = getLightCardStyles(accentCol, isOn, isUnavail);

    // 1. Mise à jour du conteneur ha-card
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

    // 2. Mise à jour du Badge
    if (this._badgeEl) {
      let bg = 'rgba(255, 255, 255, 0.05)';
      let border = '1.25px solid rgba(255, 255, 255, 0.10)';
      let shadow = 'none';

      if (isUnavail) {
        bg = 'rgba(245, 158, 11, 0.20)';
        border = '1.25px solid rgba(245, 158, 11, 0.50)';
        shadow = '0 0 12px rgba(245, 158, 11, 0.40)';
      } else if (isOn) {
        bg = `${accentCol}26`;
        border = `1.25px solid ${accentCol}66`;
        shadow = `0 0 12px ${accentCol}44`;
      }

      if (this._badgeEl.style.background !== bg) this._badgeEl.style.background = bg;
      if (this._badgeEl.style.border !== border) this._badgeEl.style.border = border;
      if (this._badgeEl.style.boxShadow !== shadow) this._badgeEl.style.boxShadow = shadow;
    }

    // 3. Mise à jour de l'icône
    if (this._iconEl) {
      let iconName = this._config.icon;
      if (!iconName) {
        if (isUnavail) {
          iconName = 'mdi:alert-circle';
        } else if (isOn) {
          iconName = 'mdi:lightbulb';
        } else {
          iconName = 'mdi:lightbulb-outline';
        }
      }

      let iconColor = '#94a3b8';
      if (isUnavail) {
        iconColor = '#f59e0b';
      } else if (isOn) {
        iconColor = accentCol;
      }

      if (this._iconEl.getAttribute('icon') !== iconName) {
        this._iconEl.setAttribute('icon', iconName);
      }
      if (this._iconEl.style.color !== iconColor) {
        this._iconEl.style.color = iconColor;
      }
    }

    // 4. Mise à jour du nom
    let name = this._config.name || attrs.friendly_name || 'Éclairage';
    name = name.replace(/^Lumière\s+/i, '').replace(/^Lampe\s+/i, '');
    if (this._nameEl && this._nameEl.textContent !== name) {
      this._nameEl.textContent = name;
    }

    // 5. Mise à jour du statut
    if (this._statusEl && !this._isDragging) {
      const statusText = formatLightStatus(entity);
      if (this._statusEl.textContent !== statusText) {
        this._statusEl.textContent = statusText;
      }
      const statusColor = isUnavail ? '#f59e0b' : isOn ? accentCol : '#94a3b8';
      if (this._statusEl.style.color !== statusColor) {
        this._statusEl.style.color = statusColor;
      }
    }

    // 6. Mise à jour du Slider de Luminosité
    const showSlider = this._config.show_slider !== false && dimmable;
    if (this._sliderWrapperEl) {
      this._sliderWrapperEl.style.display = showSlider ? 'flex' : 'none';

      if (showSlider && !this._isDragging) {
        const pct = isOn ? currentPct : 0;
        const widthStr = `${pct}%`;
        const shadow = isOn ? `0 0 6px ${accentCol}88` : 'none';
        const fillBg = isOn ? accentCol : 'rgba(255, 255, 255, 0.2)';

        if (this._sliderFillEl) {
          if (this._sliderFillEl.style.width !== widthStr) this._sliderFillEl.style.width = widthStr;
          if (this._sliderFillEl.style.background !== fillBg) this._sliderFillEl.style.background = fillBg;
          if (this._sliderFillEl.style.boxShadow !== shadow) this._sliderFillEl.style.boxShadow = shadow;
        }

        if (this._sliderThumbEl) {
          if (this._sliderThumbEl.style.left !== widthStr) this._sliderThumbEl.style.left = widthStr;
          if (this._sliderThumbEl.style.background !== fillBg) this._sliderThumbEl.style.background = fillBg;
          if (this._sliderThumbEl.style.boxShadow !== shadow) this._sliderThumbEl.style.boxShadow = shadow;
        }
      }
    }

    // 7. Bouton Luminosité (%)
    const showBrightnessBtn = this._config.show_brightness_btn !== false && dimmable;
    if (this._btnBrightnessEl) {
      this._btnBrightnessEl.style.display = showBrightnessBtn ? 'flex' : 'none';
      if (showBrightnessBtn && this._btnBrightnessLabelEl) {
        const label = isOn ? `${currentPct}%` : '%';
        if (this._btnBrightnessLabelEl.textContent !== label) {
          this._btnBrightnessLabelEl.textContent = label;
        }
      }
    }

    // 8. Bouton Température / Kelvin (K)
    const showTempBtn = this._config.show_temp_btn !== false && colorTempSupported;
    if (this._btnTempEl) {
      this._btnTempEl.style.display = showTempBtn ? 'flex' : 'none';
      if (showTempBtn && this._btnTempLabelEl) {
        const label = isOn && currentKelvin ? formatKelvin(currentKelvin) : 'K';
        if (this._btnTempLabelEl.textContent !== label) {
          this._btnTempLabelEl.textContent = label;
        }
      }
    }

    // 9. Bouton Power (On/Off)
    const showPowerBtn = this._config.show_power_btn !== false;
    if (this._btnPowerEl) {
      this._btnPowerEl.style.display = showPowerBtn ? 'flex' : 'none';
      if (showPowerBtn) {
        let pBg = 'rgba(255, 255, 255, 0.08)';
        let pBorder = '1px solid rgba(255, 255, 255, 0.12)';
        let pColor = '#94a3b8';
        let pShadow = 'none';

        if (isOn) {
          pBg = `${accentCol}22`;
          pBorder = `1px solid ${accentCol}55`;
          pColor = accentCol;
          pShadow = `0 0 8px ${accentCol}33`;
        }

        if (this._btnPowerEl.style.background !== pBg) this._btnPowerEl.style.background = pBg;
        if (this._btnPowerEl.style.border !== pBorder) this._btnPowerEl.style.border = pBorder;
        if (this._btnPowerEl.style.boxShadow !== pShadow) this._btnPowerEl.style.boxShadow = pShadow;
        if (this._btnPowerIconEl && this._btnPowerIconEl.style.color !== pColor) {
          this._btnPowerIconEl.style.color = pColor;
        }
      }
    }
  }
}
