# 🌟 HALO Button Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/default)
[![GitHub release](https://img.shields.io/github/v/release/MilesTEG1/HALO-Button-Card?style=for-the-badge)](https://github.com/MilesTEG1/HALO-Button-Card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**HALO Button Card** is a premium, turnkey Lovelace card suite for [Home Assistant](https://www.home-assistant.io/), crafted with a refined **Liquid Glass / HOLM** visual aesthetic and dynamic ambient **HALO** glow effects.

---

## ✨ Features

- 💎 **Liquid Glass UI**: Frosted glassmorphism, dark obsidian/slate gradients, and subtle specular borders.
- 🌈 **Dynamic Halo Glow**: Real-time ambient glow responding to entity states and custom theme palettes.
- 🪟 **Smart Cover Engine**: Integrated asynchronous movement estimation and position tracking (`_voletHelper`).
- 💡 **Multi-Control Light Tiles**: 4-in-1 compact control cards with sub-buttons and brightness sliders.
- 🚪 **Binary Sensors & Alerts**: High-contrast status badges for doors, windows, and security groups.
- 🚀 **Zero Dependency**: Standalone custom element suite with full button-card engine built-in.
- 📱 **Mobile-First Responsive**: Optimized for touch interactions, tablet wall-mounts, and desktop browsers.

---

## 📦 Installation

### Via HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Add repository:
   - **Repository**: `https://github.com/MilesTEG1/HALO-Button-Card`
   - **Category**: `Dashboard`
4. Click **Download**, then reload your browser resources.

### Manual Installation

1. Download `halo-button-card.js` from the [latest release](https://github.com/MilesTEG1/HALO-Button-Card/releases).
2. Place it in your Home Assistant `/config/www/` folder.
3. Add the resource in **Settings ➔ Dashboards ➔ Resources**:
   - URL: `/local/halo-button-card.js`
   - Type: `JavaScript Module`

---

## 🛠️ Usage & Card Types

HALO Button Card provides ready-to-use custom elements:

- `type: custom:halo-cover-card` : Intelligent roller shutter card with position tracking and micro-controls.
- `type: custom:halo-light-card` : Ambient lighting tile with brightness and sub-scene toggles.
- `type: custom:halo-binary-card`: Security opening status (windows, doors, locks).
- `type: custom:halo-separator-card`: Frosted divider with integrated section icons and gradient accent line.
- `type: custom:halo-button-card`: Base versatile tile with halo effect.

---

## 📜 Credits & License

- Author: **MilesTEG1**
- License: **MIT**
- Built on top of the exceptional foundation laid by [custom-cards/button-card](https://github.com/custom-cards/button-card).
