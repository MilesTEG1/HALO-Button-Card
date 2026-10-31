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

export const COMMON_EDITOR_STYLES = `
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
