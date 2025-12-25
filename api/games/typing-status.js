import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

/**
 * Gestion du statut de frappe des joueurs en mode synchrone
 * Permet de voir en temps réel ce que tapent les autres joueurs
 */

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const typingStatus = await getCollection('typing_status')
  const profiles = await getCollection('profiles')
  const games = await getCollection('games')
  const { gameId } = req.query

  // GET - Récupérer le statut de frappe de tous les joueurs
  if (req.method === 'GET') {
    try {
      // Supprimer les entrées expirées (plus de 10 secondes)
      const expireTime = new Date(Date.now() - 10000)
      await typingStatus.deleteMany({ updatedAt: { $lt: expireTime } })

      // Récupérer les statuts actifs
      const statuses = await typingStatus.find({ gameId }).toArray()

      return res.status(200).json(
        statuses.map(s => ({
          userId: s.userId,
          playerName: s.playerName,
          content: s.content,
          updatedAt: s.updatedAt
        }))
      )
    } catch (error) {
      console.error('Get typing status error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Mettre à jour son statut de frappe
  if (req.method === 'POST') {
    try {
      const { content } = req.body

      const profile = await profiles.findOne({
        $or: [{ userId }, { id: userId }]
      })

      if (!content || content.trim().length === 0) {
        // Si contenu vide, supprimer le statut
        await typingStatus.deleteOne({ gameId, userId })
        return res.status(200).json({ success: true })
      }

      // Mettre à jour ou insérer le statut
      await typingStatus.updateOne(
        { gameId, userId },
        {
          $set: {
            gameId,
            userId,
            playerName: profile?.characterName || 'Joueur',
            content: content.substring(0, 300), // Limite à 300 caractères
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Update typing status error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // DELETE - Effacer son statut de frappe
  if (req.method === 'DELETE') {
    try {
      await typingStatus.deleteOne({ gameId, userId })
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete typing status error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

