/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-marketplace-card.ts
 * 📝 Description   : Composant Web custom:halo-marketplace-card.
 *                    Gestionnaire et rafraîchissement des dépôts du Marketplace
 *                    (ex-HACS) et dépôts personnalisés dans le style Liquid Glass HALO.
 *                    - Bouton global de rechargement de l'intégration Marketplace.
 *                    - Sélecteur multi-choix interactif avec recherche en temps réel.
 *                    - Section dédiée pour les dépôts prioritaires épinglés (HALO, HOLM, HA-MCP).
 *                    - Bouton de rafraîchissement ciblé multi-dépôts (update_entity).
 *                    - Actions entièrement modifiables depuis le YAML de la carte.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.8.0-beta.2
 * 📅 Date         : 2026-11-11
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.8.0-beta.2 (2026-11-11) : Création initiale de custom:halo-marketplace-card :
 *                              - Double mode de rafraîchissement : Global et Sélectif.
 *                              - Recherche dynamique locale et multi-sélection réactive.
 *                              - Dépôts prioritaires épinglés (HALO, HOLM, HA-MCP).
 *                              - Surcharge complète des services et cibles en YAML.
 *                              - Style Liquid Glass HALO avec indicateurs visuels et feedback d'état.
 * ==============================================================================
 */

import { HomeAssistant, HaloMarketplaceCardConfig, HassEntity } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';

interface RepoItem {
  entity_id: string;
  friendly_name: string;
  installed_version: string;
  latest_version: string;
  has_update: boolean;
  is_pinned: boolean;
}

export class HaloMarketplaceCard extends HTMLElement {
  private _config!: HaloMarketplaceCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // État interactif
  private _selectedEntities: Set<string> = new Set();
  private _searchQuery: string = '';
  private _isLoadingAll: boolean = false;
  private _isLoadingSelection: boolean = false;
  private _statusMessage: string = '';
  private _statusType: 'success' | 'error' | 'info' = 'info';
  private _statusTimeout: any = null;

