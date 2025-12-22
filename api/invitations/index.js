import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const invitations = await getCollection('invitations')
  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

  // GET - Liste des invitations reçues en attente
  if (req.method === 'GET') {
    try {
      const pendingInvitations = await invitations.find({
        toUserId: uid,
        status: 'pending'
      }).sort({ createdAt: -1 }).toArray()

      const enriched = await Promise.all(pendingInvitations.map(async (inv) => {
        const game = await games.findOne({ _id: new ObjectId(inv.gameId) })
        const fromProfile = await profiles.findOne({ 
          $or: [{ userId: inv.fromUserId }, { id: inv.fromUserId }]
        })
        
        return {
          id: inv._id.toString(),
          gameId: inv.gameId,
          gameTitle: game?.title || 'Partie inconnue',
          gamePrompt: game?.initialPrompt || '',
          fromUserId: inv.fromUserId,
          fromName: fromProfile?.characterName || 'Joueur',
          mode: inv.mode || 'sync',
          createdAt: inv.createdAt
        }
      }))

      return res.status(200).json(enriched)
    } catch (error) {
      console.error('Get invitations error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Envoyer une invitation
  if (req.method === 'POST') {
    try {
      const { gameId, toUserId, mode = 'sync' } = req.body

      if (!gameId || !toUserId) {
        return res.status(400).json({ error: 'gameId et toUserId requis' })
      }

      const game = await games.findOne({ _id: new ObjectId(gameId) })
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }
      if (game.userId !== uid && game.ownerId !== uid) {
        return res.status(403).json({ error: 'Seul le créateur peut inviter' })
      }

      const existing = await invitations.findOne({
        gameId,
        toUserId,
        status: 'pending'
      })
      if (existing) {
        return res.status(400).json({ error: 'Invitation déjà envoyée' })
      }

      const invitation = {
        gameId,
        fromUserId: uid,
        toUserId,
        mode,
        status: 'pending',
        createdAt: new Date()
      }

      const result = await invitations.insertOne(invitation)

      return res.status(201).json({
        ...invitation,
        id: result.insertedId.toString()
      })
    } catch (error) {
      console.error('Send invitation error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
