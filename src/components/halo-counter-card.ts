/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-counter-card.ts
 * 📝 Description   : Composant Web custom:halo-counter-card.
 *                    Tuile récapitulative et compteur intelligent Liquid Glass HALO
 *                    pour volets roulants (mode 'cover' : 4 états + détection de
 *                    mouvement synchrone sans liste nominative par défaut) et
 *                    ouvertures / fenêtres & portes (mode 'binary' : compteur +
 *                    pastilles nominatives des ouvertures actives et capteurs en défaut).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.6.0-beta.4
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.6.0-beta.4 (2026-11-02) : Création initiale de custom:halo-counter-card
 *                                     unifiant tuile_recap_volets_holm et
 *                                     tuile_recap_ouvertures_holm en Web Component natif.
 * ==============================================================================
 */

import { HomeAssistant, HaloCounterCardConfig, HassEntity } from '../types';
import { voletHelperInstance } from '../core/volet-helper';
import { getCoverColors, toHexColor } from '../core/theme-helper';
import { handleAction, bindTouchActions } from '../core/action-handler';
import { useLocalize } from '../localize/localize';

const DEFAULT_COVER_ENTITIES: string[] = [
  'cover.volet_roulant_salon_tv_n03',
  'cover.volet_roulant_salon_poele_n02',
  'cover.volet_roulant_salon_terrasse_n01',
  'cover.volet_roulant_cuisine_n04',
  'cover.volet_roulant_bureau_pierrick_n06',
  'cover.volet_roulant_salle_de_bains_n07',
  'cover.volet_roulant_chambre_parents_n09',
  'cover.volet_roulant_salle_de_douche_parents_n10',
  'cover.volet_roulant_chambre_charlotte_n05',
  'cover.volet_roulant_palier_etage_n08',
  'cover.volet_roulant_atelier_cecile_rue_n11',
  'cover.volet_roulant_atelier_cecile_servitude_n12'
];

const DEFAULT_ENTITY_LABELS: Record<string, string> = {
  'binary_sensor.capteur_porte_entree_contact': "Porte d'entrée",
  'binary_sensor.capteur_fenetre_toilettes_rdc_contact': 'Toilettes RdC',
  'binary_sensor.capteur_fenetre_cuisine_contact': 'Cuisine',
  'binary_sensor.capteur_fenetre_salon_terrasse_contact': 'Porte-Fenêtre Terrasse',
  'binary_sensor.capteur_fenetre_salon_tv_contact': 'Salon TV',
  'binary_sensor.capteur_fenetre_salon_poele_contact': 'Salon Poêle',
  'binary_sensor.capteur_fenetre_chambre_parents_contact': 'Chambre Parents',
  'binary_sensor.capteur_fenetre_sdd_parentale_contact': 'SdD Parents',
  'binary_sensor.capteur_fenetre_salle_de_bains_contact': 'Salle de Bains',
  'binary_sensor.capteur_fenetre_bureau_contact': 'Bureau',
  'binary_sensor.capteur_fenetre_piece_artistique_cote_rue_contact': 'Atelier Cécile (Rue)',
  'binary_sensor.capteur_fenetre_piece_artistique_cote_servitude_contact': 'Atelier Cécile (Servitude)',
  'binary_sensor.capteur_fenetre_chambre_enfant_1_contact': 'Chambre Charlotte',
  'binary_sensor.capteur_fenetre_palier_etage_contact': 'Palier Étage',
  'binary_sensor.capteur_fenetre_velux_escalier_contact': 'Velux Escalier',
  'binary_sensor.capteur_fenetre_velux_chambre_parents_contact': 'Velux Parents',
  'binary_sensor.capteur_fenetre_velux_salle_de_douche_contact': 'Velux Salle de Douche',
  'binary_sensor.capteur_fenetre_velux_chambre_charlotte_contact': 'Velux Charlotte',
  'binary_sensor.capteur_fenetre_velux_chambre_enfant_2_velux_petite_chambre': 'Velux Petite Chambre',
  'binary_sensor.capteur_fenetre_velux_sdd_etage_velux_sdd_etage': 'Velux SdD Étage',
  'binary_sensor.capteur_fenetre_vasistas_soussol_linky_vasistas': 'Vasistas Sous-Sol Linky',
  'binary_sensor.capteur_fenetre_vasistas_soussol_atelier_vasistas': 'Vasistas Sous-Sol Atelier',
  'binary_sensor.capteur_fenetre_vasistas_soussol_buanderie_vasistas': 'Vasistas Sous-Sol Buanderie'
};

