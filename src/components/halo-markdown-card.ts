/**
 * ==============================================================================
 * 📌 Nom du fichier : src/components/halo-markdown-card.ts
 * 📝 Description   : Composant Web custom:halo-markdown-card.
 *                    Encadré de message / callout Markdown au style Liquid Glass
 *                    avec barre verticale d'accent néon, dégradé horizontal translucide,
 *                    coins arrondis et support de la synchronisation de thème.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.2
 * 📅 Date         : 2026-11-02
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🆕 v1.5.2 (2026-11-02) : Création initiale de la carte custom:halo-markdown-card :
 *                              - Style Liquid Glass callout (barre verticale gauche 4px,
 *                                dégradé 90deg translucide, coins arrondis 12px).
 *                              - Personnalisation séparée ou harmonisée des teintes
 *                                (barre latérale bar_color et dégradé gradient_color).
 *                              - Support de synchronisation dynamique theme_entity.
 *                              - Support de l'évaluation native Jinja2 via WebSocket HA
 *                                et rendu propre des blockquotes sans redondance.
 * ==============================================================================
 */

import { HomeAssistant, HaloMarkdownCardConfig } from '../types';
import { resolveThemeColor, toHexColor } from '../core/theme-helper';

export class HaloMarkdownCard extends HTMLElement {
  private _config!: HaloMarkdownCardConfig;
  private _hass!: HomeAssistant;
  private _root: ShadowRoot;

  // Références DOM
  private _cardEl: HTMLElement | null = null;
  private _boxEl: HTMLElement | null = null;
  private _markdownEl: HTMLElement | null = null;
  private _titleEl: HTMLElement | null = null;

  // Souscription aux templates Jinja2 temps réel
  private _unsubRenderTemplate: Promise<() => Promise<void>> | null = null;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  public static getConfigElement(): HTMLElement {
    return document.createElement('halo-markdown-card-editor');
  }

  public static getStubConfig(): Record<string, any> {
    return {
      type: 'custom:halo-markdown-card',
      content: '> 💡 **Information importante :**  \n> • **Point 1 :** Votre texte d\'explication ou d\'aide.  \n> • **Point 2 :** Mise en forme riche avec gras, listes et emojis.',
      bar_width: 4,
      border_radius: 12
    };
  }

  public setConfig(config: HaloMarkdownCardConfig) {
    if (!config) {
      throw new Error('Invalid configuration for halo-markdown-card');
    }
    this._config = {
      bar_width: 4,
      border_radius: 12,
      gradient_opacity: 0.10,
      text_color: 'rgba(230, 242, 245, 0.90)',
      ...config
    };

    if (this._hass) {
      this._render();
      this._updateContent();
    }
  }

  public set hass(hass: HomeAssistant) {
    const oldHass = this._hass;
    this._hass = hass;

    if (!this._cardEl) {
      this._render();
      this._updateContent();
      return;
    }

    if (this._hasChanged(oldHass, hass)) {
      this._updateStyles();
    }
  }

  public getCardSize(): number {
    return 2;
  }

  public connectedCallback() {
    if (!this._cardEl && this._config && this._hass) {
      this._render();
    }
    this._updateContent();
  }

  public disconnectedCallback() {
    this._cleanupTemplateSubscription();
  }

  private _cleanupTemplateSubscription() {
    if (this._unsubRenderTemplate) {
      this._unsubRenderTemplate.then(unsub => unsub()).catch(() => {});
      this._unsubRenderTemplate = null;
    }
  }

  private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
    if (!oldHass || !newHass || !this._config) return true;

    // Changement de langue ou de thèmes
    if (oldHass.themes !== newHass.themes || oldHass.language !== newHass.language) {
      return true;
    }

    // Entité de thème dynamique
    if (this._config.theme_entity) {
      if (oldHass.states[this._config.theme_entity] !== newHass.states[this._config.theme_entity]) {
        return true;
      }
    }

