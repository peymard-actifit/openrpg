import OpenAI from 'openai'
import { getCollection } from './lib/mongodb.js'
import { getUserIdFromRequest } from './lib/auth.js'
import { ObjectId } from 'mongodb'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)

  try {
    const { messages, gameContext } = req.body
    const gameId = gameContext?.game?.id

    // Vérifier si c'est une partie multijoueur
    if (gameId && gameContext?.game?.isMultiplayer) {
      return handleMultiplayerChat(req, res, messages, gameContext, userId)
    }

    // Mode solo standard
    return handleSoloChat(req, res, messages, gameContext)
  } catch (error) {
    console.error('OpenAI Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de communication avec l\'IA',
      details: error.message 
    })
  }
}

// Chat solo (comportement original)
async function handleSoloChat(req, res, messages, gameContext) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    temperature: 0.85,
    max_tokens: 1500,
    presence_penalty: 0.3,
    frequency_penalty: 0.2
  })

  const content = completion.choices[0].message.content
  return res.status(200).json(parseAIResponse(content))
}

// Chat multijoueur
async function handleMultiplayerChat(req, res, messages, gameContext, userId) {
  const games = await getCollection('games')
  const pendingActions = await getCollection('pending_actions')
  const gameChats = await getCollection('game_chats')
  
  const gameId = gameContext.game.id
  const game = await games.findOne({ _id: new ObjectId(gameId) })
  
  if (!game) {
    return res.status(404).json({ error: 'Partie non trouvée' })
  }

  // Trouver le participant actuel
  const currentParticipant = game.participants?.find(p => p.userId === userId)
  const isOwner = game.ownerId === userId || game.userId === userId
  const playerMode = currentParticipant?.mode || (isOwner ? 'sync' : 'sync')
  const playerName = gameContext.profile?.characterName || 'Joueur'

  // Mode ASYNCHRONE : réponse individuelle immédiate
  if (playerMode === 'async') {
    // Ajouter le contexte des autres joueurs
    const asyncSystemAddition = `

═══════════════════════════════════════════
MODE ASYNCHRONE - JOUEUR: ${playerName}
═══════════════════════════════════════════
Ce joueur joue en mode asynchrone. Ses actions sont indépendantes.
Autres participants: ${game.participants?.map(p => p.characterName).join(', ') || 'Aucun'}
Tiens compte des actions des autres mais génère une réponse personnalisée pour ${playerName}.`

    // Modifier le premier message système
    const modifiedMessages = [...messages]
    if (modifiedMessages[0]?.role === 'system') {
      modifiedMessages[0].content += asyncSystemAddition
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: modifiedMessages,
      temperature: 0.85,
      max_tokens: 1500,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    })

    const content = completion.choices[0].message.content

    // Notifier les autres via le chat
    await gameChats.insertOne({
      gameId,
      userId: 'system',
      characterName: 'Système',
      content: `🎭 ${playerName} a effectué une action (async)`,
      createdAt: new Date(),
      isSystem: true
    })

    return res.status(200).json(parseAIResponse(content))
  }

  // Mode SYNCHRONE : attendre tous les joueurs
  const syncParticipants = game.participants?.filter(p => p.mode === 'sync' && p.status === 'active') || []
  const totalSyncPlayers = syncParticipants.length + (game.masterOnlyWatch ? 0 : 1) // +1 pour le owner si il joue

  // Enregistrer l'action de ce joueur
  await pendingActions.updateOne(
    { gameId, userId: userId },
    { 
      $set: {
        gameId,
        userId: userId,
        playerName,
        action: messages[messages.length - 1]?.content || '',
        submittedAt: new Date()
      }
    },
    { upsert: true }
  )

  // Compter les actions en attente
  const pendingCount = await pendingActions.countDocuments({ gameId })

  // Si tous les joueurs sync n'ont pas encore répondu
  if (pendingCount < totalSyncPlayers) {
    // Notifier via le chat
    await gameChats.insertOne({
      gameId,
      userId: 'system',
      characterName: 'Système',
      content: `⏳ ${playerName} a répondu (${pendingCount}/${totalSyncPlayers})`,
      createdAt: new Date(),
      isSystem: true
    })

    return res.status(200).json({
      content: `⏳ Action enregistrée ! En attente des autres joueurs (${pendingCount}/${totalSyncPlayers})...`,
      waiting: true,
      pendingCount,
      totalPlayers: totalSyncPlayers
    })
  }

  // Tous les joueurs ont répondu - générer la réponse combinée
  const allActions = await pendingActions.find({ gameId }).toArray()
  
  // Construire le contexte des actions de tous les joueurs
  const actionsContext = allActions.map(a => 
    `${a.playerName}: "${a.action}"`
  ).join('\n')

  const syncSystemAddition = `

═══════════════════════════════════════════
MODE SYNCHRONE - ACTIONS DE TOUS LES JOUEURS
═══════════════════════════════════════════
${actionsContext}

Génère une réponse qui prend en compte TOUTES ces actions simultanément.
Décris les conséquences pour chaque joueur de manière cohérente.
Les joueurs agissent ensemble, leurs actions se complètent ou interfèrent.`

  // Modifier les messages
  const modifiedMessages = [...messages]
  if (modifiedMessages[0]?.role === 'system') {
    modifiedMessages[0].content += syncSystemAddition
  }
  
  // Remplacer le dernier message par un résumé des actions
  modifiedMessages[modifiedMessages.length - 1] = {
    role: 'user',
    content: `[Actions simultanées]\n${actionsContext}`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: modifiedMessages,
    temperature: 0.85,
    max_tokens: 2000, // Plus long pour plusieurs joueurs
    presence_penalty: 0.3,
    frequency_penalty: 0.2
  })

  const content = completion.choices[0].message.content

  // Nettoyer les actions en attente
  await pendingActions.deleteMany({ gameId })

  // Notifier via le chat
  await gameChats.insertOne({
    gameId,
    userId: 'system',
    characterName: 'Système',
    content: `✨ Tous les joueurs ont agi ! L'histoire continue...`,
    createdAt: new Date(),
    isSystem: true
  })

  return res.status(200).json({
    ...parseAIResponse(content),
    syncComplete: true,
    playerActions: allActions.map(a => ({ name: a.playerName, action: a.action }))
  })
}

