import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    const games = await getCollection('games')
    const messages = await getCollection('messages')

    // Récupérer toutes les parties actives
    const activeGames = await games
      .find({ userId, status: 'active' })
      .toArray()

    const updates = []

    for (const game of activeGames) {
      // Récupérer les 2 derniers messages de l'IA
      const lastMessages = await messages
        .find({ gameId: game._id.toString(), role: 'assistant' })
        .sort({ createdAt: -1 })
        .limit(2)
        .toArray()

      for (const msg of lastMessages) {
        const content = msg.content || ''
        
        // Détecter victoire
        const victoryMatch = content.match(/\[VICTOIRE:\s*([^\]]+)\]/)
        if (victoryMatch) {
          updates.push({
            gameId: game._id,
            update: {
              status: 'archived',
              victory: true,
              victoryReason: victoryMatch[1]
            }
          })
          break
        }
        
        // Détecter mort
        const deathMatch = content.match(/\[MORT:\s*([^\]]+)\]/)
        if (deathMatch) {
          updates.push({
            gameId: game._id,
            update: {
              status: 'archived',
              victory: false,
              deathReason: deathMatch[1]
            }
          })
          break
        }
      }
    }

    // Appliquer les mises à jour
    for (const { gameId, update } of updates) {
      await games.updateOne(
        { _id: gameId },
        { $set: { ...update, updatedAt: new Date() } }
      )
    }

    return res.status(200).json({ 
      checked: activeGames.length,
      archived: updates.length,
      details: updates.map(u => ({
        gameId: u.gameId.toString(),
        victory: u.update.victory
      }))
    })
  } catch (error) {
    console.error('Check finished error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

