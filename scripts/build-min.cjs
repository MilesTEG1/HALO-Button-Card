#!/usr/bin/env node
// ==============================================================================
// 📌 Nom du script : scripts/build-min.cjs
// 📝 Description   : Minification sécurisée et sans perte du bundle HALO Button Card
//                    via Terser et compresseur CSS non-destructif préservant
//                    scrupuleusement la ponctuation {}:;,>+~.
// 🖥️  Machine cible : VM-203 - Agent-Debian-Caw
// 👤 Auteur       : Pierrick / DÉDALE (Escouade Homelab)
// 📦 Version      : 1.3.1
// 📅 Date         : 2026-10-30
// 🤖 LLM utilisé  : Gemini / Antigravity (DÉDALE)
// ==============================================================================
// 📋 CHANGELOG (antéchronologique)
//   - 🩹 v1.3.1 (2026-10-30) : Prise en charge des blocs <style> interpolés purs (${...})
//                              dans validateCssAssertions (retour audit QA SENTINELLE).
//   - 🆕 v1.3.1 (2026-10-30) : Création initiale du script de minification sécurisé
//                              et pérenne avec assertions de conformité CSS et
//                              contrôle strict du plafond de 128 Ko (128 000 octets).
// ==============================================================================

const fs = require('fs');
const path = require('path');
const terser = require('terser');

const MAX_BUNDLE_BYTES = 128000; // Limite stricte pour ressources inline / stockage Lovelace
const INPUT_PATH = path.resolve(__dirname, '../dist/halo-button-card.js');
const OUTPUT_PATH = path.resolve(__dirname, '../dist/halo-button-card.min.js');

/**
 * Minifie le contenu CSS de manière sûre sans altérer la syntaxe,
 * en préservant scrupuleusement TOUTE la ponctuation ({}:;,>+~).
 * Protège les interpolations de template strings JS (${...}).
 *
 * @param {string} css - Chaîne CSS brute à minifier
 * @returns {string} - CSS compacté
 */
function minifyCssSafe(css) {
  if (!css || typeof css !== 'string') return '';

  // 1. Isoler et protéger les interpolations JS ${...}
  const interpolations = [];
  const tokenized = css.replace(/\$\{[^}]+\}/g, (match) => {
    interpolations.push(match);
    return `___INTERPOLATION_${interpolations.length - 1}___`;
  });

  // 2. Minification CSS sans perte
  const minified = tokenized
    // Supprimer les commentaires CSS /* ... */
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remplacer les sauts de ligne, retours chariot et tabulations par un espace
    .replace(/[\r\n\t]+/g, ' ')
    // Réduire les séquences d'espaces multiples à un seul espace
    .replace(/\s{2,}/g, ' ')
    // Supprimer les espaces superflus autour des séparateurs de règles ({};,)
    .replace(/\s*([{};,])\s*/g, '$1')
    // Supprimer les espaces superflus autour des deux-points ':'
    .replace(/\s*:\s*/g, ':')
    // Supprimer les espaces superflus autour des combinateurs de sélecteurs (> + ~)
    .replace(/\s*([>+~])\s*/g, '$1')
    .trim();

  // 3. Restaurer les interpolations JS protégées
  return minified.replace(/___INTERPOLATION_(\d+)___/g, (_, idx) => interpolations[Number(idx)]);
}

/**
 * Valide par assertions que la ponctuation CSS essentielle est préservée
 * dans l'ensemble des blocs <style> de la sortie.
 *
 * @param {string} code - Code JavaScript minifié final
 */
