import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const chats = await getCollection('game_chats')
  const profiles = await getCollection('profiles')
  const { gameId } = req.query

  // GET - Récupérer les messages du chat
  if (req.method === 'GET') {
    try {
      const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 3600000) // Dernière heure par défaut
      
      const messages = await chats.find({
        gameId,
        createdAt: { $gte: since }
      }).sort({ createdAt: 1 }).limit(100).toArray()

      return res.status(200).json(
        messages.map(m => ({
          id: m._id.toString(),
          userId: m.userId,
          characterName: m.characterName,
          content: m.content,
          createdAt: m.createdAt,
          isSystem: m.isSystem || false
        }))
      )
    } catch (error) {
      console.error('Get chat error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Envoyer un message
  if (req.method === 'POST') {
    try {
      const { content, isSystem = false } = req.body

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Contenu requis' })
      }

      const profile = await profiles.findOne({
        $or: [{ userId: uid }, { id: uid }]
      })

      const message = {
        gameId,
        userId: uid,
        characterName: profile?.characterName || 'Joueur',
        content: content.trim().substring(0, 500), // Limite 500 caractères
        createdAt: new Date(),
        isSystem
      }

      const result = await chats.insertOne(message)

      return res.status(201).json({
        id: result.insertedId.toString(),
        ...message
      })
    } catch (error) {
      console.error('Send chat error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

