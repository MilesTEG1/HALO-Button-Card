/**
 * HALO Button Card — Halo Cover Card Component
 * Turnkey roller shutter tile with HOLM Liquid Glass styling and dynamic halo.
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HomeAssistant, HaloCoverCardConfig, HassEntity } from '../types';
import { voletHelperInstance } from '../core/volet-helper';
import { getCoverColors, getHaloCardStyles } from '../core/theme-helper';

export class HaloCoverCard extends HTMLElement {
  private _config!: HaloCoverCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;
  public _updateTimerMS = 0;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public setConfig(config: HaloCoverCardConfig) {
    if (!config || !config.entity) {
      throw new Error('Please define a valid cover entity (e.g. cover.mon_volet)');
    }
    this._config = config;
  }

  public set hass(hass: HomeAssistant) {
    this._hass = hass;
    voletHelperInstance.register(this);
    this._render();
  }

  public getCardSize(): number {
    return 2;
  }

  public refresh() {
    this._render();
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
      voletHelperInstance.markManualMove(id, 'opening', members, this._hass.states);
      this._hass.callService('cover', 'open_cover', { entity_id: id });
    } else if (action === 'stop') {
      voletHelperInstance.markManualMove(id, 'stop', members, this._hass.states);
      this._hass.callService('cover', 'stop_cover', { entity_id: id });
    } else if (action === 'close') {
      voletHelperInstance.markManualMove(id, 'closing', members, this._hass.states);
      this._hass.callService('cover', 'close_cover', { entity_id: id });
    }
    this._render();
  }

  private _render() {
    if (!this._config || !this._hass) return;

    const id = this._config.entity;
    const entity = this._hass.states[id] as HassEntity | undefined;
    const colors = getCoverColors(this._hass, this._config);

    if (!entity) {
      this._root.innerHTML = `
        <style>
          .unavailable {
            padding: 14px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid #f59e0b;
            border-radius: 14px;
            color: #ffffff;
            font-size: 13px;
          }
        </style>
        <div class="unavailable">Entité non trouvée : ${id}</div>
      `;
      return;
    }

    const attrs = entity.attributes || {};
    const members = Array.isArray(attrs.entity_id) ? attrs.entity_id : [];
    const isGroup = members.length > 0;

    const p = voletHelperInstance.position(entity);
    const st = entity.state || 'unavailable';
    const isUnavail = st === 'unavailable' || st === 'unknown';

    const moveInfo = voletHelperInstance.isEntityOrGroupMoving(entity, this._hass.states);
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
    let name = this._config.name || attrs.friendly_name || 'Volet';
    name = name.replace(/^Volet\s+roulant\s+/i, '');

    // Status label
    let statusText = 'Fermé';
    if (isUnavail) {
      statusText = 'Indisponible';
    } else if (isMoving) {
      if (isGroup) {
        statusText = movingCount > 1 ? `${movingCount} volets en mouvement…` : moveDir === 'closing' ? 'Fermeture…' : 'Ouverture…';
      } else {
        statusText = moveDir === 'closing'
          ? (p != null ? `Fermeture… ${100 - p} %` : 'Fermeture…')
          : (p != null ? `Ouverture… ${p} %` : 'Ouverture…');
      }
    } else if (isClosed) {
      statusText = 'Fermé';
    } else if (isOpen) {
      statusText = 'Ouvert';
    } else if (isPartial) {
      statusText = `Partiel (${p}%)`;
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

    const cardStyles = getHaloCardStyles(accentCol, isUnavail, isMoving);

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .halo-cover-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 14px;
          padding: 8px 12px;
          min-height: 56px;
          box-sizing: border-box;
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          background: ${cardStyles.background};
          border: ${cardStyles.border};
          box-shadow: ${cardStyles.boxShadow};
          cursor: pointer;
          user-select: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .halo-cover-card:hover {
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
          background: ${accentCol}22;
          border: 1.25px solid ${accentCol}55;
          box-shadow: 0 0 12px ${accentCol}44;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .halo-icon-badge ha-icon {
          --mdc-icon-size: 22px;
          width: 22px;
          height: 22px;
          color: ${accentCol};
          display: flex;
          align-items: center;
          justify-content: center;
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
          line-height: 1.2;
        }
        .halo-status {
          font-size: 11.5px;
          font-weight: 600;
          color: ${accentCol};
          line-height: 1.1;
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
          width: ${closurePct}%;
          background: ${accentCol};
          box-shadow: 0 0 6px ${accentCol}88;
          border-radius: 3px;
          transition: width 0.6s ease, background 0.3s ease;
        }
        .halo-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
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
        }
      </style>

      <div class="halo-cover-card" id="card-body">
        <div class="halo-left">
          <div class="halo-icon-badge">
            <ha-icon icon="${iconName}"></ha-icon>
          </div>
          <div class="halo-info">
            <span class="halo-name">${name}</span>
            <span class="halo-status">${statusText}</span>
            <div class="halo-progress-track">
              <i class="halo-progress-fill"></i>
            </div>
          </div>
        </div>

        <div class="halo-buttons">
          <button class="halo-btn" id="btn-up" title="Monter">
            <ha-icon icon="mdi:arrow-up"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-stop" title="Arrêter">
            <ha-icon icon="mdi:stop"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-down" title="Descendre">
            <ha-icon icon="mdi:arrow-down"></ha-icon>
          </button>
        </div>
      </div>
    `;

    // Bind event listeners
    this._root.getElementById('card-body')?.addEventListener('click', (e) => this._handleTap(e));
    this._root.getElementById('btn-up')?.addEventListener('click', (e) => this._handleAction(e, 'open'));
    this._root.getElementById('btn-stop')?.addEventListener('click', (e) => this._handleAction(e, 'stop'));
    this._root.getElementById('btn-down')?.addEventListener('click', (e) => this._handleAction(e, 'close'));
  }
}
