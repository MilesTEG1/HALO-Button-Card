# HALO Button Card par [@MilesTEG1](https://github.com/MilesTEG1) <!-- omit in toc -->

[![Stable][releases-shield]][releases] [![Beta][releases-dev-shield]][releases-dev] [![Badge HACS][hacs-badge]][hacs-link] ![Maintenance du Projet][maintenance-shield] <br/> ![Téléchargements][downloads] [![Activité GitHub][commits-shield]][commits] [![Licence][license-shield]](LICENSE) ![Co-Développé avec Antigravity][antigravity-shield]

[commits-shield]: https://img.shields.io/github/commit-activity/y/MilesTEG1/HALO-Button-Card.svg
[commits]: https://github.com/MilesTEG1/HALO-Button-Card/commits/main
[license-shield]: https://img.shields.io/github/license/MilesTEG1/HALO-Button-Card.svg
[maintenance-shield]: https://img.shields.io/maintenance/yes/2026.svg
[releases-shield]: https://img.shields.io/github/release/MilesTEG1/HALO-Button-Card.svg
[releases]: https://github.com/MilesTEG1/HALO-Button-Card/releases/latest
[releases-dev-shield]: https://img.shields.io/github/package-json/v/MilesTEG1/HALO-Button-Card/dev?label=release%40dev
[releases-dev]: https://github.com/MilesTEG1/HALO-Button-Card/releases
[hacs-badge]: https://img.shields.io/badge/HACS-Custom-41BDF5.svg
[downloads]: https://img.shields.io/github/downloads/MilesTEG1/HALO-Button-Card/total
[hacs-link]: https://my.home-assistant.io/redirect/hacs_repository/?owner=MilesTEG1&repository=HALO-Button-Card&category=plugin
[antigravity-shield]: https://img.shields.io/badge/Co--Développé%20avec-Google%20DeepMind%20Antigravity-4285F4?logo=google&logoColor=white

