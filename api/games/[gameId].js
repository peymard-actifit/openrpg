import { ObjectId } from 'mongodb'
import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query
  
  if (!gameId || !ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: 'ID de partie invalide' })
  }

  const games = await getCollection('games')

  // GET - Récupérer une partie
  if (req.method === 'GET') {
    try {
      const game = await games.findOne({ 
        _id: new ObjectId(gameId),
        userId 
      })

      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      return res.status(200).json({
        ...game,
        id: game._id.toString(),
        _id: undefined
      })
    } catch (error) {
      console.error('Get game error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // PATCH - Mettre à jour une partie
  if (req.method === 'PATCH') {
    try {
      const updates = req.body
      
      // Champs autorisés pour mise à jour
      const allowedUpdates = [
        'status', 
        'level', 
        'currentStats', 
        'deathReason',
        'victory',
        'victoryReason',
        'inventory',
        'alignment',
        'rerolls'
      ]
      
      const filteredUpdates = {}
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key]
        }
      }
      
      filteredUpdates.updatedAt = new Date()

      const result = await games.updateOne(
        { _id: new ObjectId(gameId), userId },
        { $set: filteredUpdates }
      )

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      const updatedGame = await games.findOne({ _id: new ObjectId(gameId) })

      return res.status(200).json({
        ...updatedGame,
        id: updatedGame._id.toString(),
        _id: undefined
      })
    } catch (error) {
      console.error('Update game error:', error)
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
    }
  }

  // DELETE - Supprimer une partie
  if (req.method === 'DELETE') {
    try {
      // Supprimer aussi les messages associés
      const messages = await getCollection('messages')
      await messages.deleteMany({ gameId })
      
      const result = await games.deleteOne({ 
        _id: new ObjectId(gameId), 
        userId 
      })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete game error:', error)
      return res.status(500).json({ error: 'Erreur lors de la suppression' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
