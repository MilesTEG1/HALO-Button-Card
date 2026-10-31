/**
 * ==============================================================================
 * 📌 Nom du fichier : src/constants.ts
 * 📝 Description   : Constantes globales, nuancier officiel des 16 teintes HALO
 *                    et sélecteurs de thème Lovelace par défaut.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.4.2
 * 📅 Date         : 2026-10-31
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              (`HALO_COLORS`, `HALO_THEME_SELECTORS`) et renommage
 *                              de la teinte `Cyan`.
 *   - 🆕 v1.0.0 (2026-10-29) : Création initiale des constantes et palettes.
 * ==============================================================================
 */

export const HALO_COLORS: Record<string, string> = {
  "Cyan": "#26c6da",
  "Bleu Céleste": "#38bdf8",
  "Saphir Océan": "#2f86ff",
  "Menthe Givrée": "#00e5a3",
  "Émeraude": "#10b981",
  "Vert Lime": "#84cc16",
  "Jaune Soleil": "#facc15",
  "Ambre Doré": "#f59e0b",
  "Orange Flamme": "#ff5a1f",
  "Corail Pêche": "#fb923c",
  "Rose Rubis": "#f43f5e",
  "Rose Bonbon": "#f472b6",
  "Fuchsia Néon": "#d946ef",
  "Améthyste": "#a855f7",
  "Violet Nuit": "#8b5cf6",
  "Blanc Glace": "#e2e8f0"
};

export const HALO_THEME_SELECTORS = {
  covers: "input_select.couleur_theme_ouvertures",
  lights: "input_select.couleur_theme_eclairages",
  heating: "input_select.couleur_theme_chauffage"
};
