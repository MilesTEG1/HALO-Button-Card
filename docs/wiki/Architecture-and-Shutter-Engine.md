# 🪟 Architecture & Algorithme Asynchrone de Course (`_voletHelper`)

## 1. Contexte Matériel & Défi Technique

Les micromodules Zigbee pour volets roulants (comme les **NodOn SIN-4-RS-20**) présentent un comportement asynchrone spécifique lors de l'actionnement physique :
- Dès qu'un ordre d'ouverture ou de fermeture est émis, le moteur physique se met en rotation.
- Cependant, le micromodule ne renvoie son état numérique que par trames périodiques espacées (parfois toutes les 2 à 4 secondes selon le trafic du maillage Zigbee).
- Dans Home Assistant, l'attribut `state` passe immédiatement à `open` dès que la position dépasse 0 %, même si le volet n'est ouvert qu'à 5 % et continue de monter pendant 28 secondes.

---

## 2. Le Moteur `_voletHelper`

Pour éviter que la carte ne bascule prématurément vers la couleur "partielle" alors que le moteur tourne encore, le composant intègre le singleton global `_voletHelper` :

```typescript
export class VoletHelper {
  public version = '2.1.0';
  public QUIET_MS = 3500;   // Tolérance de gigue entre trames Zigbee
  public GRACE_MS = 4000;   // Fenêtre de grâce initiale au clic manuel
  public MAX_AGE_MS = 30000; // Durée maximale de course nominale
  ...
}
```

### Mécanisme déterministe en 3 phases :
1. **Déclenchement Manuel (`markManualMove`)** :
   - Au clic sur Descendre ou Monter, le volet est immédiatement marqué comme en mouvement.
   - Le halo néon ambre (`#f59e0b`) s'active sans attendre le retour de trame Zigbee.
2. **Surveillance Asynchrone (`checkMoving`)** :
   - À chaque rapport de position reçu, la direction (`closing` ou `opening`) est déduite de la comparaison avec `lastPos`.
   - La fenêtre d'expiration est repoussée de `QUIET_MS` (3 500 ms).
3. **Extinction Déterministe (`reached`)** :
   - En fermeture : le mouvement s'éteint déterministement dès que `position === 0` ou `state === 'closed'`.
   - En ouverture : le mouvement s'éteint déterministement dès que `position === 100` (et non sur simple `state === 'open'`).

---

## 3. Support des Groupes de Volets

L'algorithme analyse récursivement les attributs `entity_id` des groupes d'entités Home Assistant :
- Si au moins un volet du groupe est en cours de déplacement, le groupe affiche l'état en mouvement.
- Le sous-titre de la carte adapte dynamiquement son libellé :  
  `X volets en mouvement…`
