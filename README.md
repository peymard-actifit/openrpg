# 🎲 OpenRPG - Jeux de Rôles Ouvert

**Plateforme de jeu de rôle textuel et vocal alimentée par l'Intelligence Artificielle**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green)](https://mongodb.com)
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
- Base MongoDB (openrpg-db sur Vercel)
- Clé API OpenAI

### Configuration Vercel

1. **Variables d'environnement** (Settings > Environment Variables) :

```
OPENAI_API_KEY=sk-votre-clef-openai
MONGODB_URI=mongodb+srv://...  (fourni par Vercel MongoDB)
JWT_SECRET=votre-clef-secrete-jwt
```

2. **Lier la base MongoDB** :
   - Storage > Create Database > MongoDB
   - La variable `MONGODB_URI` sera automatiquement ajoutée

### Développement local

1. **Cloner le projet**
```bash
git clone https://github.com/peymard-actifit/openrpg.git
cd openrpg
npm install
```

2. **Créer `.env`** :
```env
OPENAI_API_KEY=sk-votre-clef
MONGODB_URI=mongodb+srv://...
JWT_SECRET=secret-local-dev
```

3. **Lancer**
```bash
npm run dev
```

---

## 🗄️ Structure de la Base MongoDB

### Collection `users`
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "password": "hash_bcrypt",
  "createdAt": "Date"
}
```

### Collection `profiles`
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "characterName": "Aldric",
  "age": 25,
  "gender": "male",
  "height": 180,
  "weight": 75,
  "strength": 14,
  "intelligence": 12,
  "wisdom": 10,
  "dexterity": 11,
  "constitution": 13,
  "mana": 10,
  "createdAt": "Date"
}
```

### Collection `games`
```json
{
  "_id": "ObjectId",
  "userId": "string",
  "title": "La Quête du Dragon",
  "initialPrompt": "Un monde médiéval...",
  "status": "active | archived",
  "level": 1,
  "currentStats": { "strength": 14, ... },
  "deathReason": null,
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Collection `messages`
```json
{
  "_id": "ObjectId",
  "gameId": "string",
  "role": "user | assistant",
  "content": "Je tire mon épée...",
  "createdAt": "Date"
}
```

---

## 🎲 Système de Dé

Le dé à 6 faces est utilisé pour résoudre les actions incertaines :

| Résultat | Interprétation |
|----------|----------------|
| 1 | Échec critique - Conséquences graves |
| 2-3 | Échec - L'action échoue |
| 4-5 | Réussite - L'action réussit |
| 6 | Réussite critique - Bonus spécial |

---

## 📁 Structure du Projet

```
openrpg/
├── api/                       # Serverless functions Vercel
│   ├── lib/
│   │   ├── mongodb.js        # Connexion MongoDB
│   │   └── auth.js           # JWT + bcrypt
│   ├── auth/
│   │   ├── register.js       # Inscription
│   │   ├── login.js          # Connexion
│   │   └── me.js             # Session actuelle
│   ├── games/
│   │   ├── index.js          # Liste / Création
│   │   ├── [gameId].js       # Détail / Update
│   │   └── [gameId]/
│   │       └── messages.js   # Messages de la partie
│   ├── profile.js            # Profil utilisateur
│   ├── chat.js               # Conversation GPT-4o
│   ├── speak.js              # Text-to-Speech
│   └── transcribe.js         # Speech-to-Text
├── src/
│   ├── components/
│   │   ├── Dice.jsx          # Dé d6 interactif
│   │   └── VoiceControls.jsx # Micro + Speaker
│   ├── contexts/
│   │   └── AuthContext.jsx   # Auth React
│   ├── lib/
│   │   └── api.js            # Client API
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── CreateProfile.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Game.jsx
│   │   └── Archive.jsx
│   └── styles/
└── vercel.json
```

---

## 🛠️ Technologies

- **Frontend** : React 18 + Vite
- **Backend** : Vercel Serverless Functions
- **Base de données** : MongoDB Atlas (openrpg-db)
- **Auth** : JWT + bcrypt
- **IA Texte** : OpenAI GPT-4o
- **IA Voix** : OpenAI Whisper + TTS

---

## 📝 Licence

MIT © 2025 OpenRPG

---

*L'aventure n'attend que vous.* ⚔️
