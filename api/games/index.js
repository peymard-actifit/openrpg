import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  const currentUserId = getUserIdFromRequest(req)
  if (!currentUserId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const games = await getCollection('games')

  // GET - Liste des parties (propres + invité)
  if (req.method === 'GET') {
    try {
      const userGames = await games
        .find({ 
          $or: [
            { userId: currentUserId },
            { 'participants.userId': currentUserId, 'participants.status': { $ne: 'removed' } }
          ]
        })
        .sort({ createdAt: -1 })
        .toArray()

      return res.status(200).json(
        userGames.map(g => ({
          ...g,
          id: g._id.toString(),
          _id: undefined
        }))
      )
    } catch (error) {
      console.error('Get games error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Créer une partie
  if (req.method === 'POST') {
    try {
      const { title, initialPrompt, currentStats } = req.body

      if (!title || !initialPrompt) {
        return res.status(400).json({ error: 'Titre et contexte requis' })
      }

      const game = {
        userId: currentUserId,
        ownerId: currentUserId,
        title,
        initialPrompt,
        status: 'active',
        level: 1,
        currentStats: currentStats || {},
        inventory: [],
        alignment: { goodEvil: 0, lawChaos: 0 },
        rerolls: 0,
        victory: false,
        victoryReason: null,
        deathReason: null,
        isMultiplayer: false,
        participants: [],
        masterOnlyWatch: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await games.insertOne(game)

      return res.status(201).json({
        ...game,
        id: result.insertedId.toString()
      })
    } catch (error) {
      console.error('Create game error:', error)
      return res.status(500).json({ error: 'Erreur lors de la création de la partie' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
