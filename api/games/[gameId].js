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
  
  // Vérifier si l'utilisateur est admin
  const users = await getCollection('users')
  const currentUser = await users.findOne({
    $or: [
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
      { id: userId }
    ]
  })
  const isAdmin = currentUser?.isAdmin === true

  // GET - Récupérer une partie (propriétaire, participant OU admin)
  if (req.method === 'GET') {
    try {
      let game
      
      if (isAdmin) {
        // Admin peut voir toutes les parties
        game = await games.findOne({ _id: new ObjectId(gameId) })
      } else {
        // Utilisateur normal : seulement ses parties ou celles où il participe
        game = await games.findOne({ 
          _id: new ObjectId(gameId),
          $or: [
            { userId },
            { ownerId: userId },
            { 'participants.userId': userId, 'participants.status': { $in: ['active', 'paused'] } }
          ]
        })
      }

      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      return res.status(200).json({
        ...game,
        id: game._id.toString(),
        _id: undefined,
        isAdminView: isAdmin && game.userId !== userId && game.ownerId !== userId
      })
    } catch (error) {
      console.error('Get game error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // PATCH - Mettre à jour une partie (propriétaire OU participant actif)
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
        { 
          _id: new ObjectId(gameId),
          $or: [
            { userId },
            { ownerId: userId },
            { 'participants.userId': userId, 'participants.status': 'active' }
          ]
        },
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

  // DELETE - Supprimer une partie (propriétaire OU admin)
  if (req.method === 'DELETE') {
    try {
      // Vérifier que la partie existe
      const game = await games.findOne({ _id: new ObjectId(gameId) })
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }
      
      // Vérifier les droits (propriétaire ou admin)
      if (game.userId !== userId && game.ownerId !== userId && !isAdmin) {
        return res.status(403).json({ error: 'Non autorisé à supprimer cette partie' })
      }
      
      // Supprimer les messages associés
      const messages = await getCollection('messages')
      await messages.deleteMany({ gameId })
      
      // Supprimer les chats de groupe associés
      const gameChats = await getCollection('game_chats')
      await gameChats.deleteMany({ gameId })
      
      // Supprimer la partie
      await games.deleteOne({ _id: new ObjectId(gameId) })

      return res.status(200).json({ success: true, deleted: game.title })
    } catch (error) {
      console.error('Delete game error:', error)
      return res.status(500).json({ error: 'Erreur lors de la suppression' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