// Parser la réponse de l'IA pour extraire les balises
function parseAIResponse(content) {
  const playerDied = content.includes('[MORT:')
  const levelUp = content.includes('[LEVEL_UP')
  const victory = content.includes('[VICTOIRE:')
  const bonusReroll = content.includes('[BONUS_REROLL]')
  
  let deathReason = null
  if (playerDied) {
    const match = content.match(/\[MORT:\s*([^\]]+)\]/)
    if (match) deathReason = match[1]
  }

  let victoryReason = null
  if (victory) {
    const match = content.match(/\[VICTOIRE:\s*([^\]]+)\]/)
    if (match) victoryReason = match[1]
  }

  // Extraire les objets
  const newItems = []
  const itemMatchesWithValue = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]/g)
  for (const match of itemMatchesWithValue) {
    newItems.push({
      name: match[1].trim(),
      icon: match[2].trim(),
      description: match[3].trim(),
      value: parseInt(match[4]) || 0
    })
  }
  const itemMatchesNoValue = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^\]|]+)\](?!\d)/g)
  for (const match of itemMatchesNoValue) {
    const alreadyAdded = newItems.some(item => item.name === match[1].trim())
    if (!alreadyAdded) {
      newItems.push({
        name: match[1].trim(),
        icon: match[2].trim(),
        description: match[3].trim(),
        value: 0
      })
    }
  }

  // Objets retirés
  const removedItems = []
  const removeMatches = content.matchAll(/\[RETIRER:\s*([^\]]+)\]/g)
  for (const match of removeMatches) {
    removedItems.push(match[1].trim())
  }

  // Alignement
  let alignmentChange = null
  const alignMatch = content.match(/\[ALIGN:\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\]/)
  if (alignMatch) {
    alignmentChange = {
      goodEvil: parseInt(alignMatch[1]),
      lawChaos: parseInt(alignMatch[2])
    }
  }

  return {
    content,
    playerDied,
    deathReason,
    victory,
    victoryReason,
    levelUp,
    bonusReroll,
    newItems,
    removedItems,
    alignmentChange
  }
}