[English 🇬🇧](README.md) | **Français 🇫🇷** | [Documentation Wiki 📖](https://github.com/MilesTEG1/HALO-Button-Card/wiki)

![HALO Button Card — Tableau de bord Liquid Glass](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/01-hero-dashboard-volets.png)

---

## 💎 Présentation Générale

**HALO Button Card** est une suite de cartes Lovelace clé en main et open-source pour [Home Assistant](https://www.home-assistant.io/). Conçue autour de la philosophie visuelle **Liquid Glass / HALO**, elle allie le raffinement du glassmorphism translucide à des bordures lumineuses dynamiques réactives à l'état des appareils (**HALO**).

Contrairement aux configurations lourdes basées sur de multiples modèles YAML dépassant 50 lignes par tuile, les cartes HALO sont des **Web Components natifs** intégrant un **Éditeur Visuel Complet (`<ha-form>`)**. Aucune écriture manuelle de code YAML n'est requise, tout en conservant une flexibilité déclarative totale pour les utilisateurs avancés.

---

## ✨ Points Forts & Fonctionnalités

- 🧊 **Esthétique Liquid Glass** : Effet de flou translucide en arrière-plan (`16px saturate(180%)`), dégradés sombres d'obsidienne et bordures spéculaires discrètes.
- 🌈 **Halo Lumineux Dynamique** : Halo coloré en trois couches réagissant instantanément aux changements d'état physique des entités.
- 🪟 **Pilote de Volets Intelligent (`halo-cover-card`)** : Algorithme asynchrone intégré pour micromodules Zigbee (NodOn, etc.) assurant l'estimation de course en continu et des micro-boutons de commande fiables.
- 💡 **Contrôle d'Éclairage Intuitif (`halo-light-card`)** : Tuile d'éclairage unifiée avec slider de luminosité Liquid Glass, halo teinté selon la couleur réelle de l'ampoule (RGB / Kelvin) et micro-boutons réactifs.
- 📑 **Séparateurs de Sections Néon (`halo-separator-card`)** : Séparateur visuel élégant avec icône, titre givré et ligne néon dégradée continue.
- 🎨 **Éditeur Graphique Complet (Zéro YAML)** : Formulaire visuel officiel Home Assistant (`<ha-form>`) avec sélecteur d'entités, recherche d'icônes MDI et **Roue Chromatique 2D avec réglage RVB et code Hexadécimal**.
- ⚡ **Architecture en DOM Persistant** : Zéro clignotement lors des rafraîchissements et réactivité tactile garantie à 100 %.
- 🧩 **Moteur de Thèmes en Cascade** : Fonctionnement immédiat "Plug & Play" sans aucun helper obligatoire, avec synchronisation optionnelle par `input_select`.

---

## 🎨 Palette d'États et Halos Lumineux

Chaque état dispose d'un halo coloré distinctif, illustré ici avec les couleurs personnalisées du banc d'essai :

| État | Position / Statut | Exemple de Couleur | Rendu Visuel |
| :--- | :--- | :---: | :---: |
| **Fermé** | Position `0 %` | `#e2e8f0` | ![Volet Fermé](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/02-state-closed.png) |
| **Ouvert** | Position `100 %` | `#6ad2e6` | ![Volet Ouvert](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/03-state-open.png) |
| **Partiel** | Position `1 % à 99 %` | `#d4fb78` | ![Volet Partiel](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/04-state-partial.png) |
| **En mouvement** | Course en montée ou descente | `#f59e0b` | ![Volet en Mouvement](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/05-state-moving.png) |

---

## 📱 Expérience Mobile & Ergonomie Tactile

Les cartes HALO ont été conçues dès l'origine pour une manipulation tactile fluide et une densité d'information optimale sur smartphone, tablette et écran mural tactile :

![Aperçu mobile HALO Button Card](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/10-mobile-view-volets.png)

- **Hauteur calibrée (68 px)** : Encombrement vertical constant éliminant les sauts d'affichage (*layout shifts*) en vue `sections` ou `grid`.
- **Micro-boutons tactiles dédiés** : Zones d'appui ergonomiques pour les commandes Descendre, Arrêter et Monter avec retour tactile instantané.
- **Contraste Liquid Glass étudié** : Typographie blanche givrée et halo lumineux garantissant une lisibilité maximale de jour comme de nuit.

---

## 📦 Installation

### Méthode 1 : Via HACS (Recommandé)

[![Ouvrir votre instance Home Assistant et ouvrir le dépôt dans le Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=MilesTEG1&repository=HALO-Button-Card&category=plugin)

#### Ajout manuel du dépôt personnalisé HACS :
1. Ouvrez **HACS** dans votre interface Home Assistant.
2. Cliquez sur les trois petits points verticaux (**⋮**) en haut à droite puis sur **Dépôts personnalisés** (*Custom repositories*).
3. Renseignez les informations :
   - **Dépôt** : `https://github.com/MilesTEG1/HALO-Button-Card`
   - **Type** : `Dashboard`
4. Recherchez **HALO Button Card**, cliquez sur **Télécharger**, puis validez.
5. Rafraîchissez votre navigateur (`Ctrl + F5` ou `Cmd + Shift + R`).

### Méthode 2 : Installation Manuelle

1. Téléchargez le fichier `dist/halo-button-card.js` depuis la section [Releases GitHub](https://github.com/MilesTEG1/HALO-Button-Card/releases).
2. Déposez-le dans le répertoire `/config/www/` de votre Home Assistant.
3. Ajoutez la ressource dans **Paramètres ➔ Tableaux de bord ➔ Ressources** :
   - **URL** : `/local/halo-button-card.js`
   - **Type de ressource** : `Module JavaScript`

---

## 🛠️ Utilisation et Exemples de Cartes

### 1. `custom:halo-cover-card`

Tuile prête à l'emploi pour volets roulants et groupes avec suivi de position, barre de progression dynamique et boutons Descendre / Arrêter / Monter.

```yaml
type: custom:halo-cover-card
entity: cover.volet_roulant_salon
name: Salon
color_closed: '#e2e8f0'
color_open: '#6ad2e6'
color_partial: '#d4fb78'
color_moving: '#f59e0b'
```

#### Options de Configuration Disponibles :

| Propriété | Type | Défaut | Description |
| :--- | :---: | :---: | :--- |
| `entity` | `string` | **Obligatoire** | Entité volet (`cover.*`) ou groupe de volets. |
| `name` | `string` | *friendly_name* | Nom d'affichage personnalisé. |
| `color_closed` | `string` | `#FFB69C` | Couleur du halo lorsque le volet est fermé. |
| `color_open` | `string` | `#96E1FF` | Couleur du halo lorsque le volet est ouvert. |
| `color_partial`| `string` | `#38bdf8` | Couleur du halo en position intermédiaire. |
| `color_moving` | `string` | `#f59e0b` | Couleur du halo pendant le déplacement. |

---

### 2. `custom:halo-light-card`

Tuile d'éclairage unifiée clé en main avec jauge de luminosité en temps réel, détection de la couleur réelle de l'ampoule (RGB / Kelvin) et micro-commandes adaptatives.

```yaml
type: custom:halo-light-card
entity: light.plafonnier_salon
name: Plafonnier Salon
use_light_color: true
show_slider: true
```

#### Options de Configuration Disponibles :

| Propriété | Type | Défaut | Description |
| :--- | :---: | :---: | :--- |
| `entity` | `string` | **Obligatoire** | Entité lumière (`light.*`) ou groupe d'éclairages. |
| `name` | `string` | *friendly_name* | Nom d'affichage personnalisé. |
| `icon` | `string` | *auto* | Icône MDI personnalisée (`mdi:lightbulb` / `mdi:lightbulb-outline`). |
| `use_light_color` | `boolean` | `true` | Teinte dynamiquement le halo et les accents avec la couleur réelle RGB ou Kelvin émise. |
| `color_on` | `string` | *thème* | Couleur de la tuile allumée (si `use_light_color` est désactivé). |
| `color_off` | `string` | `#64748b` | Couleur de la tuile éteinte. |
| `theme_entity` | `string` | *auto* | Entité optionnelle `input_select` pilotant la couleur de vue/thème. |
| `show_slider` | `boolean` | `true` | Affiche la jauge de luminosité interactive (si dimmable). |
| `show_brightness_btn` | `boolean` | `true` | Affiche le micro-bouton de cycle rapide de luminosité (30% -> 67% -> 100%). |
| `show_temp_btn` | `boolean` | `true` | Affiche le micro-bouton de cycle rapide de température Kelvin (2700K -> 4000K -> 5500K). |
| `show_power_btn` | `boolean` | `true` | Affiche le micro-bouton instantané Marche / Arrêt. |

---

### 3. `custom:halo-separator-card`

Remplace avantageusement les anciens modèles YAML de séparation par un composant Web natif léger.

```yaml
type: custom:halo-separator-card
name: Rez-de-chaussée
icon: mdi:home-floor-0
color: '#26c6da'
```

#### Options de Configuration Disponibles :

| Propriété | Type | Défaut | Description |
| :--- | :---: | :---: | :--- |
| `name` | `string` | `Section` | Titre de la section. |
| `icon` | `string` | `mdi:bookmark`| Icône MDI d'en-tête. |
| `color` | `string` | `#26c6da` | Couleur de la ligne néon dégradée (Hex ou nom de palette HALO). |
| `theme_entity` | `string` | *auto* | Entité optionnelle `input_select` pilotant la couleur de vue. |
| `collapsible` | `boolean` | `false` | Active le bouton pill escamotable (*Masquer ⌃* / *Afficher ⌄*) et le volet accordéon. |
| `initial_collapsed` | `boolean` | `false` | Initialement masqué / replié si activé. |
| `label_on` | `string` | `Masquer` | Libellé du bouton quand le volet est ouvert. |
| `label_off` | `string` | `Afficher` | Libellé du bouton quand le volet est replié. |
| `toggle_entity` | `string` | *optionnel* | Entité `input_boolean` synchronisée avec le bouton de bascule. |
| `legend_items` | `boolean` / `array` | *auto* | Active la grille standard 2x2 du Guide des Boutons (Icône gauche, % luminosité, Kelvin, Nom tuile) ou accepte un tableau personnalisé d'éléments. |

---

### 4. `custom:halo-button-card`

Bouton multi-usage universel Liquid Glass avec halo spéculaire, remplaçant avantageusement les templates complexes `custom:button-card`.

```yaml
# Exemple 1 : Carte large horizontale (Extinction générale)
type: custom:halo-button-card
name: Éteindre Toutes les Lumières
label: Extinction globale de l'ensemble des pièces
icon: mdi:lightbulb-off
color: Orange Flamme # ou #ff5a1f
layout: horizontal
tap_action:
  action: call-service
  service: light.turn_off
  target:
    entity_id:
      - light.lumieres_tv
      - light.lumiere_canape
      - light.lumieres_bureau
  confirmation:
    text: "⚠️ Confirmer l'extinction de toutes les lumières de la maison ?"
```

```yaml
# Exemple 2 : Bouton d'ambiance vertical carré
type: custom:halo-button-card
name: Ambiance Cinéma
label: Salon TV (40% • 2200K)
icon: mdi:movie-open
color: Cyan
layout: vertical
tap_action:
  action: call-service
  service: scene.turn_on
  target:
    entity_id: scene.salon_cinema
```

#### Options de Configuration Disponibles :

| Propriété | Type | Défaut | Description |
| :--- | :---: | :---: | :--- |
| `name` / `title` | `string` | *optionnel* | Titre principal du bouton. |
| `label` / `subtitle` | `string` | *optionnel* | Sous-titre ou description atténuée. |
| `icon` | `string` | `mdi:gesture-tap-button` | Icône MDI affichée dans le bouton carré Liquid Glass. |
| `layout` | `string` | `horizontal` | Disposition : `horizontal` (large) ou `vertical` (ambiance compacte). |
| `text_align` | `string` | *auto* | Alignement : `left`, `center`, `right` (`left` par défaut en horizontal, `center` en vertical). |
| `color` / `halo_color` | `string` | *thème* | Couleur de l'icône, du bouton et du halo spéculaire (nom HALO ou Hex). |
| `entity` | `string` | *optionnel* | Entité liée optionnelle (pour état, nom ou bascule). |
| `tap_action` | `object` | *toggle* | Action au clic simple sur la carte. |
| `hold_action` | `object` | *none* | Action au clic long (500 ms) sur la carte. |
| `double_tap_action` | `object` | *none* | Action au double appui rapide sur la carte. |
| `icon_tap_action` | `object` | *optionnel* | Action dissociée exclusive au clic sur le bouton de l'icône. |
| `sub_buttons` | `array` | *aucun* | Tableau de sous-boutons intégrés (`icon`, `badge`, `color`, `tap_action`, etc.). |

---

### 5. `custom:halo-cover-color-card`

Carte prête à l'emploi reproduisant la grille 2×2 des couleurs d'états des volets (*Volet Fermé*, *Volet Partiel*, *Volet Ouvert*, *Mouvement*).

```yaml
type: custom:halo-cover-color-card
title: "Couleurs d'États des Volets"
icon: mdi:window-shutter-cog
closed_entity: input_text.couleur_volet_ferme
partial_entity: input_text.couleur_volet_partiel
open_entity: input_text.couleur_volet_ouvert
moving_entity: input_text.couleur_volet_en_mouvement
```

---

### 6. `custom:halo-palette-card`

Nuancier interactif officiel des 16 teintes HALO en grille 2 colonnes × 8 lignes avec halo spéculaire et badge de sélection active ✓.

```yaml
type: custom:halo-palette-card
entity: input_select.couleur_theme_eclairages
columns: 2
```

---

## 🖥️ Configuration Graphique (Zéro YAML)

Toutes les cartes de la collection intègrent un éditeur visuel complet basé sur le composant officiel `<ha-form>` de Home Assistant. Aucune ligne de code YAML n'est requise pour configurer ou personnaliser vos tuiles.

### 🔍 Découverte Native dans le Sélecteur de Cartes

Les composants s'enregistrent automatiquement dans `window.customCards` avec aperçu en direct dans la boîte de dialogue officielle d'ajout de carte :

![Découverte des cartes HALO dans Lovelace](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/09-card-picker-discovery.png)

### 🎛️ Éditeurs Visuels et Roue Chromatique 2D

La personnalisation visuelle se fait entièrement à la souris ou au doigt :

![Éditeur de la carte Volet](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/06-editor-cover-card-general.png)

![Dialogue de la roue chromatique 2D](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/07-editor-cover-color-wheel.png)

1. **Éditeur de la Carte Volet (`halo-cover-card`)** : Sélection d'entités `cover` ou de groupes avec filtrage automatique de domaine, personnalisation des noms et réglage fin des couleurs d'état.
2. **Roue Chromatique 2D Haute Précision** : Cliquez sur n'importe quel champ de couleur pour ouvrir le sélecteur natif Home Assistant avec spectre 2D de saturation, curseur d'intensité lumineuse, canaux primaires RVB (0 à 255) et saisie directe de code Hexadécimal.

### 📑 Éditeur du Séparateur de Section (`halo-separator-card`)

![Éditeur du séparateur de section](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/08-editor-separator-card.png)

- **Titre de la section** : Libellé blanc givré semi-gras.
- **Sélecteur interactif d'icônes** : Recherche instantanée dans la bibliothèque Material Design Icons (`mdi:...`).
- **Couleur néon d'accentuation** : Sélecteur direct de la teinte du dégradé lumineux.
- **Liaison thématique** : Menu déroulant filtré sur les `input_select` pour synchroniser dynamiquement la ligne avec un thème de vue.

---

## 👥 Auteurs et Co-Ingénierie

Ce projet est le fruit d'une co-ingénierie collaborative entre direction architecturale humaine et exécution agentique autonome :

- 👤 **Architecte & Lead** : **Pierrick (MilesTEG1)** — Vision du projet, design UI/UX HALO, validation et intégration matérielle en conditions réelles.
- 🤖 **Co-Ingénieur** : **IDA / Agent Antigravity (Google DeepMind)** — Architecture Web Components TypeScript, moteur de rendu persistant et algorithmes asynchrones NodOn Zigbee.

### 🙏 Inspirations et Remerciements

Nous tenons à saluer la paternité des idées ayant inspiré la genèse de cette suite :
- **[Kaaribou](https://github.com/kaaribou)** et ses cartes **HOLM** pour l'inspiration esthétique initiale (*Liquid Glass*, glassmorphism sombre et halos lumineux).
- **[RomRider](https://github.com/custom-cards/button-card)** et l'incontournable **[`custom:button-card`](https://github.com/custom-cards/button-card)**, qui a servi de socle de prototypage initial avant la réécriture intégrale de nos cartes en Web Components TypeScript natifs autonomes.

---

## 📄 Licence

Ce projet est distribué sous **Licence MIT** — consultez le fichier [LICENSE](LICENSE) pour plus de détails.
