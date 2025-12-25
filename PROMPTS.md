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
 
 
--- 
 
### v0.17.2 - 22/12/2025 13:51:11 
 
> Affichage version a cote du logo OpenRPG dans le dashboard 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v0.17.3 - 22/12/2025 13:57:19 
 
> Inventaire mis a jour en temps reel - objets de depart et au fil de laventure 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.4 - 22/12/2025 13:59:40 
 
> Sync inventaire au chargement basee sur les 3 dernieres interactions 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.5 - 22/12/2025 14:01:52 
 
> Prompt IA renforce - balises OBJET obligatoires avec exemples 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.6 - 22/12/2025 14:04:20 
 
> Version affichee dans Game + contraste ameliore du badge 
 
**Type**: patch | **Fichiers**: 4 
 
 
--- 
 
### v0.17.7 - 22/12/2025 14:08:26 
 
> Extraction auto objets du texte narratif sans balises + sync au chargement 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.8 - 22/12/2025 14:10:51 
 
> Sync inventaire via API dediee - plus fiable que extraction IA 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.9 - 22/12/2025 14:13:18 
 
> API sync-inventory amelioree - meilleur prompt et logs 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.10 - 22/12/2025 16:13:45 
 
> Sync inventaire APRES chaque reponse IA sans balises 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.11 - 22/12/2025 16:18:23 
 
> Touche Entree fonctionne pour confirmer le message + Echap pour annuler 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.12 - 23/12/2025 01:06:02 
 
> Fix acces parties multijoueur pour participants - GET/PATCH/messages 
 
**Type**: patch | **Fichiers**: 52 
 
 
--- 
 
### v0.17.13 - 23/12/2025 01:09:27 
 
> Fix sync/async multijoueur - alignement syncMode et verification acces participants 
 
**Type**: patch | **Fichiers**: 5 
 
 
--- 
 
### v0.17.14 - 23/12/2025 01:11:43 
 
> Introduction IA narrative pour les nouveaux joueurs en mode sync 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.15 - 23/12/2025 01:28:21 
 
> Correction orthographique IA avant envoi du message 
 
**Type**: patch | **Fichiers**: 5 
 
 
--- 
 
### v0.17.16 - 23/12/2025 01:32:13 
 
> Entree envoie automatiquement la version corrigee 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v0.17.17 - 23/12/2025 01:38:33 
 
> Toggle correction automatique en haut a droite 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v0.17.18 - 24/12/2025 17:49:12 
 
> Initialisation session Cursor - verification systeme 
 
**Type**: patch | **Fichiers**: 0 
 
 
--- 
 
### v1.0.0 - 24/12/2025 18:08:37 
 
> Consignes IA personnalisees + prompt cable Joe Abercrombie + admin toutes parties 
 
**Type**: major | **Fichiers**: 40 
 
 
--- 
 
### v1.0.1 - 24/12/2025 18:27:03 
 
> Choix rapides (numeros, lettres) envoyes sans correction 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v1.0.2 - 24/12/2025 19:01:57 
 
> Focus automatique sur zone de reponse apres chaque message IA 
 
**Type**: patch | **Fichiers**: 6 
 
 
--- 
 
### v1.0.3 - 24/12/2025 23:57:45 
 
> Nouveau prompt cable style Abercrombie + API admin stats 
 
**Type**: patch | **Fichiers**: 35 
 
 
--- 
 
### v1.0.4 - 25/12/2025 00:04:25 
 
> Mise a jour du prompt cable Joe Abercrombie et ajout API stats admin 
 
**Type**: patch | **Fichiers**: 1678 
 
 
--- 
 
### v1.0.5 - 25/12/2025 00:07:41 
 
> Fix mode admin: affichage automatique de toutes les parties des que admin active 
 
**Type**: patch | **Fichiers**: 4 
 
 
--- 
 
### v1.0.6 - 25/12/2025 00:14:05 
 
> Admin automatique: statut isAdmin recupere depuis API au chargement 
 
**Type**: patch | **Fichiers**: 6 
 
 
--- 
 
### v1.0.7 - 25/12/2025 00:18:12 
 
> Fix droits admin: seul apydya@gmail.com est admin 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v1.0.8 - 25/12/2025 00:24:13 
 
> Synchronisation et maintenance 
 
**Type**: patch | **Fichiers**: 1 
 
 
--- 
 
### v1.0.9 - 25/12/2025 00:27:10 
 
> Script deploy avec Vercel integre 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v1.1.0 - 25/12/2025 00:29:47 
 
> Admin peut voir toutes les parties en cliquant dessus 
 
**Type**: minor | **Fichiers**: 5 
 
 
--- 
 
### v1.1.1 - 25/12/2025 00:55:48 
 
> Reouverture partie Ballade en cimmǸrie - quete non terminee 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v1.2.0 - 25/12/2025 00:59:55 
 
> Admin: boutons supprimer et rouvrir les parties dans le dashboard 
 
**Type**: minor | **Fichiers**: 6 
 
 
--- 
 
### v1.2.1 - 25/12/2025 09:24:40 
 
> Ajout bouton continuer pour parties mortes et admin 
 
**Type**: patch | **Fichiers**: 43 
 
 
--- 
 
### v1.2.2 - 25/12/2025 09:34:21 
 
> Rafraichissement immediat du dashboard apres actions 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v1.2.3 - 25/12/2025 09:36:55 
 
> Affichage nombre joueurs/parties dans zone admin 
 
**Type**: patch | **Fichiers**: 2 
 
 
--- 
 
### v1.2.4 - 25/12/2025 09:40:15 
 
> Correction clic sur notifications invitations 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v1.3.0 - 25/12/2025 10:04:13 
 
> Mode sync ameliore: voir actions des autres joueurs en temps reel, noms des joueurs en attente 
 
**Type**: minor | **Fichiers**: 11 
 
 
--- 
 
### v1.4.0 - 25/12/2025 10:05:02 
 
> Multijoueur sync: voir actions des autres, typing indicator, chat amǸliorǸ 
 
**Type**: minor | **Fichiers**: 2 
 
 
--- 
 
### v1.4.1 - 25/12/2025 10:35:08 
 
> Fix import manquant TypingIndicator 
 
**Type**: patch | **Fichiers**: 3 
 
 
--- 
 
### v1.4.2 - 25/12/2025 10:56:36 
 
> Sync automatique messages IA en mode multijoueur 
 
**Type**: patch | **Fichiers**: 2 
 
