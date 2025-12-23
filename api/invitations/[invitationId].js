import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { invitationId } = req.query
  const invitations = await getCollection('invitations')
  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

  // POST - Accepter ou refuser une invitation
  if (req.method === 'POST') {
    try {
      const { action } = req.body

      if (!action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Action invalide' })
      }

      const invitation = await invitations.findOne({ 
        _id: new ObjectId(invitationId),
        toUserId: uid,
        status: 'pending'
      })

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation non trouvée' })
      }

      if (action === 'decline') {
        await invitations.updateOne(
          { _id: new ObjectId(invitationId) },
          { $set: { status: 'declined', respondedAt: new Date() } }
        )
        return res.status(200).json({ success: true, status: 'declined' })
      }

      // Accepter l'invitation
      await invitations.updateOne(
        { _id: new ObjectId(invitationId) },
        { $set: { status: 'accepted', respondedAt: new Date() } }
      )

      const profile = await profiles.findOne({ 
        $or: [{ userId: uid }, { id: uid }]
      })

      const game = await games.findOne({ _id: new ObjectId(invitation.gameId) })
      
      // Convertir mode simple en syncMode pour compatibilité avec le chat
      const mode = invitation.mode || 'sync'
      const syncMode = mode === 'sync' ? 'syncWithMaster' : 'asyncIndependent'
      
      const participant = {
        userId: uid,
        characterName: profile?.characterName || 'Joueur',
        mode: mode,
        syncMode: syncMode,
        syncGroupId: null,
        status: 'active',
        joinedAt: new Date(),
        stats: profile?.stats || {}
      }

      await games.updateOne(
        { _id: new ObjectId(invitation.gameId) },
        { 
          $set: { 
            isMultiplayer: true,
            ownerId: game.ownerId || game.userId
          },
          $push: { participants: participant }
        }
      )

      return res.status(200).json({ 
        success: true, 
        status: 'accepted',
        gameId: invitation.gameId
      })
    } catch (error) {
      console.error('Respond invitation error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
