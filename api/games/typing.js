import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query
  const typing = await getCollection('typing_status')
  const profiles = await getCollection('profiles')

  // GET - Récupérer qui tape
  if (req.method === 'GET') {
    try {
      // Nettoyer les anciennes entrées (plus de 5 secondes)
      const cutoff = new Date(Date.now() - 5000)
      await typing.deleteMany({ updatedAt: { $lt: cutoff } })

      // Récupérer les joueurs qui tapent
      const typingPlayers = await typing.find({ gameId }).toArray()
      
      // Exclure l'utilisateur courant
      const others = typingPlayers.filter(t => t.userId !== userId)

      return res.status(200).json({
        typing: others.map(t => ({
          userId: t.userId,
          playerName: t.playerName,
          draft: t.draft || ''
        }))
      })
    } catch (error) {
      console.error('Get typing error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Signaler qu'on tape / mettre à jour le brouillon
  if (req.method === 'POST') {
    try {
      const { draft = '', isTyping = true } = req.body

      if (!isTyping) {
        // Arrêter de taper
        await typing.deleteOne({ gameId, userId })
        return res.status(200).json({ success: true })
      }

      // Récupérer le nom du joueur
      const profile = await profiles.findOne({
        $or: [{ userId }, { id: userId }]
      })

      await typing.updateOne(
        { gameId, userId },
        {
          $set: {
            gameId,
            userId,
            playerName: profile?.characterName || 'Joueur',
            draft: draft.substring(0, 100), // Limiter la preview
            updatedAt: new Date()
          }
        },
        { upsert: true }
      )

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Set typing error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // DELETE - Arrêter de taper
  if (req.method === 'DELETE') {
    try {
      await typing.deleteOne({ gameId, userId })
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete typing error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

