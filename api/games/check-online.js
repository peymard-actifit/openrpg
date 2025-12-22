import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query
  const games = await getCollection('games')
  const presence = await getCollection('presence')

  try {
    const game = await games.findOne({ _id: new ObjectId(gameId) })
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvée' })
    }

    const thirtySecondsAgo = new Date(Date.now() - 30000)

    // Vérifier si le maître est en ligne
    const ownerPresence = await presence.findOne({
      userId: game.ownerId || game.userId,
      lastSeen: { $gte: thirtySecondsAgo }
    })

    const masterOnline = !!ownerPresence

    // Vérifier les participants
    const participantsStatus = await Promise.all(
      (game.participants || []).map(async (p) => {
        const pPresence = await presence.findOne({
          userId: p.userId,
          lastSeen: { $gte: thirtySecondsAgo }
        })
        return {
          userId: p.userId,
          characterName: p.characterName,
          mode: p.mode,
          status: p.status,
          isOnline: !!pPresence
        }
      })
    )

    // Mettre à jour automatiquement les joueurs sync déconnectés en pause
    for (const p of participantsStatus) {
      if (p.mode === 'sync' && !p.isOnline && p.status === 'active') {
        await games.updateOne(
          { _id: new ObjectId(gameId), 'participants.userId': p.userId },
          { $set: { 'participants.$.status': 'paused' } }
        )
      } else if (p.mode === 'sync' && p.isOnline && p.status === 'paused') {
        // Remettre actif si revenu en ligne
        await games.updateOne(
          { _id: new ObjectId(gameId), 'participants.userId': p.userId },
          { $set: { 'participants.$.status': 'active' } }
        )
      }
    }

    // Déterminer si la partie est accessible
    const isOwner = game.ownerId === userId || game.userId === userId
    const canPlay = isOwner || masterOnline || game.masterOnlyWatch

    return res.status(200).json({
      masterOnline,
      masterOnlyWatch: game.masterOnlyWatch,
      participants: participantsStatus,
      canPlay,
      isOwner
    })
  } catch (error) {
    console.error('Check online error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