    return false;
  }

  private _getColors(): { barColor: string; gradientColor: string; alphaHex: string } {
    const baseColor = resolveThemeColor(
      this._hass,
      this._config.color,
      this._config.theme_entity,
      '#26c6da'
    );

    const barColor = this._config.bar_color
      ? resolveThemeColor(this._hass, this._config.bar_color, this._config.theme_entity, baseColor)
      : baseColor;

    const gradientColor = this._config.gradient_color
      ? resolveThemeColor(this._hass, this._config.gradient_color, this._config.theme_entity, baseColor)
      : baseColor;

    const opacity = typeof this._config.gradient_opacity === 'number'
      ? Math.max(0, Math.min(1, this._config.gradient_opacity))
      : 0.10;

    const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');

    return {
      barColor: toHexColor(barColor, '#26c6da'),
      gradientColor: toHexColor(gradientColor, '#26c6da'),
      alphaHex
    };
  }

  private _updateStyles() {
    if (!this._boxEl) return;

    const { barColor, gradientColor, alphaHex } = this._getColors();
    const barWidth = typeof this._config.bar_width === 'number' ? this._config.bar_width : 4;
    const borderRadius = typeof this._config.border_radius === 'number' ? this._config.border_radius : 12;
    const textColor = this._config.text_color || 'rgba(230, 242, 245, 0.90)';

    this._boxEl.style.setProperty('--halo-bar-color', barColor);
    this._boxEl.style.setProperty('--halo-gradient-color-alpha', `${gradientColor}${alphaHex}`);
    this._boxEl.style.setProperty('--halo-text-color', textColor);
    this._boxEl.style.setProperty('--primary-color', barColor);
    this._boxEl.style.setProperty('--accent-color', barColor);

    if (barWidth > 0) {
      this._boxEl.style.borderLeft = `${barWidth}px solid ${barColor}`;
    } else {
      this._boxEl.style.borderLeft = 'none';
    }

    this._boxEl.style.background = `linear-gradient(90deg, ${gradientColor}${alphaHex} 0%, transparent 100%)`;
    this._boxEl.style.borderRadius = `0 ${borderRadius}px ${borderRadius}px 0`;
  }

  private _updateContent() {
    const rawContent = this._config?.content || '';

    // Détection de syntaxe Jinja2 {{ ... }} ou {% ... %}
    if (this._hass?.connection && (rawContent.includes('{{') || rawContent.includes('{%'))) {
      this._cleanupTemplateSubscription();

      try {
        this._unsubRenderTemplate = (this._hass.connection as any).subscribeMessage(
          (msg: { result?: string }) => {
            if (msg.result !== undefined && this._markdownEl) {
              (this._markdownEl as any).content = msg.result;
            }
          },
          {
            type: 'render_template',
            template: rawContent,
            variables: { config: this._config }
          }
        );
      } catch (err) {
        console.warn('HALO Markdown Card: Erreur de souscription au template Jinja2, rendu brut appliqué.', err);
        if (this._markdownEl) {
          (this._markdownEl as any).content = rawContent;
        }
      }
    } else {
      this._cleanupTemplateSubscription();
      if (this._markdownEl) {
        (this._markdownEl as any).content = rawContent;
      }
    }

    if (this._markdownEl && this._hass) {
      (this._markdownEl as any).hass = this._hass;
    }
  }

  private _render() {
    this._root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
          margin: 0;
          overflow: hidden;
          box-sizing: border-box;
        }
        .halo-markdown-title {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 6px;
          padding-left: 2px;
          letter-spacing: 0.2px;
        }
        .halo-markdown-box {
          position: relative;
          box-sizing: border-box;
          border-left: 4px solid var(--halo-bar-color, #26c6da);
          background: linear-gradient(90deg, var(--halo-gradient-color-alpha, rgba(38, 198, 218, 0.1)) 0%, transparent 100%);
          border-radius: 0 12px 12px 0;
          padding: 10px 14px;
          margin: 0;
          color: var(--halo-text-color, rgba(230, 242, 245, 0.90));
          transition: border-color 0.3s ease, background 0.3s ease, border-radius 0.2s ease;
        }
        ha-markdown {
          display: block;
          font-size: 0.93rem;
          line-height: 1.5;
        }
        /* Intégration propre des blockquotes sans double bordure ni double marge */
        ha-markdown blockquote {
          border: none !important;
          background: transparent !important;
          margin: 0 !important;
          padding: 0 !important;
          color: inherit !important;
        }
        ha-markdown p {
          margin: 0 0 6px 0;
          line-height: 1.5;
        }
        ha-markdown p:last-child {
          margin-bottom: 0;
        }
        ha-markdown strong,
        ha-markdown b {
          color: #ffffff;
          font-weight: 600;
        }
        ha-markdown a {
          color: var(--primary-color, var(--halo-bar-color, #26c6da));
          text-decoration: none;
        }
        ha-markdown a:hover {
          text-decoration: underline;
        }
        ha-markdown code {
          background: rgba(0, 0, 0, 0.35);
          padding: 2px 5px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: #f1f5f9;
        }
        ha-markdown ul,
        ha-markdown ol {
          margin: 4px 0 6px 18px;
          padding: 0;
        }
        ha-markdown li {
          margin-bottom: 3px;
        }
        ha-markdown li:last-child {
          margin-bottom: 0;
        }
      </style>

      <ha-card id="card">
        ${this._config.title ? `<div class="halo-markdown-title" id="title">${this._config.title}</div>` : ''}
        <div class="halo-markdown-box" id="box">
          <ha-markdown id="markdown"></ha-markdown>
        </div>
      </ha-card>
    `;

    this._cardEl = this._root.querySelector('#card');
    this._boxEl = this._root.querySelector('#box');
    this._markdownEl = this._root.querySelector('#markdown');
    this._titleEl = this._root.querySelector('#title');

    this._updateStyles();
  }
}
