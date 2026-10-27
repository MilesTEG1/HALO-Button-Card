# 🌟 HALO Button Card

<p align="center">
  <img src="docs/screenshots/01-hero-dashboard-volets.png" alt="HALO Button Card — Tableau de bord Liquid Glass" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/hacs/default"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge" alt="HACS Custom" /></a>
  <a href="https://github.com/MilesTEG1/HALO-Button-Card/releases"><img src="https://img.shields.io/github/v/release/MilesTEG1/HALO-Button-Card?style=for-the-badge&color=26c6da" alt="Release GitHub" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="Licence : MIT" /></a>
  <img src="https://img.shields.io/badge/Co--Développé%20avec-Google%20DeepMind%20Antigravity-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Co-développé avec Antigravity" />
</p>

<p align="center">
  <a href="README.md">English 🇬🇧</a> | <b>Français 🇫🇷</b> | <a href="https://github.com/MilesTEG1/HALO-Button-Card/wiki">Documentation Wiki 📖</a>
</p>

---

## 💎 Présentation Générale

**HALO Button Card** est une suite de cartes Lovelace clé en main et open-source pour [Home Assistant](https://www.home-assistant.io/). Inspirée par la philosophie visuelle **Liquid Glass / HOLM**, elle allie le raffinement du glassmorphism translucide à des bordures lumineuses dynamiques réactives à l'état des appareils (**HALO**).

Contrairement aux configurations lourdes basées sur de multiples modèles YAML dépassant 50 lignes par tuile, les cartes HALO sont des **Web Components natifs** intégrant un **Éditeur Visuel Complet (`<ha-form>`)**. Aucune écriture manuelle de code YAML n'est requise, tout en conservant une flexibilité déclarative totale pour les utilisateurs avancés.

---

## ✨ Points Forts & Fonctionnalités

- 🧊 **Esthétique Liquid Glass** : Effet de flou translucide en arrière-plan (`16px saturate(180%)`), dégradés sombres d'obsidienne et bordures spéculaires discrètes.
- 🌈 **Halo Lumineux Dynamique** : Halo coloré en trois couches réagissant instantanément aux changements d'état physique des entités.
- 🪟 **Pilote de Volets Intelligent (`halo-cover-card`)** : Algorithme asynchrone intégré pour micromodules Zigbee (NodOn, etc.) assurant l'estimation de course en continu et des micro-boutons de commande fiables.
- 📑 **Séparateurs de Sections Néon (`halo-separator-card`)** : Séparateur visuel élégant avec icône, titre givré et ligne néon dégradée continue.
- 🎨 **Éditeur Graphique Complet (Zéro YAML)** : Formulaire visuel officiel Home Assistant (`<ha-form>`) avec sélecteur d'entités, recherche d'icônes MDI et **Roue Chromatique 2D avec réglage RVB et code Hexadécimal**.
- ⚡ **Architecture en DOM Persistant** : Zéro clignotement lors des rafraîchissements et réactivité tactile garantie à 100 %.
- 🧩 **Moteur de Thèmes en Cascade** : Fonctionnement immédiat "Plug & Play" sans aucun helper obligatoire, avec synchronisation optionnelle par `input_select`.

---

## 🎨 Palette d'États et Halos Lumineux

Chaque état dispose d'un halo coloré distinctif, illustré ici avec les couleurs personnalisées du banc d'essai :

| État | Position / Statut | Exemple de Couleur | Rendu Visuel |
| :--- | :--- | :---: | :---: |
| **Fermé** | Position `0 %` | `#e2e8f0` | <img src="docs/screenshots/02-state-closed.png" alt="Volet Fermé" width="280"/> |
| **Ouvert** | Position `100 %` | `#6ad2e6` | <img src="docs/screenshots/03-state-open.png" alt="Volet Ouvert" width="280"/> |
| **Partiel** | Position `1 % à 99 %` | `#d4fb78` | <img src="docs/screenshots/04-state-partial.png" alt="Volet Partiel" width="280"/> |
| **En mouvement** | Course en montée ou descente | `#f59e0b` | <img src="docs/screenshots/05-state-moving.png" alt="Volet en Mouvement" width="280"/> |

---

## 📦 Installation

### Méthode 1 : Via HACS (Recommandé)

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

### 2. `custom:halo-separator-card`

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
| `color` | `string` | `#26c6da` | Couleur de la ligne néon dégradée (Hex ou nom de palette HOLM). |
| `theme_entity` | `string` | *auto* | Entité optionnelle `input_select` pilotant la couleur de vue. |

---

## 🖥️ Configuration Graphique (Zéro YAML)

Toutes les cartes de la collection s'éditent graphiquement sans toucher au code :

1. En mode édition de votre tableau de bord, cliquez sur **Ajouter une carte**.
2. Choisissez **HALO Cover Card** ou **HALO Separator Card**.
3. Sélectionnez vos entités dans la liste déroulante et personnalisez les libellés.
4. Cliquez sur n'importe quel champ de couleur pour ouvrir la **Roue chromatique 2D**, régler la luminosité, les primaires RVB ou coller un code Hexadécimal.

---

## 👥 Auteurs et Co-Ingénierie

Ce projet est le fruit d'une co-ingénierie collaborative entre direction architecturale humaine et exécution agentique autonome :

- 👤 **Architecte & Lead** : **Pierrick (MilesTEG1)** — Vision du projet, design UI/UX HOLM, validation et intégration matérielle en conditions réelles.
- 🤖 **Co-Ingénieur** : **IDA / Agent Antigravity (Google DeepMind)** — Architecture Web Components TypeScript, moteur de rendu persistant et algorithmes asynchrones NodOn Zigbee.

---

## 📄 Licence

Ce projet est distribué sous **Licence MIT** — consultez le fichier [LICENSE](LICENSE) pour plus de détails.