function validateCssAssertions(code) {
  const styleRegex = /<style(?:\s+[^>]*)?>([\s\S]*?)<\/style>/gi;
  let match;
  let blockIndex = 0;
  let validatedBlocks = 0;

  while ((match = styleRegex.exec(code)) !== null) {
    blockIndex++;
    const cssBlock = match[1].trim();

    // Cas d'un bloc de styles injecté par interpolation JS (${COMMON_EDITOR_STYLES} minifié en ${_})
    if (/^\$\{[^}]+\}$/.test(cssBlock)) {
      continue;
    }

    // Assertions sur CSS statique inline
    if (!cssBlock.includes('{')) {
      throw new Error(`❌ [ÉCHEC ASSERTION] Le bloc <style> #${blockIndex} ne contient aucune accolade '{' ! Structure CSS corrompue.`);
    }

    if (!cssBlock.includes(':')) {
      throw new Error(`❌ [ÉCHEC ASSERTION] Le bloc <style> #${blockIndex} ne contient aucun deux-points ':' ! Déclarations CSS corrompues.`);
    }

    // Pas de mot-clé CSS "flottant" sans ponctuation
    if (cssBlock.includes('display flex') || cssBlock.includes('position relative')) {
      throw new Error(`❌ [ÉCHEC ASSERTION] Détection de propriétés CSS sans ':' dans le bloc <style> #${blockIndex} !`);
    }

    validatedBlocks++;
  }

  if (blockIndex === 0) {
    throw new Error('❌ [ÉCHEC ASSERTION] Aucun bloc <style> trouvé dans le bundle minifié !');
  }

  console.log(`✨ Assertions validées avec succès sur les blocs <style> (${blockIndex} blocs détectés, dont ${validatedBlocks} blocs CSS statiques vérifiés et préservés).`);
}

async function run() {
  console.log('🚀 Démarrage du build de minification HALO Button Card...');

  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`❌ Fichier d'entrée introuvable : ${INPUT_PATH}. Lancez d'abord "npm run build".`);
  }

  const rawJs = fs.readFileSync(INPUT_PATH, 'utf8');
  const initialBytes = Buffer.byteLength(rawJs, 'utf8');
  console.log(`📦 Taille initiale du bundle : ${initialBytes.toLocaleString()} octets (${(initialBytes / 1024).toFixed(2)} Ko)`);

  // 1. Minification CSS ciblée des balises <style>...</style>
  let processedJs = rawJs.replace(/(<style(?:\s+[^>]*)?>)([\s\S]*?)(<\/style>)/gi, (match, openTag, css, closeTag) => {
    return openTag + minifyCssSafe(css) + closeTag;
  });

  // Minification ciblée de la constante de styles partagés COMMON_EDITOR_STYLES si présente
  processedJs = processedJs.replace(/(const COMMON_EDITOR_STYLES\s*=\s*`)([\s\S]*?)(`;)/g, (match, prefix, css, suffix) => {
    return prefix + minifyCssSafe(css) + suffix;
  });

  // 2. Minification JS globale via Terser
  console.log('⚙️  Compression JS via Terser (passes: 2, mangle: true)...');
  const terserResult = await terser.minify(processedJs, {
    ecma: 2020,
    module: false,
    compress: {
      passes: 2,
      drop_console: false, // Conserver le badge console console.info
      drop_debugger: true,
      pure_getters: true,
      unsafe: false
    },
    mangle: {
      toplevel: false,
      reserved: ['HaloButtonCard']
    },
    format: {
      comments: false
    }
  });

  if (!terserResult.code) {
    throw new Error('❌ Échec de la minification Terser : code de sortie vide.');
  }

  const minifiedJs = terserResult.code;
  const finalBytes = Buffer.byteLength(minifiedJs, 'utf8');

  console.log(`📊 Taille finale après minification : ${finalBytes.toLocaleString()} octets (${(finalBytes / 1024).toFixed(2)} Ko)`);
  const gainPct = (((initialBytes - finalBytes) / initialBytes) * 100).toFixed(1);
  console.log(`📉 Réduction de taille : ${gainPct}% (-${(initialBytes - finalBytes).toLocaleString()} octets)`);

  // 3. Contrôle rigoureux du seuil des 128 000 octets
  if (finalBytes > MAX_BUNDLE_BYTES) {
    throw new Error(`❌ VIOLATION SEUIL CRITIQUE : Le bundle minifié fait ${finalBytes} octets, dépassant le plafond strict de ${MAX_BUNDLE_BYTES} octets !`);
  }

  // 4. Assertions de non-dégradation du CSS
  validateCssAssertions(minifiedJs);

  // 5. Écriture du fichier final
  fs.writeFileSync(OUTPUT_PATH, minifiedJs, 'utf8');
  console.log(`✅ Fichier généré avec succès : ${OUTPUT_PATH}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
