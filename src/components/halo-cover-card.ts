/**
 * HALO Button Card — Halo Cover Card Component
 * Turnkey roller shutter tile with HOLM Liquid Glass styling and dynamic halo.
 * High-performance persistent DOM architecture (zero flicker, zero lost clicks).
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloCoverCardConfig, HassEntity } from '../types';
import { voletHelperInstance } from '../core/volet-helper';
import { getCoverColors, getHaloCardStyles } from '../core/theme-helper';
import { useLocalize, localizeHolm } from '../localize/localize';

export class HaloCoverCard extends HTMLElement {
  private _config!: HaloCoverCardConfig;
  private _hass!: HomeAssistant;

  private get _t() {
    return useLocalize(this._hass);
  }
  private _root: ShadowRoot;
  public _updateTimerMS = 0;

  // Persistent DOM references
  private _cardEl: HTMLElement | null = null;
  private _unavailEl: HTMLElement | null = null;
  private _badgeEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _nameEl: HTMLElement | null = null;
  private _statusEl: HTMLElement | null = null;
  private _progressFillEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-cover-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      entity: 'cover.volet_roulant'
    };
  }

  private get _helper() {
    return (window as any)._voletHelper || voletHelperInstance;
  }

  public setConfig(config: HaloCoverCardConfig) {
    if (!config || !config.entity) {
      throw new Error('Please define a valid cover entity (e.g. cover.mon_volet)');
    }
    this._config = config;
    if (this._hass) {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;
    this._helper.register(this);

    // Initial render
    if (!this._cardEl) {
      this._render();
      return;
    }

    // Only re-render if relevant states changed
    if (this._hasChanged(oldHass, hass)) {
      this._render();
    }
  }

  public getCardSize(): number {
    return 2;
  }

  public refresh() {
    this._render();
  }

  public requestUpdate(_name?: string, _oldValue?: any) {
    this._render();
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;
    const id = this._config.entity;
    if (!id) return true;

    // Check cover state change
    if (oldHass.states[id] !== newHass.states[id]) return true;

    // Check group members
    const oldEntity = oldHass.states[id];
    const members = oldEntity?.attributes?.entity_id;
    if (Array.isArray(members)) {
      for (const m of members) {
        if (oldHass.states[m] !== newHass.states[m]) return true;
      }
    }

    // Check active tracking
    const track = this._helper.tracking[id];
    if (track && track.moving) return true;

    // Check color helper changes
    const colorEntities = [
      'input_text.couleur_volet_ferme',
      'input_text.couleur_volet_ouvert',
      'input_text.couleur_volet_partiel',
      'input_text.couleur_volet_en_mouvement'
    ];
    for (const ce of colorEntities) {
      if (oldHass.states[ce] !== newHass.states[ce]) return true;
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

  private _handleTap(e: Event) {
    e.stopPropagation();
    this._fireEvent('hass-more-info', { entityId: this._config.entity });
  }

  private _handleAction(e: Event, action: 'open' | 'stop' | 'close') {
    e.stopPropagation();
    const id = this._config.entity;
    if (!id || !this._hass) return;

    const entity = this._hass.states[id];
    const members = entity?.attributes?.entity_id || null;

    if (action === 'open') {
      this._helper.markManualMove(id, 'opening', members, this._hass.states);
      this._hass.callService('cover', 'open_cover', { entity_id: id });
    } else if (action === 'stop') {
      this._helper.markManualMove(id, 'stop', members, this._hass.states);
      this._hass.callService('cover', 'stop_cover', { entity_id: id });
    } else if (action === 'close') {
      this._helper.markManualMove(id, 'closing', members, this._hass.states);
      this._hass.callService('cover', 'close_cover', { entity_id: id });
    }
    this._render();
  }

  private _buildDom() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card.halo-cover-card {
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
        ha-card.halo-cover-card:hover {
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
          transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .halo-icon-badge ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        .halo-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
          overflow: hidden;
          text-align: left;
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
        .halo-progress-track {
          width: 100%;
          max-width: 130px;
          height: 3px;
          min-height: 3px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.10);
          overflow: hidden;
          margin-top: 3px;
        }
        .halo-progress-fill {
          display: block;
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s ease, background 0.3s ease, box-shadow 0.3s ease;
        }
        .halo-buttons {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          margin-left: 10px;
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

      <ha-card class="halo-cover-card" id="card-body">
        <div class="halo-left">
          <div class="halo-icon-badge" id="icon-badge">
            <ha-icon id="cover-icon"></ha-icon>
          </div>
          <div class="halo-info">
            <span class="halo-name" id="cover-name"></span>
            <span class="halo-status" id="cover-status"></span>
            <div class="halo-progress-track">
              <i class="halo-progress-fill" id="progress-fill"></i>
            </div>
          </div>
        </div>

        <div class="halo-buttons">
          <button class="halo-btn" id="btn-down" title="${this._t('cover.down')}" type="button">
            <ha-icon icon="mdi:arrow-down"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-stop" title="${this._t('cover.stop')}" type="button">
            <ha-icon icon="mdi:stop"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-up" title="${this._t('cover.up')}" type="button">
            <ha-icon icon="mdi:arrow-up"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    this._cardEl = this._root.getElementById('card-body');
    this._unavailEl = this._root.getElementById('unavail-box');
    this._badgeEl = this._root.getElementById('icon-badge');
    this._iconEl = this._root.getElementById('cover-icon');
    this._nameEl = this._root.getElementById('cover-name');
    this._statusEl = this._root.getElementById('cover-status');
    this._progressFillEl = this._root.getElementById('progress-fill');

    this._cardEl?.addEventListener('click', (e) => this._handleTap(e));
    this._root.getElementById('btn-down')?.addEventListener('click', (e) => this._handleAction(e, 'close'));
    this._root.getElementById('btn-stop')?.addEventListener('click', (e) => this._handleAction(e, 'stop'));
    this._root.getElementById('btn-up')?.addEventListener('click', (e) => this._handleAction(e, 'open'));
  }

  private _render() {
    if (!this._config || !this._hass) return;
    if (!this._cardEl) {
      this._buildDom();
    }

    const id = this._config.entity;
    const entity = this._hass.states[id] as HassEntity | undefined;
    const colors = getCoverColors(this._hass, this._config);

    if (!entity) {
      if (this._unavailEl) {
        this._unavailEl.textContent = this._t('cover.not_found', 'id', id);
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
    const members = Array.isArray(attrs.entity_id) ? attrs.entity_id : [];
    const isGroup = members.length > 0;

    const p = this._helper.position(entity);
    const st = entity.state || 'unavailable';
    const isUnavail = st === 'unavailable' || st === 'unknown';

    const moveInfo = this._helper.isEntityOrGroupMoving(entity, this._hass.states);
    const isMoving = moveInfo.moving;
    const moveDir = moveInfo.dir;
    const movingCount = moveInfo.count;

    const isClosed = !isMoving && !isUnavail && (p === 0 || st === 'closed');
    const isOpen = !isMoving && !isUnavail && !isClosed && (p === 100 || (p == null && st === 'open'));
    const isPartial = !isMoving && !isUnavail && !isClosed && !isOpen && p != null && p > 0 && p < 100;

    let accentCol = colors.closed;
    if (isUnavail) {
      accentCol = '#f59e0b';
    } else if (isMoving) {
      accentCol = colors.moving;
    } else if (isClosed) {
      accentCol = colors.closed;
    } else if (isOpen) {
      accentCol = colors.open;
    } else if (isPartial) {
      accentCol = colors.partial;
    }

    // Friendly name
    let name = this._config.name || attrs.friendly_name || this._t('cover.default_name');
    name = name.replace(/^Volet\s+roulant\s+/i, '');

    // Status label
    const t = this._t;
    let statusText = t('state.closed');
    if (isUnavail) {
      statusText = t('state.unavailable');
    } else if (isMoving) {
      if (isGroup) {
        statusText = movingCount > 1
          ? t('cover.moving_n', 'count', String(movingCount))
          : moveDir === 'closing' ? t('cover.closing') : t('cover.opening');
      } else {
        statusText = moveDir === 'closing'
          ? (p != null ? t('cover.closing_pct', 'pct', String(100 - p)) : t('cover.closing'))
          : (p != null ? t('cover.opening_pct', 'pct', String(p)) : t('cover.opening'));
      }
    } else if (isClosed) {
      statusText = t('state.closed');
    } else if (isOpen) {
      statusText = t('state.open');
    } else if (isPartial) {
      statusText = t('cover.partial_pct', 'pct', String(p));
    }

    // Closure percentage
    const closurePct = p != null ? 100 - p : isClosed ? 100 : 0;

    // Icon
    let iconName = 'mdi:window-shutter';
    if (isUnavail) {
      iconName = 'mdi:alert-circle';
    } else if (isMoving) {
      iconName = moveDir === 'closing' ? 'mdi:arrow-down-bold-circle' : 'mdi:arrow-up-bold-circle';
    } else if (isOpen || isPartial) {
      iconName = 'mdi:window-shutter-open';
    } else {
      iconName = 'mdi:window-shutter';
    }

    const cardStyles = getHaloCardStyles(accentCol, isUnavail, isMoving, this._config.border_width);

    // Update card body styling
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

    // Update icon badge styling
    if (this._badgeEl) {
      const bg = `${accentCol}22`;
      const border = `1.25px solid ${accentCol}55`;
      const shadow = `0 0 12px ${accentCol}44`;
      if (this._badgeEl.style.background !== bg) this._badgeEl.style.background = bg;
      if (this._badgeEl.style.border !== border) this._badgeEl.style.border = border;
      if (this._badgeEl.style.boxShadow !== shadow) this._badgeEl.style.boxShadow = shadow;
    }

    // Update icon
    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== iconName) {
        this._iconEl.setAttribute('icon', iconName);
      }
      if (this._iconEl.style.color !== accentCol) {
        this._iconEl.style.color = accentCol;
      }
    }

    // Update name and status text
    if (this._nameEl && this._nameEl.textContent !== name) {
      this._nameEl.textContent = name;
    }
    if (this._statusEl) {
      if (this._statusEl.textContent !== statusText) {
        this._statusEl.textContent = statusText;
      }
      if (this._statusEl.style.color !== accentCol) {
        this._statusEl.style.color = accentCol;
      }
    }

    // Update progress fill
    if (this._progressFillEl) {
      const widthStr = `${closurePct}%`;
      const shadow = `0 0 6px ${accentCol}88`;
      if (this._progressFillEl.style.width !== widthStr) this._progressFillEl.style.width = widthStr;
      if (this._progressFillEl.style.background !== accentCol) this._progressFillEl.style.background = accentCol;
      if (this._progressFillEl.style.boxShadow !== shadow) this._progressFillEl.style.boxShadow = shadow;
    }
  }
}
