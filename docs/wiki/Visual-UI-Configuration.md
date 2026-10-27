# 🎨 Guide de Configuration No-YAML (<ha-form>)

## 1. Philosophie Zéro YAML

La suite **HALO Button Card** est conçue pour l'ère moderne de Home Assistant où la configuration doit être accessible directement depuis l'interface visuelle, sans obligation d'écrire ou de copier-coller des blocs de code YAML complexes.

Toutes les cartes exposent la méthode officielle :
```typescript
public static getConfigElement(): HTMLElement {
  return document.createElement('halo-cover-card-editor');
}
```

---

## 2. L'Éditeur de la Carte Volet (`halo-cover-card`)

L'éditeur visuel s'ouvre d'un simple clic sur "Modifier la carte" :

1. **Sélecteur d'Entité** : Filtre automatiquement les entités du domaine `cover` ainsi que les groupes de volets enregistrés sur l'instance.
2. **Nom Personnalisé** : Permet de raccourcir ou personnaliser le libellé affiché sur la tuile (par exemple remplacer *"Volet roulant Salon Baie Vitrée"* par *"Baie Vitrée"*).
3. **Palette des 4 États** :
   - Couleur Fermé (Défaut : `#FFB69C` / exemple test : `#e2e8f0`)
   - Couleur Ouvert (Défaut : `#96E1FF` / exemple test : `#6ad2e6`)
   - Couleur Partiel (Défaut : `#38bdf8` / exemple test : `#d4fb78`)
   - Couleur Mouvement (Défaut : `#f59e0b`)

---

## 3. La Roue Chromatique 2D et Canaux RVB

En cliquant sur n'importe quelle pastille de couleur dans l'éditeur, Home Assistant ouvre sa boîte de dialogue native haute précision :

- **Roue 2D interactive** : Déplacement fluide du curseur sur le spectre de couleurs et saturation.
- **Curseur de luminosité** : Réglage d'intensité de 0 à 100 %.
- **Canaux primaires RVB** : Saisie numérique directe pour le Rouge, le Vert et le Bleu (0 à 255).
- **Champ Hexadécimal** : Possibilité de coller directement un code `#RRGGBB`.

---

## 4. L'Éditeur du Séparateur (`halo-separator-card`)

- **Titre de la section** : Texte affiché en blanc givré semi-gras.
- **Sélecteur d'Icône** : Moteur de recherche visuel officiel Material Design Icons (`mdi:...`).
- **Couleur personnalisée** : Sélecteur visuel `color_rgb` pour teinter l'icône et la ligne néon en dégradé.
- **Entité sélecteur de thème** : Menu déroulant filtré sur les `input_select` pour synchroniser dynamiquement la section avec un thème de vue.
