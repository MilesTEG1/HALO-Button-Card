/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-fold-card.ts
 * 📝 Description   : Composant Web custom:halo-fold-card.
 *                    Conteneur accordéon repliable Liquid Glass permettant
 *                    d'encapsuler n'importe quelles cartes Lovelace enfants
 *                    (ex. lampes individuelles d'un groupe) sous une barre
 *                    d'en-tête compacte avec ligne dégradée néon, badge de
 *                    compteur et bouton pill Afficher / Masquer.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.6.0-beta.1
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.6.0-beta.1 (2026-11-02) : Création initiale du composant conteneur
 *                                     repliable custom:halo-fold-card :
 *                                     • En-tête raffiné aligné sur halo-separator-card
 *                                       (icône MDI, titre, ligne dégradée néon, badge
 *                                       compteur et bouton pill Afficher / Masquer).
 *                                     • Tiroir accordéon fluide avec grille CSS interne
 *                                       responsive (1, 2 ou 3 colonnes, repli 1 col mobile).
 *                                     • Instanciation dynamique des cartes enfants via
 *                                       window.loadCardHelpers() et fallback DOM direct.
 *                                     • Propagation réactive de hass aux cartes enfants.
 * ==============================================================================
 */

import { HomeAssistant, HaloFoldCardConfig } from '../types';
import { resolveThemeColor } from '../core/theme-helper';
import { fireHaptic } from '../core/action-handler';
import { useLocalize } from '../localize/localize';

export class HaloFoldCard extends HTMLElement {
  private _config!: HaloFoldCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // État interne (replié par défaut)
  private _isExpanded: boolean = false;
  private _childCards: any[] = [];
  private _cardsBuildToken: number = 0;

  // Références DOM persistantes
  private _containerEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _badgeEl: HTMLElement | null = null;
  private _lineEl: HTMLElement | null = null;
  private _toggleBtnEl: HTMLElement | null = null;
  private _toggleLabelEl: HTMLElement | null = null;
  private _toggleIconEl: HTMLElement | null = null;
  private _drawerEl: HTMLElement | null = null;
  private _gridEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  private get _t() {
    return useLocalize(this._hass);
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-fold-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      name: 'Détails & Appareils individuels',
      icon: 'mdi:tune-vertical',
      initial_collapsed: true,
      columns: 1,
      cards: []
    };
  }

  public connectedCallback() {
    if (this._config && !this._containerEl) {
      this._buildDom();
      this._buildChildCards();
      this._render();
    }
  }

  public setConfig(config: HaloFoldCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-fold-card');
    }

    this._config = {
      columns: 1,
      gap: 10,
      initial_collapsed: true,
      ...config
    };

    if (config.expanded !== undefined) {
      this._isExpanded = Boolean(config.expanded);
    } else if (config.initial_collapsed !== undefined) {
      this._isExpanded = !config.initial_collapsed;
    } else {
      this._isExpanded = false;
    }

    if (!this._containerEl) {
      this._buildDom();
    }

    this._buildChildCards();
    this._render();
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    // Propagation réactive de hass à toutes les cartes enfants instanciées
    for (const card of this._childCards) {
      if (card) {
        try {
          card.hass = hass;
        } catch (_e) {
          // Ignorer les erreurs éventuelles d'une carte enfant
        }
      }
    }

    if (!this._containerEl) {
      this._buildDom();
      this._buildChildCards();
      this._render();
      return;
    }

    if (this._hasChanged(oldHass, hass)) {
      this._render();
    }
  }

  public getCardSize(): number {
    if (!this._isExpanded) return 1;
    const count = Array.isArray(this._config?.cards) ? this._config.cards.length : 1;
    return 1 + Math.max(1, count);
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    if (this._config.toggle_entity) {
      if (oldHass.states[this._config.toggle_entity] !== newHass.states[this._config.toggle_entity]) {
        return true;
      }
    }

    if (this._config.theme_entity) {
      if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
        return true;
      }
    }

    const themeEntities = [
      'input_select.couleur_theme_eclairages',
      'input_select.couleur_theme_ouvertures',
      'input_select.couleur_theme_chauffage',
      'input_select.couleur_theme_global'
    ];
    for (const te of themeEntities) {
      if (oldHass.states[te] !== newHass.states[te]) return true;
    }

    return false;
  }

  private _buildDom() {
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
        .halo-fold-wrapper {
          width: 100%;
          box-sizing: border-box;
          padding: 6px 0px 4px 0px;
        }
        .halo-fold-header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          box-sizing: border-box;
          cursor: pointer;
          padding: 4px 2px;
          border-radius: 10px;
          transition: background 0.2s ease;
        }
        .halo-fold-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .halo-fold-icon {
          width: 18px;
          height: 18px;
          min-width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translateY(-2px);
          flex-shrink: 0;
        }
        .halo-fold-icon ha-icon {
          --mdc-icon-size: 18px;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        .halo-fold-title {
          color: #e6f2f5;
          font-size: 13.5px;
          font-weight: 600;
          letter-spacing: -0.2px;
          white-space: nowrap;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .halo-fold-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 9px;
          font-size: 10.5px;
          font-weight: 700;
          line-height: 1;
          flex-shrink: 0;
          box-sizing: border-box;
          transition: all 0.25s ease;
        }
        .halo-fold-line {
          flex: 1;
          height: 2px;
          min-height: 2px;
          border-radius: 2px;
          transition: background 0.3s ease;
        }
        .halo-toggle-btn {
          display: inline-flex;
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
        .halo-fold-drawer {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          margin-top: 0;
          transition: max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.3s ease,
                      margin-top 0.3s ease;
          pointer-events: none;
        }
        .halo-fold-drawer.expanded {
          max-height: 2500px;
          opacity: 1;
          margin-top: 10px;
          overflow: visible;
          pointer-events: auto;
        }
        .halo-fold-grid {
          display: grid;
          grid-template-columns: repeat(var(--halo-fold-cols, 1), minmax(0, 1fr));
          gap: var(--halo-fold-gap, 10px);
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 600px) {
          .halo-fold-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>
      <div class="halo-fold-wrapper" id="container">
        <div class="halo-fold-header" id="header">
          <div class="halo-fold-icon">
            <ha-icon id="fold-icon"></ha-icon>
          </div>
          <span class="halo-fold-title" id="fold-title"></span>
          <span class="halo-fold-badge" id="fold-badge" style="display: none;"></span>
          <div class="halo-fold-line" id="fold-line"></div>
          <div class="halo-toggle-btn" id="toggle-btn">
            <span id="toggle-label">Afficher</span>
            <ha-icon id="toggle-icon" icon="mdi:chevron-down"></ha-icon>
          </div>
        </div>
        <div class="halo-fold-drawer" id="fold-drawer">
          <div class="halo-fold-grid" id="fold-grid"></div>
        </div>
      </div>
    `;

    this._containerEl = this._root.getElementById('container');
    this._headerEl = this._root.getElementById('header');
    this._iconEl = this._root.getElementById('fold-icon');
    this._titleEl = this._root.getElementById('fold-title');
    this._badgeEl = this._root.getElementById('fold-badge');
    this._lineEl = this._root.getElementById('fold-line');
    this._toggleBtnEl = this._root.getElementById('toggle-btn');
    this._toggleLabelEl = this._root.getElementById('toggle-label');
    this._toggleIconEl = this._root.getElementById('toggle-icon');
    this._drawerEl = this._root.getElementById('fold-drawer');
    this._gridEl = this._root.getElementById('fold-grid');

    if (this._headerEl) {
      this._headerEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this._handleToggle();
      });
    }
  }

  private _handleToggle() {
    this._isExpanded = !this._isExpanded;
    fireHaptic('light');

    if (this._config.toggle_entity && this._hass) {
      const ent = this._config.toggle_entity;
      const domain = ent.split('.')[0] || 'input_boolean';
      this._hass.callService(domain, 'toggle', { entity_id: ent });
    }

    this._render();
  }

  private async _createCardElement(cardConfig: Record<string, any>): Promise<HTMLElement> {
    try {
      const loadHelpers = (window as any).loadCardHelpers;
      if (typeof loadHelpers === 'function') {
        const helpers = await loadHelpers();
        if (helpers && typeof helpers.createCardElement === 'function') {
          const el = helpers.createCardElement(cardConfig);
          if (this._hass) {
            el.hass = this._hass;
          }
          return el;
        }
      }
    } catch (_err) {
      // Fallback direct ci-dessous
    }

    const rawType = String(cardConfig.type || 'div');
    const tag = rawType.startsWith('custom:') ? rawType.slice(7) : `hui-${rawType}-card`;
    if (rawType.startsWith('custom:') && !customElements.get(tag)) {
      try {
        await Promise.race([
          customElements.whenDefined(tag),
          new Promise(resolve => setTimeout(resolve, 2000))
        ]);
      } catch (_e) {
        // Ignorer timeout
      }
    }
    const el = document.createElement(tag) as any;
    if (typeof el.setConfig === 'function') {
      el.setConfig(cardConfig);
    }
    if (this._hass) {
      el.hass = this._hass;
    }
    return el;
  }

  private async _buildChildCards() {
    if (!this._gridEl) return;
    const token = ++this._cardsBuildToken;
    const cardsConfig = Array.isArray(this._config?.cards) ? this._config.cards : [];

    this._childCards = [];
    this._gridEl.innerHTML = '';

    for (const cardCfg of cardsConfig) {
      if (!cardCfg || typeof cardCfg !== 'object') continue;
      const cardEl = await this._createCardElement(cardCfg);
      if (token !== this._cardsBuildToken) return;
      if (this._hass) {
        (cardEl as any).hass = this._hass;
      }
      this._childCards.push(cardEl);
      this._gridEl.appendChild(cardEl);
    }
  }

  private _render() {
    if (!this._config) return;
    if (!this._containerEl) {
      this._buildDom();
    }

    const name = this._config.name || this._config.title || this._t('fold.default_title');
    const icon = this._config.icon || 'mdi:tune-vertical';
    const col = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity || 'input_select.couleur_theme_eclairages',
      '#26c6da'
    );

    if (this._config.toggle_entity && this._hass?.states?.[this._config.toggle_entity]) {
      const extState = this._hass.states[this._config.toggle_entity].state;
      this._isExpanded = (extState === 'on');
    }

    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      this._iconEl.style.color = col;
    }

    if (this._titleEl && this._titleEl.textContent !== name) {
      this._titleEl.textContent = name;
    }

    const cardCount = Array.isArray(this._config.cards) ? this._config.cards.length : 0;
    if (this._badgeEl) {
      if (cardCount > 0) {
        this._badgeEl.style.display = 'inline-flex';
        this._badgeEl.textContent = String(cardCount);
        this._badgeEl.style.background = `${col}22`;
        this._badgeEl.style.border = `1px solid ${col}55`;
        this._badgeEl.style.color = col;
      } else {
        this._badgeEl.style.display = 'none';
      }
    }

    if (this._lineEl) {
      const gradient = `linear-gradient(90deg, ${col} 0%, ${col}44 60%, transparent 100%)`;
      if (this._lineEl.style.background !== gradient) {
        this._lineEl.style.background = gradient;
      }
    }

    if (this._toggleBtnEl) {
      this._toggleBtnEl.style.background = this._isExpanded ? `${col}26` : 'rgba(255, 255, 255, 0.05)';
      this._toggleBtnEl.style.border = this._isExpanded ? `1px solid ${col}66` : '1px solid rgba(255, 255, 255, 0.10)';
      this._toggleBtnEl.style.boxShadow = this._isExpanded ? `0 0 8px ${col}40` : 'none';
      this._toggleBtnEl.style.color = this._isExpanded ? col : 'rgba(220, 235, 240, 0.70)';

      const labelText = this._isExpanded
        ? (this._config.label_on || this._t('fold.hide'))
        : (this._config.label_off || this._t('fold.show'));
      if (this._toggleLabelEl) {
        this._toggleLabelEl.textContent = labelText;
      }

      const chevronIcon = this._isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down';
      if (this._toggleIconEl) {
        if (this._toggleIconEl.getAttribute('icon') !== chevronIcon) {
          this._toggleIconEl.setAttribute('icon', chevronIcon);
        }
        this._toggleIconEl.style.color = this._isExpanded ? col : 'rgba(220, 235, 240, 0.70)';
      }
    }

    if (this._drawerEl) {
      this._drawerEl.className = this._isExpanded ? 'halo-fold-drawer expanded' : 'halo-fold-drawer';
    }

    if (this._gridEl) {
      let colCount = 1;
      if (this._config.columns !== undefined) {
        const parsed = parseInt(String(this._config.columns), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) {
          colCount = parsed;
        }
      }
      const gapPx = typeof this._config.gap === 'number' ? this._config.gap : 10;
      this._gridEl.style.setProperty('--halo-fold-cols', String(colCount));
      this._gridEl.style.setProperty('--halo-fold-gap', `${gapPx}px`);
    }
  }
}
