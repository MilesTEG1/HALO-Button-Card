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
 * 📦 Version      : 1.2.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.2.0 (2026-10-30) : Refonte modulaire majeure :
 *                              • Mode adaptatif : séparateur épuré (collapsible: false) ou accordéon (collapsible: true).
 *                              • Grille responsive dynamique paramétrable (1, 2 ou 3 colonnes).
 *                              • Alignement optique vertical au pixel près entre icône/badge et libellé.
 *                              • Support double icône MDI ou badge court (max 2-3 car. avec calibrage dynamique).
 *                              • Rétro-éclairage et halo spéculaire paramétrables par item.
 *                              • Support du contenu libre et interactions tactiles optionnelles.
 *   - 🆕 v1.0.0 (2026-10-29) : Création initiale du séparateur de section HOLM.
 * ==============================================================================
 */

import { HomeAssistant, HaloSeparatorCardConfig, LegendItemConfig } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';
import { handleAction, fireHaptic } from '../core/action-handler';
import { useLocalize, localizeHolm } from '../localize/localize';

export class HaloSeparatorCard extends HTMLElement {
  private _config!: HaloSeparatorCardConfig;
  private _hass!: HomeAssistant;

  private get _t() {
    return useLocalize(this._hass);
  }
  private _root: ShadowRoot;

  // Internal state
  private _isExpanded: boolean = true;

  // Persistent DOM references
  private _containerEl: HTMLElement | null = null;
  private _headerEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _lineEl: HTMLElement | null = null;
  private _toggleBtnEl: HTMLElement | null = null;
  private _toggleLabelEl: HTMLElement | null = null;
  private _toggleIconEl: HTMLElement | null = null;
  private _accordionEl: HTMLElement | null = null;
  private _legendContentEl: HTMLElement | null = null;
  private _legendGridEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-separator-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      name: 'Section',
      icon: 'mdi:bookmark',
      collapsible: false
    };
  }

  public setConfig(config: HaloSeparatorCardConfig) {
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
    } else if (config.expanded !== undefined) {
      this._isExpanded = config.expanded;
    }

    if (this._hass) {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
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

  public getCardSize(): number {
    return this._isExpanded && this._isCollapsible() ? 2 : 1;
  }

  private _isCollapsible(): boolean {
    if (this._config?.collapsible === false || this._config?.show_legend === false) {
      return false;
    }
    return Boolean(this._config?.collapsible || this._config?.show_legend);
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

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

  private _handleToggle() {
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

  private _getDefaultLegendItems(accentColor: string): LegendItemConfig[] {
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

  private _render() {
    if (!this._config) return;
    if (!this._containerEl) {
      this._buildDom();
    }

    const name = this._config.name || this._config.title || this._t('separator.section');
    const icon = this._config.icon || 'mdi:bookmark';
    const col = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity || 'input_select.couleur_theme_eclairages',
      '#26c6da'
    );

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
        if (this._toggleLabelEl) this._toggleLabelEl.textContent = labelText;

        const chevronIcon = this._isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down';
        if (this._toggleIconEl) {
          if (this._toggleIconEl.getAttribute('icon') !== chevronIcon) {
            this._toggleIconEl.setAttribute('icon', chevronIcon);
          }
          this._toggleIconEl.style.color = this._isExpanded ? col : 'rgba(220, 235, 240, 0.70)';
        }
      } else {
        this._toggleBtnEl.style.display = 'none';
      }
    }

    // Tiroir Accordéon
    if (this._accordionEl) {
      if (isCollapsible && this._isExpanded) {
        this._accordionEl.style.display = 'block';
        this._accordionEl.className = 'halo-accordion-drawer expanded';
      } else if (isCollapsible) {
        this._accordionEl.style.display = 'block';
        this._accordionEl.className = 'halo-accordion-drawer';
      } else {
        this._accordionEl.style.display = 'none';
        this._accordionEl.className = 'halo-accordion-drawer';
      }
    }

    // Rendu du contenu libre Markdown/texte
    if (this._legendContentEl) {
      if (this._config.content) {
        this._legendContentEl.textContent = this._config.content;
        this._legendContentEl.style.display = 'block';
      } else {
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

      let items: LegendItemConfig[] = [];
      if (Array.isArray(this._config.legend_items)) {
        items = this._config.legend_items;
      } else if (
        this._config.legend_items === true ||
        (this._config.collapsible && this._config.legend_items === undefined && !this._config.content)
      ) {
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
          } else if (badgeText.length === 2) {
            badgeFontSize = '10.5px';
          }
          badgeContent = `<span class="legend-badge-text" style="color: ${itemCol}; font-size: ${badgeFontSize};">${badgeText}</span>`;
        } else if (it.icon) {
          badgeContent = `<ha-icon icon="${it.icon}" style="color: ${itemCol};"></ha-icon>`;
        } else {
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

        this._legendGridEl!.appendChild(div);
      });
    }
  }
}
