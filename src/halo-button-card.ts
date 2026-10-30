/**
 * ==============================================================================
 * 📌 Nom du fichier : src/halo-button-card.ts
 * 📝 Description   : Point d'entrée principal de la suite HALO Button Card.
 *                    Déclaration et enregistrement des Web Components Lovelace,
 *                    enregistrement dans le catalogue Home Assistant (window.customCards)
 *                    et exportation des composants et moteurs d'aide.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.3.0
 * 📅 Date         : 2026-10-30
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ✨ v1.3.0 (2026-10-30) : Personnalisation visuelle avancée :
 *                              - Réglage de l'épaisseur de bordure (0 à 3 px, pas 0.25) sur
 *                                halo-button-card, halo-cover-card et halo-light-card.
 *                              - Sélecteur de couleur Mix A+B (Halo Swatch médaillon interactif
 *                                + Nuancier rapide HOLM 16 teintes) dans l'éditeur de carte.
 *   - 🩹 v1.2.1 (2026-10-30) : Correctif halo-button-card : contour net (border 1.5px solid)
 *                              et halo lumineux permanent (box-shadow) assorti au bouton.
 *   - 💡 v1.2.0 (2026-10-30) : Suite majeure Liquid Glass & Composants modulaires :
 *                              - custom:halo-button-card (tuile universelle polyvalente).
 *                              - custom:halo-separator-card modulaire (mode adaptateur simple
 *                                ou accordéon repliable, grille 1/2/3 colonnes responsive,
 *                                légendes dynamiques, mention "OU" stylisée et badge court auto-calibré).
 *                              - custom:halo-cover-color-card (palette 2x2 états volets).
 *                              - custom:halo-palette-card (nuancier officiel 16 teintes HOLM).
 *                              - Remédiation Spook & zéro entités fantômes.
 *   - 💡 v1.1.0 (2026-10-30) : Intégration de custom:halo-light-card, éditeur visuel UI,
 *                              calibrage 64px et bundle lisible/non-minifié.
 *   - 🆕 v1.0.0 (2026-10-29) : Création initiale avec halo-cover-card et halo-separator-card.
 * ==============================================================================
 */

import { HaloButtonCard } from './components/halo-button-card';
import { HaloButtonCardEditor } from './editors/halo-button-card-editor';
import { HaloCoverCard } from './components/halo-cover-card';
import { HaloCoverCardEditor } from './editors/halo-cover-card-editor';
import { HaloLightCard } from './components/halo-light-card';
import { HaloLightCardEditor } from './editors/halo-light-card-editor';
import { HaloSeparatorCard } from './components/halo-separator-card';
import { HaloSeparatorCardEditor } from './editors/halo-separator-card-editor';
import { HaloCoverColorCard } from './components/halo-cover-color-card';
import { HaloCoverColorCardEditor } from './editors/halo-cover-color-card-editor';
import { HaloPaletteCard } from './components/halo-palette-card';
import { HaloPaletteCardEditor } from './editors/halo-palette-card-editor';

import { voletHelperInstance } from './core/volet-helper';
import * as lightHelper from './core/light-helper';
import * as themeHelper from './core/theme-helper';
import * as actionHandler from './core/action-handler';

const VERSION = '1.3.0';

console.info(
  `%c  HALO-BUTTON-CARD  %c v${VERSION} `,
  'color: #0b0f19; background: #26c6da; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;',
  'color: #ffffff; background: #1e293b; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;'
);

// Register custom cards in Home Assistant card picker
declare global {
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
  }
}

window.customCards = window.customCards || [];

window.customCards.push({
  type: 'halo-button-card',
  name: 'HALO Button Card',
  description: 'Polyvalent Liquid Glass button with specular glow, horizontal/vertical layouts and sub-buttons.',
  preview: true
});

window.customCards.push({
  type: 'halo-light-card',
  name: 'HALO Light Card',
  description: 'Turnkey unified lighting tile with HOLM glass styling, dynamic halo, brightness and kelvin sub-buttons.',
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
  description: 'Official 16-color HOLM / HALO theme palette picker with glowing halos and active check badges.',
  preview: true
});

// Register Web Component custom elements
if (!customElements.get('halo-button-card')) {
  customElements.define('halo-button-card', HaloButtonCard);
}
if (!customElements.get('halo-button-card-editor')) {
  customElements.define('halo-button-card-editor', HaloButtonCardEditor);
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

// Export for external consumers
export {
  HaloButtonCard,
  HaloButtonCardEditor,
  HaloLightCard,
  HaloLightCardEditor,
  HaloCoverCard,
  HaloCoverCardEditor,
  HaloSeparatorCard,
  HaloSeparatorCardEditor,
  HaloCoverColorCard,
  HaloCoverColorCardEditor,
  HaloPaletteCard,
  HaloPaletteCardEditor,
  voletHelperInstance,
  lightHelper,
  themeHelper,
  actionHandler
};
