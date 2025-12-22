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

// Chat multijoueur avec gestion des sous-groupes
async function handleMultiplayerChat(req, res, messages, gameContext, userId) {
  const games = await getCollection('games')
  const pendingActions = await getCollection('pending_actions')
  const gameChats = await getCollection('game_chats')
  
  const gameId = gameContext.game.id
  const game = await games.findOne({ _id: new ObjectId(gameId) })
  
  if (!game) {
    return res.status(404).json({ error: 'Partie non trouvée' })
  }

  const currentParticipant = game.participants?.find(p => p.userId === userId)
  const isOwner = game.ownerId === userId || game.userId === userId
  const playerName = gameContext.profile?.characterName || 'Joueur'
  
  // Déterminer le mode de synchronisation
  const syncMode = isOwner ? 'master' : (currentParticipant?.syncMode || 'syncWithMaster')
  const syncGroupId = currentParticipant?.syncGroupId || null

  // === MODE ASYNCHRONE INDÉPENDANT ===
  if (syncMode === 'asyncIndependent') {
    return handleAsyncResponse(res, messages, game, playerName, gameId, gameChats)
  }

  // === MODE SOUS-GROUPE ===
  if (syncMode === 'syncWithGroup' && syncGroupId) {
    return handleSubGroupSync(res, messages, game, userId, playerName, syncGroupId, gameId, pendingActions, gameChats)
  }

  // === MODE SYNCHRONE AVEC LE MAÎTRE (fil principal) ===
  return handleMasterSync(res, messages, game, userId, playerName, isOwner, gameId, pendingActions, gameChats)
}

// Réponse asynchrone immédiate
async function handleAsyncResponse(res, messages, game, playerName, gameId, gameChats) {
  const asyncSystemAddition = `

═══════════════════════════════════════════
MODE ASYNCHRONE INDÉPENDANT - ${playerName}
═══════════════════════════════════════════
Ce joueur évolue de manière indépendante dans l'histoire.
Son fil narratif est séparé du fil principal mais dans le même univers.
Autres participants: ${game.participants?.map(p => p.characterName).join(', ') || 'Aucun'}
Génère une réponse personnalisée pour ${playerName}.`

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

  await gameChats.insertOne({
    gameId,
    userId: 'system',
    characterName: 'Système',
    content: `🎭 ${playerName} agit de son côté (async)`,
    createdAt: new Date(),
    isSystem: true
  })

  return res.status(200).json({
    ...parseAIResponse(content),
    syncMode: 'asyncIndependent'
  })
}

// Synchronisation au sein d'un sous-groupe
async function handleSubGroupSync(res, messages, game, userId, playerName, syncGroupId, gameId, pendingActions, gameChats) {
  const group = game.syncGroups?.find(g => g.id === syncGroupId)
  if (!group) {
    // Groupe disparu, revenir en async
    return handleAsyncResponse(res, messages, game, playerName, gameId, gameChats)
  }

  const groupMembers = group.members || []
  const activeGroupMembers = game.participants?.filter(
    p => groupMembers.includes(p.userId) && p.status === 'active'
  ) || []

  // Enregistrer l'action avec le contexte du groupe
  await pendingActions.updateOne(
    { gameId, userId, syncGroupId },
    { 
      $set: {
        gameId,
        userId,
        syncGroupId,
        playerName,
        action: messages[messages.length - 1]?.content || '',
        submittedAt: new Date()
      }
    },
    { upsert: true }
  )

  // Compter les actions du groupe
  const groupPendingCount = await pendingActions.countDocuments({ gameId, syncGroupId })

  if (groupPendingCount < activeGroupMembers.length) {
    await gameChats.insertOne({
      gameId,
      userId: 'system',
      characterName: 'Système',
      content: `⏳ [${group.name}] ${playerName} a répondu (${groupPendingCount}/${activeGroupMembers.length})`,
      createdAt: new Date(),
      isSystem: true
    })

    return res.status(200).json({
      content: `⏳ Action enregistrée ! En attente du groupe "${group.name}" (${groupPendingCount}/${activeGroupMembers.length})...`,
      waiting: true,
      pendingCount: groupPendingCount,
      totalPlayers: activeGroupMembers.length,
      groupName: group.name
    })
  }

  // Tous les membres du groupe ont répondu
  const groupActions = await pendingActions.find({ gameId, syncGroupId }).toArray()
  const actionsContext = groupActions.map(a => `${a.playerName}: "${a.action}"`).join('\n')

  const groupSystemAddition = `

═══════════════════════════════════════════
SOUS-GROUPE "${group.name}" - ACTIONS SYNCHRONISÉES
═══════════════════════════════════════════
Ce groupe agit de manière indépendante du fil principal.
Membres: ${activeGroupMembers.map(p => p.characterName).join(', ')}

Actions:
${actionsContext}

Génère une réponse pour ce sous-groupe. Leurs actions sont synchronisées entre eux
mais indépendantes du maître et du fil principal.`

  const modifiedMessages = [...messages]
  if (modifiedMessages[0]?.role === 'system') {
    modifiedMessages[0].content += groupSystemAddition
  }
  modifiedMessages[modifiedMessages.length - 1] = {
    role: 'user',
    content: `[Actions du groupe ${group.name}]\n${actionsContext}`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: modifiedMessages,
    temperature: 0.85,
    max_tokens: 2000,
    presence_penalty: 0.3,
    frequency_penalty: 0.2
  })

  const content = completion.choices[0].message.content

  // Nettoyer les actions du groupe
  await pendingActions.deleteMany({ gameId, syncGroupId })

  await gameChats.insertOne({
    gameId,
    userId: 'system',
    characterName: 'Système',
    content: `✨ [${group.name}] Le groupe a agi ensemble !`,
    createdAt: new Date(),
    isSystem: true
  })

  return res.status(200).json({
    ...parseAIResponse(content),
    syncComplete: true,
    syncMode: 'syncWithGroup',
    groupName: group.name,
    playerActions: groupActions.map(a => ({ name: a.playerName, action: a.action }))
  })
}

