import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const games = await getCollection('games')
  const { gameId } = req.query

  // GET - Liste des participants d'une partie
  if (req.method === 'GET') {
    try {
      const game = await games.findOne({ _id: new ObjectId(gameId) })
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      return res.status(200).json({
        isMultiplayer: game.isMultiplayer || false,
        ownerId: game.ownerId || game.userId,
        participants: game.participants || [],
        masterWatching: game.masterWatching || false,
        masterOnlyWatch: game.masterOnlyWatch || false
      })
    } catch (error) {
      console.error('Get participants error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // PATCH - Modifier un participant ou les paramètres multi
  if (req.method === 'PATCH') {
    try {
      const { action, targetUserId, mode, masterOnlyWatch } = req.body

      const game = await games.findOne({ _id: new ObjectId(gameId) })
      if (!game) {
        return res.status(404).json({ error: 'Partie non trouvée' })
      }

      const isOwner = game.ownerId === uid || game.userId === uid

      // Changer mode sync/async d'un participant
      if (action === 'changeMode' && targetUserId) {
        // Seul le joueur lui-même peut changer son mode
        if (targetUserId !== uid) {
          return res.status(403).json({ error: 'Non autorisé' })
        }

        await games.updateOne(
          { 
            _id: new ObjectId(gameId),
            'participants.userId': targetUserId
          },
          { 
            $set: { 'participants.$.mode': mode }
          }
        )
        return res.status(200).json({ success: true })
      }

      // Retirer un joueur (owner uniquement)
      if (action === 'remove' && targetUserId) {
        if (!isOwner) {
          return res.status(403).json({ error: 'Seul le maître peut retirer des joueurs' })
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $set: { 'participants.$[elem].status': 'removed', 'participants.$[elem].removedAt': new Date() }
          },
          { arrayFilters: [{ 'elem.userId': targetUserId }] }
        )
        return res.status(200).json({ success: true })
      }

      // Réinviter un joueur retiré (owner uniquement)
      if (action === 'reinvite' && targetUserId) {
        if (!isOwner) {
          return res.status(403).json({ error: 'Seul le maître peut réinviter' })
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $set: { 
              'participants.$[elem].status': 'active', 
              'participants.$[elem].reinvitedAt': new Date() 
            }
          },
          { arrayFilters: [{ 'elem.userId': targetUserId }] }
        )
        return res.status(200).json({ success: true })
      }

      // Mettre en pause (joueur lui-même)
      if (action === 'pause') {
        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $set: { 'participants.$[elem].status': 'paused' }
          },
          { arrayFilters: [{ 'elem.userId': uid }] }
        )
        return res.status(200).json({ success: true })
      }

      // Reprendre (joueur lui-même, si owner en ligne)
      if (action === 'resume') {
        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $set: { 'participants.$[elem].status': 'active' }
          },
          { arrayFilters: [{ 'elem.userId': uid }] }
        )
        return res.status(200).json({ success: true })
      }

      // Mode "maître regarde seulement" (owner uniquement)
      if (typeof masterOnlyWatch === 'boolean' && isOwner) {
        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $set: { masterOnlyWatch } }
        )
        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: 'Action invalide' })
    } catch (error) {
      console.error('Update participant error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}


