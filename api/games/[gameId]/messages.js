import { ObjectId } from 'mongodb'
import { getCollection } from '../../lib/mongodb.js'
import { getUserIdFromRequest } from '../../lib/auth.js'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query
  
  if (!gameId || !ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: 'ID de partie invalide' })
  }

  // Vérifier que l'utilisateur a accès à la partie (propriétaire ou participant)
  const games = await getCollection('games')
  const game = await games.findOne({ 
    _id: new ObjectId(gameId),
    $or: [
      { userId },
      { ownerId: userId },
      { 'participants.userId': userId, 'participants.status': { $in: ['active', 'paused'] } }
    ]
  })
  
  if (!game) {
    return res.status(404).json({ error: 'Partie non trouvée' })
  }

  const messages = await getCollection('messages')

  // GET - Récupérer les messages
  if (req.method === 'GET') {
    try {
      const gameMessages = await messages
        .find({ gameId })
        .sort({ createdAt: 1 })
        .toArray()

      return res.status(200).json(
        gameMessages.map(m => ({
          ...m,
          id: m._id.toString(),
          _id: undefined
        }))
      )
    } catch (error) {
      console.error('Get messages error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Ajouter un message
  if (req.method === 'POST') {
    try {
      const { role, content } = req.body

      if (!role || !content) {
        return res.status(400).json({ error: 'Role et contenu requis' })
      }

      const message = {
        gameId,
        role,
        content,
        createdAt: new Date()
      }

      const result = await messages.insertOne(message)

      return res.status(201).json({
        ...message,
        id: result.insertedId.toString()
      })
    } catch (error) {
      console.error('Create message error:', error)
      return res.status(500).json({ error: 'Erreur lors de l\'ajout du message' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}