// Synchronisation avec le maître (fil principal)
async function handleMasterSync(res, messages, game, userId, playerName, isOwner, gameId, pendingActions, gameChats) {
  // Joueurs synchronisés avec le maître
  const masterSyncParticipants = game.participants?.filter(
    p => p.syncMode === 'syncWithMaster' && p.status === 'active'
  ) || []
  
  // Total = participants sync + maître (si il joue)
  const totalMasterSync = masterSyncParticipants.length + (game.masterOnlyWatch ? 0 : 1)

  // Enregistrer l'action (contexte maître)
  await pendingActions.updateOne(
    { gameId, userId, syncGroupId: null },
    { 
      $set: {
        gameId,
        userId,
        syncGroupId: null, // null = fil principal
        playerName,
        isOwner,
        action: messages[messages.length - 1]?.content || '',
        submittedAt: new Date()
      }
    },
    { upsert: true }
  )

  // Compter les actions du fil principal
  const masterPendingCount = await pendingActions.countDocuments({ gameId, syncGroupId: null })

  if (masterPendingCount < totalMasterSync) {
    await gameChats.insertOne({
      gameId,
      userId: 'system',
      characterName: 'Système',
      content: `⏳ [Fil principal] ${playerName} a répondu (${masterPendingCount}/${totalMasterSync})`,
      createdAt: new Date(),
      isSystem: true
    })

    return res.status(200).json({
      content: `⏳ Action enregistrée ! En attente des joueurs du fil principal (${masterPendingCount}/${totalMasterSync})...`,
      waiting: true,
      pendingCount: masterPendingCount,
      totalPlayers: totalMasterSync,
      isMasterThread: true
    })
  }

  // Tous les joueurs du fil principal ont répondu
  const masterActions = await pendingActions.find({ gameId, syncGroupId: null }).toArray()
  const actionsContext = masterActions.map(a => 
    `${a.isOwner ? '👑 ' : ''}${a.playerName}: "${a.action}"`
  ).join('\n')

  const masterSystemAddition = `

═══════════════════════════════════════════
FIL PRINCIPAL - ACTIONS SYNCHRONISÉES
═══════════════════════════════════════════
Le maître et les joueurs synchrones agissent ensemble sur le fil principal.

Actions:
${actionsContext}

Génère une réponse cohérente qui prend en compte toutes ces actions.
L'action du maître (👑) guide le fil narratif principal.`

  const modifiedMessages = [...messages]
  if (modifiedMessages[0]?.role === 'system') {
    modifiedMessages[0].content += masterSystemAddition
  }
  modifiedMessages[modifiedMessages.length - 1] = {
    role: 'user',
    content: `[Actions du fil principal]\n${actionsContext}`
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: modifiedMessages,
    temperature: 0.85,
    max_tokens: 2000,
    presence_penalty: 0.3,
    frequency_penalty: 0.2
  })

  const content = completion.choices[0].message.content

  // Nettoyer les actions du fil principal
  await pendingActions.deleteMany({ gameId, syncGroupId: null })

  await gameChats.insertOne({
    gameId,
    userId: 'system',
    characterName: 'Système',
    content: `✨ [Fil principal] L'histoire avance !`,
    createdAt: new Date(),
    isSystem: true
  })

  return res.status(200).json({
    ...parseAIResponse(content),
    syncComplete: true,
    syncMode: 'syncWithMaster',
    isMasterThread: true,
    playerActions: masterActions.map(a => ({ 
      name: a.playerName, 
      action: a.action,
      isOwner: a.isOwner 
    }))
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

  const removedItems = []
  const removeMatches = content.matchAll(/\[RETIRER:\s*([^\]]+)\]/g)
  for (const match of removeMatches) {
    removedItems.push(match[1].trim())
  }

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
