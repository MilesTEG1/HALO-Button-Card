# ⚡ Architecture en DOM Persistant

## 1. Le Piège Classique de `innerHTML` dans Lovelace

Dans les cartes personnalisées standard pour Home Assistant, le modèle d'écriture le plus répandu consiste à réécrire la totalité du Shadow DOM lors de chaque notification :

```typescript
// ❌ Anti-pattern classique :
public set hass(hass: HomeAssistant) {
  this._hass = hass;
  this._root.innerHTML = `<ha-card>...</ha-card>`;
}
```

Dans un écosystème domotique actif, `set hass` est appelé plusieurs fois par seconde par Home Assistant dès qu'un capteur météo, une sonde de température ou une consommation électrique varie sur le serveur.

### Conséquences néfastes :
1. **Clignotement visuel** : Les balises d'icônes `<ha-icon>` sont détruites et réinsérées en continu, obligeant le moteur à recalculer les tracés SVG.
2. **Perte de réactivité tactile (clics manqués)** : Lorsqu'un utilisateur appuie sur un bouton (`mousedown`) et que `innerHTML` reconstruit le DOM avant le relâchement (`mouseup`), le navigateur annule l'émission de l'événement `click`.

---

## 2. La Solution HALO : Instanciation Unique et Mises à Jour Atomiques

Dans la suite HALO, le Shadow DOM n'est construit qu'une seule fois :

```typescript
// ✅ Initialisation unique :
private _buildDom() {
  this._root.innerHTML = `...`;
  this._cardEl = this._root.getElementById('card-body');
  this._badgeEl = this._root.getElementById('icon-badge');
  this._iconEl = this._root.getElementById('cover-icon');
  ...
  // Écouteurs d'événements permanents
  btnDown.addEventListener('click', (e) => this._handleAction(e, 'close'));
}
```

### Mises à jour en place :
Lorsqu'un changement d'état survient sur le volet :
- Seules les propriétés directes des nœuds existants sont altérées :  
  `this._cardEl.style.background = cardStyles.background;`  
  `this._nameEl.textContent = name;`  
  `this._iconEl.setAttribute('icon', iconName);`
- Les balises `<button>` et leurs icônes ne sont **jamais détruites**.
- La réactivité tactile est instantanée, sans aucune latence ni risque de clic perdu.

---

## 3. Filtrage Événementiel Intelligent (`_hasChanged`)

Pour préserver le processeur des tablettes murales et smartphones, la carte filtre les notifications WebSocket non pertinentes :

```typescript
private _hasChanged(oldHass?: HomeAssistant, newHass?: HomeAssistant): boolean {
  // Ignore silencieusement les événements si l'entité volet,
  // ses membres de groupe et ses helpers de couleur sont inchangés.
}
```
Si un capteur de température varie dans le jardin, la carte volet du salon n'effectue aucun calcul inutile.
