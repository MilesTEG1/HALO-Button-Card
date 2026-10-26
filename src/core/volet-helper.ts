/**
 * HALO Button Card — Volet Helper Engine
 * Asynchronous position estimation and manual movement tracker
 * (c) 2026 MilesTEG1 — MIT License
 */

import { HassEntity, VoletTrack } from '../types';

export class VoletHelper {
  public version = '2.2.0';
  public QUIET_MS = 2500;
  public GRACE_MS = 4000;
  public MAX_AGE_MS = 30000;
  public seq = 0;
  public tracking: Record<string, VoletTrack> = {};
  public cards: any[] = [];

  constructor() {
    this._attachGlobal();
  }

  private _attachGlobal() {
    if (typeof window !== 'undefined') {
      (window as any)._voletHelper = this;
    }
  }

  public position(s: HassEntity): number | null {
    if (!s) return null;
    const a = s.attributes || {};
    if (a.current_position !== undefined && a.current_position !== null) {
      return Number(a.current_position);
    }
    return s.state === 'open' ? 100 : s.state === 'closed' ? 0 : null;
  }

  public reached(dir: 'opening' | 'closing' | null, p: number | null, st: string): boolean {
    if (dir === 'closing') return p === 0 || st === 'closed';
    if (dir === 'opening') return p === 100 || st === 'open';
    return false;
  }

  public register(el: any) {
    if (!el || typeof el.requestUpdate !== 'function') return;
    for (let i = 0; i < this.cards.length; i++) {
      const c = this.cards[i].deref ? this.cards[i].deref() : this.cards[i];
      if (c === el) return;
    }
    this.cards.push(typeof WeakRef !== 'undefined' ? new WeakRef(el) : el);
  }

  public forceCardUpdate(c: any): boolean {
    if (!c) return false;
    if (typeof c.requestUpdate === 'function') {
      this.seq = (this.seq || 0) + 1;
      const prev = c._updateTimerMS;
      c._updateTimerMS = this.seq;
      c.requestUpdate('_updateTimerMS', prev);
      return true;
    }
    if (typeof c.refresh === 'function') {
      c.refresh();
      return true;
    }
    return false;
  }

  public refreshAll() {
    let n = 0;
    const live: any[] = [];
    for (let i = 0; i < this.cards.length; i++) {
      const ref = this.cards[i];
      const c = ref.deref ? ref.deref() : ref;
      if (c && c.isConnected !== false) {
        live.push(ref);
        try {
          if (this.forceCardUpdate(c)) n++;
        } catch (e) {
          // ignore
        }
      }
    }
    this.cards = live;

    if (n === 0 && typeof document !== 'undefined') {
      try {
        const walk = (root: Document | ShadowRoot) => {
          const all = root.querySelectorAll('*');
          for (let j = 0; j < all.length; j++) {
            const e = all[j] as any;
            if (
              e.tagName === 'HALO-COVER-CARD' ||
              e.tagName === 'BUTTON-CARD' ||
              e.tagName === 'CUSTOM-BUTTON-CARD'
            ) {
              this.forceCardUpdate(e);
            }
            if (e.shadowRoot) walk(e.shadowRoot);
          }
        };
        walk(document);
      } catch (e) {
        // ignore
      }
    }
  }

  public newTrack(p: number | null, lu: number): VoletTrack {
    return {
      lastPos: p,
      lastLu: lu,
      moving: false,
      dir: null,
      until: 0,
      timer: null
    };
  }

  public stopMove(t: VoletTrack) {
    if (t.timer) clearTimeout(t.timer);
    t.timer = null;
    t.moving = false;
    t.dir = null;
    t.until = 0;
  }

  public startMove(id: string, dir: 'opening' | 'closing', ms: number) {
    const t = this.tracking[id];
    if (!t) return;
    if (t.timer) clearTimeout(t.timer);
    t.moving = true;
    t.dir = dir;
    t.until = Date.now() + ms;
    t.timer = setTimeout(() => {
      this.expire(id);
    }, ms + 50);
  }