  // Référence DOM
  private _cardEl: HTMLElement | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-marketplace-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      type: 'custom:halo-marketplace-card',
      title: 'Marketplace & Dépôts Custom',
      theme_color: 'Cyan',
      pinned_repositories: [
        'update.halo_button_card_update',
        'update.ha_mcp_custom_component_update',
        'update.home_assistant_mcp_server_mise_a_jour',
        'update.carburant_holm_update',
        'update.climat_holm_update',
        'update.holm_cars_update',
        'update.holm_climate_card_update',
        'update.holm_covers_card_update',
        'update.holm_ecojoko_card_update',
        'update.holm_energy_cards_update',
        'update.holm_family_card_update',
        'update.holm_floor_card_update',
        'update.holm_hp_hc_tarification_et_abonnement_update',
        'update.holm_music_card_update',
        'update.holm_my_menu_update',
        'update.holm_navbar_card_update',
        'update.holm_power_flow_card_update',
        'update.holm_radiator_card_update',
        'update.holm_runtime_card_update',
        'update.holm_sentinel_card_update',
        'update.holm_smoke_card_update',
        'update.volets_holm_update'
      ]
    };
  }

  public setConfig(config: HaloMarketplaceCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-marketplace-card');
    }
    this._config = {
      title: 'Marketplace & Dépôts Custom',
      icon: 'mdi:storefront-outline',
      theme_color: 'Cyan',
      border_width: 1,
      show_search: true,
      show_select_all: true,
      max_height: '320px',
      pinned_repositories: [],
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

    // Réévaluation si des entités de mise à jour ont changé
    if (this._hasEntitiesChanged(oldHass, hass)) {
      this._renderList();
    }
  }

  public getCardSize(): number {
    return 6;
  }

  public connectedCallback() {
    if (!this._cardEl && this._config && this._hass) {
      this._render();
    }
  }

  private _hasEntitiesChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass) return true;
    for (const id in newHass.states) {
      if (id.startsWith('update.')) {
        if (!oldHass.states[id] || oldHass.states[id].state !== newHass.states[id].state || oldHass.states[id].attributes.latest_version !== newHass.states[id].attributes.latest_version) {
          return true;
        }
      }
    }
    return false;
  }

  private _getThemeColor(): string {
    return resolveThemeColor(
      this._hass,
      this._config.color || this._config.theme_color,
      this._config.theme_entity,
      '#26c6da'
    );
  }

  private _getRepositories(): { pinned: RepoItem[]; others: RepoItem[]; totalCount: number } {
    if (!this._hass) return { pinned: [], others: [], totalCount: 0 };

    const pinnedSet = new Set(this._config.pinned_repositories || []);
    const allRepos: RepoItem[] = [];

    for (const [entityId, stateObj] of Object.entries(this._hass.states)) {
      if (!entityId.startsWith('update.')) continue;

      const attrs = stateObj.attributes || {};
      const friendlyName = attrs.friendly_name || entityId.replace('update.', '').replace(/_/g, ' ');
      const installedVer = attrs.installed_version || 'N/A';
      const latestVer = attrs.latest_version || installedVer;
      const hasUpdate = stateObj.state === 'on';
      const isPinned = pinnedSet.has(entityId);

      allRepos.push({
        entity_id: entityId,
        friendly_name: friendlyName,
        installed_version: installedVer,
        latest_version: latestVer,
        has_update: hasUpdate,
        is_pinned: isPinned
      });
    }

    // Tri alphabétique
    allRepos.sort((a, b) => a.friendly_name.localeCompare(b.friendly_name, undefined, { sensitivity: 'base' }));

    const query = this._searchQuery.trim().toLowerCase();
    const filtered = query
      ? allRepos.filter(r => r.friendly_name.toLowerCase().includes(query) || r.entity_id.toLowerCase().includes(query))
      : allRepos;

    const pinned = filtered.filter(r => r.is_pinned);
    const others = filtered.filter(r => !r.is_pinned);

    return { pinned, others, totalCount: allRepos.length };
  }

  private _showStatus(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this._statusMessage = message;
    this._statusType = type;
    if (this._statusTimeout) clearTimeout(this._statusTimeout);

    const bannerEl = this._root.querySelector('#status-banner') as HTMLElement | null;
    if (bannerEl) {
      bannerEl.textContent = message;
      bannerEl.className = `status-banner status-${type} visible`;
    }

    this._statusTimeout = setTimeout(() => {
      this._statusMessage = '';
      if (bannerEl) {
        bannerEl.className = 'status-banner';
      }
    }, 4500);
  }

  private async _handleReloadAll() {
    if (this._isLoadingAll) return;
    this._isLoadingAll = true;
    this._updateButtons();

    try {
      const allAction = this._config.all_action || {};
      const serviceCall = allAction.service || 'homeassistant.reload_config_entry';
      const [domain, service] = serviceCall.includes('.') ? serviceCall.split('.') : ['homeassistant', serviceCall];
      const data = allAction.data || { entry_id: 'b84819f7b4f0fa8be2192dbd1bbb865b' };

      await this._hass.callService(domain, service, data);
      this._showStatus('✅ Marketplace rechargé avec succès. Les entités ont été réinterrogées.', 'success');
    } catch (err: any) {
      console.error('Erreur lors du rechargement du Marketplace:', err);
      this._showStatus(`❌ Erreur lors du rechargement : ${err?.message || err}`, 'error');
    } finally {
      this._isLoadingAll = false;
      this._updateButtons();
    }
  }

  private async _handleRefreshSelection() {
    if (this._isLoadingSelection || this._selectedEntities.size === 0) return;
    this._isLoadingSelection = true;
    this._updateButtons();

    const selectedList = Array.from(this._selectedEntities);

    try {
      const selAction = this._config.selection_action || {};
      const serviceCall = selAction.service || 'homeassistant.update_entity';
      const [domain, service] = serviceCall.includes('.') ? serviceCall.split('.') : ['homeassistant', serviceCall];
      const data = {
        ...(selAction.data || {}),
        entity_id: selectedList
      };

      await this._hass.callService(domain, service, data);
      this._showStatus(`⚡ ${selectedList.length} dépôt(s) sélectionné(s) rafraîchi(s) avec succès !`, 'success');
    } catch (err: any) {
      console.error('Erreur lors du rafraîchissement de la sélection:', err);
      this._showStatus(`❌ Erreur rafraîchissement sélection : ${err?.message || err}`, 'error');
    } finally {
      this._isLoadingSelection = false;
      this._updateButtons();
    }
  }

  private _toggleSelectAll(selectAll: boolean) {
    const { pinned, others } = this._getRepositories();
    const visibleRepos = [...pinned, ...others];

    if (selectAll) {
      for (const r of visibleRepos) {
        this._selectedEntities.add(r.entity_id);
      }
    } else {
      for (const r of visibleRepos) {
        this._selectedEntities.delete(r.entity_id);
      }
    }
    this._renderList();
    this._updateButtons();
  }

  private _toggleEntity(entityId: string) {
    if (this._selectedEntities.has(entityId)) {
      this._selectedEntities.delete(entityId);
    } else {
      this._selectedEntities.add(entityId);
    }
    this._renderList();
    this._updateButtons();
  }

  private _updateButtons() {
    const btnAll = this._root.querySelector('#btn-reload-all') as HTMLButtonElement | null;
    const btnSel = this._root.querySelector('#btn-refresh-selection') as HTMLButtonElement | null;
    const selCount = this._selectedEntities.size;

    if (btnAll) {
      btnAll.disabled = this._isLoadingAll;
      btnAll.innerHTML = this._isLoadingAll
        ? `<span class="spinner"></span> Rechargement du Marketplace en cours...`
        : `<ha-icon icon="mdi:sync"></ha-icon> Tout rafraîchir le Marketplace`;
    }

    if (btnSel) {
      btnSel.disabled = this._isLoadingSelection || selCount === 0;
      btnSel.innerHTML = this._isLoadingSelection
        ? `<span class="spinner"></span> Rafraîchissement en cours (${selCount})...`
        : `<ha-icon icon="mdi:flash"></ha-icon> Rafraîchir la sélection (${selCount})`;
    }
  }

  private _renderList() {
    const container = this._root.querySelector('#repo-list-container') as HTMLElement | null;
    if (!container) return;

    const { pinned, others, totalCount } = this._getRepositories();
    const totalMatching = pinned.length + others.length;

    let html = '';

    if (pinned.length > 0) {
      html += `
        <div class="section-title">
          <ha-icon icon="mdi:pin"></ha-icon>
          <span>Dépôts Prioritaires & Épinglés (${pinned.length})</span>
        </div>
        <div class="repo-grid">
          ${pinned.map(r => this._renderRepoItem(r)).join('')}
        </div>
      `;
    }

    if (others.length > 0) {
      html += `
        <div class="section-title" style="margin-top: 14px;">
          <ha-icon icon="mdi:package-variant-closed"></ha-icon>
          <span>Tous les Dépôts Installés (${others.length})</span>
        </div>
        <div class="repo-grid">
          ${others.map(r => this._renderRepoItem(r)).join('')}
        </div>
      `;
    }

    if (totalMatching === 0) {
      html = `
        <div class="empty-state">
          <ha-icon icon="mdi:alert-circle-outline"></ha-icon>
          <span>Aucun dépôt ne correspond à la recherche "${this._searchQuery}".</span>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attacher les écouteurs sur les items
    const items = container.querySelectorAll('.repo-item');
    items.forEach(el => {
      el.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id');
        if (id) this._toggleEntity(id);
      });
    });
  }

  private _renderRepoItem(r: RepoItem): string {
    const isSelected = this._selectedEntities.has(r.entity_id);
    const updateBadge = r.has_update
      ? `<span class="badge badge-update">MAJ dispo (${r.latest_version})</span>`
      : `<span class="badge badge-current">${r.installed_version}</span>`;

    return `
      <div class="repo-item ${isSelected ? 'selected' : ''}" data-id="${r.entity_id}">
        <div class="repo-checkbox">
          <ha-icon icon="${isSelected ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline'}"></ha-icon>
        </div>
        <div class="repo-info">
          <div class="repo-name" title="${r.friendly_name}">${r.friendly_name}</div>
          <div class="repo-meta">
            ${updateBadge}
            ${r.is_pinned ? '<span class="badge badge-pinned">Épinglé</span>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  private _render() {
    const themeColor = this._getThemeColor();
    const borderWidth = this._config.border_width !== undefined ? this._config.border_width : 1;
    const maxHeight = typeof this._config.max_height === 'number' ? `${this._config.max_height}px` : (this._config.max_height || '320px');
    const { totalCount } = this._getRepositories();

    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: rgba(18, 24, 38, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: ${borderWidth}px solid ${themeColor};
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(38, 198, 218, 0.08);
          border-radius: 16px;
          padding: 16px;
          color: #f1f5f9;
          font-family: inherit;
          box-sizing: border-box;
          overflow: hidden;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        /* En-tête de carte */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .header-title-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-icon {
          color: ${themeColor};
          --mdc-icon-size: 26px;
          filter: drop-shadow(0 0 6px ${themeColor});
        }
        .card-title {
          font-size: 1.15rem;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: 0.3px;
        }
        .header-badge {
          background: rgba(38, 198, 218, 0.15);
          border: 1px solid ${themeColor};
          color: ${themeColor};
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 12px;
        }

        /* Bannière de statut / Toast */
        .status-banner {
          display: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 12px;
          transition: opacity 0.3s ease;
        }
        .status-banner.visible {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-success {
          background: rgba(16, 185, 129, 0.20);
          border: 1px solid #10b981;
          color: #6ee7b7;
        }
        .status-error {
          background: rgba(239, 68, 68, 0.20);
          border: 1px solid #ef4444;
          color: #fca5a5;
        }
        .status-info {
          background: rgba(56, 189, 248, 0.20);
          border: 1px solid #38bdf8;
          color: #bae6fd;
        }

        /* Bouton Global */
        .action-primary-btn {
          width: 100%;
          background: linear-gradient(135deg, rgba(38, 198, 218, 0.25) 0%, rgba(18, 24, 38, 0.8) 100%);
          border: 1px solid ${themeColor};
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 12px 16px;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
        }
        .action-primary-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(38, 198, 218, 0.40) 0%, rgba(18, 24, 38, 0.9) 100%);
          box-shadow: 0 0 16px ${themeColor}40;
          transform: translateY(-1px);
        }
        .action-primary-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .action-primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Séparateur */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, ${themeColor}60 50%, transparent 100%);
          margin: 16px 0;
        }

        /* Barre d'outils de sélection */
        .selection-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .search-box {
          flex: 1;
          min-width: 160px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-box ha-icon {
          position: absolute;
          left: 10px;
          color: #94a3b8;
          --mdc-icon-size: 18px;
        }
        .search-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 7px 10px 7px 34px;
          color: #ffffff;
          font-size: 0.85rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .search-input:focus {
          border-color: ${themeColor};
        }
        .tool-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
          font-size: 0.78rem;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s ease;
        }
        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }

        /* Liste et grille des dépôts */
        .repo-scroll-area {
          max-height: ${maxHeight};
          overflow-y: auto;
          padding-right: 4px;
          box-sizing: border-box;
        }
        .repo-scroll-area::-webkit-scrollbar {
          width: 6px;
        }
        .repo-scroll-area::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        .repo-scroll-area::-webkit-scrollbar-thumb {
          background: ${themeColor}60;
          border-radius: 3px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .section-title ha-icon {
          --mdc-icon-size: 16px;
          color: ${themeColor};
        }

        .repo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 8px;
          margin-bottom: 6px;
        }
        .repo-item {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
        }
        .repo-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .repo-item.selected {
          background: rgba(38, 198, 218, 0.12);
          border-color: ${themeColor};
          box-shadow: 0 0 10px ${themeColor}30;
        }
        .repo-checkbox ha-icon {
          --mdc-icon-size: 20px;
          color: #64748b;
          transition: color 0.15s ease;
        }
        .repo-item.selected .repo-checkbox ha-icon {
          color: ${themeColor};
        }
        .repo-info {
          flex: 1;
          min-width: 0;
        }
        .repo-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .repo-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
        }
        .badge {
          font-size: 0.70rem;
          padding: 1px 6px;
          border-radius: 6px;
          font-weight: 500;
        }
        .badge-current {
          background: rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
        }
        .badge-update {
          background: rgba(239, 68, 68, 0.25);
          border: 1px solid #ef4444;
          color: #fca5a5;
          font-weight: 600;
        }
        .badge-pinned {
          background: rgba(245, 158, 11, 0.20);
          color: #fcd34d;
        }

        /* Bouton Action Sélection */
        .selection-action-box {
          margin-top: 14px;
        }
        .action-secondary-btn {
          width: 100%;
          background: rgba(38, 198, 218, 0.15);
          border: 1px solid ${themeColor};
          color: #ffffff;
          font-size: 0.90rem;
          font-weight: 600;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .action-secondary-btn:hover:not(:disabled) {
          background: rgba(38, 198, 218, 0.30);
          box-shadow: 0 0 12px ${themeColor}40;
        }
        .action-secondary-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          border-color: rgba(255, 255, 255, 0.15);
        }

        .empty-state {
          padding: 24px;
          text-align: center;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
        }

        /* Spinner d'animation */
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <ha-card id="card">
        <!-- En-tête -->
        <div class="card-header">
          <div class="header-title-box">
            <ha-icon class="header-icon" icon="${this._config.icon || 'mdi:storefront-outline'}"></ha-icon>
            <div class="card-title">${this._config.title || 'Marketplace & Dépôts Custom'}</div>
          </div>
          <div class="header-badge" id="total-badge">${totalCount} dépôts</div>
        </div>

        <!-- Toast de Statut -->
        <div id="status-banner" class="status-banner"></div>

        <!-- Bouton Global : Tout rafraîchir -->
        <button id="btn-reload-all" class="action-primary-btn">
          <ha-icon icon="mdi:sync"></ha-icon>
          Tout rafraîchir le Marketplace
        </button>

        <div class="divider"></div>

        <!-- Outils de sélection -->
        <div class="selection-toolbar">
          ${this._config.show_search !== false ? `
            <div class="search-box">
              <ha-icon icon="mdi:magnify"></ha-icon>
              <input type="text" id="search-input" class="search-input" placeholder="Filtrer par nom ou identifiant..." value="${this._searchQuery}">
            </div>
          ` : ''}
          ${this._config.show_select_all !== false ? `
            <button id="btn-select-all" class="tool-btn">Tout cocher</button>
            <button id="btn-unselect-all" class="tool-btn">Tout décocher</button>
          ` : ''}
        </div>

        <!-- Liste scrollable des dépôts -->
        <div class="repo-scroll-area" id="repo-list-container"></div>

        <!-- Bouton de rafraîchissement ciblé -->
        <div class="selection-action-box">
          <button id="btn-refresh-selection" class="action-secondary-btn" disabled>
            <ha-icon icon="mdi:flash"></ha-icon>
            Rafraîchir la sélection (0)
          </button>
        </div>
      </ha-card>
    `;

    this._cardEl = this._root.querySelector('#card');

    // Écouteurs d'événements principaux
    const btnReloadAll = this._root.querySelector('#btn-reload-all');
    btnReloadAll?.addEventListener('click', () => this._handleReloadAll());

    const btnRefreshSel = this._root.querySelector('#btn-refresh-selection');
    btnRefreshSel?.addEventListener('click', () => this._handleRefreshSelection());

    const btnSelectAll = this._root.querySelector('#btn-select-all');
    btnSelectAll?.addEventListener('click', () => this._toggleSelectAll(true));

    const btnUnselectAll = this._root.querySelector('#btn-unselect-all');
    btnUnselectAll?.addEventListener('click', () => this._toggleSelectAll(false));

    const searchInput = this._root.querySelector('#search-input') as HTMLInputElement | null;
    searchInput?.addEventListener('input', (e) => {
      this._searchQuery = (e.target as HTMLInputElement).value;
      this._renderList();
    });

    this._renderList();
    this._updateButtons();
  }
}
