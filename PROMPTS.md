# 📜 Historique des Prompts - OpenRPG

Ce fichier contient l'historique de tous les prompts utilisés pour développer le projet OpenRPG.

---

## Session 1 - Création initiale (21/12/2024)

### Prompt 1 - Création du projet
> Créé un premier readme avec "Jeux de rôles ouvert", puis commit dans le repository GitHub openrpg

**Résultat**: Création du repository GitHub et premier commit.

---

### Prompt 2 - Structure du projet JDR
> Chaque utilisateur du projet doit se connecter. Toutes les données du projet sont stockées dans la base associée au projet. Les données utilisateurs et celles de chaque partie jouée sur le projet. Chaque joueur peut initier ensuite des parties dans une première vue ou chaque partie est représentée par une icone. Lorsqu'on clique sur une icone existante ou qu'on créée une nouvelle partie, openrpg propose au joueur de rédiger un prompt permettant de contextualiser le jdr associé à la partie. Sur cette base, openjdr va ensuite générer des histoires qui seront jouer par le joueur. Le joueur conversera avec openrpg afin d'avancer dans sa partie. Il possèdera des caractéristiques (celles du joueur) qui seront sur son profil initial (à créer au moment de la création du compte - avec les question suivantes : nom du personnage, age, sexe, taille, poids, puis, sur 20, force, intelligence, sagesse, dextérité, constitution, mana), puis il pourra les faire évoluer dans les différentes parties, en fonction des scénarios. Il partira toujours d'un niveau 1 dans chaque partie créée. Il n'y a pas de limite au niveau qu'il peut atteindre dans une partie. Chaque niveau voit l'augmentation d'un point dans une caractéristique. L'IA de openrpg gèrera les interactions, les combats, les réflexions et choisira, selon la partie, de les présenter comme il le souhaite. La possibilité est donnée à openrpg d'utiliser l'IA pour écrire, poser des problèmes, dessiner, faire des sons, de son choix pour animer la partie de l'utilisateur. Par défaut le mode est hardcore et l'utilisateur peut mourir dans chaque partie. Chaque mort est irrémédiable et la partie devient alors archivée et contient les éléments pour pouvoir la revoir ensuite. openrpg possède une clef api OPENAI pour converser avec l'utilisateur dans la langue de son choix. La partie se termine à la mort du joueur/utilisateur dans le contexte de la partie. Une fois que la partie est démarrée, il est impossible de changer le prompt initial de la partie, qui ne peut se finir qu'à la mort du joueur. Essaye de démarrer openrpg.

**Résultat**: 
- Structure React + Vite complète
- Système d'authentification
- Création de profil avec 6 caractéristiques RPG
- Dashboard avec gestion des parties
- Page de jeu avec conversation IA
- Mode hardcore avec mort permanente
- Archives des parties terminées

---

### Prompt 3 - Ajout du dé et mode vocal
> Le joueur a toujours un d6 que l'IA peut lui demander de lancer (dé visualisé à coté de sa ligne d'expression écrite). Un bouton permet de passer de l'expression écrite à l'expression orale au choix du joueur. De la même façon, openrpg peut exprimer par oral ses actions et l'histoire. un bouton permettant de basculer entre les modes. Par ailleurs, utilise la variable OPENAI_API_KEY et créé les variable VITE et utilise la base openrpg-db créée dans vercel.

**Résultat**:
- Dé à 6 faces (d6) interactif avec animation
- L'IA peut demander un lancer de dé avec [LANCER_DE]
- Mode vocal input (Speech-to-Text via Whisper)
- Mode vocal output (Text-to-Speech via OpenAI TTS)
- Configuration des variables d'environnement

---

### Prompt 4 - Migration MongoDB
> C'est la base mongodb créée dans vercel pour le projet.

**Résultat**:
- Migration complète de Supabase vers MongoDB
- API routes pour auth, profile, games, messages
- Authentification JWT + bcrypt
- Collections MongoDB : users, profiles, games, messages

---

### Prompt 5 - Script de déploiement
> Créé un script commit and deploy qui permet d'augmenter au fil de l'amélioration du projet la version en trois niveaux (majeure, mineure, correctif)

**Résultat**:
- Script `deploy.cmd` pour Windows
- Script `deploy.ps1` pour PowerShell
- Script `deploy.sh` pour Bash
- Versioning sémantique (major.minor.patch)
- Création automatique de tags Git

---

### Prompt 6 - Rapport de déploiement
> Rajoute dans le script la création d'un fichier texte horodaté avec le rapport complet du commit and deploy que tu va stocker dans le github dans un répertoire de suivi des commit et indente dans la racine du github un fichier qui reprendra tous les prompts faits sur le projet openrpg.

**Résultat**:
- Dossier `logs/deploys/` pour les rapports horodatés
- Fichier `DEPLOYS.md` pour l'historique des déploiements
- Fichier `PROMPTS.md` pour l'historique des prompts (ce fichier)

---

## Statistiques

| Métrique | Valeur |
|----------|--------|
| Total prompts | 6 |
| Version actuelle | 0.4.0 |
| Fichiers créés | ~40 |
| Technologies | React, Vite, MongoDB, OpenAI, JWT |

---

## Notes

- Ce fichier doit être mis à jour manuellement après chaque session de développement
- Les prompts sont résumés pour la lisibilité
- Les résultats incluent les principales fonctionnalités ajoutées
- **IMPORTANT**: Ne jamais inclure de tokens ou secrets dans ce fichier

---

*Dernière mise à jour: 21/12/2024*
