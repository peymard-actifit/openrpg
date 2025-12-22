# 📜 Historique des Prompts - OpenRPG

Ce fichier contient l'historique de tous les prompts utilisés pour développer le projet OpenRPG.
Il est mis à jour automatiquement à chaque déploiement via le script `deploy.cmd`.

---

## Session 1 - Création initiale (21/12/2024)

### Prompt 1 - Création du projet
> Créé un premier readme avec "Jeux de rôles ouvert", puis commit dans le repository GitHub openrpg

**Résultat**: Création du repository GitHub et premier commit.

---

### Prompt 2 - Structure du projet JDR
> Structure complète du JDR avec authentification, profil utilisateur (6 caractéristiques sur 20), gestion des parties, mode hardcore, conversation IA.

**Résultat**: Structure React + Vite, authentification, profil RPG, dashboard, page de jeu, archives.

---

### Prompt 3 - Ajout du dé et mode vocal
> D6 interactif, mode vocal input/output via OpenAI (Whisper + TTS).

**Résultat**: Dé animé, Speech-to-Text, Text-to-Speech.

---

### Prompt 4 - Migration MongoDB
> Migration de Supabase vers MongoDB (base créée dans Vercel).

**Résultat**: API routes MongoDB, auth JWT + bcrypt.

---

### Prompt 5 - Script de déploiement
> Script commit and deploy avec versioning sémantique (major.minor.patch).

**Résultat**: Scripts deploy.cmd, deploy.ps1, deploy.sh.

---

### Prompt 6 - Rapport de déploiement
> Création de rapports horodatés dans logs/deploys/, fichier DEPLOYS.md et PROMPTS.md.

**Résultat**: Système de tracking des déploiements.

---

## Session 2 - Améliorations UI/UX (22/12/2024)

### v0.13.1 - Tooltips et micro
> Quand je me déplace sur le bouton moral ou ordre, il affiche le % entre les deux. Quand je me déplace sur le titre je dois voir le modal en dessous joli. Le bouton "Micro" doit être à coté de celui du haut parleur en haut.

**Résultat**: Tooltips alignement avec %, tooltip titre élégant, micro déplacé dans le header.

---

### v0.13.2 - Fix dés + Drag & Drop
> Les lancers de dés ne fonctionnent pas du tout. Par ailleurs, dans l'écran de gestion des parties, je veux pouvoir faire un drag & drop d'une partie dans l'espace archive.

**Résultat**: Système de dés refait avec animation, drag & drop pour archiver les parties.

---

### v0.14.0 - Menu utilisateur et profil persistant
> J'ai perdu mes stats qui ont été initialisée à 10 partout. Je veux un menu utilisateur pour pouvoir le re-rentrer et je veux qu'elles soient persistantes. La zone archive doit etre toute petite et positionnée à droite des statistiques. Menu utilisateur avec déconnexion. Modification du personnage via modal. Tooltip OpenRPG avec slogan.

**Résultat**: Menu utilisateur dropdown, modal édition profil, API PUT profile, zone archive compacte, tooltip logo.

---

### v0.15.0 - Suppression parties + Admin
> Je veux pouvoir effacer des parties en cours avec une mini icône rouge (poubelle). Quand on relance une partie victorieuse archivée, on continue le prompt là où on en était avec tout l'historique (v2, v3, etc.). Menu utilisateur avec mode admin (code 12411241) pour voir toutes les parties de tous les utilisateurs.

**Résultat**: Bouton supprimer (🗑️), continuation avec historique (v2, v3...), mode admin avec vision globale.

---

## Statistiques

| Métrique | Valeur |
|----------|--------|
| Total versions | 0.15.0 |
| Fichiers créés | ~80 |
| Technologies | React, Vite, MongoDB, OpenAI, JWT |

---

## Notes

- Ce fichier est maintenant mis à jour **automatiquement** par le script `deploy.cmd`
- Chaque déploiement ajoute une entrée avec la version, la date et le message
- **IMPORTANT**: Ne jamais inclure de tokens ou secrets dans ce fichier

---

*Mis à jour automatiquement à chaque déploiement*
 
--- 
 
### v0.15.1 - 22/12/2025 02:29:27 
 
> Script deploy met a jour PROMPTS.md automatiquement 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v0.15.2 - 22/12/2025 13:06:04 
 
> Amelioration affichage des des et animation 
 
**Type**: patch | **Fichiers**: 62 
 
 
--- 
 
### v0.16.0 - 22/12/2025 13:28:54 
 
> Mode multijoueur - invitations, participants, chat temps reel 
 
**Type**: minor | **Fichiers**: 14 
 
 
--- 
 
### v0.16.1 - 22/12/2025 13:34:14 
 
> Multijoueur ameliore - sync/async, pause auto, statut en ligne 
 
**Type**: patch | **Fichiers**: 9 
 
 
--- 
 
### v0.17.0 - 22/12/2025 13:45:51 
 
> Sous-groupes sync, inventaire partage, systeme de vote 
 
**Type**: minor | **Fichiers**: 9 
 
 
--- 
 
### v0.17.1 - 22/12/2025 13:48:54 
 
> Redirection auto vers dashboard si utilisateur connecte 
 
**Type**: patch | **Fichiers**: 2 
 
