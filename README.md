# 🎲 OpenRPG - Jeux de Rôles Ouvert

**Plateforme de jeu de rôle textuel et vocal alimentée par l'Intelligence Artificielle**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![Supabase](https://img.shields.io/badge/Database-openrpg--db-green)](https://supabase.com)
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

### 🎲 Dé à 6 Faces (d6)
- **Dé visuel interactif** : Toujours visible à côté de la zone de saisie
- **Demande du MJ** : L'IA peut demander un lancer de dé pour les actions risquées
- **Animation de lancer** : Effet visuel réaliste
- **Résultats interprétés** : 1=Échec critique, 6=Réussite critique

### 🎤 Mode Vocal
- **Parler au lieu d'écrire** : Bouton microphone pour dicter vos actions (Whisper)
- **Écouter l'histoire** : Le MJ peut vous raconter l'aventure à voix haute (TTS)
- **Basculer à volonté** : Passez du texte à la voix quand vous voulez

### ⚔️ Gameplay
- **Mode Hardcore** : La mort est permanente et irréversible
- **Niveaux infinis** : Progressez sans limite dans chaque partie
- **+1 stat/niveau** : Chaque niveau augmente une caractéristique
- **Conversation IA** : Dialoguez avec un Maître du Jeu intelligent (GPT-4o)

### 📜 Archives
- **Parties immortalisées** : Revivez vos aventures terminées
- **Historique complet** : Tous les messages conservés
- **Cause de mort** : Sachez comment votre héros a péri

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- Compte Supabase (base openrpg-db)
- Clé API OpenAI

### Configuration

1. **Cloner le projet**
```bash
git clone https://github.com/peymard-actifit/openrpg.git
cd openrpg
npm install
```

2. **Configurer Supabase**
   - Créer un projet nommé `openrpg-db` sur [supabase.com](https://supabase.com)
   - Exécuter le schéma SQL dans `supabase/schema.sql`
   - Récupérer l'URL et la clé anon

3. **Variables d'environnement**

Sur **Vercel** (Settings > Environment Variables) :
```
OPENAI_API_KEY=sk-votre-clef-openai
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

En **local** (fichier `.env`) :
```env
OPENAI_API_KEY=sk-votre-clef-openai
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

4. **Lancer en développement**
```bash
npm run dev
```

---

## 🔊 Fonctionnalités Vocales

### Speech-to-Text (Parler)
- Cliquez sur 🎤 pour enregistrer votre voix
- Cliquez à nouveau pour arrêter
- Le texte transcrit apparaît dans la zone de saisie
- Utilise **OpenAI Whisper**

### Text-to-Speech (Écouter)
- Activez 🔊 dans l'en-tête pour que le MJ parle
- Chaque réponse de l'IA sera lue à voix haute
- Voix "Onyx" (grave et immersive)
- Utilise **OpenAI TTS**

---

## 🎲 Système de Dé

Le dé à 6 faces est utilisé pour résoudre les actions incertaines :

| Résultat | Interprétation |
|----------|----------------|
| 1 | Échec critique - Conséquences graves |
| 2-3 | Échec - L'action échoue |
| 4-5 | Réussite - L'action réussit |
| 6 | Réussite critique - Bonus spécial |

Les caractéristiques du personnage modifient les chances :
- Stat ≥ 15 : Bonus au résultat
- Le MJ décide quand un lancer est nécessaire avec `[LANCER_DE]`

---

## 🗄️ Structure de la Base de Données

### `profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| user_id | UUID | Référence auth.users |
| character_name | VARCHAR | Nom du personnage |
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

### `game_messages`
| Colonne | Type | Description |
|---------|------|-------------|
| game_id | UUID | Partie associée |
| role | VARCHAR | user / assistant |
| content | TEXT | Contenu du message |

---

## 🛠️ Technologies

- **Frontend** : React 18 + Vite
- **Routing** : React Router DOM
- **Base de données** : Supabase PostgreSQL (openrpg-db)
- **Authentification** : Supabase Auth
- **IA Texte** : OpenAI GPT-4o
- **IA Voix** : OpenAI Whisper (STT) + TTS
- **Hébergement** : Vercel

---

## 📁 Structure du Projet

```
openrpg/
├── api/                    # Serverless functions Vercel
│   ├── chat.js            # Conversation GPT-4o
│   ├── speak.js           # Text-to-Speech
│   ├── transcribe.js      # Speech-to-Text (Whisper)
│   └── generate-image.js  # DALL-E (optionnel)
├── src/
│   ├── components/        # Composants réutilisables
│   │   ├── Dice.jsx       # Dé d6 interactif
│   │   └── VoiceControls.jsx
│   ├── contexts/          # React Context
│   │   └── AuthContext.jsx
│   ├── lib/               # Bibliothèques
│   │   ├── supabase.js
│   │   └── openai.js
│   ├── pages/             # Pages de l'application
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── CreateProfile.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Game.jsx
│   │   └── Archive.jsx
│   └── styles/            # CSS
├── supabase/
│   └── schema.sql         # Schéma de la BDD
└── vercel.json            # Configuration Vercel
```

---

## 📝 Licence

MIT © 2025 OpenRPG

---

*L'aventure n'attend que vous.* ⚔️
