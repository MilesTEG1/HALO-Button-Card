var HaloButtonCard = (function (exports) {
    'use strict';

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/core/theme-helper.ts
     * 📝 Description   : Moteur de thème en cascade et de style Liquid Glass HALO.
     *                    Résolution des teintes (Hex, RGB, noms de palette HALO,
     *                    entités Home Assistant `input_select` / `input_text`) et
     *                    génération dynamique des feuilles CSS des cartes.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`) et renommage de la teinte `Cyan`.
     *   - ✨ v1.3.0 (2026-10-30) : Support de l'épaisseur de bordure paramétrable (`border_width`).
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale du moteur de thème et de styles.
     * ==============================================================================
     */
    const HALO_PALETTE = {
        'Cyan': '#26c6da',
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
        if (HALO_PALETTE[hex]) {
            hex = HALO_PALETTE[hex];
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
            const trimmed = color.trim();
            if (HALO_PALETTE[trimmed])
                return HALO_PALETTE[trimmed];
            if (trimmed.startsWith('#')) {
                const clean = trimmed.replace('#', '');
                if (clean.length === 3) {
                    return '#' + clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
                }
                if (clean.length >= 6) {
                    return '#' + clean.substring(0, 6);
                }
            }
            if (trimmed.startsWith('rgb')) {
                const match = trimmed.match(/\d+/g);
                if (match && match.length >= 3) {
                    return rgbToHex([parseInt(match[0], 10), parseInt(match[1], 10), parseInt(match[2], 10)]);
                }
            }
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
            if (HALO_PALETTE[val])
                return HALO_PALETTE[val];
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
            if (st && HALO_PALETTE[st])
                return HALO_PALETTE[st];
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
    function getHaloCardStyles(accentCol, isUnavail, isMoving, borderWidth) {
        const bw = (typeof borderWidth === 'number' && !isNaN(borderWidth)) ? borderWidth : 1.5;
        const borderStr = (color) => bw > 0 ? `${bw}px solid ${color}` : 'none';
        if (isUnavail) {
            return {
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(20, 28, 38, 0.90))',
                border: borderStr('#f59e0b'),
                boxShadow: '0 0 18px rgba(245, 158, 11, 0.55), 0 0 6px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.20)'
            };
        }
        if (isMoving) {
            return {
                background: `linear-gradient(135deg, ${accentCol}26, rgba(20, 28, 38, 0.90))`,
                border: borderStr(accentCol),
                boxShadow: `0 0 22px ${accentCol}77, 0 0 8px ${accentCol}55, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
            };
        }
        return {
            background: `linear-gradient(135deg, ${accentCol}1A, rgba(20, 28, 38, 0.88))`,
            border: borderStr(accentCol),
            boxShadow: `0 0 18px ${accentCol}60, 0 0 6px ${accentCol}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`
        };
    }

    var themeHelper = /*#__PURE__*/Object.freeze({
        __proto__: null,
        HALO_PALETTE: HALO_PALETTE,
        getCoverColors: getCoverColors,
        getHaloCardStyles: getHaloCardStyles,
        hexToRgb: hexToRgb,
        resolveThemeColor: resolveThemeColor,
        rgbToHex: rgbToHex,
        toHexColor: toHexColor
    });

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/core/action-handler.ts
     * 📝 Description   : Moteur universel de gestion des interactions tactiles et
     *                    exécution des actions Home Assistant (tap, hold, double-tap,
     *                    call-service, more-info, navigate, url, toggle, confirmation).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.2.0
     * 📅 Date         : 2026-10-30
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale du moteur d'actions universel HALO.
     * ==============================================================================
     */
    function fireHaptic(type = 'light') {
        const event = new CustomEvent('haptic', {
            bubbles: true,
            composed: true,
            detail: type
        });
        window.dispatchEvent(event);
    }
    function fireEvent(node, type, detail) {
        const event = new CustomEvent(type, {
            bubbles: true,
            composed: true,
            detail: detail
        });
        node.dispatchEvent(event);
    }
    async function handleAction(node, hass, config, defaultEntityId) {
        if (!config || !hass)
            return;
        const action = config.action || (config.service ? 'call-service' : (defaultEntityId ? 'more-info' : 'none'));
        if (action === 'none')
            return;
        // Confirmation dialog
        if (config.confirmation) {
            const text = typeof config.confirmation === 'string'
                ? config.confirmation
                : (config.confirmation.text || 'Confirmer l\'action ?');
            if (!window.confirm(text)) {
                return;
            }
        }
        fireHaptic('light');
        switch (action) {
            case 'call-service':
            case 'perform-action': {
                const fullService = config.service || config.perform_action;
                if (!fullService)
                    return;
                const [domain, service] = fullService.split('.');
                const serviceData = {
                    ...(config.data || config.service_data || {})
                };
                if (config.target) {
                    Object.assign(serviceData, config.target);
                }
                else if (!serviceData.entity_id && (config.entity || defaultEntityId)) {
                    serviceData.entity_id = config.entity || defaultEntityId;
                }
                await hass.callService(domain, service, serviceData);
                break;
            }
            case 'toggle': {
                const targetEntity = config.entity || defaultEntityId;
                if (!targetEntity)
                    return;
                const domain = targetEntity.split('.')[0] || 'homeassistant';
                await hass.callService(domain, 'toggle', { entity_id: targetEntity });
                break;
            }
            case 'more-info': {
                const targetEntity = config.entity || defaultEntityId;
                if (!targetEntity)
                    return;
                fireEvent(node, 'hass-more-info', { entityId: targetEntity });
                break;
            }
            case 'navigate': {
                const path = config.navigation_path;
                if (!path)
                    return;
                window.history.pushState(null, '', path);
                const navEvent = new CustomEvent('location-changed', {
                    bubbles: true,
                    composed: true
                });
                window.dispatchEvent(navEvent);
                break;
            }
            case 'url': {
                const url = config.url_path;
                if (!url)
                    return;
                window.open(url, '_blank');
                break;
            }
            default:
                console.warn('[HALO ActionHandler] Action non prise en charge :', action);
        }
    }
    function bindTouchActions(el, handlers, holdDurationMs = 500, doubleTapThresholdMs = 280) {
        let holdTimer = null;
        let isHold = false;
        let lastTapTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        let hasMoved = false;
        const onPointerDown = (e) => {
            // Ne gérer que le clic principal gauche ou tactile
            if (e.button !== 0)
                return;
            touchStartPos = { x: e.clientX, y: e.clientY };
            hasMoved = false;
            isHold = false;
            if (handlers.onHold) {
                holdTimer = setTimeout(() => {
                    isHold = true;
                    fireHaptic('heavy');
                    handlers.onHold?.();
                }, holdDurationMs);
            }
        };
        const onPointerMove = (e) => {
            if (!holdTimer)
                return;
            const dx = Math.abs(e.clientX - touchStartPos.x);
            const dy = Math.abs(e.clientY - touchStartPos.y);
            if (dx > 10 || dy > 10) {
                hasMoved = true;
                clearTimeout(holdTimer);
                holdTimer = null;
            }
        };
        const onPointerUp = (e) => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            if (isHold || hasMoved) {
                return;
            }
            const now = Date.now();
            if (handlers.onDoubleTap && now - lastTapTime < doubleTapThresholdMs) {
                lastTapTime = 0;
                handlers.onDoubleTap();
                return;
            }
            lastTapTime = now;
            if (handlers.onTap) {
                // S'il y a un handler de double tap, on peut attendre légèrement ou appeler onTap si pas de double-tap
                if (handlers.onDoubleTap) {
                    setTimeout(() => {
                        if (Date.now() - lastTapTime >= doubleTapThresholdMs - 20 && lastTapTime !== 0) {
                            handlers.onTap?.();
                            lastTapTime = 0;
                        }
                    }, doubleTapThresholdMs);
                }
                else {
                    handlers.onTap();
                }
            }
        };
        const onPointerCancel = () => {
            if (holdTimer) {
                clearTimeout(holdTimer);
                holdTimer = null;
            }
            isHold = false;
        };
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerCancel);
        // Return unbind callback
        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerCancel);
        };
    }

    var actionHandler = /*#__PURE__*/Object.freeze({
        __proto__: null,
        bindTouchActions: bindTouchActions,
        fireEvent: fireEvent,
        fireHaptic: fireHaptic,
        handleAction: handleAction
    });

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/components/halo-button-card.ts
     * 📝 Description   : Composant Web custom:halo-button-card.
     *                    Bouton multi-usage universel Liquid Glass avec halo spéculaire,
     *                    mises en page horizontale/verticale, dissociation d'actions icône/carte,
     *                    et support complet des sous-boutons interactifs.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.5.0
     * 📅 Date         : 2026-11-01
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ✨ v1.5.0 (2026-11-01) : Support de `linked_entity`, `linked_attribute` et
     *                              `display_format` (date_short, date_long, date_time_fr,
     *                              time_only, relative) pour l'affichage de valeurs externes
     *                              (ex. input_datetime) dans le sous-titre.
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO.
     *   - 🩹 v1.2.1 (2026-10-30) : Ajout du contour net (border 1.5px solid) et
     *                              du halo lumineux permanent (box-shadow) sur ha-card.
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de halo-button-card polyvalente.
     * ==============================================================================
     */
    class HaloButtonCard extends HTMLElement {
        constructor() {
            super();
            // Persistent DOM references
            this._cardEl = null;
            this._iconBtnEl = null;
            this._iconEl = null;
            this._textColEl = null;
            this._titleEl = null;
            this._subtitleEl = null;
            this._subButtonsContainerEl = null;
            this._subButtonEls = [];
            // Cleanup touch bindings
            this._unbindCardTouch = null;
            this._unbindIconTouch = null;
            this._unbindSubTouch = [];
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-button-card-editor');
        }
        static getStubConfig() {
            return {
                name: 'Bouton HALO',
                label: 'Description du bouton',
                icon: 'mdi:gesture-tap-button',
                layout: 'horizontal',
                color: 'Cyan',
                tap_action: {
                    action: 'toggle'
                }
            };
        }
        setConfig(config) {
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
            return this._config?.layout === 'vertical' ? 2 : 1;
        }
        disconnectedCallback() {
            this._cleanupBindings();
        }
        _cleanupBindings() {
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
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            // Entité principale
            if (this._config.entity) {
                if (oldHass.states[this._config.entity] !== newHass.states[this._config.entity]) {
                    return true;
                }
            }
            // Entité liée
            if (this._config.linked_entity) {
                if (oldHass.states[this._config.linked_entity] !== newHass.states[this._config.linked_entity]) {
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
            // Thèmes globaux HALO
            const commonThemeEntities = [
                'input_select.couleur_theme_eclairages',
                'input_select.couleur_theme_ouvertures',
                'input_select.couleur_theme_chauffage',
                'input_select.couleur_theme_global'
            ];
            for (const te of commonThemeEntities) {
                if (oldHass.states[te] !== newHass.states[te])
                    return true;
            }
            return false;
        }
        _getEffectiveColor() {
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
            return resolveThemeColor(this._hass, undefined, this._config.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
        }
        _buildDom() {
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
          filter: brightness(1.05);
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
        _render() {
            if (!this._config)
                return;
            if (!this._cardEl) {
                this._buildDom();
            }
            const color = this._getEffectiveColor();
            const layout = this._config.layout || 'horizontal';
            const isVertical = layout === 'vertical';
            // Classes & Layout
            this._cardEl.className = isVertical ? 'layout-vertical' : 'layout-horizontal';
            // Card styling (Border & Glowing Specular Halo)
            const bw = (typeof this._config.border_width === 'number' && !isNaN(this._config.border_width))
                ? this._config.border_width
                : 1.5;
            const cardBorder = bw > 0 ? `${bw}px solid ${color}` : 'none';
            const cardShadow = `0 0 18px ${color}60, 0 0 6px ${color}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;
            if (this._cardEl.style.border !== cardBorder) {
                this._cardEl.style.border = cardBorder;
            }
            if (this._cardEl.style.boxShadow !== cardShadow) {
                this._cardEl.style.boxShadow = cardShadow;
            }
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
            if (!icon)
                icon = 'mdi:gesture-tap-button';
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
            let subtitle = this._config.label || this._config.subtitle;
            const linkedVal = this._formatLinkedValue();
            if (linkedVal !== null) {
                subtitle = subtitle ? `${subtitle} • ${linkedVal}` : linkedVal;
            }
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
        _renderSubButtons(cardColor) {
            if (!this._subButtonsContainerEl)
                return;
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
                this._subButtonsContainerEl.appendChild(btnEl);
                this._subButtonEls.push(btnEl);
            });
        }
        _formatLinkedValue() {
            if (!this._config.linked_entity || !this._hass?.states?.[this._config.linked_entity]) {
                return null;
            }
            const stateObj = this._hass.states[this._config.linked_entity];
            let rawValue;
            if (this._config.linked_attribute && stateObj.attributes) {
                rawValue = stateObj.attributes[this._config.linked_attribute];
            }
            else {
                rawValue = stateObj.state;
            }
            if (rawValue === undefined || rawValue === null || rawValue === 'unavailable' || rawValue === 'unknown') {
                return String(rawValue ?? '');
            }
            const fmt = this._config.display_format || 'raw';
            if (fmt === 'raw')
                return String(rawValue);
            // Tentative de parsing Date
            const d = new Date(rawValue);
            if (isNaN(d.getTime())) {
                return String(rawValue);
            }
            const lang = this._hass.locale?.language || this._hass.language || 'fr';
            switch (fmt) {
                case 'date_short':
                    return d.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' });
                case 'date_long':
                    return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
                case 'date_time_fr':
                    return `${d.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}`;
                case 'time_only':
                    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
                case 'relative': {
                    const now = Date.now();
                    const diffSec = Math.round((d.getTime() - now) / 1000);
                    try {
                        const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
                        if (Math.abs(diffSec) < 60)
                            return rtf.format(diffSec, 'second');
                        if (Math.abs(diffSec) < 3600)
                            return rtf.format(Math.round(diffSec / 60), 'minute');
                        if (Math.abs(diffSec) < 86400)
                            return rtf.format(Math.round(diffSec / 3600), 'hour');
                        return rtf.format(Math.round(diffSec / 86400), 'day');
                    }
                    catch {
                        return `${d.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })}`;
                    }
                }
                default:
                    return String(rawValue);
            }
        }
        _bindInteractions() {
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
                        }
                        else {
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
                    if (!el)
                        return;
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

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/editor-styles.ts
     * 📝 Description   : Styles partagés optimisés pour les éditeurs visuels de la
     *                    suite HALO Cards (halo-button-card, halo-cover-card,
     *                    halo-light-card).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO.
     *   - ✨ v1.3.1 (2026-10-30) : Standardisation des styles d'éditeurs partagés
     *                              (Mix A+B Nuancier HALO & curseur de bordure)
     *                              pour halo-button-card, halo-cover-card et halo-light-card.
     * ==============================================================================
     */
    const COMMON_EDITOR_STYLES = `
  .halo-editor-wrap {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 0 12px 0;
    box-sizing: border-box;
  }
  .halo-style-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 14px 16px;
    background: linear-gradient(145deg, rgba(20, 28, 38, 0.70), rgba(10, 15, 22, 0.90));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    box-sizing: border-box;
  }
  .halo-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 600;
    color: #e2e8f0;
  }
  .halo-section-header ha-icon {
    --mdc-icon-size: 18px;
    color: #26c6da;
  }
  .halo-state-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 2px;
  }
  .halo-state-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 11px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    font-size: 11.5px;
    font-weight: 500;
    color: rgba(226, 232, 240, 0.85);
    transition: all 0.2s ease;
  }
  .halo-state-tab ha-icon {
    --mdc-icon-size: 15px;
    opacity: 0.8;
  }
  .halo-state-tab:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.16);
  }
  .halo-state-tab.active {
    background: rgba(38, 198, 218, 0.16);
    border-color: #26c6da;
    color: #ffffff;
    font-weight: 600;
    box-shadow: 0 0 8px rgba(38, 198, 218, 0.25);
  }
  .halo-state-tab.active ha-icon {
    color: #26c6da;
    opacity: 1;
  }
  .halo-state-tab-dot {
    width: 8px;
    height: 8px;
    min-width: 8px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
    transition: background-color 0.2s ease, box-shadow 0.2s ease;
  }
  .halo-style-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    align-items: stretch;
  }
  @media (max-width: 520px) {
    .halo-style-grid {
      grid-template-columns: 1fr;
    }
  }
  .halo-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .halo-col-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 22px;
  }
  .halo-col-title {
    font-size: 12px;
    font-weight: 600;
    color: rgba(226, 232, 240, 0.90);
  }
  .halo-badge-val {
    font-size: 11px;
    font-weight: 700;
    color: #26c6da;
    background: rgba(38, 198, 218, 0.15);
    border: 1px solid rgba(38, 198, 218, 0.35);
    border-radius: 6px;
    padding: 1px 6px;
  }
  .halo-swatch-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    min-height: 44px;
    box-sizing: border-box;
  }
  .halo-swatch-circle-wrap {
    position: relative;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .halo-swatch-circle {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.5);
    box-sizing: border-box;
    transition: transform 0.15s ease, box-shadow 0.25s ease;
  }
  .halo-swatch-circle:hover {
    transform: scale(1.1);
  }
  .hidden-color-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    pointer-events: none;
  }
  .halo-swatch-meta {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .halo-color-title {
    font-size: 12px;
    font-weight: 600;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
  }
  .halo-color-hex {
    font-size: 10.5px;
    font-family: monospace;
    color: rgba(226, 232, 240, 0.60);
  }
  .halo-pipette-btn {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #e2e8f0;
    cursor: pointer;
    padding: 5px 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, transform 0.1s ease;
  }
  .halo-pipette-btn:hover {
    background: rgba(255, 255, 255, 0.16);
    transform: scale(1.05);
  }
  .halo-pipette-btn ha-icon {
    --mdc-icon-size: 16px;
    width: 16px;
    height: 16px;
  }
  .halo-chips-label {
    font-size: 10.5px;
    color: rgba(226, 232, 240, 0.55);
    margin-top: 2px;
  }
  .halo-chips-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .halo-chip {
    width: 20px;
    height: 20px;
    min-width: 20px;
    border-radius: 50%;
    cursor: pointer;
    box-sizing: border-box;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .halo-chip:hover {
    transform: scale(1.22);
    box-shadow: 0 0 6px currentColor;
  }
  .halo-chip.active {
    transform: scale(1.25);
    border: 2px solid #ffffff;
    box-shadow: 0 0 10px currentColor;
  }
  .halo-border-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    height: 100%;
    box-sizing: border-box;
  }
  .halo-range-slider {
    width: 100%;
    height: 6px;
    accent-color: #26c6da;
    cursor: pointer;
    margin: 4px 0;
  }
  .slider-ticks {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: rgba(226, 232, 240, 0.55);
    line-height: 1.2;
  }
`;

    var en = {
      "state": {
        "on": "On",
        "off": "Off",
        "unavailable": "Unavailable",
        "unknown": "Unknown",
        "closed": "Closed",
        "open": "Open",
        "partial": "Partial",
        "moving": "Moving"
      },
      "cover": {
        "default_name": "Shutter",
        "opening": "Opening…",
        "closing": "Closing…",
        "opening_pct": "Opening… {pct} %",
        "closing_pct": "Closing… {pct} %",
        "moving_n": "{count} shutters moving…",
        "partial_pct": "Partial ({pct}%)",
        "not_found": "Entity not found: {id}",
        "down": "Lower",
        "stop": "Stop",
        "up": "Raise"
      },
      "light": {
        "default_name": "Light",
        "not_found": "Entity not found: {id}",
        "toggle": "Toggle",
        "details": "Details",
        "cycle_brightness": "Cycle brightness",
        "cycle_kelvin": "Cycle color temperature",
        "power": "On / Off"
      },
      "cover_color": {
        "title": "Shutter State Colors",
        "closed": "Shutter Closed",
        "partial": "Shutter Partial",
        "open": "Shutter Open",
        "moving": "Moving"
      },
      "separator": {
        "section": "Section",
        "hide": "Hide",
        "show": "Show",
        "lg_icon": "Left icon",
        "lg_icon_d": " : On / Off",
        "lg_pct": "Badge %",
        "lg_pct_d": " : 30 / 67 / 100%",
        "lg_k": "Badge K",
        "lg_k_d": " : Warm / Cool",
        "lg_name": "Tile name",
        "lg_name_d": " : Light details"
      },
      "halo": {
        "Cyan": "Cyan",
        "Bleu Céleste": "Sky Blue",
        "Saphir Océan": "Ocean Sapphire",
        "Menthe Givrée": "Frosted Mint",
        "Émeraude": "Emerald",
        "Vert Lime": "Lime Green",
        "Jaune Soleil": "Sunshine Yellow",
        "Ambre Doré": "Golden Amber",
        "Orange Flamme": "Flame Orange",
        "Corail Pêche": "Peach Coral",
        "Rose Rubis": "Ruby Pink",
        "Rose Bonbon": "Candy Pink",
        "Fuchsia Néon": "Neon Fuchsia",
        "Améthyste": "Amethyst",
        "Violet Nuit": "Night Violet",
        "Blanc Glace": "Ice White"
      },
      "editor": {
        "style_title": "Visual Customization (Halo & Border)",
        "style_title_colors": "Visual Customization (Halo, Colors & Border)",
        "halo_color": "Halo & Button Color",
        "state_color": "Color: {state}",
        "open_palette": "Open the free palette",
        "open_wheel": "Open the color wheel",
        "chips_label": "Official HALO palette (quick pick):",
        "border_title": "Border thickness",
        "border_title_single": "Border thickness (single)",
        "border_none": "No border",
        "border_default": "Default",
        "border_max": "Max",
        "border_badge_off": "0 px (Off)",
        "border_badge_default": "{v} px (Default)",
        "color_custom": "Custom color",
        "color_default_halo": "Default HALO",
        "color_default_cyan": "Cyan (Default)",
        "color_active_theme": "Active HALO theme",
        "color_default_grey": "Default (#64748B)",
        "button": {
          "name": "Main title",
          "label": "Subtitle / description",
          "icon": "MDI icon",
          "layout": "Layout",
          "layout_horizontal": "Horizontal (wide card, text on the right)",
          "layout_vertical": "Vertical (compact card, text centered below)",
          "text_align": "Text alignment",
          "align_left": "Left",
          "align_center": "Centered",
          "align_right": "Right",
          "entity": "Primary entity (optional)",
          "linked_entity": "Displayed secondary entity (e.g. absence date, sensor)",
          "linked_attribute": "Specific attribute of linked entity (optional)",
          "display_format": "Linked value display format",
          "format_raw": "Raw (Direct value)",
          "format_date_short": "Short date (DD/MM)",
          "format_date_long": "Long date (DD Month YYYY)",
          "format_date_time_fr": "Date & Time (DD/MM HH:mm)",
          "format_time_only": "Time only (HH:mm)",
          "format_relative": "Relative time (e.g. in / ago)",
          "tap_action": "Tap action",
          "theme_entity": "Theme selector entity (optional)"
        },
        "scene": {
          "name": "Scene title",
          "label": "Subtitle / description",
          "icon": "MDI icon",
          "layout": "Layout",
          "layout_horizontal": "Horizontal (wide card, text on the right)",
          "layout_vertical": "Vertical (compact card, text centered below)",
          "text_align": "Text alignment",
          "align_left": "Left",
          "align_center": "Centered",
          "align_right": "Right",
          "mode": "Adjustment mode",
          "mode_individual": "Individual (Precise per device)",
          "mode_common": "Harmonized (Common setting for all targets)",
          "theme_entity": "Theme selector entity (optional)",
          "targets_title": "Scene Devices & Presets",
          "add_target": "Add device (Light or Shutter)",
          "no_targets": "No devices configured. Click 'Add device' to get started.",
          "select_entity": "Select entity",
          "delete": "Delete"
        },
        "cover": {
          "entity": "Shutter or group entity",
          "name": "Custom name (optional)"
        },
        "light": {
          "entity": "Light or lighting group entity",
          "name": "Custom name (optional)",
          "icon": "Custom icon (optional)",
          "sub_toggle_entity": "Dedicated entity for the Power button (optional)",
          "use_light_color": "Tint the tile with the bulb's real color (RGB / Kelvin)",
          "theme_entity": "Theme selector entity",
          "theme_entity_helper": "Default: input_select.couleur_theme_eclairages",
          "show_brightness": "Brightness sub-button (%)",
          "show_kelvin": "Temperature sub-button (K)",
          "show_toggle": "Power sub-button (On/Off)"
        },
        "separator": {
          "name": "Section title",
          "icon": "MDI icon",
          "color": "Custom color (optional)",
          "theme_entity": "Theme selector entity (optional)",
          "collapsible": "Enable the collapsible legend drawer (accordion)",
          "initial_collapsed": "Initially collapsed / hidden",
          "columns": "Drawer columns",
          "cols_1": "1 column (full width / detailed text)",
          "cols_2": "2 columns (balanced standard)",
          "cols_3": "3 columns (compact / 3 items per row)",
          "label_on": "Button label when open",
          "label_on_helper": "e.g. Hide",
          "label_off": "Button label when closed",
          "label_off_helper": "e.g. Show",
          "content": "Free note or explanatory text (optional)",
          "toggle_entity": "Synchronized external entity (optional)",
          "items_title": "Legend Items & Guide",
          "items_subtitle": "Configure the explanatory tiles of the collapsible drawer",
          "add_item": "+ Add an item",
          "no_items": "No custom legend item defined.",
          "no_items_hint": "Click \"Add an item\" to customize the drawer.",
          "item_n": "Item #{n}",
          "new_label": "New item",
          "new_desc": "Description",
          "f_icon": "MDI icon (e.g. mdi:power)",
          "or": "OR",
          "f_badge": "Badge",
          "f_badge_hint": "(max 2-3 chars)",
          "f_label": "Label / title (bold)",
          "f_label_ph": "e.g. Short press",
          "f_desc": "Description",
          "f_desc_ph": "e.g. Turn on",
          "f_color": "Custom HEX color (optional, inherits from the card if empty)"
        },
        "cover_color": {
          "title": "Header title",
          "icon": "Header icon",
          "closed_entity": "Closed shutter color entity",
          "closed_entity_helper": "Default: input_text.couleur_volet_ferme",
          "partial_entity": "Partial shutter color entity",
          "partial_entity_helper": "Default: input_text.couleur_volet_partiel",
          "open_entity": "Open shutter color entity",
          "open_entity_helper": "Default: input_text.couleur_volet_ouvert",
          "moving_entity": "Moving shutter color entity",
          "moving_entity_helper": "Default: input_text.couleur_volet_en_mouvement",
          "theme_entity": "Theme selector entity for the header (optional)"
        },
        "palette": {
          "entity": "Theme selector entity",
          "entity_helper": "Default: input_select.couleur_theme_eclairages",
          "title": "Section title (optional)",
          "icon": "MDI icon (optional)",
          "columns": "Number of columns"
        }
      }
    }
    ;

    var fr = {
      "state": {
        "on": "Allumé",
        "off": "Éteint",
        "unavailable": "Indisponible",
        "unknown": "Inconnu",
        "closed": "Fermé",
        "open": "Ouvert",
        "partial": "Partiel",
        "moving": "En mouvement"
      },
      "cover": {
        "default_name": "Volet",
        "opening": "Ouverture…",
        "closing": "Fermeture…",
        "opening_pct": "Ouverture… {pct} %",
        "closing_pct": "Fermeture… {pct} %",
        "moving_n": "{count} volets en mouvement…",
        "partial_pct": "Partiel ({pct}%)",
        "not_found": "Entité non trouvée : {id}",
        "down": "Descendre",
        "stop": "Arrêter",
        "up": "Monter"
      },
      "light": {
        "default_name": "Éclairage",
        "not_found": "Entité introuvable : {id}",
        "toggle": "Basculer",
        "details": "Détails",
        "cycle_brightness": "Cycle luminosité",
        "cycle_kelvin": "Cycle température",
        "power": "Marche / Arrêt"
      },
      "cover_color": {
        "title": "Couleurs d'États des Volets",
        "closed": "Volet Fermé",
        "partial": "Volet Partiel",
        "open": "Volet Ouvert",
        "moving": "Mouvement"
      },
      "separator": {
        "section": "Section",
        "hide": "Masquer",
        "show": "Afficher",
        "lg_icon": "Icône gauche",
        "lg_icon_d": " : On / Off",
        "lg_pct": "Badge %",
        "lg_pct_d": " : 30 / 67 / 100%",
        "lg_k": "Badge K",
        "lg_k_d": " : Chaud / Froid",
        "lg_name": "Nom tuile",
        "lg_name_d": " : Détails lampe"
      },
      "halo": {
        "Cyan": "Cyan",
        "Bleu Céleste": "Bleu Céleste",
        "Saphir Océan": "Saphir Océan",
        "Menthe Givrée": "Menthe Givrée",
        "Émeraude": "Émeraude",
        "Vert Lime": "Vert Lime",
        "Jaune Soleil": "Jaune Soleil",
        "Ambre Doré": "Ambre Doré",
        "Orange Flamme": "Orange Flamme",
        "Corail Pêche": "Corail Pêche",
        "Rose Rubis": "Rose Rubis",
        "Rose Bonbon": "Rose Bonbon",
        "Fuchsia Néon": "Fuchsia Néon",
        "Améthyste": "Améthyste",
        "Violet Nuit": "Violet Nuit",
        "Blanc Glace": "Blanc Glace"
      },
      "editor": {
        "style_title": "Personnalisation Visuelle (Halo & Bordure)",
        "style_title_colors": "Personnalisation Visuelle (Halo, Couleurs & Bordure)",
        "halo_color": "Couleur du Halo & Bouton",
        "state_color": "Couleur : {state}",
        "open_palette": "Ouvrir la palette libre",
        "open_wheel": "Ouvrir la roue chromatique",
        "chips_label": "Nuancier officiel HALO (Sélection rapide) :",
        "border_title": "Épaisseur de bordure",
        "border_title_single": "Épaisseur de bordure (Unique)",
        "border_none": "Sans bordure",
        "border_default": "Défaut",
        "border_max": "Maxi",
        "border_badge_off": "0 px (Off)",
        "border_badge_default": "{v} px (Défaut)",
        "color_custom": "Couleur personnalisée",
        "color_default_halo": "Défaut HALO",
        "color_default_cyan": "Cyan (Défaut)",
        "color_active_theme": "Thème HALO actif",
        "color_default_grey": "Défaut (#64748B)",
        "button": {
          "name": "Titre principal",
          "label": "Sous-titre / Description",
          "icon": "Icône MDI",
          "layout": "Disposition (Layout)",
          "layout_horizontal": "Horizontal (Carte large avec texte à droite)",
          "layout_vertical": "Vertical (Carte compacte avec texte centré en dessous)",
          "text_align": "Alignement du texte",
          "align_left": "Gauche",
          "align_center": "Centré",
          "align_right": "Droite",
          "entity": "Entité principale (optionnel)",
          "linked_entity": "Entité tierce affichée (ex. date d'absence, capteur)",
          "linked_attribute": "Attribut spécifique de l'entité liée (optionnel)",
          "display_format": "Format d'affichage de la valeur liée",
          "format_raw": "Brut (Valeur directe)",
          "format_date_short": "Date courte (JJ/MM)",
          "format_date_long": "Date longue (JJ Mois AAAA)",
          "format_date_time_fr": "Date et heure (JJ/MM HH:mm)",
          "format_time_only": "Heure uniquement (HH:mm)",
          "format_relative": "Temps relatif (ex. il y a / dans X j)",
          "tap_action": "Action lors du clic",
          "theme_entity": "Entité sélecteur de thème (optionnel)"
        },
        "scene": {
          "name": "Titre de l'ambiance",
          "label": "Sous-titre / Description",
          "icon": "Icône MDI",
          "layout": "Disposition (Layout)",
          "layout_horizontal": "Horizontal (Carte large avec texte à droite)",
          "layout_vertical": "Vertical (Carte compacte avec texte centré en dessous)",
          "text_align": "Alignement du texte",
          "align_left": "Gauche",
          "align_center": "Centré",
          "align_right": "Droite",
          "mode": "Mode de réglage",
          "mode_individual": "Individuel (Réglage précis par appareil)",
          "mode_common": "Harmonisé (Réglage commun à toutes les cibles)",
          "theme_entity": "Entité sélecteur de thème (optionnel)",
          "targets_title": "Appareils & Réglages de l'ambiance",
          "add_target": "Ajouter un appareil (Lumière ou Volet)",
          "no_targets": "Aucun appareil configuré. Cliquez sur « Ajouter un appareil » pour commencer.",
          "select_entity": "Sélectionner une entité",
          "delete": "Supprimer"
        },
        "cover": {
          "entity": "Entité Volet ou Groupe",
          "name": "Nom personnalisé (optionnel)"
        },
        "light": {
          "entity": "Entité Lumière ou Groupe d’éclairages",
          "name": "Nom personnalisé (optionnel)",
          "icon": "Icône personnalisée (optionnel)",
          "sub_toggle_entity": "Entité dédiée pour le bouton Power (optionnel)",
          "use_light_color": "Teinter la tuile avec la couleur réelle de l’ampoule (RGB / Kelvin)",
          "theme_entity": "Entité sélecteur de thème",
          "theme_entity_helper": "Défaut : input_select.couleur_theme_eclairages",
          "show_brightness": "Sous-bouton Luminosité (%)",
          "show_kelvin": "Sous-bouton Température (K)",
          "show_toggle": "Sous-bouton Power (On/Off)"
        },
        "separator": {
          "name": "Titre de la section",
          "icon": "Icône MDI",
          "color": "Couleur personnalisée (optionnel)",
          "theme_entity": "Entité sélecteur de thème (optionnel)",
          "collapsible": "Activer le volet repliable de légende (Accordéon)",
          "initial_collapsed": "Initialement replié / masqué",
          "columns": "Nombre de colonnes du volet",
          "cols_1": "1 colonne (Largeur complète / Texte détaillé)",
          "cols_2": "2 colonnes (Standard équilibré)",
          "cols_3": "3 colonnes (Compact / 3 éléments par ligne)",
          "label_on": "Libellé bouton quand ouvert",
          "label_on_helper": "ex : Masquer",
          "label_off": "Libellé bouton quand fermé",
          "label_off_helper": "ex : Afficher",
          "content": "Note ou texte explicatif libre (optionnel)",
          "toggle_entity": "Entité externe synchronisée (optionnel)",
          "items_title": "Éléments de Légende & Guide",
          "items_subtitle": "Configurez les tuiles explicatives du volet repliable",
          "add_item": "+ Ajouter un élément",
          "no_items": "Aucun élément de légende personnalisé défini.",
          "no_items_hint": "Cliquez sur \"Ajouter un élément\" pour personnaliser le volet.",
          "item_n": "Élément #{n}",
          "new_label": "Nouvel élément",
          "new_desc": "Description",
          "f_icon": "Icône MDI (ex : mdi:power)",
          "or": "OU",
          "f_badge": "Badge",
          "f_badge_hint": "(max 2-3 car.)",
          "f_label": "Libellé / Titre (en gras)",
          "f_label_ph": "ex : Appui court",
          "f_desc": "Description",
          "f_desc_ph": "ex : Allumage",
          "f_color": "Couleur personnalisée HEX (optionnel, hérite de la carte si vide)"
        },
        "cover_color": {
          "title": "Titre de l'en-tête",
          "icon": "Icône de l'en-tête",
          "closed_entity": "Entité couleur volet fermé",
          "closed_entity_helper": "Défaut : input_text.couleur_volet_ferme",
          "partial_entity": "Entité couleur volet partiel",
          "partial_entity_helper": "Défaut : input_text.couleur_volet_partiel",
          "open_entity": "Entité couleur volet ouvert",
          "open_entity_helper": "Défaut : input_text.couleur_volet_ouvert",
          "moving_entity": "Entité couleur mouvement",
          "moving_entity_helper": "Défaut : input_text.couleur_volet_en_mouvement",
          "theme_entity": "Entité sélecteur de thème pour en-tête (optionnel)"
        },
        "palette": {
          "entity": "Entité sélecteur de thème",
          "entity_helper": "Défaut : input_select.couleur_theme_eclairages",
          "title": "Titre de la section (optionnel)",
          "icon": "Icône MDI (optionnel)",
          "columns": "Nombre de colonnes"
        }
      }
    }
    ;

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/localize/localize.ts
     * 📝 Description   : Helper d'internationalisation (i18n) de la suite HALO Cards.
     *                    Résout la langue active de Home Assistant
     *                    (hass.locale?.language || hass.language || 'en') et traduit
     *                    une clé pointée avec repli déterministe vers l'anglais.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`localizeHalo`, espace de noms `halo.*`).
     *   - 🆕 v1.4.0 (2026-10-30) : Création initiale (dictionnaires en/fr, fallback EN).
     * ==============================================================================
     */
    const LANGUAGES = { en, fr };
    /** Retourne le code de langue primaire actif (ex. 'fr-CA' -> 'fr'), 'en' par défaut. */
    function getLang(hass) {
        const raw = hass?.locale?.language || hass?.language || 'en';
        const lang = String(raw).toLowerCase().split(/[-_]/)[0];
        return LANGUAGES[lang] ? lang : 'en';
    }
    function lookup(dict, key) {
        let cur = dict;
        for (const part of key.split('.')) {
            if (cur == null || typeof cur !== 'object')
                return undefined;
            cur = cur[part];
        }
        return typeof cur === 'string' ? cur : undefined;
    }
    /**
     * Traduit `key` selon la langue de `hass`. Repli : langue active -> anglais -> clé brute.
     * Les marqueurs `{search}` du texte sont remplacés par `replace` (valeurs ou tableaux).
     */
    function localize(hass, key, search, replace) {
        let str = lookup(LANGUAGES[getLang(hass)], key) ?? lookup(en, key) ?? key;
        if (search !== undefined) {
            const s = Array.isArray(search) ? search : [search];
            const r = Array.isArray(replace) ? replace : [replace];
            s.forEach((name, i) => {
                str = str.split(`{${name}}`).join(String(r[i] ?? ''));
            });
        }
        return str;
    }
    /** Fabrique un traducteur lié à `hass` : `t(key, search, replace)`. */
    function useLocalize(hass) {
        return (key, search, replace) => localize(hass, key, search, replace);
    }
    /** Traduit le nom d'une nuance HALO (la valeur stockée en configuration reste inchangée). */
    function localizeHalo(hass, name) {
        return localize(hass, `halo.${name}`) === `halo.${name}` ? name : localize(hass, `halo.${name}`);
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/editor-common.ts
     * 📝 Description   : Utilitaires partagés des éditeurs visuels HALO (i18n) :
     *                    câblage computeLabel/computeHelper des <ha-form>, gabarit HTML
     *                    du panneau Liquid Glass, badge de bordure, nuancier HALO et
     *                    nom d'affichage des couleurs.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`, `localizeHalo`, `color_default_halo`)
     *                              et renommage de la teinte `Cyan`.
     *   - 🆕 v1.4.0 (2026-10-30) : Création initiale (factorisation i18n des éditeurs).
     * ==============================================================================
     */
    /**
     * Assigne schéma, computeLabel et computeHelper d'un <ha-form> :
     * label  = editor.<card>.<name>, aide = editor.<card>.<name>_helper (vide si absente).
     */
    function applyFormI18n(form, hass, card, schema) {
        const t = useLocalize(hass);
        form.schema = schema;
        form.computeLabel = (s) => t(`editor.${card}.${s.name}`);
        form.computeHelper = (s) => {
            const key = `editor.${card}.${s.name}_helper`;
            const val = t(key);
            return val === key ? '' : val;
        };
    }
    /** Options d'un sélecteur `select` traduites : [['valeur', 'clé de traduction'], ...]. */
    function selectOptions(t, card, pairs) {
        return pairs.map(([value, key]) => ({ value, label: t(`editor.${card}.${key}`) }));
    }
    /** Gabarit HTML du panneau de style Liquid Glass (médaillon, nuancier HALO, bordure). */
    function stylePanelHtml(t, o) {
        const tabs = o.tabs
            ? `<div class="halo-state-tabs">${o.tabs.map(s => `
        <div class="halo-state-tab ${s.active ? 'active' : ''}" id="tab-${s.key}" data-key="${s.key}">
          <span class="halo-state-tab-dot" id="tab-dot-${s.key}"></span>
          <ha-icon icon="${s.icon}"></ha-icon>
          <span>${s.label}</span>
        </div>`).join('')}</div>`
            : '';
        const small = (k) => `<small style="opacity: 0.6;">${t(`editor.${k}`)}</small>`;
        return `
    <div class="halo-style-section">
      <div class="halo-section-header">
        <ha-icon icon="mdi:palette-swatch"></ha-icon>
        <span>${o.title}</span>
      </div>
      ${tabs}
      <div class="halo-style-grid">
        <div class="halo-col">
          <div class="halo-col-header">
            <span class="halo-col-title" id="state-title">${o.leftTitle}</span>
          </div>
          <div class="halo-swatch-card" id="swatch-card">
            <div class="halo-swatch-circle-wrap" id="swatch-circle-wrap" title="${t('editor.open_palette')}">
              <div class="halo-swatch-circle" id="swatch-circle"></div>
              <input type="color" id="native-color-input" class="hidden-color-input" />
            </div>
            <div class="halo-swatch-meta">
              <span class="halo-color-title" id="swatch-name"></span>
              <span class="halo-color-hex" id="swatch-hex"></span>
            </div>
            <button type="button" class="halo-pipette-btn" id="pipette-btn" title="${t('editor.open_wheel')}">
              <ha-icon icon="mdi:eyedropper"></ha-icon>
            </button>
          </div>
          <div class="halo-chips-label">${t('editor.chips_label')}</div>
          <div class="halo-chips-grid" id="chips-grid"></div>
        </div>
        <div class="halo-col">
          <div class="halo-col-header">
            <span class="halo-col-title">${o.borderTitle}</span>
            <span class="halo-badge-val" id="border-val-text"></span>
          </div>
          <div class="halo-border-card">
            <input type="range" id="border-slider-input" min="0" max="3" step="0.25" value="1.5" class="halo-range-slider" />
            <div class="slider-ticks">
              <span>0 px<br>${small('border_none')}</span>
              <span style="text-align: center;">1.5 px<br>${small('border_default')}</span>
              <span style="text-align: right;">3.0 px<br>${small('border_max')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
    }
    /** Texte du badge d'épaisseur de bordure (Off / Défaut traduits). */
    function borderBadge(t, bw) {
        if (bw === 0)
            return t('editor.border_badge_off');
        if (bw === 1.5)
            return t('editor.border_badge_default', 'v', String(bw));
        return `${bw} px`;
    }
    /** Génère les pastilles du nuancier rapide HALO (info-bulle traduite). */
    function buildChips(container, hass, onPick) {
        container.innerHTML = '';
        for (const [name, hex] of Object.entries(HALO_PALETTE)) {
            const chip = document.createElement('div');
            chip.className = 'halo-chip';
            chip.setAttribute('data-name', name);
            chip.setAttribute('data-hex', hex);
            chip.setAttribute('title', `${localizeHalo(hass, name)} (${hex})`);
            chip.style.backgroundColor = hex;
            chip.style.color = hex;
            chip.addEventListener('click', () => onPick(name));
            container.appendChild(chip);
        }
    }
    /** Nom d'affichage traduit d'une couleur (nuance HALO, personnalisée ou défaut). */
    function colorDisplayName(hass, raw, emptyKey) {
        const t = useLocalize(hass);
        if (!raw)
            return t(emptyKey);
        if (typeof raw === 'string') {
            if (HALO_PALETTE[raw])
                return localizeHalo(hass, raw);
            for (const [name, hex] of Object.entries(HALO_PALETTE)) {
                if (hex.toLowerCase() === raw.toLowerCase())
                    return localizeHalo(hass, name);
            }
        }
        return t('editor.color_custom');
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-button-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-button-card.
     *                    Combine le composant natif <ha-form> pour les métadonnées et un
     *                    panneau Liquid Glass avec médaillon halo interactif, nuancier
     *                    rapide HALO et curseur d'épaisseur de bordure.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.5.0
     * 📅 Date         : 2026-11-01
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ✨ v1.5.0 (2026-11-01) : Ajout des sélecteurs pour `linked_entity`, `linked_attribute`,
     *                              `display_format` et configuration de l'action `tap_action`.
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`, `color_default_halo`).
     *   - ✨ v1.2.1 (2026-10-30) : Sélecteur de couleur Mix A+B (Halo Swatch + Nuancier
     *                              rapide HALO 16 teintes) et curseur d'épaisseur de bordure
     *                              (0 à 3 px) côte à côte en grille responsive.
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-button-card.
     * ==============================================================================
     */
    const buildSchema$3 = (t) => [
        { name: 'name', selector: { text: {} } },
        { name: 'label', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        {
            name: 'layout',
            selector: {
                select: {
                    options: selectOptions(t, 'button', [['horizontal', 'layout_horizontal'], ['vertical', 'layout_vertical']])
                }
            }
        },
        {
            name: 'text_align',
            selector: {
                select: {
                    options: selectOptions(t, 'button', [['left', 'align_left'], ['center', 'align_center'], ['right', 'align_right']])
                }
            }
        },
        { name: 'entity', selector: { entity: {} } },
        { name: 'linked_entity', selector: { entity: {} } },
        { name: 'linked_attribute', selector: { text: {} } },
        {
            name: 'display_format',
            selector: {
                select: {
                    options: selectOptions(t, 'button', [
                        ['raw', 'format_raw'],
                        ['date_short', 'format_date_short'],
                        ['date_long', 'format_date_long'],
                        ['date_time_fr', 'format_date_time_fr'],
                        ['time_only', 'format_time_only'],
                        ['relative', 'format_relative']
                    ])
                }
            }
        },
        { name: 'tap_action', selector: { 'ui-action': {} } },
        { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
    ];
    class HaloButtonCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
            // Références DOM Style Panel
            this._swatchCircleEl = null;
            this._colorInputEl = null;
            this._swatchNameEl = null;
            this._swatchHexEl = null;
            this._chipsContainerEl = null;
            this._borderSliderEl = null;
            this._borderValBadgeEl = null;
        }
        setConfig(config) {
            this._config = {
                layout: 'horizontal',
                border_width: 1.5,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('#form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('#form');
            if (form) {
                form.hass = hass;
            }
        }
        _fireConfigChanged() {
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _getColorHex() {
            const raw = this._config?.color || 'Cyan';
            return toHexColor(raw, '#26c6da');
        }
        _getColorDisplayName() {
            return colorDisplayName(this._hass, this._config?.color, 'editor.color_default_cyan');
        }
        _updateColor(colorValue) {
            this._config = {
                ...this._config,
                color: colorValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _updateBorderWidth(widthValue) {
            this._config = {
                ...this._config,
                border_width: widthValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _syncStylePanel() {
            const hex = this._getColorHex();
            const name = this._getColorDisplayName();
            const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;
            // 1. Swatch Circle & Halo (Option A)
            if (this._swatchCircleEl) {
                this._swatchCircleEl.style.background = hex;
                this._swatchCircleEl.style.boxShadow = `0 0 12px ${hex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
                this._swatchCircleEl.style.borderColor = hex;
            }
            if (this._colorInputEl) {
                this._colorInputEl.value = hex;
            }
            if (this._swatchNameEl) {
                this._swatchNameEl.textContent = name;
            }
            if (this._swatchHexEl) {
                this._swatchHexEl.textContent = hex.toUpperCase();
            }
            // 2. Nuancier rapide Chips (Option B)
            if (this._chipsContainerEl) {
                const activeRaw = this._config.color || 'Cyan';
                const chipButtons = this._chipsContainerEl.querySelectorAll('.halo-chip');
                chipButtons.forEach(btn => {
                    const chipName = btn.getAttribute('data-name');
                    const chipHex = btn.getAttribute('data-hex');
                    const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
                    btn.classList.toggle('active', isActive);
                });
            }
            // 3. Border Slider & Badge
            if (this._borderSliderEl) {
                this._borderSliderEl.value = String(bw);
            }
            if (this._borderValBadgeEl) {
                this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
            }
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('#form');
            if (!form) {
                const t = useLocalize(this._hass);
                this._lang = getLang(this._hass);
                this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
                title: t('editor.style_title'),
                leftTitle: t('editor.halo_color'),
                borderTitle: t('editor.border_title')
            })}
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "button", buildSchema$3(useLocalize(this._hass)));
                    form.data = this._formMetadata();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
                this._initDomBindings();
            }
            else {
                form.data = this._formMetadata();
                if (this._hass)
                    form.hass = this._hass;
            }
            this._syncStylePanel();
        }
        _initDomBindings() {
            this._swatchCircleEl = this.querySelector('#swatch-circle');
            this._colorInputEl = this.querySelector('#native-color-input');
            this._swatchNameEl = this.querySelector('#swatch-name');
            this._swatchHexEl = this.querySelector('#swatch-hex');
            this._chipsContainerEl = this.querySelector('#chips-grid');
            this._borderSliderEl = this.querySelector('#border-slider-input');
            this._borderValBadgeEl = this.querySelector('#border-val-text');
            // 1. Déclencheur input color natif
            const triggerColor = () => {
                if (this._colorInputEl) {
                    this._colorInputEl.click();
                }
            };
            this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
            this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);
            this._colorInputEl?.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val)
                    this._updateColor(val);
            });
            // 2. Génération des chips HALO (Option B)
            if (this._chipsContainerEl) {
                buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
            }
            // 3. Slider de bordure
            this._borderSliderEl?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    this._updateBorderWidth(val);
                }
            });
        }
        _formMetadata() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            delete data.color;
            delete data.border_width;
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            this._config = {
                ...this._config,
                ...ev.detail.value
            };
            this._fireConfigChanged();
        }
    }

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
    class HaloSceneCard extends HTMLElement {
        constructor() {
            super();
            // Références DOM
            this._cardEl = null;
            this._iconBtnEl = null;
            this._iconEl = null;
            this._textColEl = null;
            this._titleEl = null;
            this._subtitleEl = null;
            this._badgeEl = null;
            // État d'animation
            this._isActivating = false;
            this._unbindCardTouch = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-scene-card-editor');
        }
        static getStubConfig() {
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
        setConfig(config) {
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
            return this._config?.layout === 'vertical' ? 2 : 1;
        }
        disconnectedCallback() {
            this._cleanupBindings();
        }
        _cleanupBindings() {
            if (this._unbindCardTouch) {
                this._unbindCardTouch();
                this._unbindCardTouch = null;
            }
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
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
                if (oldHass.states[te] !== newHass.states[te])
                    return true;
            }
            return false;
        }
        _getEffectiveColor() {
            const explicit = this._config.color || this._config.halo_color || this._config.accent_color;
            if (explicit) {
                return resolveThemeColor(this._hass, explicit, this._config.theme_entity, '#a855f7');
            }
            return resolveThemeColor(this._hass, undefined, this._config.theme_entity || 'input_select.couleur_theme_eclairages', '#a855f7');
        }
        _buildDom() {
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
        _render() {
            if (!this._config)
                return;
            if (!this._cardEl) {
                this._buildDom();
            }
            const color = this._getEffectiveColor();
            const layout = this._config.layout || 'horizontal';
            const isVertical = layout === 'vertical';
            // Classes & Layout
            this._cardEl.className = `${isVertical ? 'layout-vertical' : 'layout-horizontal'} ${this._isActivating ? 'activating' : ''}`;
            // Card styling (Border & Glowing Specular Halo)
            const bw = (typeof this._config.border_width === 'number' && !isNaN(this._config.border_width))
                ? this._config.border_width
                : 1.5;
            const cardBorder = bw > 0 ? `${bw}px solid ${color}` : 'none';
            const cardShadow = this._isActivating
                ? `0 0 28px ${color}99, 0 0 10px ${color}80, inset 0 1px 0 rgba(255, 255, 255, 0.35)`
                : `0 0 18px ${color}60, 0 0 6px ${color}40, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;
            this._cardEl.style.border = cardBorder;
            this._cardEl.style.boxShadow = cardShadow;
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
                const parts = [];
                if (lightCount > 0)
                    parts.push(`${lightCount} éclairage${lightCount > 1 ? 's' : ''}`);
                if (coverCount > 0)
                    parts.push(`${coverCount} volet${coverCount > 1 ? 's' : ''}`);
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
                }
                else {
                    this._badgeEl.style.display = 'none';
                }
            }
            // Rebind touch gestures
            this._bindInteractions();
        }
        _bindInteractions() {
            this._cleanupBindings();
            if (this._cardEl) {
                this._unbindCardTouch = bindTouchActions(this._cardEl, {
                    onTap: () => {
                        this._applyScene();
                    }
                });
            }
        }
        async _applyScene() {
            if (!this._config || !this._hass)
                return;
            fireHaptic('medium');
            this._isActivating = true;
            this._render();
            try {
                const targets = this._config.targets || [];
                const mode = this._config.mode || 'individual';
                for (const target of targets) {
                    if (!target.entity)
                        continue;
                    const domain = target.domain || target.entity.split('.')[0];
                    if (domain === 'light') {
                        if (target.state === 'off') {
                            await this._hass.callService('light', 'turn_off', {
                                entity_id: target.entity
                            });
                        }
                        else {
                            const serviceData = {
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
                            }
                            else {
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
                    }
                    else if (domain === 'cover') {
                        let position;
                        if (mode === 'common' && typeof this._config.common_cover_position === 'number') {
                            position = this._config.common_cover_position;
                        }
                        else if (typeof target.position === 'number') {
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
            }
            catch (err) {
                console.error('[halo-scene-card] Erreur lors de l\'application de la scène :', err);
                fireHaptic('failure');
            }
            finally {
                setTimeout(() => {
                    this._isActivating = false;
                    this._render();
                }, 500);
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-scene-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-scene-card.
     *                    Combine le composant natif <ha-form> pour les métadonnées,
     *                    un panneau de gestion visuelle des cibles (lumières & volets),
     *                    et le panneau de style Liquid Glass HALO (nuancier & bordure).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.5.0
     * 📅 Date         : 2026-11-01
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 🆕 v1.5.0 (2026-11-01) : Création initiale de l'éditeur halo-scene-card :
     *                              - Sélection d'entités cibles (light & cover).
     *                              - Réglages fins individuels ou harmonisés (luminosité, kelvin, position).
     *                              - Style Panel Mix A+B (Halo Swatch + Nuancier 16 teintes + Curseur bordure).
     * ==============================================================================
     */
    const buildSchema$2 = (t) => [
        { name: 'name', selector: { text: {} } },
        { name: 'label', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        {
            name: 'layout',
            selector: {
                select: {
                    options: selectOptions(t, 'scene', [['horizontal', 'layout_horizontal'], ['vertical', 'layout_vertical']])
                }
            }
        },
        {
            name: 'text_align',
            selector: {
                select: {
                    options: selectOptions(t, 'scene', [['left', 'align_left'], ['center', 'align_center'], ['right', 'align_right']])
                }
            }
        },
        {
            name: 'mode',
            selector: {
                select: {
                    options: selectOptions(t, 'scene', [['individual', 'mode_individual'], ['common', 'mode_common']])
                }
            }
        },
        { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
    ];
    class HaloSceneCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = 'en';
            // Références DOM Style Panel
            this._swatchCircleEl = null;
            this._colorInputEl = null;
            this._swatchNameEl = null;
            this._swatchHexEl = null;
            this._chipsContainerEl = null;
            this._borderSliderEl = null;
            this._borderValBadgeEl = null;
            this._targetsContainerEl = null;
        }
        setConfig(config) {
            this._config = {
                layout: 'horizontal',
                mode: 'individual',
                border_width: 1.5,
                targets: [],
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('#form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('#form');
            if (form) {
                form.hass = hass;
            }
        }
        _fireConfigChanged() {
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _getColorHex() {
            const raw = this._config?.color || 'Améthyste';
            return toHexColor(raw, '#a855f7');
        }
        _getColorDisplayName() {
            return colorDisplayName(this._hass, this._config?.color, 'editor.color_default_halo');
        }
        _updateColor(colorValue) {
            this._config = {
                ...this._config,
                color: colorValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _updateBorderWidth(widthValue) {
            this._config = {
                ...this._config,
                border_width: widthValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _syncStylePanel() {
            const hex = this._getColorHex();
            const name = this._getColorDisplayName();
            const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;
            if (this._swatchCircleEl) {
                this._swatchCircleEl.style.background = hex;
                this._swatchCircleEl.style.boxShadow = `0 0 12px ${hex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
                this._swatchCircleEl.style.borderColor = hex;
            }
            if (this._colorInputEl) {
                this._colorInputEl.value = hex;
            }
            if (this._swatchNameEl) {
                this._swatchNameEl.textContent = name;
            }
            if (this._swatchHexEl) {
                this._swatchHexEl.textContent = hex.toUpperCase();
            }
            if (this._chipsContainerEl) {
                const activeRaw = this._config.color || 'Améthyste';
                const chipButtons = this._chipsContainerEl.querySelectorAll('.halo-chip');
                chipButtons.forEach(btn => {
                    const chipName = btn.getAttribute('data-name');
                    const chipHex = btn.getAttribute('data-hex');
                    const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === hex.toLowerCase());
                    btn.classList.toggle('active', isActive);
                });
            }
            if (this._borderSliderEl) {
                this._borderSliderEl.value = String(bw);
            }
            if (this._borderValBadgeEl) {
                this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
            }
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('#form');
            if (!form) {
                const t = useLocalize(this._hass);
                this._lang = getLang(this._hass);
                this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
          .scene-targets-section {
            margin-top: 16px;
            background: rgba(15, 23, 42, 0.55);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .scene-section-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: #f1f5f9;
          }
          .scene-section-title ha-icon {
            --mdc-icon-size: 18px;
            color: #a855f7;
          }
          .target-card {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .target-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            color: #e2e8f0;
          }
          .target-controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 8px;
          }
          .control-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 11px;
            color: rgba(226, 232, 240, 0.8);
          }
          .control-group input[type="range"] {
            width: 100%;
          }
          .btn-delete-target {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.35);
            color: #ef4444;
            border-radius: 6px;
            padding: 2px 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-delete-target:hover {
            background: rgba(239, 68, 68, 0.3);
          }
          .btn-add-target {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: rgba(168, 85, 247, 0.15);
            border: 1px solid rgba(168, 85, 247, 0.4);
            color: #c084fc;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .btn-add-target:hover {
            background: rgba(168, 85, 247, 0.25);
            border-color: #c084fc;
          }
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>

          <!-- Section Targets -->
          <div class="scene-targets-section">
            <div class="scene-section-title">
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span>${t('editor.scene.targets_title')}</span>
            </div>
            <div id="targets-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
            <button type="button" class="btn-add-target" id="btn-add-target">
              <ha-icon icon="mdi:plus-circle-outline"></ha-icon>
              <span>${t('editor.scene.add_target')}</span>
            </button>
          </div>

          ${stylePanelHtml(t, {
                title: t('editor.style_title'),
                leftTitle: t('editor.halo_color'),
                borderTitle: t('editor.border_title')
            })}
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, 'scene', buildSchema$2(useLocalize(this._hass)));
                    form.data = this._formMetadata();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
                this._initDomBindings();
            }
            else {
                form.data = this._formMetadata();
                if (this._hass)
                    form.hass = this._hass;
            }
            this._renderTargets();
            this._syncStylePanel();
        }
        _initDomBindings() {
            this._swatchCircleEl = this.querySelector('#swatch-circle');
            this._colorInputEl = this.querySelector('#native-color-input');
            this._swatchNameEl = this.querySelector('#swatch-name');
            this._swatchHexEl = this.querySelector('#swatch-hex');
            this._chipsContainerEl = this.querySelector('#chips-grid');
            this._borderSliderEl = this.querySelector('#border-slider-input');
            this._borderValBadgeEl = this.querySelector('#border-val-text');
            this._targetsContainerEl = this.querySelector('#targets-list');
            const triggerColor = () => {
                if (this._colorInputEl) {
                    this._colorInputEl.click();
                }
            };
            this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
            this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);
            this._colorInputEl?.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val)
                    this._updateColor(val);
            });
            if (this._chipsContainerEl) {
                buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
            }
            this._borderSliderEl?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    this._updateBorderWidth(val);
                }
            });
            this.querySelector('#btn-add-target')?.addEventListener('click', () => {
                const targets = [...(this._config.targets || [])];
                targets.push({
                    entity: '',
                    domain: 'light',
                    state: 'on',
                    brightness_pct: 50
                });
                this._config = { ...this._config, targets };
                this._renderTargets();
                this._fireConfigChanged();
            });
        }
        _renderTargets() {
            if (!this._targetsContainerEl)
                return;
            const targets = this._config.targets || [];
            const t = useLocalize(this._hass);
            if (targets.length === 0) {
                this._targetsContainerEl.innerHTML = `
        <div style="font-size: 11.5px; opacity: 0.6; text-align: center; padding: 8px;">
          ${t('editor.scene.no_targets')}
        </div>
      `;
                return;
            }
            this._targetsContainerEl.innerHTML = '';
            targets.forEach((target, index) => {
                const card = document.createElement('div');
                card.className = 'target-card';
                const domain = target.domain || (target.entity ? target.entity.split('.')[0] : 'light');
                const isLight = domain === 'light';
                const isCover = domain === 'cover';
                card.innerHTML = `
        <div class="target-header">
          <span>#${index + 1} — ${target.entity || t('editor.scene.select_entity')}</span>
          <button type="button" class="btn-delete-target" data-index="${index}">
            ✕ ${t('editor.scene.delete')}
          </button>
        </div>
        <div class="control-group">
          <input type="text" class="input-target-entity" data-index="${index}" value="${target.entity || ''}" placeholder="light.salon ou cover.volet" style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 6px; color: #fff; font-size: 11.5px;" />
        </div>
        ${isLight ? `
          <div class="target-controls">
            <div class="control-group">
              <label>Luminosité : <b class="val-brightness">${target.brightness_pct ?? 100}%</b></label>
              <input type="range" class="input-target-brightness" data-index="${index}" min="0" max="100" value="${target.brightness_pct ?? 100}" />
            </div>
            <div class="control-group">
              <label>Température : <b class="val-kelvin">${target.color_temp_kelvin ?? 2700}K</b></label>
              <input type="range" class="input-target-kelvin" data-index="${index}" min="2000" max="6500" step="100" value="${target.color_temp_kelvin ?? 2700}" />
            </div>
          </div>
        ` : ''}
        ${isCover ? `
          <div class="target-controls">
            <div class="control-group">
              <label>Position volet : <b class="val-position">${target.position ?? 100}%</b></label>
              <input type="range" class="input-target-position" data-index="${index}" min="0" max="100" value="${target.position ?? 100}" />
            </div>
          </div>
        ` : ''}
      `;
                // Handlers
                card.querySelector('.btn-delete-target')?.addEventListener('click', () => {
                    const updated = [...targets];
                    updated.splice(index, 1);
                    this._config = { ...this._config, targets: updated };
                    this._renderTargets();
                    this._fireConfigChanged();
                });
                card.querySelector('.input-target-entity')?.addEventListener('change', (e) => {
                    const val = e.target.value.trim();
                    const updated = [...targets];
                    const newDomain = val.startsWith('cover.') ? 'cover' : 'light';
                    updated[index] = { ...updated[index], entity: val, domain: newDomain };
                    this._config = { ...this._config, targets: updated };
                    this._renderTargets();
                    this._fireConfigChanged();
                });
                card.querySelector('.input-target-brightness')?.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value, 10);
                    const valEl = card.querySelector('.val-brightness');
                    if (valEl)
                        valEl.textContent = `${val}%`;
                    const updated = [...targets];
                    updated[index] = { ...updated[index], brightness_pct: val };
                    this._config = { ...this._config, targets: updated };
                    this._fireConfigChanged();
                });
                card.querySelector('.input-target-kelvin')?.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value, 10);
                    const valEl = card.querySelector('.val-kelvin');
                    if (valEl)
                        valEl.textContent = `${val}K`;
                    const updated = [...targets];
                    updated[index] = { ...updated[index], color_temp_kelvin: val };
                    this._config = { ...this._config, targets: updated };
                    this._fireConfigChanged();
                });
                card.querySelector('.input-target-position')?.addEventListener('input', (e) => {
                    const val = parseInt(e.target.value, 10);
                    const valEl = card.querySelector('.val-position');
                    if (valEl)
                        valEl.textContent = `${val}%`;
                    const updated = [...targets];
                    updated[index] = { ...updated[index], position: val };
                    this._config = { ...this._config, targets: updated };
                    this._fireConfigChanged();
                });
                this._targetsContainerEl.appendChild(card);
            });
        }
        _formMetadata() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            delete data.color;
            delete data.border_width;
            delete data.targets;
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            this._config = {
                ...this._config,
                ...ev.detail.value
            };
            this._fireConfigChanged();
        }
    }

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
     * ==============================================================================
     * 📌 Nom du fichier : src/components/halo-cover-card.ts
     * 📝 Description   : Composant Web custom:halo-cover-card.
     *                    Tuile de volet roulant clé en main avec style Liquid Glass HALO,
     *                    halo lumineux dynamique par état, barre de progression et
     *                    architecture Persistent DOM haute performance.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`localizeHalo`) et mise en conformité de l'en-tête.
     *   - 🌍 v1.4.0 (2026-10-30) : Internationalisation (i18n) des états du volet.
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale de halo-cover-card.
     * ==============================================================================
     */
    class HaloCoverCard extends HTMLElement {
        get _t() {
            return useLocalize(this._hass);
        }
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
                    this._unavailEl.textContent = this._t('cover.not_found', 'id', id);
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
            let name = this._config.name || attrs.friendly_name || this._t('cover.default_name');
            name = name.replace(/^Volet\s+roulant\s+/i, '');
            // Status label
            const t = this._t;
            let statusText = t('state.closed');
            if (isUnavail) {
                statusText = t('state.unavailable');
            }
            else if (isMoving) {
                if (isGroup) {
                    statusText = movingCount > 1
                        ? t('cover.moving_n', 'count', String(movingCount))
                        : moveDir === 'closing' ? t('cover.closing') : t('cover.opening');
                }
                else {
                    statusText = moveDir === 'closing'
                        ? (p != null ? t('cover.closing_pct', 'pct', String(100 - p)) : t('cover.closing'))
                        : (p != null ? t('cover.opening_pct', 'pct', String(p)) : t('cover.opening'));
                }
            }
            else if (isClosed) {
                statusText = t('state.closed');
            }
            else if (isOpen) {
                statusText = t('state.open');
            }
            else if (isPartial) {
                statusText = t('cover.partial_pct', 'pct', String(p));
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
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-cover-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-cover-card.
     *                    Combine le composant natif <ha-form> pour les métadonnées et un
     *                    panneau Liquid Glass avec sélecteur d'états (Fermé, Ouvert,
     *                    Partiel, Mouvement), médaillon halo interactif (Option A),
     *                    nuancier rapide HALO 16 teintes (Option B) et curseur unique
     *                    d'épaisseur de bordure.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`).
     *   - ✨ v1.3.1 (2026-10-30) : Intégration du sélecteur Mix A+B pour les 4 états
     *                              du volet avec onglets d'états, pastille halo dynamique,
     *                              nuancier rapide HALO et curseur unique d'épaisseur.
     *   - 💡 v1.3.0 (2026-10-30) : Ajout du curseur d'épaisseur de bordure (0 à 3 px).
     *   - 💡 v1.0.0 (2026-10-26) : Création initiale de l'éditeur halo-cover-card.
     * ==============================================================================
     */
    const COVER_STATES = [
        {
            key: 'color_closed',
            tk: 'closed',
            icon: 'mdi:window-shutter',
            fallback: '#FFB69C',
            stateEntityKey: 'input_text.couleur_volet_ferme'
        },
        {
            key: 'color_open',
            tk: 'open',
            icon: 'mdi:window-shutter-open',
            fallback: '#96E1FF',
            stateEntityKey: 'input_text.couleur_volet_ouvert'
        },
        {
            key: 'color_partial',
            tk: 'partial',
            icon: 'mdi:window-shutter-cog',
            fallback: '#38bdf8',
            stateEntityKey: 'input_text.couleur_volet_partiel'
        },
        {
            key: 'color_moving',
            tk: 'moving',
            icon: 'mdi:arrow-up-down',
            fallback: '#f59e0b',
            stateEntityKey: 'input_text.couleur_volet_en_mouvement'
        }
    ];
    const buildSchema$1 = (_t) => [
        { name: 'entity', selector: { entity: { domain: 'cover' } } },
        { name: 'name', selector: { text: {} } }
    ];
    class HaloCoverCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
            this._activeStateKey = 'color_closed';
            // Références DOM
            this._swatchCircleEl = null;
            this._colorInputEl = null;
            this._swatchNameEl = null;
            this._swatchHexEl = null;
            this._stateTitleEl = null;
            this._chipsContainerEl = null;
            this._borderSliderEl = null;
            this._borderValBadgeEl = null;
        }
        setConfig(config) {
            this._config = {
                border_width: 1.5,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('#form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('#form');
            if (form) {
                form.hass = hass;
            }
            this._syncStylePanel();
        }
        _fireConfigChanged() {
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _getStateDef(key) {
            return COVER_STATES.find(s => s.key === key) || COVER_STATES[0];
        }
        _getStateFallback(key) {
            const def = this._getStateDef(key);
            const states = this._hass?.states || {};
            return states[def.stateEntityKey]?.state || def.fallback;
        }
        _getColorHex(key) {
            const raw = this._config?.[key];
            const fallback = this._getStateFallback(key);
            return toHexColor(raw, fallback);
        }
        _getColorDisplayName(key) {
            return colorDisplayName(this._hass, this._config?.[key], 'editor.color_default_halo');
        }
        _updateColor(colorValue) {
            this._config = {
                ...this._config,
                [this._activeStateKey]: colorValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _updateBorderWidth(widthValue) {
            this._config = {
                ...this._config,
                border_width: widthValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _setActiveState(key) {
            this._activeStateKey = key;
            this._syncStylePanel();
        }
        _syncStylePanel() {
            if (!this._config)
                return;
            // 1. Mise à jour des onglets d'états
            COVER_STATES.forEach(state => {
                const tabEl = this.querySelector(`#tab-${state.key}`);
                const dotEl = this.querySelector(`#tab-dot-${state.key}`);
                const hex = this._getColorHex(state.key);
                if (tabEl) {
                    tabEl.classList.toggle('active', state.key === this._activeStateKey);
                }
                if (dotEl) {
                    dotEl.style.backgroundColor = hex;
                    dotEl.style.boxShadow = `0 0 6px ${hex}88`;
                }
            });
            // 2. Swatch de l'état actif (Option A)
            const activeDef = this._getStateDef(this._activeStateKey);
            const activeHex = this._getColorHex(this._activeStateKey);
            const activeName = this._getColorDisplayName(this._activeStateKey);
            if (this._stateTitleEl) {
                this._stateTitleEl.textContent = useLocalize(this._hass)('editor.state_color', 'state', useLocalize(this._hass)(`state.${activeDef.tk}`));
            }
            if (this._swatchCircleEl) {
                this._swatchCircleEl.style.background = activeHex;
                this._swatchCircleEl.style.boxShadow = `0 0 12px ${activeHex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
                this._swatchCircleEl.style.borderColor = activeHex;
            }
            if (this._colorInputEl) {
                this._colorInputEl.value = activeHex;
            }
            if (this._swatchNameEl) {
                this._swatchNameEl.textContent = activeName;
            }
            if (this._swatchHexEl) {
                this._swatchHexEl.textContent = activeHex.toUpperCase();
            }
            // 3. Nuancier rapide Chips (Option B)
            if (this._chipsContainerEl) {
                const activeRaw = this._config[this._activeStateKey];
                const chipButtons = this._chipsContainerEl.querySelectorAll('.halo-chip');
                chipButtons.forEach(btn => {
                    const chipName = btn.getAttribute('data-name');
                    const chipHex = btn.getAttribute('data-hex');
                    const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === activeHex.toLowerCase());
                    btn.classList.toggle('active', isActive);
                });
            }
            // 4. Curseur unique d'épaisseur de bordure
            const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;
            if (this._borderSliderEl) {
                this._borderSliderEl.value = String(bw);
            }
            if (this._borderValBadgeEl) {
                this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
            }
        }
        _formMetadata() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            delete data.border_width;
            delete data.color_closed;
            delete data.color_open;
            delete data.color_partial;
            delete data.color_moving;
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            this._config = {
                ...this._config,
                ...ev.detail.value
            };
            this._fireConfigChanged();
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('#form');
            if (!form) {
                const t = useLocalize(this._hass);
                this._lang = getLang(this._hass);
                const first = this._getStateDef(this._activeStateKey);
                this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
                title: t('editor.style_title_colors'),
                tabs: COVER_STATES.map(s => ({
                    key: s.key,
                    icon: s.icon,
                    label: t(`state.${s.tk}`),
                    active: s.key === this._activeStateKey
                })),
                leftTitle: t('editor.state_color', 'state', t(`state.${first.tk}`)),
                borderTitle: t('editor.border_title_single')
            })}
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "cover", buildSchema$1(useLocalize(this._hass)));
                    form.data = this._formMetadata();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
                this._initDomBindings();
            }
            else {
                form.data = this._formMetadata();
                if (this._hass)
                    form.hass = this._hass;
            }
            this._syncStylePanel();
        }
        _initDomBindings() {
            this._swatchCircleEl = this.querySelector('#swatch-circle');
            this._colorInputEl = this.querySelector('#native-color-input');
            this._swatchNameEl = this.querySelector('#swatch-name');
            this._swatchHexEl = this.querySelector('#swatch-hex');
            this._stateTitleEl = this.querySelector('#state-title');
            this._chipsContainerEl = this.querySelector('#chips-grid');
            this._borderSliderEl = this.querySelector('#border-slider-input');
            this._borderValBadgeEl = this.querySelector('#border-val-text');
            // 1. Clics sur les onglets d'états
            COVER_STATES.forEach(s => {
                this.querySelector(`#tab-${s.key}`)?.addEventListener('click', () => {
                    this._setActiveState(s.key);
                });
            });
            // 2. Déclencheur input color natif
            const triggerColor = () => {
                if (this._colorInputEl) {
                    this._colorInputEl.click();
                }
            };
            this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
            this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);
            this._colorInputEl?.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val)
                    this._updateColor(val);
            });
            // 3. Génération des chips HALO (Option B)
            if (this._chipsContainerEl) {
                buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
            }
            // 4. Slider unique de bordure
            this._borderSliderEl?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    this._updateBorderWidth(val);
                }
            });
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
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              dans la documentation et la résolution des couleurs.
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
    function formatLightStatus(entity, t) {
        if (!entity)
            return '—';
        const st = entity.state;
        if (st === 'unavailable')
            return t('state.unavailable');
        if (st === 'unknown')
            return t('state.unknown');
        if (st !== 'on')
            return t('state.off');
        const parts = [t('state.on')];
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
     * l'état réel de l'ampoule et le sélecteur de thème HALO.
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
        // 3. Sélecteur de thème HALO
        return resolveThemeColor(hass, undefined, config.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
    }
    /**
     * Génère les styles CSS pour le conteneur ha-card :
     * Alignement strict 1:1 avec tuile_avec_sous_boutons.
     */
    function getLightCardStyles(accentCol, isOn, isUnavail, borderWidth) {
        const bw = (typeof borderWidth === 'number' && !isNaN(borderWidth)) ? borderWidth : 1.5;
        const borderStr = (color) => bw > 0 ? `${bw}px solid ${color}` : 'none';
        if (isUnavail) {
            return {
                background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
                border: borderStr('rgba(245, 158, 11, 0.50)'),
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 22px rgba(0, 0, 0, 0.40), 0 0 16px rgba(245, 158, 11, 0.30)'
            };
        }
        if (isOn) {
            return {
                background: 'linear-gradient(160deg, rgba(22, 34, 48, 0.90), rgba(12, 18, 28, 0.95))',
                border: borderStr(accentCol),
                boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 6px 20px rgba(0, 0, 0, 0.38), 0 0 14px ${accentCol}26`
            };
        }
        // Éteint : compact, sobre et discret, sans halo bleuté parasite
        return {
            background: 'linear-gradient(160deg, rgba(22, 32, 46, 0.72), rgba(12, 18, 26, 0.86))',
            border: borderStr('rgba(255, 255, 255, 0.08)'),
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
    class HaloLightCard extends HTMLElement {
        get _t() {
            return useLocalize(this._hass);
        }
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
            // Sélecteur de thème d'éclairages global HALO
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
                    this._unavailEl.textContent = this._t('light.not_found', 'id', id);
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
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-light-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-light-card.
     *                    Combine le composant natif <ha-form> pour les métadonnées et un
     *                    panneau Liquid Glass avec sélecteur d'états (Allumé, Éteint),
     *                    médaillon halo interactif (Option A), nuancier rapide HALO
     *                    16 teintes (Option B) et curseur unique d'épaisseur de bordure.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`, `color_default_cyan`).
     *   - ✨ v1.3.1 (2026-10-30) : Intégration du sélecteur Mix A+B pour les états Allumé
     *                              et Éteint, pastille halo dynamique, nuancier rapide HALO
     *                              et curseur unique d'épaisseur de bordure.
     *   - 💡 v1.3.0 (2026-10-30) : Ajout du curseur d'épaisseur de bordure (0 à 3 px).
     *   - 💡 v1.1.0 (2026-10-29) : Alignement des sélecteurs sur les sous-boutons HALO.
     *   - 💡 v1.0.0 (2026-10-29) : Création initiale de halo-light-card-editor.
     * ==============================================================================
     */
    const LIGHT_STATES = [
        {
            key: 'color_on',
            tk: 'on',
            icon: 'mdi:lightbulb-on',
            fallback: '#26c6da'
        },
        {
            key: 'color_off',
            tk: 'off',
            icon: 'mdi:lightbulb-off',
            fallback: '#64748b'
        }
    ];
    const buildSchema = (_t) => [
        { name: 'entity', selector: { entity: { domain: 'light' } } },
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'sub_toggle_entity', selector: { entity: {} } },
        { name: 'use_light_color', selector: { boolean: {} } },
        { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } },
        {
            type: 'grid',
            name: '',
            schema: [
                { name: 'show_brightness', selector: { boolean: {} } },
                { name: 'show_kelvin', selector: { boolean: {} } },
                { name: 'show_toggle', selector: { boolean: {} } }
            ]
        }
    ];
    class HaloLightCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
            this._activeStateKey = 'color_on';
            // Références DOM
            this._swatchCircleEl = null;
            this._colorInputEl = null;
            this._swatchNameEl = null;
            this._swatchHexEl = null;
            this._stateTitleEl = null;
            this._chipsContainerEl = null;
            this._borderSliderEl = null;
            this._borderValBadgeEl = null;
        }
        setConfig(config) {
            this._config = {
                use_light_color: false,
                show_brightness: true,
                show_kelvin: true,
                show_toggle: true,
                border_width: 1.5,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('#form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('#form');
            if (form) {
                form.hass = hass;
            }
            this._syncStylePanel();
        }
        _fireConfigChanged() {
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _getStateDef(key) {
            return LIGHT_STATES.find(s => s.key === key) || LIGHT_STATES[0];
        }
        _getStateFallback(key) {
            if (key === 'color_on') {
                return resolveThemeColor(this._hass, undefined, this._config?.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
            }
            return '#64748b';
        }
        _getColorHex(key) {
            const raw = this._config?.[key];
            const fallback = this._getStateFallback(key);
            return toHexColor(raw, fallback);
        }
        _getColorDisplayName(key) {
            return colorDisplayName(this._hass, this._config?.[key], key === 'color_on' ? 'editor.color_active_theme' : 'editor.color_default_grey');
        }
        _updateColor(colorValue) {
            this._config = {
                ...this._config,
                [this._activeStateKey]: colorValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _updateBorderWidth(widthValue) {
            this._config = {
                ...this._config,
                border_width: widthValue
            };
            this._syncStylePanel();
            this._fireConfigChanged();
        }
        _setActiveState(key) {
            this._activeStateKey = key;
            this._syncStylePanel();
        }
        _syncStylePanel() {
            if (!this._config)
                return;
            // 1. Mise à jour des onglets Allumé / Éteint
            LIGHT_STATES.forEach(state => {
                const tabEl = this.querySelector(`#tab-${state.key}`);
                const dotEl = this.querySelector(`#tab-dot-${state.key}`);
                const hex = this._getColorHex(state.key);
                if (tabEl) {
                    tabEl.classList.toggle('active', state.key === this._activeStateKey);
                }
                if (dotEl) {
                    dotEl.style.backgroundColor = hex;
                    dotEl.style.boxShadow = `0 0 6px ${hex}88`;
                }
            });
            // 2. Swatch de l'état actif (Option A)
            const activeDef = this._getStateDef(this._activeStateKey);
            const activeHex = this._getColorHex(this._activeStateKey);
            const activeName = this._getColorDisplayName(this._activeStateKey);
            if (this._stateTitleEl) {
                this._stateTitleEl.textContent = useLocalize(this._hass)('editor.state_color', 'state', useLocalize(this._hass)(`state.${activeDef.tk}`));
            }
            if (this._swatchCircleEl) {
                this._swatchCircleEl.style.background = activeHex;
                this._swatchCircleEl.style.boxShadow = `0 0 12px ${activeHex}88, inset 0 1px 0 rgba(255, 255, 255, 0.4)`;
                this._swatchCircleEl.style.borderColor = activeHex;
            }
            if (this._colorInputEl) {
                this._colorInputEl.value = activeHex;
            }
            if (this._swatchNameEl) {
                this._swatchNameEl.textContent = activeName;
            }
            if (this._swatchHexEl) {
                this._swatchHexEl.textContent = activeHex.toUpperCase();
            }
            // 3. Nuancier rapide Chips (Option B)
            if (this._chipsContainerEl) {
                const activeRaw = this._config[this._activeStateKey];
                const chipButtons = this._chipsContainerEl.querySelectorAll('.halo-chip');
                chipButtons.forEach(btn => {
                    const chipName = btn.getAttribute('data-name');
                    const chipHex = btn.getAttribute('data-hex');
                    const isActive = (chipName === activeRaw || chipHex?.toLowerCase() === activeHex.toLowerCase());
                    btn.classList.toggle('active', isActive);
                });
            }
            // 4. Curseur unique d'épaisseur de bordure
            const bw = typeof this._config.border_width === 'number' ? this._config.border_width : 1.5;
            if (this._borderSliderEl) {
                this._borderSliderEl.value = String(bw);
            }
            if (this._borderValBadgeEl) {
                this._borderValBadgeEl.textContent = borderBadge(useLocalize(this._hass), bw);
            }
        }
        _formMetadata() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            delete data.border_width;
            delete data.color_on;
            delete data.color_off;
            return data;
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            this._config = {
                ...this._config,
                ...ev.detail.value
            };
            this._fireConfigChanged();
        }
        _render() {
            if (!this._config)
                return;
            let form = this.querySelector('#form');
            if (!form) {
                const t = useLocalize(this._hass);
                this._lang = getLang(this._hass);
                const first = this._getStateDef(this._activeStateKey);
                this.innerHTML = `
        <style>
          ${COMMON_EDITOR_STYLES}
        </style>

        <div class="halo-editor-wrap">
          <ha-form id="form"></ha-form>
          ${stylePanelHtml(t, {
                title: t('editor.style_title_colors'),
                tabs: LIGHT_STATES.map(s => ({
                    key: s.key,
                    icon: s.icon,
                    label: t(`state.${s.tk}`),
                    active: s.key === this._activeStateKey
                })),
                leftTitle: t('editor.state_color', 'state', t(`state.${first.tk}`)),
                borderTitle: t('editor.border_title_single')
            })}
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "light", buildSchema(useLocalize(this._hass)));
                    form.data = this._formMetadata();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
                this._initDomBindings();
            }
            else {
                form.data = this._formMetadata();
                if (this._hass)
                    form.hass = this._hass;
            }
            this._syncStylePanel();
        }
        _initDomBindings() {
            this._swatchCircleEl = this.querySelector('#swatch-circle');
            this._colorInputEl = this.querySelector('#native-color-input');
            this._swatchNameEl = this.querySelector('#swatch-name');
            this._swatchHexEl = this.querySelector('#swatch-hex');
            this._stateTitleEl = this.querySelector('#state-title');
            this._chipsContainerEl = this.querySelector('#chips-grid');
            this._borderSliderEl = this.querySelector('#border-slider-input');
            this._borderValBadgeEl = this.querySelector('#border-val-text');
            // 1. Clics sur les onglets d'états
            LIGHT_STATES.forEach(s => {
                this.querySelector(`#tab-${s.key}`)?.addEventListener('click', () => {
                    this._setActiveState(s.key);
                });
            });
            // 2. Déclencheur input color natif
            const triggerColor = () => {
                if (this._colorInputEl) {
                    this._colorInputEl.click();
                }
            };
            this.querySelector('#swatch-circle-wrap')?.addEventListener('click', triggerColor);
            this.querySelector('#pipette-btn')?.addEventListener('click', triggerColor);
            this._colorInputEl?.addEventListener('input', (e) => {
                const val = e.target.value;
                if (val)
                    this._updateColor(val);
            });
            // 3. Génération des chips HALO (Option B)
            if (this._chipsContainerEl) {
                buildChips(this._chipsContainerEl, this._hass, name => this._updateColor(name));
            }
            // 4. Slider unique de bordure
            this._borderSliderEl?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                    this._updateBorderWidth(val);
                }
            });
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/components/halo-separator-card.ts
     * 📝 Description   : Composant Web custom:halo-separator-card.
     *                    Séparateur de section élégant avec ligne dégradée néon,
     *                    bouton escamotable (Masquer / Afficher) et volet accordéon
     *                    de légende personnalisable (grille 1/2/3 colonnes,
     *                    alignement vertical, badges/icônes, halos et actions tactiles).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`localizeHalo`).
     *   - 💡 v1.2.0 (2026-10-30) : Refonte modulaire majeure :
     *                              • Mode adaptatif : séparateur épuré (collapsible: false) ou accordéon (collapsible: true).
     *                              • Grille responsive dynamique paramétrable (1, 2 ou 3 colonnes).
     *                              • Alignement optique vertical au pixel près entre icône/badge et libellé.
     *                              • Support double icône MDI ou badge court (max 2-3 car. avec calibrage dynamique).
     *                              • Rétro-éclairage et halo spéculaire paramétrables par item.
     *                              • Support du contenu libre et interactions tactiles optionnelles.
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale du séparateur de section HALO.
     * ==============================================================================
     */
    class HaloSeparatorCard extends HTMLElement {
        get _t() {
            return useLocalize(this._hass);
        }
        constructor() {
            super();
            // Internal state
            this._isExpanded = true;
            // Persistent DOM references
            this._containerEl = null;
            this._headerEl = null;
            this._iconEl = null;
            this._titleEl = null;
            this._lineEl = null;
            this._toggleBtnEl = null;
            this._toggleLabelEl = null;
            this._toggleIconEl = null;
            this._accordionEl = null;
            this._legendContentEl = null;
            this._legendGridEl = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-separator-card-editor');
        }
        static getStubConfig() {
            return {
                name: 'Section',
                icon: 'mdi:bookmark',
                collapsible: false
            };
        }
        setConfig(config) {
            if (!config) {
                throw new Error('Invalid configuration for halo-separator-card');
            }
            this._config = {
                columns: 2,
                collapsible: false,
                ...config
            };
            if (config.initial_collapsed) {
                this._isExpanded = false;
            }
            else if (config.expanded !== undefined) {
                this._isExpanded = config.expanded;
            }
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
            return this._isExpanded && this._isCollapsible() ? 2 : 1;
        }
        _isCollapsible() {
            if (this._config?.collapsible === false || this._config?.show_legend === false) {
                return false;
            }
            return Boolean(this._config?.collapsible || this._config?.show_legend);
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            // Entité de toggle externe synchronisée
            if (this._config.toggle_entity) {
                if (oldHass.states[this._config.toggle_entity] !== newHass.states[this._config.toggle_entity]) {
                    return true;
                }
            }
            // Entité de thème
            if (this._config.theme_entity) {
                if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
                    return true;
                }
            }
            // Thèmes globaux
            const themeEntities = [
                'input_select.couleur_theme_eclairages',
                'input_select.couleur_theme_ouvertures',
                'input_select.couleur_theme_chauffage',
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
          margin: 0;
          padding: 0;
          user-select: none;
          -webkit-user-select: none;
        }
        .halo-separator-wrapper {
          width: 100%;
          box-sizing: border-box;
          padding: 14px 0px 6px 0px;
        }
        .halo-separator-header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
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

        /* Bouton Pill Toggle */
        .halo-toggle-btn {
          display: none;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          line-height: 14px;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.25s ease;
        }
        .halo-toggle-btn:hover {
          filter: brightness(1.2);
        }
        .halo-toggle-btn:active {
          transform: scale(0.95);
        }
        .halo-toggle-btn ha-icon {
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -1px;
        }

        /* Volet Accordéon */
        .halo-accordion-drawer {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          margin-top: 0;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.3s ease,
                      margin-top 0.3s ease;
          pointer-events: none;
        }
        .halo-accordion-drawer.expanded {
          max-height: 1200px;
          opacity: 1;
          margin-top: 10px;
          overflow: visible;
          pointer-events: auto;
        }

        .halo-legend-card {
          border-radius: 14px;
          padding: 12px 14px;
          background: linear-gradient(160deg, rgba(20, 28, 38, 0.70), rgba(10, 15, 22, 0.85));
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 4px 16px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          box-sizing: border-box;
          width: 100%;
        }

        .legend-content {
          font-size: 11.5px;
          line-height: 1.5;
          color: rgba(220, 235, 240, 0.85);
          margin-bottom: 10px;
          text-align: left;
          word-break: break-word;
        }

        .legend-grid {
          display: grid;
          grid-template-columns: repeat(var(--halo-columns, 2), minmax(0, 1fr));
          gap: 10px 16px;
          font-size: 11px;
          width: 100%;
          box-sizing: border-box;
          text-align: left;
        }

        @media (max-width: 480px) {
          .legend-grid {
            grid-template-columns: repeat(min(var(--halo-columns, 2), 2), minmax(0, 1fr));
            gap: 8px 12px;
          }
        }

        @media (max-width: 340px) {
          .legend-grid {
            grid-template-columns: 1fr;
          }
        }

        .legend-item {
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          gap: 8px;
          min-width: 0;
          box-sizing: border-box;
        }

        .legend-item.interactive {
          cursor: pointer;
          padding: 3px 6px;
          margin: -3px -6px;
          border-radius: 8px;
          transition: background 0.2s ease, transform 0.15s ease;
        }
        .legend-item.interactive:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .legend-item.interactive:active {
          transform: scale(0.97);
        }

        .legend-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 6px;
          flex-shrink: 0;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 8px var(--item-halo, transparent);
          transition: all 0.25s ease;
          margin-top: 0px;
        }
        .legend-badge ha-icon {
          --mdc-icon-size: 14px;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .legend-badge-text {
          font-weight: 700;
          font-size: 11px;
          letter-spacing: -0.3px;
          line-height: 1;
          text-align: center;
        }
        .legend-text {
          flex: 1;
          min-width: 0;
          color: rgba(220, 235, 240, 0.85);
          line-height: 22px;
          font-size: 11.5px;
          text-align: left;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        .legend-text b {
          color: #ffffff;
          font-weight: 600;
          letter-spacing: -0.1px;
        }
      </style>
      <div class="halo-separator-wrapper" id="container">
        <div class="halo-separator-header" id="header">
          <div class="halo-separator-icon">
            <ha-icon id="sep-icon"></ha-icon>
          </div>
          <span class="halo-separator-title" id="sep-title"></span>
          <div class="halo-separator-line" id="sep-line"></div>
          <div class="halo-toggle-btn" id="toggle-btn">
            <span id="toggle-label">Masquer</span>
            <ha-icon id="toggle-icon" icon="mdi:chevron-up"></ha-icon>
          </div>
        </div>

        <div class="halo-accordion-drawer" id="accordion-drawer">
          <div class="halo-legend-card">
            <div class="legend-content" id="legend-content" style="display: none;"></div>
            <div class="legend-grid" id="legend-grid"></div>
          </div>
        </div>
      </div>
    `;
            this._containerEl = this._root.getElementById('container');
            this._headerEl = this._root.getElementById('header');
            this._iconEl = this._root.getElementById('sep-icon');
            this._titleEl = this._root.getElementById('sep-title');
            this._lineEl = this._root.getElementById('sep-line');
            this._toggleBtnEl = this._root.getElementById('toggle-btn');
            this._toggleLabelEl = this._root.getElementById('toggle-label');
            this._toggleIconEl = this._root.getElementById('toggle-icon');
            this._accordionEl = this._root.getElementById('accordion-drawer');
            this._legendContentEl = this._root.getElementById('legend-content');
            this._legendGridEl = this._root.getElementById('legend-grid');
            if (this._toggleBtnEl) {
                this._toggleBtnEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._handleToggle();
                });
            }
        }
        _handleToggle() {
            this._isExpanded = !this._isExpanded;
            fireHaptic('light');
            // Synchronisation si toggle_entity configurée
            if (this._config.toggle_entity && this._hass) {
                const ent = this._config.toggle_entity;
                const domain = ent.split('.')[0] || 'input_boolean';
                this._hass.callService(domain, 'toggle', { entity_id: ent });
            }
            this._render();
        }
        _getDefaultLegendItems(accentColor) {
            return [
                {
                    icon: 'mdi:lightbulb',
                    label: this._t('separator.lg_icon'),
                    desc: this._t('separator.lg_icon_d'),
                    color: accentColor
                },
                {
                    badge: '%',
                    label: this._t('separator.lg_pct'),
                    desc: this._t('separator.lg_pct_d'),
                    color: '#f59e0b'
                },
                {
                    icon: 'mdi:thermometer',
                    label: this._t('separator.lg_k'),
                    desc: this._t('separator.lg_k_d'),
                    color: '#f97316'
                },
                {
                    icon: 'mdi:gesture-tap',
                    label: this._t('separator.lg_name'),
                    desc: this._t('separator.lg_name_d'),
                    color: '#e6f2f5'
                }
            ];
        }
        _render() {
            if (!this._config)
                return;
            if (!this._containerEl) {
                this._buildDom();
            }
            const name = this._config.name || this._config.title || this._t('separator.section');
            const icon = this._config.icon || 'mdi:bookmark';
            const col = resolveThemeColor(this._hass, this._config.color, this._config.theme_entity || 'input_select.couleur_theme_eclairages', '#26c6da');
            // Synchroniser l'état d'expansion si lié à toggle_entity
            if (this._config.toggle_entity && this._hass?.states?.[this._config.toggle_entity]) {
                const extState = this._hass.states[this._config.toggle_entity].state;
                this._isExpanded = (extState === 'on');
            }
            // Icône principale
            if (this._iconEl) {
                if (this._iconEl.getAttribute('icon') !== icon) {
                    this._iconEl.setAttribute('icon', icon);
                }
                this._iconEl.style.color = col;
            }
            // Titre
            if (this._titleEl && this._titleEl.textContent !== name) {
                this._titleEl.textContent = name;
            }
            // Ligne dégradée
            if (this._lineEl) {
                const gradient = `linear-gradient(90deg, ${col} 0%, ${col}44 60%, transparent 100%)`;
                if (this._lineEl.style.background !== gradient) {
                    this._lineEl.style.background = gradient;
                }
            }
            // Gestion Accordéon & Bouton Pill
            const isCollapsible = this._isCollapsible();
            if (this._toggleBtnEl) {
                if (isCollapsible) {
                    this._toggleBtnEl.style.display = 'inline-flex';
                    this._toggleBtnEl.style.background = this._isExpanded ? `${col}26` : 'rgba(255, 255, 255, 0.05)';
                    this._toggleBtnEl.style.border = this._isExpanded ? `1px solid ${col}66` : '1px solid rgba(255, 255, 255, 0.10)';
                    this._toggleBtnEl.style.boxShadow = this._isExpanded ? `0 0 8px ${col}40` : 'none';
                    this._toggleBtnEl.style.color = this._isExpanded ? col : 'rgba(220, 235, 240, 0.70)';
                    const labelText = this._isExpanded
                        ? (this._config.label_on || this._t('separator.hide'))
                        : (this._config.label_off || this._t('separator.show'));
                    if (this._toggleLabelEl)
                        this._toggleLabelEl.textContent = labelText;
                    const chevronIcon = this._isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down';
                    if (this._toggleIconEl) {
                        if (this._toggleIconEl.getAttribute('icon') !== chevronIcon) {
                            this._toggleIconEl.setAttribute('icon', chevronIcon);
                        }
                        this._toggleIconEl.style.color = this._isExpanded ? col : 'rgba(220, 235, 240, 0.70)';
                    }
                }
                else {
                    this._toggleBtnEl.style.display = 'none';
                }
            }
            // Tiroir Accordéon
            if (this._accordionEl) {
                if (isCollapsible && this._isExpanded) {
                    this._accordionEl.style.display = 'block';
                    this._accordionEl.className = 'halo-accordion-drawer expanded';
                }
                else if (isCollapsible) {
                    this._accordionEl.style.display = 'block';
                    this._accordionEl.className = 'halo-accordion-drawer';
                }
                else {
                    this._accordionEl.style.display = 'none';
                    this._accordionEl.className = 'halo-accordion-drawer';
                }
            }
            // Rendu du contenu libre Markdown/texte
            if (this._legendContentEl) {
                if (this._config.content) {
                    this._legendContentEl.textContent = this._config.content;
                    this._legendContentEl.style.display = 'block';
                }
                else {
                    this._legendContentEl.textContent = '';
                    this._legendContentEl.style.display = 'none';
                }
            }
            // Rendu des items de légende
            if (isCollapsible && this._legendGridEl) {
                let colCount = 2;
                if (this._config.columns !== undefined) {
                    const parsed = parseInt(String(this._config.columns), 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
                        colCount = parsed;
                    }
                }
                this._legendGridEl.style.setProperty('--halo-columns', String(colCount));
                let items = [];
                if (Array.isArray(this._config.legend_items)) {
                    items = this._config.legend_items;
                }
                else if (this._config.legend_items === true ||
                    (this._config.collapsible && this._config.legend_items === undefined && !this._config.content)) {
                    items = this._getDefaultLegendItems(col);
                }
                this._legendGridEl.innerHTML = '';
                items.forEach(it => {
                    const itemCol = it.color ? toHexColor(it.color, col) : col;
                    const div = document.createElement('div');
                    div.className = 'legend-item';
                    let badgeContent = '';
                    if (it.badge) {
                        const badgeText = String(it.badge).trim().slice(0, 3);
                        let badgeFontSize = '11px';
                        if (badgeText.length >= 3) {
                            badgeFontSize = '9.5px';
                        }
                        else if (badgeText.length === 2) {
                            badgeFontSize = '10.5px';
                        }
                        badgeContent = `<span class="legend-badge-text" style="color: ${itemCol}; font-size: ${badgeFontSize};">${badgeText}</span>`;
                    }
                    else if (it.icon) {
                        badgeContent = `<ha-icon icon="${it.icon}" style="color: ${itemCol};"></ha-icon>`;
                    }
                    else {
                        badgeContent = `<ha-icon icon="mdi:circle-small" style="color: ${itemCol};"></ha-icon>`;
                    }
                    const labelPart = it.label ? `<b>${it.label}</b>` : '';
                    const descPart = it.desc || '';
                    const separator = (labelPart && descPart && !descPart.startsWith(' ') && !descPart.startsWith(':')) ? ' : ' : '';
                    div.innerHTML = `
          <span class="legend-badge" style="background: ${itemCol}22; border-color: ${itemCol}55; --item-halo: ${itemCol}40;">
            ${badgeContent}
          </span>
          <span class="legend-text">
            ${labelPart}${separator}${descPart}
          </span>
        `;
                    if (it.tap_action) {
                        div.classList.add('interactive');
                        div.addEventListener('click', (ev) => {
                            ev.stopPropagation();
                            fireHaptic('light');
                            handleAction(this, this._hass, { tap_action: it.tap_action }, 'tap');
                        });
                    }
                    this._legendGridEl.appendChild(div);
                });
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-separator-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-separator-card.
     *                    Mode adaptatif conditionnel : séparateur simple par défaut,
     *                    et affichage des options de volet repliable/légendes uniquement
     *                    si l'accordéon est explicitement activé.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.2.0
     * 📅 Date         : 2026-10-30
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.2.0 (2026-10-30) : Éditeur adaptatif modulaire complet :
     *                              • Masquage strict des options de volet/légendes si collapsible est désactivé.
     *                              • Répéteur dynamique des éléments de légende (ajout, édition, réordonnancement, suppression).
     *                              • Support sélecteur colonnes (1, 2, 3).
     *                              • Mention visuelle "OU" stylisée entre sélecteur d'icône et badge court.
     *                              • Champ badge court calibré avec limite stricte (maxlength="3").
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale de l'éditeur séparateur.
     * ==============================================================================
     */
    const BASE_SCHEMA = [
        { name: 'name', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'color', selector: { color_rgb: {} } },
        { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } },
        { name: 'collapsible', selector: { boolean: {} } }
    ];
    const buildAccordionSchema = (t) => [
        { name: 'initial_collapsed', selector: { boolean: {} } },
        {
            name: 'columns',
            selector: {
                select: {
                    options: selectOptions(t, 'separator', [['1', 'cols_1'], ['2', 'cols_2'], ['3', 'cols_3']])
                }
            }
        },
        { name: 'label_on', selector: { text: {} } },
        { name: 'label_off', selector: { text: {} } },
        { name: 'content', selector: { text: { multiline: true } } },
        { name: 'toggle_entity', selector: { entity: { domain: 'input_boolean' } } }
    ];
    class HaloSeparatorCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
        }
        get _t() {
            return useLocalize(this._hass);
        }
        setConfig(config) {
            this._config = {
                columns: 2,
                collapsible: false,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('ha-form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('ha-form');
            if (form) {
                form.hass = hass;
            }
        }
        _formData() {
            if (!this._config)
                return {};
            const data = { ...this._config };
            if (data.columns !== undefined) {
                data.columns = String(data.columns);
            }
            if (data.collapsible === undefined) {
                data.collapsible = Boolean(data.show_legend);
            }
            if (data.color && typeof data.color === 'string') {
                const rgb = hexToRgb(data.color);
                if (rgb)
                    data.color = rgb;
            }
            return data;
        }
        _fireChanged() {
            const event = new CustomEvent('config-changed', {
                detail: { config: this._config },
                bubbles: true,
                composed: true
            });
            this.dispatchEvent(event);
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            const val = { ...ev.detail.value };
            if (val.columns !== undefined) {
                val.columns = parseInt(String(val.columns), 10) || 2;
            }
            if (val.color && Array.isArray(val.color)) {
                val.color = rgbToHex(val.color);
            }
            const previousCollapsible = Boolean(this._config.collapsible || this._config.show_legend);
            const newCollapsible = Boolean(val.collapsible !== undefined ? val.collapsible : previousCollapsible);
            this._config = {
                ...this._config,
                ...val
            };
            this._fireChanged();
            // Actualiser le formulaire et l'affichage si le mode accordéon a basculé
            if (previousCollapsible !== newCollapsible) {
                this._render();
            }
        }
        _getItems() {
            if (Array.isArray(this._config.legend_items)) {
                return [...this._config.legend_items];
            }
            return [];
        }
        _addItem() {
            const items = this._getItems();
            items.push({
                icon: 'mdi:information-outline',
                label: this._t('editor.separator.new_label'),
                desc: this._t('editor.separator.new_desc'),
                color: ''
            });
            this._config = {
                ...this._config,
                legend_items: items
            };
            this._fireChanged();
            this._renderItemsManager();
        }
        _removeItem(index) {
            const items = this._getItems();
            items.splice(index, 1);
            this._config = {
                ...this._config,
                legend_items: items
            };
            this._fireChanged();
            this._renderItemsManager();
        }
        _moveItem(index, direction) {
            const items = this._getItems();
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= items.length)
                return;
            const temp = items[index];
            items[index] = items[targetIndex];
            items[targetIndex] = temp;
            this._config = {
                ...this._config,
                legend_items: items
            };
            this._fireChanged();
            this._renderItemsManager();
        }
        _updateItemField(index, field, value) {
            const items = this._getItems();
            if (!items[index])
                return;
            items[index][field] = value;
            this._config = {
                ...this._config,
                legend_items: items
            };
            this._fireChanged();
        }
        _renderItemsManager() {
            const container = this.querySelector('#items-container');
            if (!container)
                return;
            const items = this._getItems();
            const t = (k) => this._t(`editor.separator.${k}`);
            if (items.length === 0) {
                container.innerHTML = `
        <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px; text-align: center; color: var(--secondary-text-color); font-size: 13px;">
          ${t("no_items")}<br>
          <small>${t("no_items_hint")}</small>
        </div>
      `;
                return;
            }
            container.innerHTML = '';
            items.forEach((it, idx) => {
                const card = document.createElement('div');
                card.style.cssText = `
        background: var(--card-background-color, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      `;
                // Header row
                const headerRow = document.createElement('div');
                headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;';
                headerRow.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px;">
          <ha-icon icon="${it.icon || 'mdi:circle-small'}" style="color: ${it.color || 'var(--primary-color)'}; --mdc-icon-size: 18px;"></ha-icon>
          <span>${it.label || this._t("editor.separator.item_n", "n", String(idx + 1))}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="btn-up" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px; font-size: 14px;" ${idx === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-down" style="background: none; border: none; color: var(--primary-text-color); cursor: pointer; padding: 2px 6px; font-size: 14px;" ${idx === items.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-del" style="background: none; border: none; color: var(--error-color, #f44336); cursor: pointer; padding: 2px 6px; font-size: 16px;">✕</button>
        </div>
      `;
                headerRow.querySelector('.btn-up')?.addEventListener('click', () => this._moveItem(idx, 'up'));
                headerRow.querySelector('.btn-down')?.addEventListener('click', () => this._moveItem(idx, 'down'));
                headerRow.querySelector('.btn-del')?.addEventListener('click', () => this._removeItem(idx));
                // Fields row 1 (Icon OU Badge court)
                const row1 = document.createElement('div');
                row1.style.cssText = 'display: flex; align-items: flex-end; gap: 8px; width: 100%; box-sizing: border-box;';
                row1.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">${t("f_icon")}</label>
          <input type="text" class="input-icon" value="${it.icon || ''}" placeholder="mdi:tag" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div style="display: flex; align-items: center; justify-content: center; height: 31px; padding: 0 1px;">
          <span style="font-size: 10px; font-weight: 700; color: var(--secondary-text-color); background: rgba(255, 255, 255, 0.08); padding: 3px 8px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); letter-spacing: 0.5px; user-select: none;">${t("or")}</span>
        </div>
        <div style="width: 130px; min-width: 130px;">
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px; white-space: nowrap;">${t("f_badge")} <span style="font-size: 10px; opacity: 0.8;">${t("f_badge_hint")}</span></label>
          <input type="text" class="input-badge" value="${it.badge || ''}" maxlength="3" placeholder="%, K, °C" style="width: 100%; box-sizing: border-box; padding: 6px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px; text-align: center; font-weight: 700;">
        </div>
      `;
                row1.querySelector('.input-icon')?.addEventListener('change', (e) => this._updateItemField(idx, 'icon', e.target.value));
                row1.querySelector('.input-badge')?.addEventListener('change', (e) => this._updateItemField(idx, 'badge', e.target.value));
                // Fields row 2 (Label & Desc)
                const row2 = document.createElement('div');
                row2.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;';
                row2.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">${t("f_label")}</label>
          <input type="text" class="input-label" value="${it.label || ''}" placeholder="${t("f_label_ph")}" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">${t("f_desc")}</label>
          <input type="text" class="input-desc" value="${it.desc || ''}" placeholder="${t("f_desc_ph")}" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;
                row2.querySelector('.input-label')?.addEventListener('change', (e) => this._updateItemField(idx, 'label', e.target.value));
                row2.querySelector('.input-desc')?.addEventListener('change', (e) => this._updateItemField(idx, 'desc', e.target.value));
                // Fields row 3 (Color)
                const row3 = document.createElement('div');
                row3.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 8px;';
                row3.innerHTML = `
        <div>
          <label style="display:block; font-size: 11px; color: var(--secondary-text-color); margin-bottom: 2px;">${t("f_color")}</label>
          <input type="text" class="input-color" value="${it.color || ''}" placeholder="ex: #38bdf8" style="width: 100%; box-sizing: border-box; padding: 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.2); color: var(--primary-text-color); font-size: 12px;">
        </div>
      `;
                row3.querySelector('.input-color')?.addEventListener('change', (e) => this._updateItemField(idx, 'color', e.target.value));
                card.appendChild(headerRow);
                card.appendChild(row1);
                card.appendChild(row2);
                card.appendChild(row3);
                container.appendChild(card);
            });
        }
        _render() {
            if (!this._config)
                return;
            const isCollapsible = Boolean(this._config?.collapsible || this._config?.show_legend);
            const schema = isCollapsible ? [...BASE_SCHEMA, ...buildAccordionSchema(this._t)] : BASE_SCHEMA;
            const t = (k) => this._t(`editor.separator.${k}`);
            let form = this.querySelector('ha-form');
            if (!form) {
                this._lang = getLang(this._hass);
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
          <div id="legend-items-manager" style="display: ${isCollapsible ? 'block' : 'none'}; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div>
                <span style="font-weight: 600; font-size: 14px; color: var(--primary-text-color);">${t("items_title")}</span>
                <span style="display: block; font-size: 11px; color: var(--secondary-text-color);">${t("items_subtitle")}</span>
              </div>
              <button type="button" id="btn-add-item" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 6px; background: var(--primary-color, #0288d1); color: #fff; border: none; cursor: pointer; font-size: 12px; font-weight: 600;">
                <span>${t("add_item")}</span>
              </button>
            </div>
            <div id="items-container"></div>
          </div>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "separator", schema);
                    form.data = this._formData();
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
                this.querySelector('#btn-add-item')?.addEventListener('click', () => this._addItem());
                if (isCollapsible) {
                    this._renderItemsManager();
                }
            }
            else {
                applyFormI18n(form, this._hass, "separator", schema);
                form.data = this._formData();
                if (this._hass)
                    form.hass = this._hass;
                const managerEl = this.querySelector('#legend-items-manager');
                if (managerEl) {
                    managerEl.style.display = isCollapsible ? 'block' : 'none';
                }
                if (isCollapsible) {
                    this._renderItemsManager();
                }
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/components/halo-cover-color-card.ts
     * 📝 Description   : Composant Web custom:halo-cover-color-card.
     *                    Carte de personnalisation des couleurs d'états des volets (2x2),
     *                    avec en-tête séparateur, pastilles lumineuses, codes hexadécimaux
     *                    et sous-boutons d'icônes d'état (alignement pixel-perfect capture).
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`localizeHalo`).
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de la carte cover color.
     * ==============================================================================
     */
    const TILE_DEFINITIONS = [
        {
            key: 'closed',
            titleKey: 'cover_color.closed',
            defaultEntity: 'input_text.couleur_volet_ferme',
            defaultHex: '#E2E8F0',
            defaultIcon: 'mdi:window-shutter'
        },
        {
            key: 'partial',
            titleKey: 'cover_color.partial',
            defaultEntity: 'input_text.couleur_volet_partiel',
            defaultHex: '#38BDF8',
            defaultIcon: 'mdi:window-shutter-open'
        },
        {
            key: 'open',
            titleKey: 'cover_color.open',
            defaultEntity: 'input_text.couleur_volet_ouvert',
            defaultHex: '#2F86FF',
            defaultIcon: 'mdi:window-shutter-open'
        },
        {
            key: 'moving',
            titleKey: 'cover_color.moving',
            defaultEntity: 'input_text.couleur_volet_en_mouvement',
            defaultHex: '#F59E0B',
            defaultIcon: 'mdi:swap-vertical'
        }
    ];
    class HaloCoverColorCard extends HTMLElement {
        get _t() {
            return useLocalize(this._hass);
        }
        constructor() {
            super();
            // Persistent DOM references
            this._containerEl = null;
            this._headerIconEl = null;
            this._headerTitleEl = null;
            this._headerLineEl = null;
            this._tilesContainerEl = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-cover-color-card-editor');
        }
        static getStubConfig() {
            return {
                icon: 'mdi:window-shutter-cog'
            };
        }
        setConfig(config) {
            if (!config) {
                throw new Error('Invalid configuration for halo-cover-color-card');
            }
            this._config = {
                icon: 'mdi:window-shutter-cog',
                ...config
            };
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
            return 3;
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            for (const def of TILE_DEFINITIONS) {
                const entKey = `${def.key}_entity`;
                const entityId = this._config[entKey] || def.defaultEntity;
                if (oldHass.states[entityId] !== newHass.states[entityId]) {
                    return true;
                }
            }
            // Thème général
            const commonThemeEntities = [
                'input_select.couleur_theme_ouvertures',
                'input_select.couleur_theme_eclairages',
                'input_select.couleur_theme_global'
            ];
            for (const te of commonThemeEntities) {
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
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 0;
        }

        /* Header Separator */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .header-icon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-2px);
          flex-shrink: 0;
        }
        .header-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
        }
        .header-title {
          color: #e6f2f5;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.2px;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .header-line {
          flex: 1;
          height: 2px;
          min-height: 2px;
          border-radius: 2px;
          transition: background 0.3s ease;
        }

        /* 2x2 Grid */
        .grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px 12px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Single Color Tile */
        .color-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px;
          padding: 8px 10px;
          min-height: 48px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .color-tile:hover {
          filter: brightness(1.08);
        }
        .color-tile:active {
          transform: scale(0.97);
        }

        .tile-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .color-dot {
          width: 22px;
          height: 22px;
          min-width: 22px;
          border-radius: 50%;
          border: 1.25px solid rgba(255, 255, 255, 0.40);
          flex-shrink: 0;
          display: inline-block;
          transition: background 0.25s ease, box-shadow 0.25s ease;
        }
        .tile-texts {
          display: flex;
          flex-direction: column;
          text-align: left;
          min-width: 0;
        }
        .tile-title {
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-hex {
          font-size: 11px;
          font-weight: 600;
          font-family: monospace;
          letter-spacing: 0.5px;
          line-height: 1.2;
          margin-top: 1px;
        }

        .tile-sub-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          flex-shrink: 0;
        }
        .tile-sub-btn ha-icon {
          --mdc-icon-size: 16px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
      <div class="wrapper" id="container">
        <div class="header">
          <div class="header-icon">
            <ha-icon id="header-icon"></ha-icon>
          </div>
          <span class="header-title" id="header-title"></span>
          <div class="header-line" id="header-line"></div>
        </div>

        <div class="grid-container" id="tiles-container"></div>
      </div>
    `;
            this._containerEl = this._root.getElementById('container');
            this._headerIconEl = this._root.getElementById('header-icon');
            this._headerTitleEl = this._root.getElementById('header-title');
            this._headerLineEl = this._root.getElementById('header-line');
            this._tilesContainerEl = this._root.getElementById('tiles-container');
        }
        _getTileHex(def) {
            const entKey = `${def.key}_entity`;
            const defKey = `${def.key}_default_color`;
            const entityId = this._config[entKey] || def.defaultEntity;
            const defaultColor = this._config[defKey] || def.defaultHex;
            let hex = this._hass?.states?.[entityId]?.state || defaultColor;
            if (typeof hex === 'string') {
                hex = hex.trim();
                if (!hex.startsWith('#'))
                    hex = '#' + hex;
                return hex;
            }
            return defaultColor;
        }
        _handleTileClick(def) {
            const entKey = `${def.key}_entity`;
            const entityId = this._config[entKey] || def.defaultEntity;
            fireHaptic('light');
            fireEvent(this, 'hass-more-info', { entityId });
        }
        _render() {
            if (!this._config)
                return;
            if (!this._containerEl) {
                this._buildDom();
            }
            const title = this._config.title || this._t('cover_color.title');
            const icon = this._config.icon || 'mdi:window-shutter-cog';
            const headerColor = resolveThemeColor(this._hass, this._config.color, this._config.theme_entity || 'input_select.couleur_theme_ouvertures', '#26c6da');
            // Header
            if (this._headerIconEl) {
                if (this._headerIconEl.getAttribute('icon') !== icon) {
                    this._headerIconEl.setAttribute('icon', icon);
                }
                this._headerIconEl.style.color = headerColor;
            }
            if (this._headerTitleEl) {
                this._headerTitleEl.textContent = title;
            }
            if (this._headerLineEl) {
                this._headerLineEl.style.background = `linear-gradient(90deg, ${headerColor} 0%, ${headerColor}44 60%, transparent 100%)`;
            }
            // Grid Tiles
            if (this._tilesContainerEl) {
                this._tilesContainerEl.innerHTML = '';
                TILE_DEFINITIONS.forEach(def => {
                    const titleKey = `${def.key}_name`;
                    const iconKey = `${def.key}_icon`;
                    const tileTitle = this._config[titleKey] || this._t(def.titleKey);
                    const tileIcon = this._config[iconKey] || def.defaultIcon;
                    const hex = this._getTileHex(def);
                    const tileEl = document.createElement('div');
                    tileEl.className = 'color-tile';
                    tileEl.style.background = `linear-gradient(135deg, ${hex}26, rgba(15, 23, 36, 0.88))`;
                    tileEl.style.border = `1.25px solid ${hex}`;
                    tileEl.style.boxShadow = `0 0 14px ${hex}55, inset 0 1px 0 rgba(255, 255, 255, 0.15)`;
                    tileEl.innerHTML = `
          <div class="tile-left">
            <span class="color-dot" style="background: ${hex}; box-shadow: 0 0 10px ${hex}88;"></span>
            <div class="tile-texts">
              <span class="tile-title">${tileTitle}</span>
              <span class="tile-hex" style="color: ${hex};">${hex.toUpperCase()}</span>
            </div>
          </div>
          <div class="tile-sub-btn">
            <ha-icon icon="${tileIcon}" style="color: ${hex};"></ha-icon>
          </div>
        `;
                    tileEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._handleTileClick(def);
                    });
                    this._tilesContainerEl.appendChild(tileEl);
                });
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-cover-color-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-cover-color-card.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.2.0
     * 📅 Date         : 2026-10-30
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-cover-color-card.
     * ==============================================================================
     */
    const SCHEMA$1 = [
        { name: 'title', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'closed_entity', selector: { entity: { domain: 'input_text' } } },
        { name: 'partial_entity', selector: { entity: { domain: 'input_text' } } },
        { name: 'open_entity', selector: { entity: { domain: 'input_text' } } },
        { name: 'moving_entity', selector: { entity: { domain: 'input_text' } } },
        { name: 'theme_entity', selector: { entity: { domain: 'input_select' } } }
    ];
    class HaloCoverColorCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
        }
        setConfig(config) {
            this._config = { ...config };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('ha-form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
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
                this._lang = getLang(this._hass);
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "cover_color", SCHEMA$1);
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
     * 📌 Nom du fichier : src/components/halo-palette-card.ts
     * 📝 Description   : Composant Web custom:halo-palette-card.
     *                    Sélecteur interactif de la palette officielle des 16 teintes HALO
     *                    (grille 2x8), avec pastilles lumineuses, bordures de focus,
     *                    badges de sélection ✓ et synchronisation temps-réel input_select.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.4.2
     * 📅 Date         : 2026-10-31
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
     *                              (`HALO_PALETTE`, `localizeHalo`) et renommage de la teinte `Cyan`.
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de la carte nuancier HALO 16 teintes.
     * ==============================================================================
     */
    // Ordonnancement exact 2 colonnes x 8 lignes de la capture 22.00.20
    const DEFAULT_PALETTE_ORDER = [
        // Ligne 1
        { name: 'Cyan', hex: '#26c6da' },
        { name: 'Bleu Céleste', hex: '#38bdf8' },
        // Ligne 2
        { name: 'Saphir Océan', hex: '#2f86ff' },
        { name: 'Menthe Givrée', hex: '#00e5a3' },
        // Ligne 3
        { name: 'Émeraude', hex: '#10b981' },
        { name: 'Vert Lime', hex: '#84cc16' },
        // Ligne 4
        { name: 'Jaune Soleil', hex: '#facc15' },
        { name: 'Ambre Doré', hex: '#f59e0b' },
        // Ligne 5
        { name: 'Orange Flamme', hex: '#ff5a1f' },
        { name: 'Corail Pêche', hex: '#fb923c' },
        // Ligne 6
        { name: 'Rose Rubis', hex: '#f43f5e' },
        { name: 'Rose Bonbon', hex: '#f472b6' },
        // Ligne 7
        { name: 'Fuchsia Néon', hex: '#d946ef' },
        { name: 'Améthyste', hex: '#a855f7' },
        // Ligne 8
        { name: 'Violet Nuit', hex: '#8b5cf6' },
        { name: 'Blanc Glace', hex: '#e2e8f0' }
    ];
    class HaloPaletteCard extends HTMLElement {
        constructor() {
            super();
            // Persistent DOM references
            this._containerEl = null;
            this._headerEl = null;
            this._headerIconEl = null;
            this._headerTitleEl = null;
            this._headerLineEl = null;
            this._gridEl = null;
            this._root = this.attachShadow({ mode: 'open' });
        }
        static getConfigElement() {
            return document.createElement('halo-palette-card-editor');
        }
        static getStubConfig() {
            return {
                entity: 'input_select.couleur_theme_eclairages'
            };
        }
        setConfig(config) {
            if (!config) {
                throw new Error('Invalid configuration for halo-palette-card');
            }
            this._config = {
                entity: 'input_select.couleur_theme_eclairages',
                columns: 2,
                ...config
            };
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
            return 6;
        }
        _hasChanged(oldHass, newHass) {
            if (!oldHass || !newHass || !this._config)
                return true;
            const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
            return oldHass.states[entityId] !== newHass.states[entityId];
        }
        _buildDom() {
            this._root.innerHTML = `
      <style>
        :host {
          display: block;
          box-sizing: border-box;
          user-select: none;
          -webkit-user-select: none;
        }
        .wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          box-sizing: border-box;
          padding: 8px 0;
        }

        /* En-tête optionnel */
        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
        }
        .header-icon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-2px);
          flex-shrink: 0;
        }
        .header-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
        }
        .header-title {
          color: #e6f2f5;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.2px;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .header-line {
          flex: 1;
          height: 2px;
          min-height: 2px;
          border-radius: 2px;
          transition: background 0.3s ease;
        }

        /* Grille des pastilles */
        .palette-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 10px;
          width: 100%;
          box-sizing: border-box;
        }

        /* Tuile pastille */
        .palette-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px;
          padding: 8px 10px;
          min-height: 48px;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .palette-tile:hover {
          filter: brightness(1.1);
        }
        .palette-tile:active {
          transform: scale(0.97);
        }

        .tile-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .tile-dot {
          width: 20px;
          height: 20px;
          min-width: 20px;
          border-radius: 50%;
          flex-shrink: 0;
          display: inline-block;
          transition: box-shadow 0.25s ease;
        }
        .tile-texts {
          display: flex;
          flex-direction: column;
          text-align: left;
          min-width: 0;
        }
        .tile-name {
          font-size: 13px;
          font-weight: 600;
          color: #e6f2f5;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tile-hex {
          font-size: 11px;
          font-weight: 500;
          font-family: monospace;
          line-height: 1.2;
          margin-top: 1px;
        }

        .tile-check-slot {
          width: 20px;
          height: 20px;
          min-width: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tile-check-slot ha-icon {
          --mdc-icon-size: 20px;
          width: 20px;
          height: 20px;
        }
      </style>
      <div class="wrapper" id="container">
        <div class="header" id="header" style="display: none;">
          <div class="header-icon">
            <ha-icon id="header-icon"></ha-icon>
          </div>
          <span class="header-title" id="header-title"></span>
          <div class="header-line" id="header-line"></div>
        </div>

        <div class="palette-grid" id="palette-grid"></div>
      </div>
    `;
            this._containerEl = this._root.getElementById('container');
            this._headerEl = this._root.getElementById('header');
            this._headerIconEl = this._root.getElementById('header-icon');
            this._headerTitleEl = this._root.getElementById('header-title');
            this._headerLineEl = this._root.getElementById('header-line');
            this._gridEl = this._root.getElementById('palette-grid');
        }
        async _selectColor(colorName) {
            const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
            if (!this._hass)
                return;
            fireHaptic('selection');
            await this._hass.callService('input_select', 'select_option', {
                entity_id: entityId,
                option: colorName
            });
        }
        _render() {
            if (!this._config)
                return;
            if (!this._containerEl) {
                this._buildDom();
            }
            const entityId = this._config.entity || 'input_select.couleur_theme_eclairages';
            const currentState = this._hass?.states?.[entityId]?.state || 'Cyan';
            const activeColorHex = HALO_PALETTE[currentState] || '#26c6da';
            // En-tête optionnel
            if (this._headerEl) {
                if (this._config.title) {
                    this._headerEl.style.display = 'flex';
                    if (this._headerTitleEl)
                        this._headerTitleEl.textContent = this._config.title;
                    const icon = this._config.icon || 'mdi:palette';
                    if (this._headerIconEl) {
                        if (this._headerIconEl.getAttribute('icon') !== icon) {
                            this._headerIconEl.setAttribute('icon', icon);
                        }
                        this._headerIconEl.style.color = activeColorHex;
                    }
                    if (this._headerLineEl) {
                        this._headerLineEl.style.background = `linear-gradient(90deg, ${activeColorHex} 0%, ${activeColorHex}44 60%, transparent 100%)`;
                    }
                }
                else {
                    this._headerEl.style.display = 'none';
                }
            }
            // Grille
            if (this._gridEl) {
                this._gridEl.innerHTML = '';
                const cols = this._config.columns || 2;
                this._gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
                const paletteList = this._config.colors || DEFAULT_PALETTE_ORDER;
                paletteList.forEach(color => {
                    const isActive = (currentState === color.name);
                    const hex = color.hex;
                    const tileEl = document.createElement('div');
                    tileEl.className = 'palette-tile';
                    if (isActive) {
                        tileEl.style.background = `linear-gradient(135deg, ${hex}26, rgba(15, 23, 36, 0.85))`;
                        tileEl.style.border = `2px solid ${hex}`;
                        tileEl.style.boxShadow = `0 0 14px ${hex}66, inset 0 1px 0 rgba(255, 255, 255, 0.12)`;
                    }
                    else {
                        tileEl.style.background = `linear-gradient(135deg, ${hex}0D, rgba(15, 23, 36, 0.65))`;
                        tileEl.style.border = `1px solid rgba(255, 255, 255, 0.08)`;
                        tileEl.style.boxShadow = 'none';
                    }
                    const checkHtml = isActive
                        ? `<ha-icon icon="mdi:check-circle" style="color: ${hex};"></ha-icon>`
                        : ``;
                    tileEl.innerHTML = `
          <div class="tile-left">
            <span class="tile-dot" style="background: ${hex}; box-shadow: 0 0 10px ${hex}88;"></span>
            <div class="tile-texts">
              <span class="tile-name">${localizeHalo(this._hass, color.name)}</span>
              <span class="tile-hex" style="color: ${hex};">${hex.toLowerCase()}</span>
            </div>
          </div>
          <div class="tile-check-slot">
            ${checkHtml}
          </div>
        `;
                    tileEl.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._selectColor(color.name);
                    });
                    this._gridEl.appendChild(tileEl);
                });
            }
        }
    }

    /**
     * ==============================================================================
     * 📌 Nom du fichier : src/editors/halo-palette-card-editor.ts
     * 📝 Description   : Éditeur d'interface graphique UI pour custom:halo-palette-card.
     * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
     * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
     * 📦 Version      : 1.2.0
     * 📅 Date         : 2026-10-30
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 💡 v1.2.0 (2026-10-30) : Création initiale de l'éditeur halo-palette-card.
     * ==============================================================================
     */
    const SCHEMA = [
        { name: 'entity', selector: { entity: { domain: 'input_select' } } },
        { name: 'title', selector: { text: {} } },
        { name: 'icon', selector: { icon: {} } },
        { name: 'columns', selector: { number: { min: 1, max: 4, mode: 'box' } } }
    ];
    class HaloPaletteCardEditor extends HTMLElement {
        constructor() {
            super(...arguments);
            this._lang = "en";
        }
        setConfig(config) {
            this._config = {
                entity: 'input_select.couleur_theme_eclairages',
                columns: 2,
                ...config
            };
            this._render();
        }
        set hass(hass) {
            this._hass = hass;
            if (this._config && this.querySelector('ha-form') && getLang(hass) !== this._lang) {
                this.innerHTML = '';
                this._render();
                return;
            }
            const form = this.querySelector('ha-form');
            if (form) {
                form.hass = hass;
            }
        }
        _valueChanged(ev) {
            if (!this._config || !ev.detail.value)
                return;
            this._config = {
                ...this._config,
                ...ev.detail.value
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
                this._lang = getLang(this._hass);
                this.innerHTML = `
        <div style="padding: 8px 0;">
          <ha-form id="form"></ha-form>
        </div>
      `;
                form = this.querySelector('#form');
                if (form) {
                    applyFormI18n(form, this._hass, "palette", SCHEMA);
                    form.data = this._config;
                    if (this._hass)
                        form.hass = this._hass;
                    form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
                }
            }
            else {
                form.data = this._config;
                if (this._hass)
                    form.hass = this._hass;
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
     * 📦 Version      : 1.5.0
     * 📅 Date         : 2026-11-01
     * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
     * ==============================================================================
     * 📋 CHANGELOG (antéchronologique)
     *   - 🌟 v1.5.0 (2026-11-01) : Intégration de custom:halo-scene-card (ambiances multi-cibles
     *                              lumières et volets sans script backend) et enrichissement de
     *                              custom:halo-button-card (linked_entity, linked_attribute, display_format).
     *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO,
     *                              renommage de la teinte `Cyan` et synchronisation de version.
     *   - 🌍 v1.4.0 (2026-10-30) : Internationalisation (i18n) en/fr de toute la suite :
     *                              src/localize/, éditeurs ha-form (computeLabel/computeHelper),
     *                              panneaux Liquid Glass et états des cartes traduits.
     *   - ✨ v1.3.0 (2026-10-30) : Personnalisation visuelle avancée :
     *                              - Réglage de l'épaisseur de bordure (0 à 3 px, pas 0.25) sur
     *                                halo-button-card, halo-cover-card et halo-light-card.
     *                              - Sélecteur de couleur Mix A+B (Halo Swatch médaillon interactif
     *                                + Nuancier rapide HALO 16 teintes) dans l'éditeur de carte.
     *   - ✨ v1.3.1 (2026-10-30) : Généralisation du sélecteur Mix A+B (avec onglets d'états
     *                              et curseur unique de bordure) à halo-cover-card et halo-light-card.
     *   - ✨ v1.3.0 (2026-10-30) : Sélecteur de couleur Mix A+B sur halo-button-card et réglage
     *                              interactif de l'épaisseur de bordure (0 à 3 px) sur toute la suite.
     *   - 🩹 v1.2.1 (2026-10-30) : Correctif halo-button-card : contour net (border 1.5px solid)
     *                              et halo lumineux permanent (box-shadow) assorti au bouton.
     *   - 💡 v1.2.0 (2026-10-30) : Suite majeure Liquid Glass & Composants modulaires :
     *                              - custom:halo-button-card (tuile universelle polyvalente).
     *                              - custom:halo-separator-card modulaire (mode adaptateur simple
     *                                ou accordéon repliable, grille 1/2/3 colonnes responsive,
     *                                légendes dynamiques, mention "OU" stylisée et badge court auto-calibré).
     *                              - custom:halo-cover-color-card (palette 2x2 états volets).
     *                              - custom:halo-palette-card (nuancier officiel 16 teintes HALO).
     *                              - Remédiation Spook & zéro entités fantômes.
     *   - 💡 v1.1.0 (2026-10-30) : Intégration de custom:halo-light-card, éditeur visuel UI,
     *                              calibrage 64px et bundle lisible/non-minifié.
     *   - 🆕 v1.0.0 (2026-10-29) : Création initiale avec halo-cover-card et halo-separator-card.
     * ==============================================================================
     */
    const VERSION = '1.5.0';
    console.info(`%c  HALO-BUTTON-CARD  %c v${VERSION} `, 'color: #0b0f19; background: #26c6da; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;', 'color: #ffffff; background: #1e293b; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;');
    window.customCards = window.customCards || [];
    window.customCards.push({
        type: 'halo-button-card',
        name: 'HALO Button Card',
        description: 'Polyvalent Liquid Glass button with specular glow, horizontal/vertical layouts, external entity linking and sub-buttons.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-scene-card',
        name: 'HALO Scene Card',
        description: 'Turnkey Liquid Glass scene & ambiance tile for direct multi-target light and cover control without HA scripts.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-light-card',
        name: 'HALO Light Card',
        description: 'Turnkey unified lighting tile with HALO glass styling, dynamic halo, brightness and kelvin sub-buttons.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-cover-card',
        name: 'HALO Cover Card',
        description: 'Turnkey roller shutter card with Liquid Glass styling and dynamic glowing halo.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-separator-card',
        name: 'HALO Separator Card',
        description: 'Sleek section divider with neon gradient line, collapsible toggle button and built-in legend drawer.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-cover-color-card',
        name: 'HALO Cover Color Card',
        description: 'Interactive 2x2 grid for configuring shutter state colors with glowing dots, HEX codes and state icons.',
        preview: true
    });
    window.customCards.push({
        type: 'halo-palette-card',
        name: 'HALO Palette Card',
        description: 'Official 16-color HALO theme palette picker with glowing halos and active check badges.',
        preview: true
    });
    // Register Web Component custom elements
    if (!customElements.get('halo-button-card')) {
        customElements.define('halo-button-card', HaloButtonCard);
    }
    if (!customElements.get('halo-button-card-editor')) {
        customElements.define('halo-button-card-editor', HaloButtonCardEditor);
    }
    if (!customElements.get('halo-scene-card')) {
        customElements.define('halo-scene-card', HaloSceneCard);
    }
    if (!customElements.get('halo-scene-card-editor')) {
        customElements.define('halo-scene-card-editor', HaloSceneCardEditor);
    }
    if (!customElements.get('halo-light-card')) {
        customElements.define('halo-light-card', HaloLightCard);
    }
    if (!customElements.get('halo-light-card-editor')) {
        customElements.define('halo-light-card-editor', HaloLightCardEditor);
    }
    if (!customElements.get('halo-cover-card')) {
        customElements.define('halo-cover-card', HaloCoverCard);
    }
    if (!customElements.get('halo-cover-card-editor')) {
        customElements.define('halo-cover-card-editor', HaloCoverCardEditor);
    }
    if (!customElements.get('halo-separator-card')) {
        customElements.define('halo-separator-card', HaloSeparatorCard);
    }
    if (!customElements.get('halo-separator-card-editor')) {
        customElements.define('halo-separator-card-editor', HaloSeparatorCardEditor);
    }
    if (!customElements.get('halo-cover-color-card')) {
        customElements.define('halo-cover-color-card', HaloCoverColorCard);
    }
    if (!customElements.get('halo-cover-color-card-editor')) {
        customElements.define('halo-cover-color-card-editor', HaloCoverColorCardEditor);
    }
    if (!customElements.get('halo-palette-card')) {
        customElements.define('halo-palette-card', HaloPaletteCard);
    }
    if (!customElements.get('halo-palette-card-editor')) {
        customElements.define('halo-palette-card-editor', HaloPaletteCardEditor);
    }

    exports.HaloButtonCard = HaloButtonCard;
    exports.HaloButtonCardEditor = HaloButtonCardEditor;
    exports.HaloCoverCard = HaloCoverCard;
    exports.HaloCoverCardEditor = HaloCoverCardEditor;
    exports.HaloCoverColorCard = HaloCoverColorCard;
    exports.HaloCoverColorCardEditor = HaloCoverColorCardEditor;
    exports.HaloLightCard = HaloLightCard;
    exports.HaloLightCardEditor = HaloLightCardEditor;
    exports.HaloPaletteCard = HaloPaletteCard;
    exports.HaloPaletteCardEditor = HaloPaletteCardEditor;
    exports.HaloSceneCard = HaloSceneCard;
    exports.HaloSceneCardEditor = HaloSceneCardEditor;
    exports.HaloSeparatorCard = HaloSeparatorCard;
    exports.HaloSeparatorCardEditor = HaloSeparatorCardEditor;
    exports.actionHandler = actionHandler;
    exports.lightHelper = lightHelper;
    exports.themeHelper = themeHelper;
    exports.voletHelperInstance = voletHelperInstance;

    return exports;

})({});
