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
  const liveTyping = await getCollection('live_typing')
  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

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
        action: p.action,
        submittedAt: p.submittedAt,
        isOwner: p.isOwner || false
      }))

      // Qui n'a pas encore répondu - avec leurs noms
      const allSyncPlayerIds = [
        ...(game.masterOnlyWatch ? [] : [game.ownerId || game.userId]),
        ...syncParticipants.map(p => p.userId)
      ]
      const submittedIds = new Set(pending.map(p => p.userId))
      const waitingForIds = allSyncPlayerIds.filter(id => !submittedIds.has(id))
      
      // Récupérer les noms des joueurs en attente
      const waitingForNames = []
      for (const playerId of waitingForIds) {
        // Chercher dans participants
        const participant = syncParticipants.find(p => p.userId === playerId)
        if (participant?.characterName) {
          waitingForNames.push({ userId: playerId, playerName: participant.characterName })
        } else {
          // C'est le maître - chercher dans les profils
          const profile = await profiles.findOne({
            $or: [{ userId: playerId }, { id: playerId }]
          })
          waitingForNames.push({ 
            userId: playerId, 
            playerName: profile?.characterName || 'Maître du jeu' 
          })
        }
      }

      // Récupérer les actions en cours de frappe (live typing) - dernières 10 secondes
      const recentTyping = await liveTyping.find({
        gameId,
        updatedAt: { $gte: new Date(Date.now() - 10000) }
      }).toArray()
      
      const typingPlayers = recentTyping
        .filter(t => t.userId !== userId) // Ne pas montrer son propre typing
        .map(t => ({
          userId: t.userId,
          playerName: t.playerName,
          preview: t.text?.substring(0, 50) + (t.text?.length > 50 ? '...' : '') || '',
          isTyping: t.text && t.text.length > 0
        }))

      return res.status(200).json({
        pending: pending.length,
        total: totalSyncPlayers,
        submittedPlayers,
        waitingFor: waitingForIds,
        waitingForNames,
        typingPlayers,
        allSubmitted: pending.length >= totalSyncPlayers
      })
    } catch (error) {
      console.error('Get pending actions error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }
  
  // POST - Enregistrer une action en cours de frappe (live typing)
  if (req.method === 'POST') {
    try {
      const { text } = req.body
      
      // Récupérer le nom du joueur
      const profile = await profiles.findOne({
        $or: [{ userId }, { id: userId }]
      })
      
      // Mettre à jour ou supprimer si texte vide
      if (text && text.trim().length > 0) {
        await liveTyping.updateOne(
          { gameId, userId },
          {
            $set: {
              gameId,
              userId,
              playerName: profile?.characterName || 'Joueur',
              text: text.substring(0, 100),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        )
      } else {
        // Supprimer si texte vide (joueur a effacé ou envoyé)
        await liveTyping.deleteOne({ gameId, userId })
      }
      
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Update live typing error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // DELETE - Annuler son action en attente
  if (req.method === 'DELETE') {
    try {
      await pendingActions.deleteOne({ gameId, userId: userId })
      await liveTyping.deleteOne({ gameId, userId }) // Nettoyer aussi le typing
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Delete pending action error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
