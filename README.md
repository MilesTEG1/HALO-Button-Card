# HALO Button Card by [@MilesTEG1](https://github.com/MilesTEG1) <!-- omit in toc -->

[![Stable][releases-shield]][releases] [![Beta][releases-dev-shield]][releases-dev] [![HACS Badge][hacs-badge]][hacs-link] ![Project Maintenance][maintenance-shield] <br/> ![Downloads][downloads] [![GitHub Activity][commits-shield]][commits] [![License][license-shield]](LICENSE) ![Co-Engineered with Antigravity][antigravity-shield]

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
[antigravity-shield]: https://img.shields.io/badge/Co--Engineered%20with-Google%20DeepMind%20Antigravity-4285F4?logo=google&logoColor=white

**English** | [Français 🇫🇷](README.fr.md) | [Wiki Documentation 📖](https://github.com/MilesTEG1/HALO-Button-Card/wiki)

![HALO Button Card — Liquid Glass Dashboard](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/01-hero-dashboard-volets.png)

---

## 💎 Overview

**HALO Button Card** is an open-source, turnkey Lovelace card collection for [Home Assistant](https://www.home-assistant.io/). Built around the **Liquid Glass / HALO** visual design philosophy, it blends translucent glassmorphism with dynamic, state-reactive glowing **HALO** borders.

Unlike complex multi-template setups requiring 50+ lines of YAML per tile, HALO cards are **native Web Components** with complete **Visual UI Editor (`<ha-form>`)** support. No manual YAML is required, while power users retain full declarative flexibility.

---

## ✨ Key Features

- 🧊 **Liquid Glass Aesthetic**: Translucent frosted backdrop blur (`16px saturate(180%)`), deep obsidian gradients, and delicate specular borders.
- 🌈 **Ambient Glowing Halo**: Dynamic 3-stage colored glow that actively reflects device states.
- 🪟 **Smart Cover Control (`halo-cover-card`)**: Built-in NodOn/Zigbee asynchronous movement algorithm with accurate travel estimations and responsive micro-controls.
- 💡 **Smart Lighting Control (`halo-light-card`)**: Turnkey lighting tile with fluid Liquid Glass brightness slider, real-time RGB/Kelvin halo tinting, and adaptive micro-buttons.
- 📑 **Neon Section Dividers (`halo-separator-card`)**: Sleek title and icon section divider with a continuous neon accent line.
- 🎨 **Full Visual No-YAML Editor**: Intuitive card configuration powered by Home Assistant's native `<ha-form>`, featuring entity pickers, MDI icon search, and a complete **2D RGB Color Wheel**.
- ⚡ **Zero-Flicker Persistent DOM**: High-performance architecture ensuring 100% click reliability and instantaneous touch response.
- 🧩 **Cascading Theme Engine**: Out-of-the-box operation with zero required helpers, plus optional synchronization with view or dashboard `input_select` entities.

---

## 🎨 Dynamic State Colors

Each card state is highlighted by an ambient glow, illustrated below using custom palette values:

| State | Status | Sample Color | Visual Preview |
| :--- | :--- | :---: | :---: |
| **Closed** | Position `0%` | `#e2e8f0` | ![Volet Fermé](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/02-state-closed.png) |
| **Open** | Position `100%` | `#6ad2e6` | ![Volet Ouvert](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/03-state-open.png) |
| **Partial** | Position `1% - 99%` | `#d4fb78` | ![Volet Partiel](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/04-state-partial.png) |
| **Moving** | Opening / Closing travel | `#f59e0b` | ![Volet en Mouvement](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/05-state-moving.png) |

---

## 📱 Mobile Experience & Responsive Layout

HALO cards are engineered from the ground up for high-density, touch-optimized interaction across smartphones, tablets, and wall-mounted dashboards:

![HALO Button Card Mobile View](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/10-mobile-view-volets.png)

- **Calibrated Height (68px)**: Consistent tile footprint preventing layout shifts and flickering in Lovelace `sections` or `grid` views.
- **Finger-Friendly Micro-Controls**: Distinct touch zones for Down, Stop, and Up commands with instant tactile feedback.
- **Glassmorphic Contrast**: Readable white frosted typography and ambient halos that maintain high legibility even under direct ambient lighting.

---

## 📦 Installation

### Option 1: Via HACS (Recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=MilesTEG1&repository=HALO-Button-Card&category=plugin)

#### Manual HACS repository addition:
1. Open **HACS** in your Home Assistant instance.
2. Click the three dots menu (**⋮**) in the top right corner and choose **Custom repositories**.
3. Add the repository:
   - **Repository**: `https://github.com/MilesTEG1/HALO-Button-Card`
   - **Type**: `Dashboard`
4. Search for **HALO Button Card**, click **Download**, and confirm.
5. Reload your browser window (`Ctrl + F5` or `Cmd + Shift + R`).

### Option 2: Manual Installation

1. Download `dist/halo-button-card.js` from the [Latest Release](https://github.com/MilesTEG1/HALO-Button-Card/releases).
2. Copy `halo-button-card.js` into your Home Assistant directory: `<config>/www/halo-button-card.js`.
3. In Home Assistant, navigate to **Settings ➔ Dashboards ➔ Resources** (three dots top right).
4. Add a new resource:
   - **URL**: `/local/halo-button-card.js`
   - **Resource type**: `JavaScript Module`

---

## 🛠️ Card Usage & Examples

### 1. `custom:halo-cover-card`

Turnkey roller shutter tile with real-time status tracking, travel progress bar, and Down / Stop / Up action controls.

```yaml
type: custom:halo-cover-card
entity: cover.living_room_shutter
name: Living Room
color_closed: '#e2e8f0'
color_open: '#6ad2e6'
color_partial: '#d4fb78'
color_moving: '#f59e0b'
```

#### Supported Configuration Options:

| Field | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `entity` | `string` | **Required** | Target `cover` entity or `cover` group. |
| `name` | `string` | *friendly_name* | Custom card display label. |
| `color_closed` | `string` | `#FFB69C` | Halo & accent color when completely closed. |
| `color_open` | `string` | `#96E1FF` | Halo & accent color when completely open. |
| `color_partial`| `string` | `#38bdf8` | Halo & accent color at intermediate positions. |
| `color_moving` | `string` | `#f59e0b` | Halo & accent color while actively traveling. |

---

### 2. `custom:halo-light-card`

Unified turnkey lighting tile with real-time brightness slider, live Kelvin / RGB color detection, and adaptive micro-controls.

```yaml
type: custom:halo-light-card
entity: light.living_room_ceiling
name: Living Room Ceiling
use_light_color: true
show_slider: true
```

#### Supported Configuration Options:

| Field | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `entity` | `string` | **Required** | Target `light` entity or `light` group. |
| `name` | `string` | *friendly_name* | Custom card display label. |
| `icon` | `string` | *auto* | Custom MDI icon (`mdi:lightbulb` / `mdi:lightbulb-outline`). |
| `use_light_color` | `boolean` | `true` | Dynamically tints the halo and accents with the bulb's real RGB or Kelvin color. |
| `color_on` | `string` | *theme* | Halo & accent color when turned on (if `use_light_color` is false). |
| `color_off` | `string` | `#64748b` | Halo & accent color when turned off. |
| `theme_entity` | `string` | *auto* | Optional `input_select` entity driving view/dashboard colors. |
| `show_slider` | `boolean` | `true` | Shows interactive brightness slider (if dimmable). |
| `show_brightness_btn` | `boolean` | `true` | Shows rapid brightness cycle micro-button (30% -> 67% -> 100%). |
| `show_temp_btn` | `boolean` | `true` | Shows rapid Kelvin temperature cycle micro-button (2700K -> 4000K -> 5500K). |
| `show_power_btn` | `boolean` | `true` | Shows instant Power On/Off micro-button. |

---

### 3. `custom:halo-separator-card`

Replaces complex custom template dividers with a sleek native Web Component.

```yaml
type: custom:halo-separator-card
name: Ground Floor
icon: mdi:home-floor-0
color: '#26c6da'
```

#### Supported Configuration Options:

| Field | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `name` | `string` | `Section` | Section title. |
| `icon` | `string` | `mdi:bookmark`| Section leading MDI icon. |
| `color` | `string` | `#26c6da` | Neon gradient accent color (Hex or HALO palette name). |
| `theme_entity` | `string` | *auto* | Optional `input_select` entity driving view/dashboard colors. |
| `collapsible` | `boolean` | `false` | Enables collapsible drawer and pill toggle button (*Hide ⌃* / *Show ⌄*). |
| `initial_collapsed` | `boolean` | `false` | Initially collapsed/hidden when collapsible is true. |
| `label_on` | `string` | `Hide` | Button label when drawer is expanded. |
| `label_off` | `string` | `Show` | Button label when drawer is collapsed. |
| `toggle_entity` | `string` | *optional* | `input_boolean` entity synchronized with the toggle button. |
| `legend_items` | `boolean` / `array` | *auto* | Displays standard 2x2 Button Guide grid or accepts custom items array. |

---

### 4. `custom:halo-button-card`

Universal Liquid Glass multi-purpose button card with specular halo, flexible horizontal/vertical layouts, decoupled actions and interactive sub-buttons.

```yaml
# Example 1: Wide horizontal button card (Master light toggle)
type: custom:halo-button-card
name: Turn Off All Lights
label: Global extinction for all rooms
icon: mdi:lightbulb-off
color: Orange Flamme
layout: horizontal
tap_action:
  action: call-service
  service: light.turn_off
  target:
    entity_id:
      - light.living_room
      - light.office
  confirmation:
    text: "⚠️ Confirm turning off all lights in the home?"
```

```yaml
# Example 2: Compact vertical mood button card
type: custom:halo-button-card
name: Cinema Mood
label: TV Room (40% • 2200K)
icon: mdi:movie-open
color: Cyan
layout: vertical
tap_action:
  action: call-service
  service: scene.turn_on
  target:
    entity_id: scene.living_room_cinema
```

---

### 5. `custom:halo-cover-color-card`

Turnkey 2×2 grid card for configuring shutter state colors (*Closed*, *Partial*, *Open*, *Moving*) with glowing dots and state icons.

```yaml
type: custom:halo-cover-color-card
title: "Cover State Colors"
icon: mdi:window-shutter-cog
closed_entity: input_text.couleur_volet_ferme
partial_entity: input_text.couleur_volet_partiel
open_entity: input_text.couleur_volet_ouvert
moving_entity: input_text.couleur_volet_en_mouvement
```

---

### 6. `custom:halo-palette-card`

Official HALO 16-color theme palette selector in a responsive 2×8 grid with active check badges and instant `input_select` synchronization.

```yaml
type: custom:halo-palette-card
entity: input_select.couleur_theme_eclairages
columns: 2
```

---

## 🖥️ Graphical UI Configuration (No YAML Needed)

Every card in the suite includes an integrated graphical editor built on Home Assistant's native `<ha-form>`. Power users can still write raw YAML, but visual configuration is 100% supported out of the box.

### 🔍 Interactive Card Discovery

HALO cards register with `window.customCards` for seamless discovery in the native Home Assistant card picker:

![HALO Cards in Lovelace Card Picker](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/09-card-picker-discovery.png)

### 🎛️ Visual Editors & Precision 2D Color Wheel

Configuring cards is completely visual—no need to memorize configuration keys or write hex codes manually:

![Cover Card Editor](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/06-editor-cover-card-general.png)

![2D Color Wheel Dialog](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/07-editor-cover-color-wheel.png)

1. **Cover Card Editor (`halo-cover-card`)**: Select target `cover` entities or groups with automatic domain filtering, customize labels, and tune individual state colors.
2. **Precision 2D Color Wheel**: Tap any color swatch to launch Home Assistant's native 2D color picker with hue/saturation navigation, brightness slider, discrete RGB primary channels (0-255), and hexadecimal inputs.

### 📑 Section Divider Editor (`halo-separator-card`)

![Separator Card Editor](https://raw.githubusercontent.com/MilesTEG1/HALO-Button-Card/main/docs/screenshots/08-editor-separator-card.png)

- **Section Title**: Frosted typography heading.
- **Interactive Icon Picker**: Live Material Design Icons search (`mdi:...`).
- **Gradient Accent Color**: Dynamic neon line color selector.
- **Theme Binding**: Optional `input_select` dropdown selector to sync divider tones across dashboard views.

---

## 👥 Authors & Co-Engineering

This project is co-engineered through pair-programming between human architectural direction and autonomous AI agent execution:

- 👤 **Architect & Lead**: **Pierrick (MilesTEG1)** — Project vision, UI/UX HALO styling, validation, and real-world hardware integration.
- 🤖 **Co-Engineer**: **IDA / Antigravity Agent (Google DeepMind)** — TypeScript Web Components architecture, persistent DOM performance engine, and NodOn Zigbee travel algorithms.

### 🙏 Acknowledgments & Inspirations

Special thanks to the projects that inspired the initial concept of this card suite:
- **[Kaaribou](https://github.com/kaaribou)** and his **HOLM** cards for the initial *Liquid Glass* visual inspiration, dark glassmorphism aesthetics, and glowing accents.
- **[RomRider](https://github.com/custom-cards/button-card)** and the iconic **[`custom:button-card`](https://github.com/custom-cards/button-card)**, which served as our original prototyping foundation before re-engineering the entire suite into standalone native TypeScript Web Components.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
