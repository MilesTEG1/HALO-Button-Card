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

import { HALO_PALETTE } from '../core/theme-helper';
import { LocalizeFunc, localizeHalo, useLocalize } from '../localize/localize';

/**
 * Assigne schéma, computeLabel et computeHelper d'un <ha-form> :
 * label  = editor.<card>.<name>, aide = editor.<card>.<name>_helper (vide si absente).
 */
export function applyFormI18n(form: any, hass: any, card: string, schema: any[]) {
  const t = useLocalize(hass);
  form.schema = schema;
  form.computeLabel = (s: any) => t(`editor.${card}.${s.name}`);
  form.computeHelper = (s: any) => {
    const key = `editor.${card}.${s.name}_helper`;
    const val = t(key);
    return val === key ? '' : val;
  };
}

/** Options d'un sélecteur `select` traduites : [['valeur', 'clé de traduction'], ...]. */
export function selectOptions(t: LocalizeFunc, card: string, pairs: Array<[string, string]>) {
  return pairs.map(([value, key]) => ({ value, label: t(`editor.${card}.${key}`) }));
}

export interface StylePanelOptions {
  title: string;
  tabs?: Array<{ key: string; icon: string; label: string; active: boolean }>;
  leftTitle: string;
  borderTitle: string;
}

/** Gabarit HTML du panneau de style Liquid Glass (médaillon, nuancier HALO, bordure). */
export function stylePanelHtml(t: LocalizeFunc, o: StylePanelOptions): string {
  const tabs = o.tabs
    ? `<div class="halo-state-tabs">${o.tabs.map(s => `
        <div class="halo-state-tab ${s.active ? 'active' : ''}" id="tab-${s.key}" data-key="${s.key}">
          <span class="halo-state-tab-dot" id="tab-dot-${s.key}"></span>
          <ha-icon icon="${s.icon}"></ha-icon>
          <span>${s.label}</span>
        </div>`).join('')}</div>`
    : '';
  const small = (k: string) => `<small style="opacity: 0.6;">${t(`editor.${k}`)}</small>`;
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
export function borderBadge(t: LocalizeFunc, bw: number): string {
  if (bw === 0) return t('editor.border_badge_off');
  if (bw === 1.5) return t('editor.border_badge_default', 'v', String(bw));
  return `${bw} px`;
}

/** Génère les pastilles du nuancier rapide HALO (info-bulle traduite). */
export function buildChips(container: HTMLElement, hass: any, onPick: (name: string) => void) {
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
export function colorDisplayName(hass: any, raw: any, emptyKey: string): string {
  const t = useLocalize(hass);
  if (!raw) return t(emptyKey);
  if (typeof raw === 'string') {
    if (HALO_PALETTE[raw]) return localizeHalo(hass, raw);
    for (const [name, hex] of Object.entries(HALO_PALETTE)) {
      if (hex.toLowerCase() === raw.toLowerCase()) return localizeHalo(hass, name);
    }
  }
  return t('editor.color_custom');
}
