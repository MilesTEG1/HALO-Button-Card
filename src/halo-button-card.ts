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
 * 📅 Date         : 2026-10-29
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 💡 v1.1.0 (2026-10-29) : Intégration de custom:halo-light-card et custom:halo-light-card-editor.
 *   - 🆕 v1.0.0 (2026-10-29) : Création initiale avec halo-cover-card et halo-separator-card.
 * ==============================================================================
 */

import { HaloCoverCard } from './components/halo-cover-card';
import { HaloSeparatorCard } from './components/halo-separator-card';
import { HaloLightCard } from './components/halo-light-card';
import { HaloCoverCardEditor } from './editors/halo-cover-card-editor';
import { HaloSeparatorCardEditor } from './editors/halo-separator-card-editor';
import { HaloLightCardEditor } from './editors/halo-light-card-editor';
import { voletHelperInstance } from './core/volet-helper';
import * as lightHelper from './core/light-helper';

const VERSION = '1.1.0';

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

// Export for external consumers
export {
  HaloCoverCard,
  HaloCoverCardEditor,
  HaloLightCard,
  HaloLightCardEditor,
  HaloSeparatorCard,
  HaloSeparatorCardEditor,
  voletHelperInstance,
  lightHelper
};
