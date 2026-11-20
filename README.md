# Les jeux de JoJo

Petit site de jeux : nombre à deviner, pendu, balles de couleurs, memory (1 ou 2 joueurs), 4 à la suite et tir spatial.

- `jeuJojoReactFront` : site React, construit avec Vite
- `jeuJojoReactBack` : API Express (meilleur score du Memory et top 10 du Tir spatial dans MongoDB, formulaire de contact via Resend). Il sert aussi le site compilé : un seul service suffit.

## Développement en local

Il faut Node.js 20.19 ou plus récent.

```bash
npm --prefix jeuJojoReactFront install
npm --prefix jeuJojoReactBack install
cp jeuJojoReactBack/.env.example jeuJojoReactBack/.env   # puis remplir les valeurs

npm run dev:back    # API sur http://localhost:8800
npm run dev:front   # site sur http://localhost:3000 (les appels /api sont redirigés vers le back)
```

## Mise en ligne sur Render (un seul « Web Service »)

| Réglage | Valeur |
| --- | --- |
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Variables d'environnement | `MONGODB_USERNAME`, `MONGODB_PASSWORD`, `RESEND_API_KEY`, `USER_MAIL`, éventuellement `NODE_VERSION=22` |

Le service répond aussi sur `/healthz` pour vérifier que le serveur et la base sont joignables.

## Pourquoi Resend ?

Depuis le 26 septembre 2025, Render bloque le SMTP (ports 25, 465, 587) sur les services gratuits, ce qui empêchait Nodemailer/Gmail d'envoyer les messages. Resend reçoit les messages par HTTPS, qui n'est pas bloqué.

## Tests

Les règles du Memory (`memoryLogic.js`) et du tir spatial (`shooterLogic.js`) sont dans `jeuJojoReactFront/src/game/`, sans React, et testées avec :

```bash
npm --prefix jeuJojoReactFront test
```

## Tir spatial : top 10, musique et bruitage

- Les 10 meilleurs scores sont stockés dans MongoDB (base `jeuJojo`, collection `tirSpatial`, créée automatiquement) et servis par `GET` / `POST /api/tirSpatial/scores`.
- Musique : `src/sounds/dream-protocol-space-invaders-classic-arcade-game-116826.mp3` (Dream-Protocol, Pixabay), mentionnée dans le pied de page de la page du jeu. Boutons « Musique » et « Tirs » sous le jeu, touche `M` pour la musique ; le choix est mémorisé sur l'appareil.
- Le bruit de tir est fabriqué par le code (`src/game/sound.js`, Web Audio) : aucun fichier, donc libre de droits.
