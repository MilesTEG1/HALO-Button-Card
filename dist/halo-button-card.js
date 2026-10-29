var HaloButtonCard = (function (exports) {
    'use strict';

    /**
     * HALO Button Card — Volet Helper Engine
     * Asynchronous position estimation and manual movement tracker
     * (c) 2026 MilesTEG1 — MIT License
     */
    class VoletHelper {
        constructor() {
            this.version = '1.1.0';
            this.QUIET_MS = 3500;
            this.GRACE_MS = 4000;
            this.MAX_AGE_MS = 30000;
            this.seq = 0;
            this.tracking = {};
            this.cards = [];
            this._attachGlobal();
        }
        _attachGlobal() {
            if (typeof window !== 'undefined') {
                const existing = window._voletHelper;
                if (existing && existing.tracking) {
                    Object.assign(this.tracking, existing.tracking);
                    if (Array.isArray(existing.cards)) {
                        this.cards = existing.cards;
                    }
                }
                window._voletHelper = this;
            }
        }
        position(s) {
            if (!s)
                return null;
            const a = s.attributes || {};
            if (a.current_position !== undefined && a.current_position !== null) {
                return Number(a.current_position);
            }
            return s.state === 'open' ? 100 : s.state === 'closed' ? 0 : null;
        }
        reached(dir, p, st) {
            if (dir === 'closing')
                return p === 0 || st === 'closed';
            if (dir === 'opening')
                return p === 100;
            return false;
        }
        register(el) {
            if (!el)
                return;
            for (let i = 0; i < this.cards.length; i++) {
                const c = this.cards[i].deref ? this.cards[i].deref() : this.cards[i];
                if (c === el)
                    return;
            }
            this.cards.push(typeof WeakRef !== 'undefined' ? new WeakRef(el) : el);
        }
        forceCardUpdate(c) {
            if (!c)
                return false;
            if (typeof c.requestUpdate === 'function') {
                this.seq = (this.seq || 0) + 1;
                const prev = c._updateTimerMS;
                c._updateTimerMS = this.seq;
                c.requestUpdate('_updateTimerMS', prev);
                return true;
            }
            if (typeof c.refresh === 'function') {
                c.refresh();
                return true;
            }
            return false;
        }
        refreshAll() {
            let n = 0;
            const live = [];
            for (let i = 0; i < this.cards.length; i++) {
                const ref = this.cards[i];
                const c = ref.deref ? ref.deref() : ref;
                if (c && c.isConnected !== false) {
                    live.push(ref);
                    try {
                        if (this.forceCardUpdate(c))
                            n++;
                    }
                    catch (e) {
                        // ignore
                    }
                }
            }
            this.cards = live;
            if (n === 0 && typeof document !== 'undefined') {
                try {
                    const walk = (root) => {
                        const all = root.querySelectorAll('*');
                        for (let j = 0; j < all.length; j++) {
                            const e = all[j];
                            if (e.tagName === 'HALO-COVER-CARD' ||
                                e.tagName === 'BUTTON-CARD' ||
                                e.tagName === 'CUSTOM-BUTTON-CARD') {
                                this.forceCardUpdate(e);
                            }
                            if (e.shadowRoot)
                                walk(e.shadowRoot);
                        }
                    };
                    walk(document);
                }
                catch (e) {
                    // ignore
                }
            }
        }
        newTrack(p, lu) {
            return {
                lastPos: p,
                lastLu: lu,
                moving: false,
                dir: null,
                until: 0,
                timer: null
            };
        }
        stopMove(t) {
            if (t.timer)
                clearTimeout(t.timer);
            t.timer = null;
            t.moving = false;
            t.dir = null;
            t.until = 0;
        }
        startMove(id, dir, ms) {
            let t = this.tracking[id];
            if (!t) {
                t = this.tracking[id] = this.newTrack(null, Date.now());
            }
            if (t.timer)
                clearTimeout(t.timer);
            t.moving = true;
            t.dir = dir;
            t.until = Date.now() + ms;
            t.timer = setTimeout(() => {
                this.expire(id);
            }, ms + 50);
        }
        expire(id) {
            const t = this.tracking[id];
            if (!t)
                return;
            t.timer = null;
            if (!t.moving)
                return;
            const left = t.until - Date.now();
            if (left > 0) {
                t.timer = setTimeout(() => {
                    this.expire(id);
                }, left + 50);
                return;
            }
            this.stopMove(t);
            this.refreshAll();
        }
        checkMoving(id, states) {
            const NO = { moving: false, dir: null };
            if (!id || !states)
                return NO;
            const s = states[id];
            if (!s)
                return NO;
            const st = s.state || 'unavailable';
            if (st === 'opening' || st === 'closing') {
                return { moving: true, dir: st };
            }
            const t = this.tracking[id];
            if (st === 'unavailable' || st === 'unknown') {
                if (t) {
                    this.stopMove(t);
                    t.lastPos = null;
                }
                return NO;
            }
            const p = this.position(s);
            const lu = s.last_updated ? new Date(s.last_updated).getTime() : 0;
            const now = Date.now();
            if (!t) {
                this.tracking[id] = this.newTrack(p, lu);
                return NO;
            }
            if (lu !== t.lastLu) {
                const fresh = lu > 0 && now - lu <= this.MAX_AGE_MS;
                if (fresh &&
                    p !== null &&
                    t.lastPos !== null &&
                    p !== t.lastPos &&
                    now >= (t.ignoreUntil || 0)) {
                    const d = p < t.lastPos ? 'closing' : 'opening';
                    if (this.reached(d, p, st)) {
                        this.stopMove(t);
                    }
                    else {
                        this.startMove(id, d, this.QUIET_MS);
                    }
                }
                t.lastLu = lu;
            }
            if (p !== null)
                t.lastPos = p;
            if (t.moving && (this.reached(t.dir, p, st) || now >= t.until)) {
                this.stopMove(t);
            }
            return t.moving ? { moving: true, dir: t.dir } : NO;
        }
        isEntityOrGroupMoving(entity, states) {
            if (!entity || !states)
                return { moving: false, dir: null, count: 0 };
            if (entity.state === 'opening' || entity.state === 'closing') {
                return { moving: true, dir: entity.state, count: 1 };
            }
            const id = entity.entity_id;
            const attrs = entity.attributes || {};
            const members = Array.isArray(attrs.entity_id)
                ? attrs.entity_id
                : Array.isArray(attrs.group_entities)
                    ? attrs.group_entities
                    : [];
            if (members.length > 0) {
                let count = 0;
                let firstDir = null;
                for (let i = 0; i < members.length; i++) {
                    const res = this.checkMoving(members[i], states);
                    if (res.moving) {
                        count++;
                        if (!firstDir)
                            firstDir = res.dir;
                    }
                }
                return { moving: count > 0, dir: firstDir, count };
            }
            const r = this.checkMoving(id, states);
            return { moving: r.moving, dir: r.dir, count: r.moving ? 1 : 0 };
        }
        markManualMove(id, dir, members, states) {
            const targets = Array.isArray(members) && members.length > 0 ? members : [id];
            targets.forEach((tid) => {
                if (!tid)
                    return;
                const s = states ? states[tid] : null;
                const p = s ? this.position(s) : null;
                const st = s ? s.state || null : null;
                const lu = s && s.last_updated ? new Date(s.last_updated).getTime() : 0;
                let t = this.tracking[tid];
                if (!t)
                    t = this.tracking[tid] = this.newTrack(p, lu);
                if (dir === 'stop') {
                    this.stopMove(t);
                    t.ignoreUntil = Date.now() + 1500;
                    return;
                }
                const checkPos = p !== null ? p : t.lastPos;
                if (st && this.reached(dir, checkPos, st))
                    return;
                this.startMove(tid, dir, this.GRACE_MS);
            });
            this.refreshAll();
        }
    }
    const voletHelperInstance = new VoletHelper();

    /**
     * HALO Button Card — Theme & Styling Engine
     * (c) 2026 MilesTEG1 — MIT License
     */
    const HOLM_PALETTE = {
        'Cyan HOLM': '#26c6da',
        'Bleu Céleste': '#38bdf8',
        'Saphir Océan': '#2f86ff',
        'Menthe Givrée': '#00e5a3',
        'Émeraude': '#10b981',
        'Vert Lime': '#84cc16',
        'Jaune Soleil': '#facc15',
        'Ambre Doré': '#f59e0b',
        'Orange Flamme': '#ff5a1f',
        'Corail Pêche': '#fb923c',
        'Rose Rubis': '#f43f5e',
        'Rose Bonbon': '#f472b6',
        'Fuchsia Néon': '#d946ef',
        'Améthyste': '#a855f7',
        'Violet Nuit': '#8b5cf6',
        'Blanc Glace': '#e2e8f0'
    };
    function hexToRgb(hex) {
        if (!hex || typeof hex !== 'string')
            return undefined;
        if (HOLM_PALETTE[hex]) {
            hex = HOLM_PALETTE[hex];
        }
        const clean = hex.replace('#', '').trim();
        if (clean.length === 3) {
            const r = parseInt(clean[0] + clean[0], 16);
            const g = parseInt(clean[1] + clean[1], 16);
            const b = parseInt(clean[2] + clean[2], 16);
            return [r, g, b];
        }
        if (clean.length === 6 || clean.length === 8) {
            const r = parseInt(clean.substring(0, 2), 16);
            const g = parseInt(clean.substring(2, 4), 16);
            const b = parseInt(clean.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                return [r, g, b];
            }
        }
        return undefined;
    }
    function rgbToHex(rgb) {
        if (!Array.isArray(rgb) || rgb.length < 3)
            return '#26c6da';
        const r = Math.max(0, Math.min(255, Math.round(rgb[0])));
        const g = Math.max(0, Math.min(255, Math.round(rgb[1])));
        const b = Math.max(0, Math.min(255, Math.round(rgb[2])));
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    function toHexColor(color, fallback) {
        if (!color)
            return fallback;
        if (Array.isArray(color))
            return rgbToHex(color);
        if (typeof color === 'string') {
            if (HOLM_PALETTE[color])
                return HOLM_PALETTE[color];
            if (color.startsWith('#'))
                return color;
            if (color.startsWith('rgb'))
                return color;
        }
        return fallback;
    }
    function resolveThemeColor(hass, explicitColor, themeEntity, fallback = '#26c6da') {
        if (explicitColor && typeof explicitColor === 'string' && explicitColor.trim() !== '') {
            return toHexColor(explicitColor, fallback);
        }
        const states = hass?.states || {};
        if (themeEntity && states[themeEntity]?.state) {
            const val = states[themeEntity].state;
            if (HOLM_PALETTE[val])
                return HOLM_PALETTE[val];
            if (val.startsWith('#'))
                return val;
        }
        const commonEntities = [
            'input_select.couleur_theme_eclairages',
            'input_select.couleur_theme_eclairage',
            'input_select.couleur_theme_ouvertures',
            'input_select.couleur_theme_chauffage',
            'input_select.couleur_theme_global'
        ];
        for (const ent of commonEntities) {
            const st = states[ent]?.state;
            if (st && HOLM_PALETTE[st])
                return HOLM_PALETTE[st];
        }
        return fallback;
    }
    function getCoverColors(hass, config) {
        const states = hass?.states || {};
        return {
            closed: toHexColor(config?.color_closed, states['input_text.couleur_volet_ferme']?.state || '#FFB69C'),
            open: toHexColor(config?.color_open, states['input_text.couleur_volet_ouvert']?.state || '#96E1FF'),
            partial: toHexColor(config?.color_partial, states['input_text.couleur_volet_partiel']?.state || '#38bdf8'),
            moving: toHexColor(config?.color_moving, states['input_text.couleur_volet_en_mouvement']?.state || '#f59e0b')
        };
    }
    function getHaloCardStyles(accentCol, isUnavail, isMoving) {
        if (isUnavail) {
            return {
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(20, 28, 38, 0.90))',
                border: '1.5px solid #f59e0b',
                boxShadow: '0 0 18px rgba(245, 158, 11, 0.55), 0 0 6px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.20)'
            };
        }
        if (isMoving) {
            return {
                background: `linear-gradient(135deg, ${accentCol}26, rgba(20, 28, 38, 0.90))`,
                border: `1.5px solid ${accentCol}`,
                boxShadow: `0 0 22px ${accentCol}77, 0 0 8px ${accentCol}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
            };
        }
        return {
            background: `linear-gradient(135deg, ${accentCol}1A, rgba(20, 28, 38, 0.88))`,
            border: `1.5px solid ${accentCol}`,
            boxShadow: `0 0 18px ${accentCol}60, 0 0 6px ${accentCol}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`
        };
    }

    /**
     * HALO Button Card — Halo Cover Card Component
     * Turnkey roller shutter tile with HOLM Liquid Glass styling and dynamic halo.
     * High-performance persistent DOM architecture (zero flicker, zero lost clicks).
     * (c) 2026 MilesTEG1 — MIT License
     */
    class HaloCoverCard extends HTMLElement {
        constructor() {
            super();
            this._updateTimerMS = 0;
            // Persistent DOM references
            this._cardEl = null;
            this._unavailEl = null;
            this._badgeEl = null;
            this._iconEl = null;
            this._nameEl = null;
            this._statusEl = null;
            this._progressFillEl = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-cover-card-editor');
        }
        static getStubConfig() {
            return {
                entity: 'cover.volet_roulant'
            };
        }
        get _helper() {
            return window._voletHelper || voletHelperInstance;
        }
        setConfig(config) {
            if (!config || !config.entity) {
                throw new Error('Please define a valid cover entity (e.g. cover.mon_volet)');
            }
            this._config = config;
            if (this._hass) {
                this._render();
            }
        }
        set hass(hass) {
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
        getCardSize() {
            return 2;
        }
        refresh() {
            this._render();
        }
        requestUpdate(_name, _oldValue) {
            this._render();
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            const id = this._config.entity;
            if (!id)
                return true;
            // Check cover state change
            if (oldHass.states[id] !== newHass.states[id])
                return true;
            // Check group members
            const oldEntity = oldHass.states[id];
            const members = oldEntity?.attributes?.entity_id;
            if (Array.isArray(members)) {
                for (const m of members) {
                    if (oldHass.states[m] !== newHass.states[m])
                        return true;
                }
            }
            // Check active tracking
            const track = this._helper.tracking[id];
            if (track && track.moving)
                return true;
            // Check color helper changes
            const colorEntities = [
                'input_text.couleur_volet_ferme',
                'input_text.couleur_volet_ouvert',
                'input_text.couleur_volet_partiel',
                'input_text.couleur_volet_en_mouvement'
            ];
            for (const ce of colorEntities) {
                if (oldHass.states[ce] !== newHass.states[ce])
                    return true;
            }
            return false;
        }
        _fireEvent(type, detail) {
            const event = new CustomEvent(type, {
                bubbles: true,
                composed: true,
                detail: detail
            });
            this.dispatchEvent(event);
        }
        _handleTap(e) {
            e.stopPropagation();
            this._fireEvent('hass-more-info', { entityId: this._config.entity });
        }
        _handleAction(e, action) {
            e.stopPropagation();
            const id = this._config.entity;
            if (!id || !this._hass)
                return;
            const entity = this._hass.states[id];
            const members = entity?.attributes?.entity_id || null;
            if (action === 'open') {
                this._helper.markManualMove(id, 'opening', members, this._hass.states);
                this._hass.callService('cover', 'open_cover', { entity_id: id });
            }
            else if (action === 'stop') {
                this._helper.markManualMove(id, 'stop', members, this._hass.states);
                this._hass.callService('cover', 'stop_cover', { entity_id: id });
            }
            else if (action === 'close') {
                this._helper.markManualMove(id, 'closing', members, this._hass.states);
                this._hass.callService('cover', 'close_cover', { entity_id: id });
            }
            this._render();
        }
        _buildDom() {
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
          <button class="halo-btn" id="btn-down" title="Descendre" type="button">
            <ha-icon icon="mdi:arrow-down"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-stop" title="Arrêter" type="button">
            <ha-icon icon="mdi:stop"></ha-icon>
          </button>
          <button class="halo-btn" id="btn-up" title="Monter" type="button">
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
        _render() {
            if (!this._config || !this._hass)
                return;
            if (!this._cardEl) {
                this._buildDom();
            }
            const id = this._config.entity;
            const entity = this._hass.states[id];
            const colors = getCoverColors(this._hass, this._config);
            if (!entity) {
                if (this._unavailEl) {
                    this._unavailEl.textContent = `Entité non trouvée : ${id}`;
                    this._unavailEl.style.display = 'block';
                }
                if (this._cardEl) {
                    this._cardEl.style.display = 'none';
                }
                return;
            }
            if (this._unavailEl)
                this._unavailEl.style.display = 'none';
            if (this._cardEl)
                this._cardEl.style.display = 'flex';
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
            }
            else if (isMoving) {
                accentCol = colors.moving;
            }
            else if (isClosed) {
                accentCol = colors.closed;
            }
            else if (isOpen) {
                accentCol = colors.open;
            }
            else if (isPartial) {
                accentCol = colors.partial;
            }
            // Friendly name
            let name = this._config.name || attrs.friendly_name || 'Volet';
            name = name.replace(/^Volet\s+roulant\s+/i, '');
            // Status label
            let statusText = 'Fermé';
            if (isUnavail) {
                statusText = 'Indisponible';
            }
            else if (isMoving) {
                if (isGroup) {
                    statusText = movingCount > 1 ? `${movingCount} volets en mouvement…` : moveDir === 'closing' ? 'Fermeture…' : 'Ouverture…';
                }
                else {
                    statusText = moveDir === 'closing'
                        ? (p != null ? `Fermeture… ${100 - p} %` : 'Fermeture…')
                        : (p != null ? `Ouverture… ${p} %` : 'Ouverture…');
                }
            }
            else if (isClosed) {
                statusText = 'Fermé';
            }
            else if (isOpen) {
                statusText = 'Ouvert';
            }
            else if (isPartial) {
                statusText = `Partiel (${p}%)`;
            }
            // Closure percentage
            const closurePct = p != null ? 100 - p : isClosed ? 100 : 0;
            // Icon
            let iconName = 'mdi:window-shutter';
            if (isUnavail) {
                iconName = 'mdi:alert-circle';
            }
            else if (isMoving) {
                iconName = moveDir === 'closing' ? 'mdi:arrow-down-bold-circle' : 'mdi:arrow-up-bold-circle';
            }
            else if (isOpen || isPartial) {
                iconName = 'mdi:window-shutter-open';
            }
            else {
                iconName = 'mdi:window-shutter';
            }
            const cardStyles = getHaloCardStyles(accentCol, isUnavail, isMoving);
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
                if (this._badgeEl.style.background !== bg)
                    this._badgeEl.style.background = bg;
                if (this._badgeEl.style.border !== border)
                    this._badgeEl.style.border = border;
                if (this._badgeEl.style.boxShadow !== shadow)
                    this._badgeEl.style.boxShadow = shadow;
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
                if (this._progressFillEl.style.width !== widthStr)
                    this._progressFillEl.style.width = widthStr;
                if (this._progressFillEl.style.background !== accentCol)
                    this._progressFillEl.style.background = accentCol;
                if (this._progressFillEl.style.boxShadow !== shadow)
                    this._progressFillEl.style.boxShadow = shadow;
            }
        }
    }

    /**
     * HALO Button Card — Halo Separator Card Component
     * Sleek section divider with neon gradient line and HOLM styling.
     * High-performance persistent DOM architecture (zero flicker).
     * (c) 2026 MilesTEG1 — MIT License
     */
    class HaloSeparatorCard extends HTMLElement {
        constructor() {
            super();
            // Persistent DOM references
            this._containerEl = null;
            this._iconEl = null;
            this._titleEl = null;
            this._lineEl = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-separator-card-editor');
        }
        static getStubConfig() {
            return {
                name: 'Section',
                icon: 'mdi:bookmark'
            };
        }
        setConfig(config) {
            if (!config) {
                throw new Error('Invalid configuration');
            }
            this._config = config;
            if (this._hass) {
                this._render();
            }
        }
        set hass(hass) {
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
        getCardSize() {
            return 1;
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
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
                if (oldHass.states[te] !== newHass.states[te])
                    return true;
            }
            return false;
        }
        _buildDom() {
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
        _render() {
            if (!this._config)
                return;
            if (!this._containerEl) {
                this._buildDom();
            }
            const name = this._config.name || this._config.title || 'Section';
            const icon = this._config.icon || 'mdi:bookmark';
            const col = resolveThemeColor(this._hass, this._config.color, this._config.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
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

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/core/light-helper.ts
     * 📝 Description   : Moteur d'aide et logique métier pour custom:halo-light-card
     *                    Reproduit fidèlement les spécifications, calculs et styles
     *                    de la référence tuile_avec_sous_boutons (dashboard-eclairage/lights).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.1.0
     * 📅 Date         : 2026-10-29
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.1.0 (2026-10-29) : Alignement 1:1 strict avec tuile_avec_sous_boutons.
     *   - 💡 v1.0.0 (2026-10-29) : Création initiale du moteur light-helper.
     * ==============================================================================
     */
    /**
     * Détecte si l'entité supporte la gradation de luminosité.
     */
    function isDimmable(entity) {
        if (!entity || !entity.attributes)
            return false;
        const modes = entity.attributes.supported_color_modes;
        if (Array.isArray(modes)) {
            if (modes.length === 1 && modes[0] === 'onoff') {
                return false;
            }
            return modes.length > 0;
        }
        const features = entity.attributes.supported_features || 0;
        return (features & 1) !== 0 || entity.attributes.brightness !== undefined;
    }
    /**
     * Détecte si l'entité supporte la température de couleur (Kelvin).
     */
    function supportsColorTemp(entity) {
        if (!entity || !entity.attributes)
            return false;
        const modes = entity.attributes.supported_color_modes;
        if (Array.isArray(modes)) {
            return modes.includes('color_temp');
        }
        const features = entity.attributes.supported_features || 0;
        return (features & 2) !== 0 || entity.attributes.color_temp_kelvin !== undefined || entity.attributes.color_temp !== undefined;
    }
    /**
     * Détecte si l'entité supporte la couleur RGB / HS / XY.
     */
    function supportsColor(entity) {
        if (!entity || !entity.attributes)
            return false;
        const modes = entity.attributes.supported_color_modes;
        if (Array.isArray(modes)) {
            return modes.some(m => ['hs', 'rgb', 'rgbw', 'rgbww', 'xy'].includes(m));
        }
        const features = entity.attributes.supported_features || 0;
        return (features & 16) !== 0;
    }
    /**
     * Extrait le pourcentage de luminosité actuel (0-100%).
     */
    function getBrightnessPct(entity) {
        if (!entity || !entity.attributes || entity.state !== 'on')
            return 0;
        const b = entity.attributes.brightness;
        if (b == null)
            return 100;
        return Math.max(0, Math.min(100, Math.round((Number(b) / 255) * 100)));
    }
    /**
     * Extrait la température de couleur en Kelvin si disponible.
     */
    function getKelvin(entity) {
        if (!entity || !entity.attributes || entity.state !== 'on')
            return undefined;
        if (entity.attributes.color_temp_kelvin != null) {
            return Math.round(entity.attributes.color_temp_kelvin);
        }
        if (entity.attributes.color_temp != null) {
            const mireds = Number(entity.attributes.color_temp);
            if (mireds > 0) {
                return Math.round(1000000 / mireds);
            }
        }
        return undefined;
    }
    /**
     * Convertit une température Kelvin (1000K-40000K) en couleur RGB [r, g, b].
     */
    function kelvinToRgb(kelvin) {
        const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
        let r, g, b;
        if (temp <= 66) {
            r = 255;
        }
        else {
            r = temp - 60;
            r = 329.698727446 * Math.pow(r, -0.1332047592);
            r = Math.max(0, Math.min(255, r));
        }
        if (temp <= 66) {
            g = temp;
            g = 99.4708025861 * Math.log(g) - 161.1195681661;
            g = Math.max(0, Math.min(255, g));
        }
        else {
            g = temp - 60;
            g = 288.1221695283 * Math.pow(g, -0.0755148492);
            g = Math.max(0, Math.min(255, g));
        }
        if (temp >= 66) {
            b = 255;
        }
        else if (temp <= 19) {
            b = 0;
        }
        else {
            b = temp - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
            b = Math.max(0, Math.min(255, b));
        }
        return [Math.round(r), Math.round(g), Math.round(b)];
    }
    /**
     * Détermine la couleur RGB physique réelle émise par l'ampoule si allumée.
     */
    function getLightActualRgb(entity) {
        if (!entity || entity.state !== 'on' || !entity.attributes)
            return undefined;
        const rgb = entity.attributes.rgb_color;
        if (Array.isArray(rgb) && rgb.length === 3) {
            return [rgb[0], rgb[1], rgb[2]];
        }
        const kelvin = getKelvin(entity);
        if (kelvin != null && kelvin > 0) {
            return kelvinToRgb(kelvin);
        }
        return undefined;
    }
    /**
     * Calcule le prochain palier de luminosité pour le cycle rapide :
     * Alignement strict avec tuile_avec_sous_boutons :
     * if (cur >= 90) return 30;
     * if (cur >= 60) return 100;
     * if (cur >= 25) return 67;
     * return 100;
     */
    function getNextBrightnessPct(currentPct, isOn) {
        if (!isOn)
            return 100;
        if (currentPct >= 90)
            return 30;
        if (currentPct >= 60)
            return 100;
        if (currentPct >= 25)
            return 67;
        return 100;
    }
    /**
     * Calcule le prochain palier de température Kelvin pour le cycle rapide :
     * Alignement strict avec tuile_avec_sous_boutons :
     * if (cur >= 4500) return 2200;
     * if (cur >= 3000) return 5000;
     * if (cur >= 2400) return 3500;
     * return 2700;
     */
    function getNextKelvin(currentKelvin, isOn) {
        if (!isOn)
            return 2700;
        const cur = currentKelvin || 2700;
        if (cur >= 4500)
            return 2200;
        if (cur >= 3000)
            return 5000;
        if (cur >= 2400)
            return 3500;
        return 2700;
    }
    /**
     * Formate un nombre de Kelvins en libellé court pour le sous-bouton :
     * Math.round(Number(ct) / 100) / 10 + 'k' -> e.g. "2.7k", "3.5k", "5k", "2.2k"
     */
    function formatKelvinShort(kelvin) {
        if (kelvin == null)
            return '—';
        return Math.round(Number(kelvin) / 100) / 10 + 'k';
    }
    /**
     * Génère le statut textuel dynamique de la lumière :
     * Alignement strict avec tuile_avec_sous_boutons :
     * - 'Indisponible' si unavailable
     * - 'Inconnu' si unknown
     * - 'Éteint' si pas on
     * - 'Allumé [• X %] [• Y K]' si on
     */
    function formatLightStatus(entity) {
        if (!entity)
            return '—';
        const st = entity.state;
        if (st === 'unavailable')
            return 'Indisponible';
        if (st === 'unknown')
            return 'Inconnu';
        if (st !== 'on')
            return 'Éteint';
        const parts = ['Allumé'];
        const b = entity.attributes?.brightness;
        if (b != null) {
            const pct = Math.round((Number(b) / 255) * 100);
            parts.push(`${pct} %`);
        }
        const k = entity.attributes?.color_temp_kelvin;
        if (k != null) {
            parts.push(`${k} K`);
        }
        return parts.join(' • ');
    }
    /**
     * Résout la couleur d'accentuation dynamique de la tuile selon la configuration,
     * l'état réel de l'ampoule et le sélecteur de thème HOLM.
     */
    function getLightAccentColor(hass, config, entity) {
        const isUnavail = !entity || entity.state === 'unavailable' || entity.state === 'unknown';
        if (isUnavail)
            return '#f59e0b';
        const isOn = entity.state === 'on';
        if (!isOn) {
            if (config.color_off) {
                return toHexColor(config.color_off, '#64748b');
            }
            return '#64748b';
        }
        // Si allumé :
        // 1. Teinte avec la couleur réelle si use_light_color est true (et disponible)
        if (config.use_light_color === true) {
            const realRgb = getLightActualRgb(entity);
            if (realRgb) {
                return rgbToHex(realRgb);
            }
        }
        // 2. Couleur fixe si configurée
        if (config.color_on) {
            return toHexColor(config.color_on, '#26c6da');
        }
        // 3. Sélecteur de thème HOLM
        return resolveThemeColor(hass, undefined, config.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
    }
    /**
     * Génère les styles CSS pour le conteneur ha-card :
     * Alignement strict 1:1 avec tuile_avec_sous_boutons.
     */
    function getLightCardStyles(accentCol, isOn, isUnavail) {
        if (isUnavail) {
            return {
                background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
                border: '1px solid rgba(245, 158, 11, 0.50)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 22px rgba(0, 0, 0, 0.40), 0 0 16px rgba(245, 158, 11, 0.30)'
            };
        }
        if (isOn) {
            return {
                background: 'linear-gradient(160deg, rgba(22, 34, 48, 0.90), rgba(12, 18, 28, 0.95))',
                border: `1px solid ${accentCol}55`,
                boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 6px 20px rgba(0, 0, 0, 0.38), 0 0 14px ${accentCol}26`
            };
        }
        // Éteint : compact, sobre et discret, sans halo bleuté parasite
        return {
            background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.35)'
        };
    }

    var lightHelper = /*#__PURE__*/Object.freeze({
        __proto__: null,
        formatKelvinShort: formatKelvinShort,
        formatLightStatus: formatLightStatus,
        getBrightnessPct: getBrightnessPct,
        getKelvin: getKelvin,
        getLightAccentColor: getLightAccentColor,
        getLightActualRgb: getLightActualRgb,
        getLightCardStyles: getLightCardStyles,
        getNextBrightnessPct: getNextBrightnessPct,
        getNextKelvin: getNextKelvin,
        isDimmable: isDimmable,
        kelvinToRgb: kelvinToRgb,
        supportsColor: supportsColor,
        supportsColorTemp: supportsColorTemp
    });

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
     * 📦 Version      : 1.1.1
     * 📅 Date         : 2026-10-29
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.1.1 (2026-10-29) : Hauteur de carte calibrée à 64px constants (padding
     *                              9px 12px) et centrage vertical absolu des icônes
     *                              des sous-boutons (luminosité, kelvin, power toggle).
     *   - 💡 v1.1.0 (2026-10-29) : Alignement 1:1 strict avec tuile_avec_sous_boutons
     *                              (layout grid 44px 1fr auto auto auto, sous-boutons
     *                              sub_brightness, sub_kelvin, sub_toggle).
     *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card.
     * ==============================================================================
     */
    class HaloLightCard extends HTMLElement {
        constructor() {
            super();
            // Persistent DOM references
            this._cardEl = null;
            this._unavailEl = null;
            this._mainIconBtnEl = null;
            this._mainIconEl = null;
            this._nameEl = null;
            this._labelEl = null;
            this._subBrightnessEl = null;
            this._subBrightnessIconEl = null;
            this._subBrightnessLabelEl = null;
            this._subKelvinEl = null;
            this._subKelvinIconEl = null;
            this._subKelvinLabelEl = null;
            this._subToggleEl = null;
            this._subToggleIconEl = null;
            // Hold timer for card hold action
            this._cardHoldTimer = null;
            this._cardIsHold = false;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-light-card-editor');
        }
        static getStubConfig() {
            return {
                entity: 'light.salon'
            };
        }
        setConfig(config) {
            if (!config || !config.entity) {
                throw new Error('Please define a valid light entity (e.g. light.mon_ampoule)');
            }
            this._config = config;
            if (this._hass) {
                this._render();
            }
        }
        set hass(hass) {
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
        getCardSize() {
            return 2;
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            const id = this._config.entity;
            if (!id)
                return true;
            // Entité de la lumière
            if (oldHass.states[id] !== newHass.states[id])
                return true;
            // Entité de sous-toggle si distincte
            if (this._config.sub_toggle_entity) {
                const ste = this._config.sub_toggle_entity;
                if (oldHass.states[ste] !== newHass.states[ste])
                    return true;
            }
            // Entité de thème spécifique si configurée
            if (this._config.theme_entity) {
                const te = this._config.theme_entity;
                if (oldHass.states[te] !== newHass.states[te])
                    return true;
            }
            // Sélecteur de thème d'éclairages global HOLM
            const commonThemeEntities = [
                'input_select.couleur_theme_eclairages',
                'input_select.couleur_theme_eclairage',
                'input_select.couleur_theme_global'
            ];
            for (const te of commonThemeEntities) {
                if (oldHass.states[te] !== newHass.states[te])
                    return true;
            }
            return false;
        }
        _fireEvent(type, detail) {
            const event = new CustomEvent(type, {
                bubbles: true,
                composed: true,
                detail: detail
            });
            this.dispatchEvent(event);
        }
        _fireHaptic(type) {
            const event = new CustomEvent('haptic', {
                bubbles: true,
                composed: true,
                detail: type
            });
            window.dispatchEvent(event);
        }
        // --- Gestionnaires d'actions ---
        _handleMoreInfo(e) {
            e.stopPropagation();
            const id = this._config.entity;
            if (!id)
                return;
            this._fireHaptic('light');
            this._fireEvent('hass-more-info', { entityId: id });
        }
        _handleMainIconToggle(e) {
            e.stopPropagation();
            const id = this._config.entity;
            if (!id || !this._hass)
                return;
            this._fireHaptic('light');
            this._hass.callService('light', 'toggle', { entity_id: id });
        }
        _handleSubToggle(e) {
            e.stopPropagation();
            const id = this._config.sub_toggle_entity || this._config.entity;
            if (!id || !this._hass)
                return;
            this._fireHaptic('light');
            const domain = id.split('.')[0] || 'light';
            this._hass.callService(domain, 'toggle', { entity_id: id });
        }
        _handleBrightnessCycle(e) {
            e.stopPropagation();
            const id = this._config.entity;
            if (!id || !this._hass)
                return;
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
        _handleKelvinCycle(e) {
            e.stopPropagation();
            const id = this._config.entity;
            if (!id || !this._hass)
                return;
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
        _onCardPointerDown(e) {
            // Si l'utilisateur clique sur un sous-bouton ou le main-icon, ne pas armer le hold de la carte
            const target = e.target;
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
        _onCardPointerUp(e) {
            const target = e.target;
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
        _onCardPointerCancel() {
            if (this._cardHoldTimer) {
                clearTimeout(this._cardHoldTimer);
                this._cardHoldTimer = null;
            }
        }
        _buildDom() {
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
        <div class="main-icon-btn" id="main-icon-btn" role="button" tabindex="0" title="Basculer">
          <ha-icon id="main-icon"></ha-icon>
        </div>

        <div class="light-info" id="light-info" role="button" tabindex="0" title="Détails">
          <div class="light-name" id="light-name"></div>
          <div class="light-label" id="light-label"></div>
        </div>

        <div class="sub-buttons-container" id="sub-buttons-container">
          <div class="sub-btn sub-brightness" id="sub-brightness" role="button" tabindex="0" title="Cycle luminosité">
            <ha-icon icon="mdi:white-balance-sunny" id="sub-brightness-icon"></ha-icon>
            <span id="sub-brightness-label"></span>
          </div>

          <div class="sub-btn sub-kelvin" id="sub-kelvin" role="button" tabindex="0" title="Cycle température">
            <ha-icon icon="mdi:palette-outline" id="sub-kelvin-icon"></ha-icon>
            <span id="sub-kelvin-label"></span>
          </div>

          <div class="sub-btn sub-toggle" id="sub-toggle" role="button" tabindex="0" title="Marche / Arrêt">
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
        _render() {
            if (!this._config || !this._hass)
                return;
            if (!this._cardEl) {
                this._buildDom();
            }
            const id = this._config.entity;
            const entity = this._hass.states[id];
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
            if (this._unavailEl)
                this._unavailEl.style.display = 'none';
            if (this._cardEl)
                this._cardEl.style.display = 'grid';
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
                }
                else if (isOn) {
                    iconBg = `${accentCol}26`;
                    iconBorder = `1px solid ${accentCol}66`;
                    iconShadow = `0 0 10px ${accentCol}40`;
                    iconCol = accentCol;
                }
                if (this._mainIconBtnEl.style.background !== iconBg)
                    this._mainIconBtnEl.style.background = iconBg;
                if (this._mainIconBtnEl.style.border !== iconBorder)
                    this._mainIconBtnEl.style.border = iconBorder;
                if (this._mainIconBtnEl.style.boxShadow !== iconShadow)
                    this._mainIconBtnEl.style.boxShadow = iconShadow;
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
                const name = this._config.name || attrs.friendly_name || 'Éclairage';
                if (this._nameEl.textContent !== name) {
                    this._nameEl.textContent = name;
                }
            }
            // 4. Label (statut textuel "Allumé • 80 % • 2700 K" ou "Éteint")
            if (this._labelEl) {
                const statusText = formatLightStatus(entity);
                if (this._labelEl.textContent !== statusText) {
                    this._labelEl.textContent = statusText;
                }
            }
            // 5. Sous-bouton 1 : Luminosité (%)
            const showBrightness = dimmable &&
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
                    if (this._subBrightnessEl.style.background !== bBg)
                        this._subBrightnessEl.style.background = bBg;
                    if (this._subBrightnessEl.style.border !== bBorder)
                        this._subBrightnessEl.style.border = bBorder;
                    if (this._subBrightnessIconEl && this._subBrightnessIconEl.style.color !== bIconCol) {
                        this._subBrightnessIconEl.style.color = bIconCol;
                    }
                    if (this._subBrightnessLabelEl) {
                        if (this._subBrightnessLabelEl.style.color !== bLabelCol)
                            this._subBrightnessLabelEl.style.color = bLabelCol;
                        if (this._subBrightnessLabelEl.textContent !== bText)
                            this._subBrightnessLabelEl.textContent = bText;
                    }
                }
            }
            // 6. Sous-bouton 2 : Température Kelvin (K)
            const showKelvin = colorTempSupported &&
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
                    if (this._subKelvinEl.style.background !== kBg)
                        this._subKelvinEl.style.background = kBg;
                    if (this._subKelvinEl.style.border !== kBorder)
                        this._subKelvinEl.style.border = kBorder;
                    if (this._subKelvinIconEl && this._subKelvinIconEl.style.color !== kIconCol) {
                        this._subKelvinIconEl.style.color = kIconCol;
                    }
                    if (this._subKelvinLabelEl) {
                        if (this._subKelvinLabelEl.style.color !== kLabelCol)
                            this._subKelvinLabelEl.style.color = kLabelCol;
                        if (this._subKelvinLabelEl.textContent !== kText)
                            this._subKelvinLabelEl.textContent = kText;
                    }
                }
            }
            // 7. Sous-bouton 3 : Power Toggle
            const showToggle = this._config.show_toggle !== false &&
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
                    if (this._subToggleEl.style.background !== tBg)
                        this._subToggleEl.style.background = tBg;
                    if (this._subToggleEl.style.border !== tBorder)
                        this._subToggleEl.style.border = tBorder;
                    if (this._subToggleEl.style.boxShadow !== tShadow)
                        this._subToggleEl.style.boxShadow = tShadow;
                    if (this._subToggleIconEl && this._subToggleIconEl.style.color !== tIconCol) {
                        this._subToggleIconEl.style.color = tIconCol;
                    }
                }
            }
        }
    }

    /**
     * HALO Button Card — Halo Cover Card UI Editor
     * Visual GUI editor powered by native Home Assistant <ha-form>.
     * (c) 2026 MilesTEG1 — MIT License
     */
    const COLOR_KEYS$1 = ['color_closed', 'color_open', 'color_partial', 'color_moving'];
    const SCHEMA$2 = [
        {
            name: 'entity',
            label: 'Entité Volet ou Groupe',
            selector: { entity: { domain: 'cover' } }
        },
        {
            name: 'name',
            label: 'Nom personnalisé (optionnel)',
            selector: { text: {} }
        },
        {
            type: 'grid',
            name: '',
            schema: [
                {
                    name: 'color_closed',
                    label: 'Couleur Fermé (optionnel)',
                    selector: { color_rgb: {} }
                },
                {
                    name: 'color_open',
                    label: 'Couleur Ouvert (optionnel)',
                    selector: { color_rgb: {} }
                },
                {
                    name: 'color_partial',
                    label: 'Couleur Partiel (optionnel)',
                    selector: { color_rgb: {} }
                },
                {
                    name: 'color_moving',
                    label: 'Couleur En mouvement (optionnel)',
                    selector: { color_rgb: {} }
                }
            ]
        }
    ];
    class HaloCoverCardEditor extends HTMLElement {
        setConfig(config) {
            this._config = { ...config };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            const form = this.querySelector('ha-form');
            if (form) {
                form.hass = hass;
            }
        }
        _formData() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            for (const k of COLOR_KEYS$1) {
                if (data[k] && typeof data[k] === 'string') {
                    const rgb = hexToRgb(data[k]);
                    if (rgb)
                        data[k] = rgb;
                }
            }
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            const val = { ...ev.detail.value };
            for (const k of COLOR_KEYS$1) {
                if (val[k] && Array.isArray(val[k])) {
                    val[k] = rgbToHex(val[k]);
                }
            }
            this._config = {
                ...this._config,
                ...val
            };
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('ha-form');
            if (!form) {
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    form.schema = SCHEMA$2;
                    form.data = this._formData();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
            }
            else {
                form.data = this._formData();
                if (this._hass)
                    form.hass = this._hass;
            }
        }
    }

    /**
     * HALO Button Card — Halo Separator Card UI Editor
     * Visual GUI editor powered by native Home Assistant <ha-form>.
     * (c) 2026 MilesTEG1 — MIT License
     */
    const SCHEMA$1 = [
        {
            name: 'name',
            label: 'Titre de la section',
            selector: { text: {} }
        },
        {
            name: 'icon',
            label: 'Icône',
            selector: { icon: {} }
        },
        {
            name: 'color',
            label: 'Couleur personnalisée (optionnel)',
            selector: { color_rgb: {} }
        },
        {
            name: 'theme_entity',
            label: 'Entité sélecteur de thème (optionnel)',
            selector: { entity: { domain: 'input_select' } }
        }
    ];
    class HaloSeparatorCardEditor extends HTMLElement {
        setConfig(config) {
            this._config = { ...config };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            const form = this.querySelector('ha-form');
            if (form) {
                form.hass = hass;
            }
        }
        _formData() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            if (data.color && typeof data.color === 'string') {
                const rgb = hexToRgb(data.color);
                if (rgb)
                    data.color = rgb;
            }
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            const val = { ...ev.detail.value };
            if (val.color && Array.isArray(val.color)) {
                val.color = rgbToHex(val.color);
            }
            this._config = {
                ...this._config,
                ...val
            };
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('ha-form');
            if (!form) {
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    form.schema = SCHEMA$1;
                    form.data = this._formData();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
            }
            else {
                form.data = this._formData();
                if (this._hass)
                    form.hass = this._hass;
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-light-card-editor.ts
     * 📝 Description   : Éditeur visuel pour custom:halo-light-card
     *                    Propulsé par le composant natif Home Assistant <ha-form>.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.1.0
     * 📅 Date         : 2026-10-29
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.1.0 (2026-10-29) : Alignement des sélecteurs sur les sous-boutons HOLM.
     *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card-editor.
     * ==============================================================================
     */
    const COLOR_KEYS = ['color_on', 'color_off'];
    const SCHEMA = [
        {
            name: 'entity',
            label: 'Entité Lumière ou Groupe d’éclairages',
            selector: { entity: { domain: 'light' } }
        },
        {
            name: 'name',
            label: 'Nom personnalisé (optionnel)',
            selector: { text: {} }
        },
        {
            name: 'icon',
            label: 'Icône personnalisée (optionnel)',
            selector: { icon: {} }
        },
        {
            name: 'sub_toggle_entity',
            label: 'Entité dédiée pour le bouton Power (optionnel)',
            selector: { entity: {} }
        },
        {
            name: 'use_light_color',
            label: 'Teinter la tuile avec la couleur réelle de l’ampoule (RGB / Kelvin)',
            selector: { boolean: {} }
        },
        {
            name: 'theme_entity',
            label: 'Entité sélecteur de thème (défaut : input_select.couleur_theme_eclairages)',
            selector: { entity: { domain: 'input_select' } }
        },
        {
            type: 'grid',
            name: '',
            schema: [
                {
                    name: 'color_on',
                    label: 'Couleur Allumé personnalisée',
                    selector: { color_rgb: {} }
                },
                {
                    name: 'color_off',
                    label: 'Couleur Éteint personnalisée',
                    selector: { color_rgb: {} }
                }
            ]
        },
        {
            type: 'grid',
            name: '',
            schema: [
                {
                    name: 'show_brightness',
                    label: 'Sous-bouton Luminosité (%)',
                    selector: { boolean: {} }
                },
                {
                    name: 'show_kelvin',
                    label: 'Sous-bouton Température (K)',
                    selector: { boolean: {} }
                },
                {
                    name: 'show_toggle',
                    label: 'Sous-bouton Power (On/Off)',
                    selector: { boolean: {} }
                }
            ]
        }
    ];
    class HaloLightCardEditor extends HTMLElement {
        setConfig(config) {
            this._config = {
                use_light_color: false,
                show_brightness: true,
                show_kelvin: true,
                show_toggle: true,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            const form = this.querySelector('ha-form');
            if (form) {
                form.hass = hass;
            }
        }
        _formData() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            for (const k of COLOR_KEYS) {
                if (data[k] && typeof data[k] === 'string') {
                    const rgb = hexToRgb(data[k]);
                    if (rgb)
                        data[k] = rgb;
                }
            }
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            const val = { ...ev.detail.value };
            for (const k of COLOR_KEYS) {
                if (val[k] && Array.isArray(val[k])) {
                    val[k] = rgbToHex(val[k]);
                }
            }
            this._config = {
                ...this._config,
                ...val
            };
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('ha-form');
            if (!form) {
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    form.schema = SCHEMA;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
            }
            if (form) {
                form.hass = this._hass;
                form.data = this._formData();
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/halo-button-card.ts
     * 📝 Description   : Point d'entrée principal de la suite HALO Button Card.
     *                    Déclaration et enregistrement des Web Components Lovelace,
     *                    enregistrement dans le catalogue Home Assistant (window.customCards)
     *                    et exportation des composants et moteurs d'aide.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.1.0
     * 📅 Date         : 2026-10-30
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.1.0 (2026-10-30) : Intégration de custom:halo-light-card, éditeur visuel UI, calibrage 64px et bundle lisible/non-minifié.
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale avec halo-cover-card et halo-separator-card.
     * ==============================================================================
     */
    const VERSION = '1.1.0';
    console.info(`%c  HALO-BUTTON-CARD  %c v${VERSION} `, 'color: #0b0f19; background: #26c6da; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;', 'color: #ffffff; background: #1e293b; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;');
    window.customCards = window.customCards || [];
    window.customCards.push({
        type: 'halo-cover-card',
        name: 'HALO Cover Card',
        description: 'Turnkey roller shutter card with Liquid Glass styling and dynamic glowing halo.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-light-card',
        name: 'HALO Light Card',
        description: 'Turnkey unified lighting tile with HOLM glass styling, dynamic halo, brightness and kelvin sub-buttons.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-separator-card',
        name: 'HALO Separator Card',
        description: 'Sleek section divider with neon gradient line and HOLM styling.',
        preview: true
    });
    // Register Web Component custom elements
    if (!customElements.get('halo-cover-card')) {
        customElements.define('halo-cover-card', HaloCoverCard);
    }
    if (!customElements.get('halo-cover-card-editor')) {
        customElements.define('halo-cover-card-editor', HaloCoverCardEditor);
    }
    if (!customElements.get('halo-light-card')) {
        customElements.define('halo-light-card', HaloLightCard);
    }
    if (!customElements.get('halo-light-card-editor')) {
        customElements.define('halo-light-card-editor', HaloLightCardEditor);
    }
    if (!customElements.get('halo-separator-card')) {
        customElements.define('halo-separator-card', HaloSeparatorCard);
    }
    if (!customElements.get('halo-separator-card-editor')) {
        customElements.define('halo-separator-card-editor', HaloSeparatorCardEditor);
    }

    exports.HaloCoverCard = HaloCoverCard;
    exports.HaloCoverCardEditor = HaloCoverCardEditor;
    exports.HaloLightCard = HaloLightCard;
    exports.HaloLightCardEditor = HaloLightCardEditor;
    exports.HaloSeparatorCard = HaloSeparatorCard;
    exports.HaloSeparatorCardEditor = HaloSeparatorCardEditor;
    exports.lightHelper = lightHelper;
    exports.voletHelperInstance = voletHelperInstance;

    return exports;

})({});
