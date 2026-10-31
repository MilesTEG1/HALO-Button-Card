/**
 * ==============================================================================
 * 📌 Nom du fichier : src/localize/localize.ts
 * 📝 Description   : Helper d'internationalisation (i18n) de la suite HALO Cards.
 *                    Résout la langue active de Home Assistant
 *                    (hass.locale?.language || hass.language || 'en') et traduit
 *                    une clé pointée avec repli déterministe vers l'anglais.
 * 🖥️  Machine cible : Navigateur Web / Home Assistant Lovelace
 * 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
 * 📦 Version      : 1.4.2
 * 📅 Date         : 2026-10-31
 * 🤖 LLM utilisé  : Gemini / Claude via Antigravity CLI
 * ==============================================================================
 * 📋 CHANGELOG (antéchronologique)
 *   - ♻️ v1.4.2 (2026-10-31) : Uniformisation intégrale de la nomenclature HALO
 *                              (`localizeHalo`, espace de noms `halo.*`).
 *   - 🆕 v1.4.0 (2026-10-30) : Création initiale (dictionnaires en/fr, fallback EN).
 * ==============================================================================
 */

import en from './languages/en.json';
import fr from './languages/fr.json';

const LANGUAGES: Record<string, any> = { en, fr };

export type LocalizeFunc = (
  key: string,
  search?: string | string[],
  replace?: string | number | Array<string | number>
) => string;

/** Retourne le code de langue primaire actif (ex. 'fr-CA' -> 'fr'), 'en' par défaut. */
export function getLang(hass?: any): string {
  const raw = hass?.locale?.language || hass?.language || 'en';
  const lang = String(raw).toLowerCase().split(/[-_]/)[0];
  return LANGUAGES[lang] ? lang : 'en';
}

function lookup(dict: any, key: string): string | undefined {
  let cur = dict;
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Traduit `key` selon la langue de `hass`. Repli : langue active -> anglais -> clé brute.
 * Les marqueurs `{search}` du texte sont remplacés par `replace` (valeurs ou tableaux).
 */
export function localize(
  hass: any,
  key: string,
  search?: string | string[],
  replace?: string | number | Array<string | number>
): string {
  let str = lookup(LANGUAGES[getLang(hass)], key) ?? lookup(en, key) ?? key;
  if (search !== undefined) {
    const s = Array.isArray(search) ? search : [search];
    const r = Array.isArray(replace) ? replace : [replace];
    s.forEach((name, i) => {
      str = str.split(`{${name}}`).join(String(r[i] ?? ''));
    });
  }
  return str;
}

/** Fabrique un traducteur lié à `hass` : `t(key, search, replace)`. */
export function useLocalize(hass?: any): LocalizeFunc {
  return (key, search, replace) => localize(hass, key, search, replace);
}

/** Traduit le nom d'une nuance HALO (la valeur stockée en configuration reste inchangée). */
export function localizeHalo(hass: any, name: string): string {
  return localize(hass, `halo.${name}`) === `halo.${name}` ? name : localize(hass, `halo.${name}`);
}
