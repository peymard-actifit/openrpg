import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query
  const pendingActions = await getCollection('pending_actions')
  const games = await getCollection('games')

  // GET - Récupérer le statut des actions en attente
  if (req.method === 'GET') {
    try {
      const game = await games.findOne({ _id: new ObjectId(gameId) })
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      const syncParticipants = game.participants?.filter(p => p.mode === 'sync' && p.status === 'active') || []
      const totalSyncPlayers = syncParticipants.length + (game.masterOnlyWatch ? 0 : 1)

      const pending = await pendingActions.find({ gameId }).toArray()
      const submittedPlayers = pending.map(p => ({
        userId: p.userId,
        playerName: p.playerName,
        submittedAt: p.submittedAt
      }))

      // Qui n'a pas encore répondu
      const allSyncPlayerIds = [
        ...(game.masterOnlyWatch ? [] : [game.ownerId || game.userId]),
        ...syncParticipants.map(p => p.userId)
      ]
      const submittedIds = new Set(pending.map(p => p.userId))
      const waitingFor = allSyncPlayerIds.filter(id => !submittedIds.has(id))

      return res.status(200).json({
        pending: pending.length,
        total: totalSyncPlayers,
        submittedPlayers,
        waitingFor,
        allSubmitted: pending.length >= totalSyncPlayers
      })
    } catch (error) {
      console.error('Get pending actions error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // DELETE - Annuler son action en attente
  if (req.method === 'DELETE') {
    try {
      await pendingActions.deleteOne({ gameId, userId: userId })
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete pending action error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

