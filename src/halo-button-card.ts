/**
 * HALO Button Card — Entry Point
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HaloCoverCard } from './components/halo-cover-card';
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

// Register Web Component custom elements
if (!customElements.get('halo-cover-card')) {
  customElements.define('halo-cover-card', HaloCoverCard);
}

// Export for external consumers
export { HaloCoverCard, voletHelperInstance };
