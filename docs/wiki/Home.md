# 🏠 Welcome to the HALO Button Card Wiki

**HALO Button Card** is an advanced open-source card suite for [Home Assistant](https://www.home-assistant.io/), crafted with a refined **Liquid Glass / HOLM** aesthetic, dynamic ambient halos, and zero YAML requirement.

---

## 📑 Wiki Documentation Index

1. [Architecture & Algorithme Asynchrone de Course](Architecture-and-Shutter-Engine.md)
   - Comment fonctionne l'algorithme `_voletHelper` pour les micromodules Zigbee (NodOn SIN-4-RS-20).
   - Gestion des temps de grâce, de la gigue de trames et de la fin de course déterministe.
2. [Moteur de Thèmes en Cascade](Cascading-Theme-Engine.md)
   - Résolution descendante des couleurs (Carte $\rightarrow$ Vue $\rightarrow$ Dashboard $\rightarrow$ Palette HOLM par défaut).
   - Utilisation sans aucun helper (`input_select`) obligatoire pour une distribution HACS simplifiée.
3. [Architecture en DOM Persistant](Persistent-DOM-Architecture.md)
   - Explication de l'élimination des clignotements et fiabilisation des clics à 100 %.
   - Différence avec les composants standard basés sur `innerHTML`.
4. [Guide de Configuration No-YAML](Visual-UI-Configuration.md)
   - Utilisation de l'éditeur `<ha-form>` avec roue chromatique 2D et sélecteurs de domaines.

---

## 👥 Co-Engineering Attribution

- 👤 **Architect & Lead**: **Pierrick (MilesTEG1)** — Vision, UI/UX HOLM Liquid Glass, banc d'essai réel.
- 🤖 **Co-Engineering**: **IDA / Antigravity Agent (Google DeepMind)** — TypeScript architecture, high-performance DOM engine, Zigbee NodOn algorithms.
