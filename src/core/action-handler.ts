/**
 * ==============================================================================
 * 📌 Nom du fichier : src/core/action-handler.ts
 * 📝 Description   : Moteur universel de gestion des interactions tactiles et
 *                    exécution des actions Home Assistant (tap, hold, double-tap,
 *                    call-service, more-info, navigate, url, toggle, confirmation).
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.5.1
 * 📅 Date         : 2026-11-01
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - 🩹 v1.5.1 (2026-11-01) : Tolérance aux actions non définies avec fallback intelligent
 *                              (toggle automatique pour domaines commutables, more-info sinon)
 *                              et réinitialisation stricte de hasMoved sur pointercancel.
 *   - 💡 v1.2.0 (2026-10-30) : Création initiale du moteur d'actions universel HALO.
 * ==============================================================================
 */

import { HomeAssistant, ActionConfig } from '../types';

export function fireHaptic(
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'failure' | 'success' = 'light'
) {
  const event = new CustomEvent('haptic', {
    bubbles: true,
    composed: true,
    detail: type
  });
  window.dispatchEvent(event);
}

export function fireEvent(node: HTMLElement, type: string, detail: any) {
  const event = new CustomEvent(type, {
    bubbles: true,
    composed: true,
    detail: detail
  });
  node.dispatchEvent(event);
}

export async function handleAction(
  node: HTMLElement,
  hass: HomeAssistant,
  config?: ActionConfig,
  defaultEntityId?: string
): Promise<void> {
  if (!hass) return;

  const effectiveConfig: ActionConfig = config || (defaultEntityId ? {} : { action: 'none' });
  let action = effectiveConfig.action;

  if (!action) {
    if (effectiveConfig.service || effectiveConfig.perform_action) {
      action = 'call-service';
    } else if (effectiveConfig.navigation_path) {
      action = 'navigate';
    } else if (effectiveConfig.url_path) {
      action = 'url';
    } else if (effectiveConfig.entity || defaultEntityId) {
      const target = effectiveConfig.entity || defaultEntityId;
      const domain = target?.split('.')[0] || '';
      const toggleableDomains = ['light', 'switch', 'input_boolean', 'fan', 'cover', 'lock', 'automation'];
      action = toggleableDomains.includes(domain) ? 'toggle' : 'more-info';
    } else {
      action = 'none';
    }
  }

  if (action === 'none') return;

  // Confirmation dialog
  if (effectiveConfig.confirmation) {
    const text = typeof effectiveConfig.confirmation === 'string'
      ? effectiveConfig.confirmation
      : (effectiveConfig.confirmation.text || 'Confirmer l\'action ?');
    if (!window.confirm(text)) {
      return;
    }
  }

  fireHaptic('light');

  switch (action) {
    case 'call-service':
    case 'perform-action': {
      const fullService = effectiveConfig.service || effectiveConfig.perform_action;
      if (!fullService) return;

      const [domain, service] = fullService.split('.');
      const serviceData = {
        ...(effectiveConfig.data || effectiveConfig.service_data || {})
      };

      if (effectiveConfig.target) {
        Object.assign(serviceData, effectiveConfig.target);
      } else if (!serviceData.entity_id && (effectiveConfig.entity || defaultEntityId)) {
        serviceData.entity_id = effectiveConfig.entity || defaultEntityId;
      }

      await hass.callService(domain, service, serviceData);
      break;
    }

    case 'toggle': {
      const targetEntity = effectiveConfig.entity || defaultEntityId;
      if (!targetEntity) return;
      const domain = targetEntity.split('.')[0] || 'homeassistant';
      await hass.callService(domain, 'toggle', { entity_id: targetEntity });
      break;
    }

    case 'more-info': {
      const targetEntity = effectiveConfig.entity || defaultEntityId;
      if (!targetEntity) return;
      fireEvent(node, 'hass-more-info', { entityId: targetEntity });
      break;
    }

    case 'navigate': {
      const path = effectiveConfig.navigation_path;
      if (!path) return;
      window.history.pushState(null, '', path);
      const navEvent = new CustomEvent('location-changed', {
        bubbles: true,
        composed: true
      });
      window.dispatchEvent(navEvent);
      break;
    }

    case 'url': {
      const url = effectiveConfig.url_path;
      if (!url) return;
      window.open(url, '_blank');
      break;
    }

    default:
      console.warn('[HALO ActionHandler] Action non prise en charge :', action);
  }
}

export interface TouchActionHandlers {
  onTap?: () => void;
  onHold?: () => void;
  onDoubleTap?: () => void;
}

export function bindTouchActions(
  el: HTMLElement,
  handlers: TouchActionHandlers,
  holdDurationMs: number = 500,
  doubleTapThresholdMs: number = 280
): () => void {
  let holdTimer: any = null;
  let isHold = false;
  let lastTapTime = 0;
  let touchStartPos = { x: 0, y: 0 };
  let hasMoved = false;

  const onPointerDown = (e: PointerEvent) => {
    // Ne gérer que le clic principal gauche ou tactile
    if (e.button !== 0) return;
    touchStartPos = { x: e.clientX, y: e.clientY };
    hasMoved = false;
    isHold = false;

    if (handlers.onHold) {
      holdTimer = setTimeout(() => {
        isHold = true;
        fireHaptic('heavy');
        handlers.onHold?.();
      }, holdDurationMs);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!holdTimer) return;
    const dx = Math.abs(e.clientX - touchStartPos.x);
    const dy = Math.abs(e.clientY - touchStartPos.y);
    if (dx > 10 || dy > 10) {
      hasMoved = true;
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }

    if (isHold || hasMoved) {
      return;
    }

    const now = Date.now();
    if (handlers.onDoubleTap && now - lastTapTime < doubleTapThresholdMs) {
      lastTapTime = 0;
      handlers.onDoubleTap();
      return;
    }

    lastTapTime = now;
    if (handlers.onTap) {
      // S'il y a un handler de double tap, on peut attendre légèrement ou appeler onTap si pas de double-tap
      if (handlers.onDoubleTap) {
        setTimeout(() => {
          if (Date.now() - lastTapTime >= doubleTapThresholdMs - 20 && lastTapTime !== 0) {
            handlers.onTap?.();
            lastTapTime = 0;
          }
        }, doubleTapThresholdMs);
      } else {
        handlers.onTap();
      }
    }
  };

  const onPointerCancel = () => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    isHold = false;
    hasMoved = false;
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerCancel);

  // Return unbind callback
  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerCancel);
  };
}
