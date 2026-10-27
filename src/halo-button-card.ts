/**
 * HALO Button Card — Entry Point
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HaloCoverCard } from './components/halo-cover-card';
import { HaloSeparatorCard } from './components/halo-separator-card';
import { HaloCoverCardEditor } from './editors/halo-cover-card-editor';
import { HaloSeparatorCardEditor } from './editors/halo-separator-card-editor';
import { voletHelperInstance } from './core/volet-helper';

const VERSION = '1.0.0';

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
  HaloSeparatorCard,
  HaloSeparatorCardEditor,
  voletHelperInstance
};