export class HaloCounterCard extends HTMLElement {
  private _config!: HaloCounterCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;
  public _updateTimerMS = 0;

  // Persistent DOM references
  private _cardEl: HTMLElement | null = null;
  private _iconBadgeEl: HTMLElement | null = null;
  private _iconEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;
  private _subtitleEl: HTMLElement | null = null;
  private _counterWrapEl: HTMLElement | null = null;
  private _counterNumEl: HTMLElement | null = null;
  private _counterTotalEl: HTMLElement | null = null;
  private _counterLabelEl: HTMLElement | null = null;
  private _detailWrapEl: HTMLElement | null = null;

  private _unbindCardTouch: (() => void) | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  private get _t() {
    return useLocalize(this._hass);
  }

  private get _helper() {
    return (window as any)._voletHelper || voletHelperInstance;
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-counter-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      mode: 'cover',
      entity: 'cover.volets_maison',
      name: 'Volets Roulants'
    };
  }

  public setConfig(config: HaloCounterCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-counter-card');
    }
    this._config = {
      mode: 'auto',
      border_width: 1.25,
      ...config
    };
    if (this._hass) {
      this._render();
    }
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;
    this._helper.register(this);

    if (!this._cardEl) {
      this._render();
      return;
    }

    if (this._hasChanged(oldHass, hass)) {
      this._render();
    }
  }

  public getCardSize(): number {
    return 1;
  }

  public refresh() {
    this._render();
  }

  public requestUpdate(_name?: string, _oldValue?: any) {
    this._render();
  }

  public connectedCallback() {
    this._helper.register(this);
    if (this._cardEl && !this._unbindCardTouch) {
      this._bindInteractions();
    }
  }

  public disconnectedCallback() {
    if (this._unbindCardTouch) {
      this._unbindCardTouch();
      this._unbindCardTouch = null;
    }
  }

  private _getEffectiveMode(): 'cover' | 'binary' {
    if (this._config?.mode === 'cover') return 'cover';
    if (this._config?.mode === 'binary') return 'binary';
    const ent = this._config?.entity || '';
    if (ent.startsWith('binary_sensor.') || ent.includes('ouverture') || ent.includes('fenetre')) {
      return 'binary';
    }
    const first = this._config?.entities?.[0] || '';
    if (first.startsWith('binary_sensor.')) {
      return 'binary';
    }
    return 'cover';
  }

  private _getTargetEntities(mode: 'cover' | 'binary'): string[] {
    if (Array.isArray(this._config?.entities) && this._config.entities.length > 0) {
      return this._config.entities;
    }
    const states = this._hass?.states || {};
    const entId = this._config?.entity;
    if (entId && states[entId]) {
      const attrs = states[entId].attributes || {};
      if (Array.isArray(attrs.entity_id) && attrs.entity_id.length > 0) {
        return attrs.entity_id;
      }
      if (Array.isArray(attrs.group_entities) && attrs.group_entities.length > 0) {
        return attrs.group_entities;
      }
    }
    if (mode === 'cover') {
      const grp = states['cover.groupe_volets_tous']?.attributes?.entity_id
        || states['cover.volets_maison']?.attributes?.group_entities;
      if (Array.isArray(grp) && grp.length > 0) {
        return grp;
      }
      return DEFAULT_COVER_ENTITIES;
    }
    const bGrp = states['binary_sensor.groupe_ouvertures']?.attributes?.entity_id;
    if (Array.isArray(bGrp) && bGrp.length > 0) {
      return bGrp;
    }
    return Object.keys(DEFAULT_ENTITY_LABELS);
  }

  private _getEntityLabel(entityId: string): string {
    if (this._config?.entity_labels && this._config.entity_labels[entityId]) {
      return this._config.entity_labels[entityId];
    }
    if (DEFAULT_ENTITY_LABELS[entityId]) {
      return DEFAULT_ENTITY_LABELS[entityId];
    }
    const st = this._hass?.states?.[entityId];
    let raw = st?.attributes?.friendly_name || entityId;
    raw = raw
      .replace(/^Volet\s+roulant\s+/i, '')
      .replace(/^Fenêtre\s+/i, '')
      .replace(/^Capteur\s+/i, '')
      .replace(/\s+contact$/i, '');
    return raw;
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;
    if (oldHass.language !== newHass.language || oldHass.themes !== newHass.themes) return true;

    const mode = this._getEffectiveMode();
    const entId = this._config.entity;
    if (entId && oldHass.states[entId] !== newHass.states[entId]) return true;

    const targets = this._getTargetEntities(mode);
    for (const tid of targets) {
      if (oldHass.states[tid] !== newHass.states[tid]) return true;
      const track = this._helper.tracking?.[tid];
      if (track && track.moving) return true;
    }

    const helperEntities = [
      'cover.volets_maison',
      'cover.groupe_volets_tous',
      'binary_sensor.groupe_ouvertures',
      'sensor.nombre_fenetres_portes_ouvertes',
      'sensor.nombre_fenetres_portes',
      'input_text.couleur_volet_ferme',
      'input_text.couleur_volet_ouvert',
      'input_text.couleur_volet_partiel',
      'input_text.couleur_volet_en_mouvement',
      'input_select.couleur_theme_ouvertures'
    ];
    for (const he of helperEntities) {
      if (oldHass.states[he] !== newHass.states[he]) return true;
    }

    return false;
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
        ha-card.halo-counter-card {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          box-sizing: border-box;
          border-radius: 18px;
          padding: 12px 14px;
          text-align: left;
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
        }
        ha-card.halo-counter-card:hover {
          filter: brightness(1.04);
        }
        ha-card.halo-counter-card:active {
          transform: scale(0.99);
        }
        .counter-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          width: 100%;
          box-sizing: border-box;
        }
        .counter-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
          text-align: left;
        }
        .counter-icon-badge {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
        }
        .counter-icon-badge ha-icon {
          --mdc-icon-size: 24px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s ease;
        }
        .counter-titles {
          display: flex;
          flex-direction: column;
          gap: 3px;
          text-align: left;
          min-width: 0;
        }
        .counter-title {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.2px;
          line-height: 1.2;
        }
        .counter-subtitle {
          font-size: 12px;
          font-weight: 500;
          color: rgba(220, 235, 240, 0.75);
          line-height: 1.25;
        }
        .counter-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          min-width: 65px;
          flex-shrink: 0;
        }
        .counter-score {
          font-size: 18px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          line-height: 1.15;
          transition: color 0.3s ease;
        }
        .counter-total {
          font-size: 13px;
          font-weight: 500;
          color: rgba(220, 235, 240, 0.65);
        }
        .counter-unit {
          font-size: 10px;
          font-weight: 600;
          color: rgba(220, 235, 240, 0.50);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 1px;
        }
        .counter-details {
          display: none;
          width: 100%;
          box-sizing: border-box;
        }
        .pills-wrap {
          display: flex;
          flex-wrap: wrap;
          margin-top: 8px;
          gap: 4px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          margin: 2px 4px 2px 0;
        }
        .pill-open {
          background: rgba(244, 63, 94, 0.22);
          border: 1px solid rgba(244, 63, 94, 0.45);
        }
        .pill-unavail {
          background: rgba(245, 158, 11, 0.22);
          border: 1px solid rgba(245, 158, 11, 0.45);
        }
        .pill-partial {
          background: rgba(56, 189, 248, 0.22);
          border: 1px solid rgba(56, 189, 248, 0.45);
        }
        .ok-text {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: rgba(220, 235, 240, 0.65);
          margin-top: 6px;
        }
      </style>
      <ha-card class="halo-counter-card" id="card">
        <div class="counter-top-row">
          <div class="counter-left">
            <div class="counter-icon-badge" id="icon-badge">
              <ha-icon id="main-icon"></ha-icon>
            </div>
            <div class="counter-titles">
              <span class="counter-title" id="title"></span>
              <span class="counter-subtitle" id="subtitle"></span>
            </div>
          </div>
          <div class="counter-right" id="counter-right">
            <span class="counter-score" id="counter-score">
              <span id="counter-num">0</span>
              <span class="counter-total" id="counter-total">/ 0</span>
            </span>
            <span class="counter-unit" id="counter-label"></span>
          </div>
        </div>
        <div class="counter-details" id="counter-details"></div>
      </ha-card>
    `;

    this._cardEl = this._root.getElementById('card');
    this._iconBadgeEl = this._root.getElementById('icon-badge');
    this._iconEl = this._root.getElementById('main-icon');
    this._titleEl = this._root.getElementById('title');
    this._subtitleEl = this._root.getElementById('subtitle');
    this._counterWrapEl = this._root.getElementById('counter-right');
    this._counterNumEl = this._root.getElementById('counter-num');
    this._counterTotalEl = this._root.getElementById('counter-total');
    this._counterLabelEl = this._root.getElementById('counter-label');
    this._detailWrapEl = this._root.getElementById('counter-details');

    this._bindInteractions();
  }

  private _bindInteractions() {
    if (this._unbindCardTouch) {
      this._unbindCardTouch();
      this._unbindCardTouch = null;
    }
    if (!this._cardEl) return;

    const mode = this._getEffectiveMode();
    const defaultEntity = this._config?.entity
      || (mode === 'cover' ? 'cover.volets_maison' : 'binary_sensor.groupe_ouvertures');
    const tapAction = this._config?.tap_action || { action: 'more-info', entity: defaultEntity };
    const holdAction = this._config?.hold_action;
    const doubleTapAction = this._config?.double_tap_action;

    this._unbindCardTouch = bindTouchActions(this._cardEl, {
      onTap: () => {
        handleAction(this, this._hass, tapAction, defaultEntity);
      },
      onHold: holdAction ? () => {
        handleAction(this, this._hass, holdAction, defaultEntity);
      } : undefined,
      onDoubleTap: doubleTapAction ? () => {
        handleAction(this, this._hass, doubleTapAction, defaultEntity);
      } : undefined
    });
  }

  private _render() {
    if (!this._config || !this._hass) return;
    if (!this._cardEl) {
      this._buildDom();
    }

    const mode = this._getEffectiveMode();
    if (mode === 'cover') {
      this._renderCoverMode();
    } else {
      this._renderBinaryMode();
    }
  }

  private _renderCoverMode() {
    const t = this._t;
    const states = this._hass.states || {};
    const entities = this._getTargetEntities('cover');
    const total = entities.length;

    let closedCount = 0;
    let partialCount = 0;
    let openCount = 0;
    let movingCount = 0;

    const openNames: string[] = [];
    const partialNames: string[] = [];
    const movingNames: string[] = [];
    const unavailNames: string[] = [];

    entities.forEach(entId => {
      const s = states[entId] as HassEntity | undefined;
      if (!s) return;
      const label = this._getEntityLabel(entId);
      const st = s.state || 'unavailable';
      const isUnavail = st === 'unavailable' || st === 'unknown';
      const p = this._helper.position(s);
      const moveInfo = this._helper.checkMoving(entId, states);

      if (moveInfo.moving) {
        movingCount++;
        movingNames.push(label);
      } else if (isUnavail) {
        unavailNames.push(label);
      } else if (p === 0 || st === 'closed') {
        closedCount++;
      } else if (p === 100 || (p == null && st === 'open')) {
        openCount++;
        openNames.push(label);
      } else if (p != null && p > 0 && p < 100) {
        partialCount++;
        partialNames.push(`${label} (${p}%)`);
      }
    });

    const isAllClosed = total > 0 && closedCount === total;
    const isAllOpen = total > 0 && openCount === total;

    const colors = getCoverColors(this._hass, this._config as any);
    let accentCol = colors.partial;
    let cardBg = `linear-gradient(135deg, ${colors.partial}22, rgba(15, 23, 36, 0.90))`;
    let cardShadow = `0 0 18px ${colors.partial}44, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;

    if (movingCount > 0) {
      accentCol = colors.moving;
      cardBg = `linear-gradient(135deg, ${colors.moving}26, rgba(15, 23, 36, 0.90))`;
      cardShadow = `0 0 18px ${colors.moving}55, inset 0 1px 0 rgba(255, 255, 255, 0.20)`;
    } else if (isAllClosed) {
      accentCol = colors.closed;
      cardBg = `linear-gradient(135deg, ${colors.closed}1A, rgba(15, 23, 36, 0.88))`;
      cardShadow = `0 0 18px ${colors.closed}44, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;
    } else if (isAllOpen) {
      accentCol = colors.open;
      cardBg = `linear-gradient(135deg, ${colors.open}22, rgba(15, 23, 36, 0.90))`;
      cardShadow = `0 0 18px ${colors.open}44, inset 0 1px 0 rgba(255, 255, 255, 0.18)`;
    }

    const bw = typeof this._config.border_width === 'number' && !isNaN(this._config.border_width)
      ? this._config.border_width
      : 1.25;
    const cardBorder = bw > 0 ? `${bw}px solid ${accentCol}` : 'none';

    const icon = movingCount > 0
      ? 'mdi:swap-vertical-bold'
      : (isAllClosed ? 'mdi:window-shutter' : 'mdi:window-shutter-open');

    const title = this._config.name || this._config.title || t('counter.cover_default_title');
    let subText = '';
    if (movingCount > 0) {
      subText = movingCount > 1
        ? t('counter.cover_moving_plural', 'count', String(movingCount))
        : t('counter.cover_moving_single', 'count', '1');
    } else if (isAllClosed) {
      subText = t('counter.cover_all_closed');
    } else if (isAllOpen) {
      subText = t('counter.cover_all_open');
    } else {
      const parts: string[] = [];
      if (closedCount > 0) {
        parts.push(closedCount > 1 ? t('counter.closed_plural', 'count', String(closedCount)) : t('counter.closed_single'));
      }
      if (partialCount > 0) {
        parts.push(partialCount > 1 ? t('counter.partial_plural', 'count', String(partialCount)) : t('counter.partial_single'));
      }
      if (openCount > 0) {
        parts.push(openCount > 1 ? t('counter.open_plural', 'count', String(openCount)) : t('counter.open_single'));
      }
      subText = parts.join(' • ');
    }

    // Apply card styles
    if (this._cardEl) {
      this._cardEl.style.background = cardBg;
      this._cardEl.style.border = cardBorder;
      this._cardEl.style.boxShadow = cardShadow;
    }

    // Apply icon badge
    if (this._iconBadgeEl) {
      this._iconBadgeEl.style.background = `${accentCol}22`;
      this._iconBadgeEl.style.border = `1.25px solid ${accentCol}66`;
      this._iconBadgeEl.style.boxShadow = `0 0 12px ${accentCol}44`;
    }
    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      this._iconEl.style.color = accentCol;
    }

    // Apply texts
    if (this._titleEl) {
      this._titleEl.textContent = title;
      this._titleEl.style.color = '#ffffff';
    }
    if (this._subtitleEl) {
      this._subtitleEl.textContent = subText;
    }

    // Apply right-hand counter (default ON in cover mode)
    const showCounter = this._config.show_counter !== false;
    if (this._counterWrapEl) {
      this._counterWrapEl.style.display = showCounter ? 'flex' : 'none';
    }
    if (showCounter) {
      if (this._counterNumEl) {
        this._counterNumEl.textContent = `${closedCount} `;
        this._counterNumEl.style.color = accentCol;
      }
      if (this._counterTotalEl) {
        this._counterTotalEl.textContent = `/ ${total}`;
      }
      if (this._counterLabelEl) {
        this._counterLabelEl.textContent = this._config.counter_label || t('counter.closed_label');
      }
    }

    // Apply details pills (default OFF in cover mode: "sans afficher quel volet est ouvert ou fermé")
    const showDetails = this._config.show_details === true;
    if (this._detailWrapEl) {
      if (!showDetails) {
        this._detailWrapEl.style.display = 'none';
        this._detailWrapEl.innerHTML = '';
      } else {
        const pills: string[] = [];
        movingNames.forEach(n => pills.push(`<span class="pill pill-unavail">↕ ${n}</span>`));
        partialNames.forEach(n => pills.push(`<span class="pill pill-partial">• ${n}</span>`));
        openNames.forEach(n => pills.push(`<span class="pill pill-open">• ${n}</span>`));
        unavailNames.forEach(n => pills.push(`<span class="pill pill-unavail">⚠️ ${n} (${t('counter.indispo_short')})</span>`));
        if (pills.length > 0) {
          this._detailWrapEl.style.display = 'block';
          this._detailWrapEl.innerHTML = `<div class="pills-wrap">${pills.join('')}</div>`;
        } else {
          this._detailWrapEl.style.display = 'none';
          this._detailWrapEl.innerHTML = '';
        }
      }
    }
  }

  private _renderBinaryMode() {
    const t = this._t;
    const states = this._hass.states || {};
    const entities = this._getTargetEntities('binary');
    const total = entities.length;

    const openNames: string[] = [];
    const unavailNames: string[] = [];

    entities.forEach(entId => {
      const s = states[entId]?.state;
      const label = this._getEntityLabel(entId);
      if (s === 'on') {
        openNames.push(label);
      } else if (s !== 'off') {
        unavailNames.push(label);
      }
    });

    const count = openNames.length;
    const hasUnavail = unavailNames.length > 0;
    const isOpen = count > 0;

    const colClosed = toHexColor(this._config.color_closed, '#10b981');
    const colOpen = toHexColor(this._config.color_open, '#f43f5e');
    const colUnavail = toHexColor(this._config.color_unavail || this._config.color_moving, '#f59e0b');

    let icon = 'mdi:window-closed-variant';
    let iconColor = colClosed;
    let iconBg = `${colClosed}2E`;
    let iconGlow = 'none';
    let title = this._config.name || this._config.title || t('counter.binary_all_closed');
    let titleColor = '#e6f2f5';

    if (hasUnavail) {
      icon = 'mdi:alert-circle';
      iconColor = colUnavail;
      iconBg = `${colUnavail}40`;
      iconGlow = `0 0 16px ${colUnavail}99`;
      title = unavailNames.length > 1
        ? t('counter.binary_unavail_plural', 'count', String(unavailNames.length))
        : t('counter.binary_unavail_single', 'count', '1');
      titleColor = '#ffffff';
    } else if (isOpen) {
      icon = 'mdi:window-open-variant';
      iconColor = colOpen;
      iconBg = `${colOpen}40`;
      iconGlow = `0 0 16px ${colOpen}99`;
      title = count > 1
        ? t('counter.binary_open_plural', 'count', String(count))
        : t('counter.binary_open_single', 'count', '1');
      titleColor = '#ffffff';
    }

    const bw = typeof this._config.border_width === 'number' && !isNaN(this._config.border_width)
      ? this._config.border_width
      : 1.25;

    let cardBg = `linear-gradient(135deg, ${colClosed}24, rgba(15, 23, 36, 0.88))`;
    let cardBorder = bw > 0 ? `1px solid ${colClosed}66` : 'none';
    let cardShadow = `0 4px 18px rgba(0, 0, 0, 0.35), 0 0 14px ${colClosed}2E, inset 0 1px 0 rgba(255, 255, 255, 0.08)`;

    if (isOpen) {
      cardBg = `linear-gradient(135deg, ${colOpen}38, rgba(15, 23, 36, 0.92))`;
      cardBorder = bw > 0 ? `${bw}px solid ${colOpen}` : 'none';
      cardShadow = `0 0 20px ${colOpen}73, inset 0 1px 0 rgba(255, 255, 255, 0.25)`;
    } else if (hasUnavail) {
      cardBg = `linear-gradient(135deg, ${colUnavail}38, rgba(15, 23, 36, 0.92))`;
      cardBorder = bw > 0 ? `${bw}px solid ${colUnavail}` : 'none';
      cardShadow = `0 0 20px ${colUnavail}73, inset 0 1px 0 rgba(255, 255, 255, 0.25)`;
    }

    if (this._cardEl) {
      this._cardEl.style.background = cardBg;
      this._cardEl.style.border = cardBorder;
      this._cardEl.style.boxShadow = cardShadow;
    }

    if (this._iconBadgeEl) {
      this._iconBadgeEl.style.background = iconBg;
      this._iconBadgeEl.style.border = `1px solid ${iconColor}66`;
      this._iconBadgeEl.style.boxShadow = iconGlow;
    }
    if (this._iconEl) {
      if (this._iconEl.getAttribute('icon') !== icon) {
        this._iconEl.setAttribute('icon', icon);
      }
      this._iconEl.style.color = iconColor;
    }

    if (this._titleEl) {
      this._titleEl.textContent = title;
      this._titleEl.style.color = titleColor;
    }

    const subText = t('counter.binary_subtitle', 'count', String(count)).replace('{total}', String(total));
    if (this._subtitleEl) {
      this._subtitleEl.textContent = subText;
    }

    // Right-hand counter (default OFF in binary mode, optional ON)
    const showCounter = this._config.show_counter === true;
    if (this._counterWrapEl) {
      this._counterWrapEl.style.display = showCounter ? 'flex' : 'none';
    }
    if (showCounter) {
      if (this._counterNumEl) {
        this._counterNumEl.textContent = `${count} `;
        this._counterNumEl.style.color = iconColor;
      }
      if (this._counterTotalEl) {
        this._counterTotalEl.textContent = `/ ${total}`;
      }
      if (this._counterLabelEl) {
        this._counterLabelEl.textContent = this._config.counter_label || t('counter.open_label');
      }
    }

    // Detail pills (default ON in binary mode: lists open and unavailable sensors)
    const showDetails = this._config.show_details !== false;
    if (this._detailWrapEl) {
      if (!showDetails) {
        this._detailWrapEl.style.display = 'none';
        this._detailWrapEl.innerHTML = '';
      } else {
        const pills: string[] = [];
        openNames.forEach(name => {
          pills.push(`<span class="pill pill-open">• ${name}</span>`);
        });
        unavailNames.forEach(name => {
          pills.push(`<span class="pill pill-unavail">⚠️ ${name} (${t('counter.indispo_short')})</span>`);
        });
        this._detailWrapEl.style.display = 'block';
        if (pills.length > 0) {
          this._detailWrapEl.innerHTML = `<div class="pills-wrap">${pills.join('')}</div>`;
        } else {
          const okMsg = this._config.ok_text || this._config.subtitle || t('counter.binary_all_ok');
          this._detailWrapEl.innerHTML = `<span class="ok-text">${okMsg}</span>`;
        }
      }
    }
  }
}
