/**
 * HALO Button Card — Built Bundle
 * (c) 2026 MilesTEG1 — MIT License
 */
(function () {
  'use strict';

  var VERSION = "1.0.0";

  console.info(
    "%c  HALO-BUTTON-CARD  %c v" + VERSION + " ",
    "color: #0b0f19; background: #26c6da; font-weight: 700; border-radius: 4px 0 0 4px; padding: 2px 4px;",
    "color: #ffffff; background: #1e293b; font-weight: 700; border-radius: 0 4px 4px 0; padding: 2px 4px;"
  );

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "halo-button-card",
    name: "HALO Button Card",
    description: "Turnkey Lovelace card suite with HOLM Liquid Glass style and dynamic glowing halos.",
    preview: true
  });

  class HaloBaseCard extends HTMLElement {
    constructor() {
      super();
      this._root = this.attachShadow({ mode: "open" });
    }

    setConfig(config) {
      if (!config) throw new Error("Invalid configuration");
      this._config = config;
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _render() {
      var name = (this._config && (this._config.name || this._config.entity)) || "HALO Card";
      this._root.innerHTML = `
        <style>
          :host {
            display: block;
          }
          .halo-container {
            position: relative;
            border-radius: 14px;
            padding: 12px 14px;
            min-height: 54px;
            background: rgba(20, 28, 38, 0.75);
            backdrop-filter: blur(16px) saturate(180%);
            -webkit-backdrop-filter: blur(16px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
            color: #e6f2f5;
            font-family: var(--paper-font-body1_-_font-family, sans-serif);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .halo-title {
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
          }
        </style>
        <div class="halo-container">
          <div class="halo-title">${name}</div>
        </div>
      `;
    }

    _update() {}

    getCardSize() {
      return 2;
    }
  }

  if (!customElements.get("halo-button-card")) {
    customElements.define("halo-button-card", HaloBaseCard);
  }
})();