  public expire(id: string) {
    const t = this.tracking[id];
    if (!t) return;
    t.timer = null;
    if (!t.moving) return;
    const left = t.until - Date.now();
    if (left > 0) {
      t.timer = setTimeout(() => {
        this.expire(id);
      }, left + 50);
      return;
    }
    this.stopMove(t);
    this.refreshAll();
  }

  public checkMoving(
    id: string,
    states: Record<string, HassEntity>
  ): { moving: boolean; dir: 'opening' | 'closing' | null } {
    const NO = { moving: false, dir: null };
    if (!id || !states) return NO;
    const s = states[id];
    if (!s) return NO;
    const st = s.state || 'unavailable';
    if (st === 'opening' || st === 'closing') {
      return { moving: true, dir: st as 'opening' | 'closing' };
    }
    const t = this.tracking[id];
    if (st === 'unavailable' || st === 'unknown') {
      if (t) {
        this.stopMove(t);
        t.lastPos = null;
      }
      return NO;
    }

    const p = this.position(s);
    const lu = s.last_updated ? new Date(s.last_updated).getTime() : 0;
    const now = Date.now();

    if (!t) {
      this.tracking[id] = this.newTrack(p, lu);
      return NO;
    }

    if (lu !== t.lastLu) {
      const fresh = lu > 0 && now - lu <= this.MAX_AGE_MS;
      if (
        fresh &&
        p !== null &&
        t.lastPos !== null &&
        p !== t.lastPos &&
        now >= (t.ignoreUntil || 0)
      ) {
        const d: 'opening' | 'closing' = p < t.lastPos ? 'closing' : 'opening';
        if (this.reached(d, p, st)) {
          this.stopMove(t);
        } else {
          this.startMove(id, d, this.QUIET_MS);
        }
      }
      t.lastLu = lu;
    }

    if (p !== null) t.lastPos = p;
    if (t.moving && (this.reached(t.dir, p, st) || now >= t.until)) {
      this.stopMove(t);
    }

    return t.moving ? { moving: true, dir: t.dir } : NO;
  }

  public isEntityOrGroupMoving(
    entity: HassEntity,
    states: Record<string, HassEntity>
  ): { moving: boolean; dir: 'opening' | 'closing' | null; count: number } {
    if (!entity || !states) return { moving: false, dir: null, count: 0 };
    if (entity.state === 'opening' || entity.state === 'closing') {
      return { moving: true, dir: entity.state as 'opening' | 'closing', count: 1 };
    }

    const id = entity.entity_id;
    const attrs = entity.attributes || {};
    const members = Array.isArray(attrs.entity_id)
      ? attrs.entity_id
      : Array.isArray(attrs.group_entities)
      ? attrs.group_entities
      : [];

    if (members.length > 0) {
      let count = 0;
      let firstDir: 'opening' | 'closing' | null = null;
      for (let i = 0; i < members.length; i++) {
        const res = this.checkMoving(members[i], states);
        if (res.moving) {
          count++;
          if (!firstDir) firstDir = res.dir;
        }
      }
      return { moving: count > 0, dir: firstDir, count };
    }

    const r = this.checkMoving(id, states);
    return { moving: r.moving, dir: r.dir, count: r.moving ? 1 : 0 };
  }

  public markManualMove(
    id: string,
    dir: 'opening' | 'closing' | 'stop',
    members?: string[] | null,
    states?: Record<string, HassEntity>
  ) {
    const targets = Array.isArray(members) && members.length > 0 ? members : [id];
    targets.forEach((tid) => {
      if (!tid) return;
      const s = states ? states[tid] : null;
      const p = s ? this.position(s) : null;
      const st = s ? s.state || null : null;
      const lu = s && s.last_updated ? new Date(s.last_updated).getTime() : 0;
      let t = this.tracking[tid];
      if (!t) t = this.tracking[tid] = this.newTrack(p, lu);

      if (dir === 'stop') {
        this.stopMove(t);
        t.ignoreUntil = Date.now() + 1500;
        return;
      }

      const checkPos = p !== null ? p : t.lastPos;
      if (st && this.reached(dir, checkPos, st)) return;
      this.startMove(tid, dir, this.GRACE_MS);
    });
    this.refreshAll();
  }
}

export const voletHelperInstance = new VoletHelper();
