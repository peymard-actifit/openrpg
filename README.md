# 🎲 OpenRPG - Jeux de Rôles Ouvert

**Plateforme de jeu de rôle textuel alimentée par l'Intelligence Artificielle**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-green)](https://supabase.com)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT--4-blue)](https://openai.com)

---

## 🌟 Fonctionnalités

### 👤 Création de Personnage
- **Profil complet** : Nom, âge, sexe, taille, poids
- **6 caractéristiques sur 20** : Force, Intelligence, Sagesse, Dextérité, Constitution, Mana
- Distribution libre de 60 points à la création

### 🎮 Système de Parties
- **Parties illimitées** : Créez autant d'aventures que vous le souhaitez
- **Prompt personnalisé** : Définissez le contexte unique de chaque partie
- **Prompt immuable** : Une fois lancée, l'aventure suit son cours

### ⚔️ Gameplay
- **Mode Hardcore** : La mort est permanente et irréversible
- **Niveaux infinis** : Progressez sans limite dans chaque partie
- **+1 stat/niveau** : Chaque niveau augmente une caractéristique
- **Conversation IA** : Dialoguez avec un Maître du Jeu intelligent

### 📜 Archives
- **Parties immortalisées** : Revivez vos aventures terminées
- **Historique complet** : Tous les messages conservés
- **Cause de mort** : Sachez comment votre héros a péri

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Clé API OpenAI

### Configuration

1. **Cloner le projet**
```bash
git clone https://github.com/peymard-actifit/openrpg.git
cd openrpg
npm install
```

2. **Configurer Supabase**
   - Créer un projet sur [supabase.com](https://supabase.com)
   - Exécuter le schéma SQL dans `supabase/schema.sql`
   - Récupérer l'URL et la clé anon

3. **Variables d'environnement**

Créer un fichier `.env` :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-anon-key
OPENAI_API_KEY=sk-votre-clef-openai
```

4. **Lancer en développement**
```bash
npm run dev
```

---

## 🗄️ Structure de la Base de Données

### `profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| user_id | UUID | Référence auth.users |
| character_name | VARCHAR | Nom du personnage |
| age, gender, height, weight | - | Caractéristiques physiques |
| strength, intelligence, wisdom, dexterity, constitution, mana | INTEGER | Stats 1-20 |

### `games`
| Colonne | Type | Description |
|---------|------|-------------|
| user_id | UUID | Propriétaire |
| title | VARCHAR | Titre de la partie |
| initial_prompt | TEXT | Contexte immuable |
| status | VARCHAR | active / archived |
| level | INTEGER | Niveau actuel |
| current_stats | JSONB | Stats évoluées |
| death_reason | TEXT | Cause de mort |

### `game_messages`
| Colonne | Type | Description |
|---------|------|-------------|
| game_id | UUID | Partie associée |
| role | VARCHAR | user / assistant |
| content | TEXT | Contenu du message |

---

## 🎯 Comment Jouer

1. **Créez un compte** et définissez votre personnage
2. **Lancez une partie** avec un prompt décrivant votre aventure
3. **Conversez** avec l'IA qui joue le rôle du Maître du Jeu
4. **Faites des choix** qui influencent votre destin
5. **Progressez** en niveaux grâce à vos accomplissements
6. **Survivez**... ou rejoignez les archives

---

## 🛠️ Technologies

- **Frontend** : React 18 + Vite
- **Routing** : React Router DOM
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Supabase Auth
- **IA** : OpenAI GPT-4o
- **Hébergement** : Vercel

---

## 📝 Licence

MIT © 2025 OpenRPG

---

*L'aventure n'attend que vous.* ⚔️
