import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

/**
 * Gestion des groupes de synchronisation
 * 
 * Structure d'un participant:
 * {
 *   userId: string,
 *   characterName: string,
 *   syncMode: 'master' | 'syncWithMaster' | 'asyncIndependent' | 'syncWithGroup',
 *   syncGroupId: string | null,  // ID du sous-groupe si syncWithGroup
 *   status: 'active' | 'paused' | 'removed',
 *   ...
 * }
 * 
 * Structure des syncGroups dans la partie:
 * {
 *   syncGroups: [
 *     {
 *       id: string,
 *       name: string,
 *       leaderId: string,  // Premier joueur qui a créé le groupe
 *       members: [userId1, userId2],
 *       createdAt: Date
 *     }
 *   ]
 * }
 */

export default async function handler(req, res) {
  const currentUserId = getUserIdFromRequest(req)
  if (!currentUserId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const games = await getCollection('games')
  const gameChats = await getCollection('game_chats')
  const { gameId } = req.query

  const game = await games.findOne({ _id: new ObjectId(gameId) })
  if (!game) {
    return res.status(404).json({ error: 'Partie non trouvée' })
  }

  const isOwner = game.ownerId === currentUserId || game.userId === currentUserId

  // GET - Récupérer les groupes et le mode du joueur
  if (req.method === 'GET') {
    const participant = game.participants?.find(p => p.userId === currentUserId)
    
    return res.status(200).json({
      isOwner,
      currentMode: isOwner ? 'master' : (participant?.syncMode || 'syncWithMaster'),
      currentGroupId: participant?.syncGroupId || null,
      syncGroups: game.syncGroups || [],
      participants: (game.participants || []).map(p => ({
        userId: p.userId,
        characterName: p.characterName,
        syncMode: p.syncMode || 'syncWithMaster',
        syncGroupId: p.syncGroupId || null,
        status: p.status
      }))
    })
  }

  // POST - Actions sur les groupes
  if (req.method === 'POST') {
    const { action, targetUserId, groupId, groupName } = req.body

    try {
      // Changer son propre mode de sync
      if (action === 'changeMode') {
        const { newMode } = req.body
        
        if (!['syncWithMaster', 'asyncIndependent', 'syncWithGroup'].includes(newMode)) {
          return res.status(400).json({ error: 'Mode invalide' })
        }

        // Si on quitte un groupe, on passe en async
        const updates = {
          'participants.$.syncMode': newMode,
          'participants.$.syncGroupId': newMode === 'syncWithGroup' ? groupId : null
        }

        await games.updateOne(
          { _id: new ObjectId(gameId), 'participants.userId': currentUserId },
          { $set: updates }
        )

        // Message système
        const participant = game.participants?.find(p => p.userId === currentUserId)
        const modeLabel = {
          'syncWithMaster': '🔗 synchrone avec le maître',
          'asyncIndependent': '📨 asynchrone (indépendant)',
          'syncWithGroup': `👥 synchrone avec un sous-groupe`
        }
        
        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `${participant?.characterName || 'Joueur'} passe en mode ${modeLabel[newMode]}`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Créer un sous-groupe
      if (action === 'createGroup') {
        const newGroupId = new ObjectId().toString()
        const newGroup = {
          id: newGroupId,
          name: groupName || `Groupe ${(game.syncGroups?.length || 0) + 1}`,
          leaderId: currentUserId,
          members: [currentUserId],
          createdAt: new Date()
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $push: { syncGroups: newGroup },
            $set: { 
              'participants.$[elem].syncMode': 'syncWithGroup',
              'participants.$[elem].syncGroupId': newGroupId
            }
          },
          { arrayFilters: [{ 'elem.userId': currentUserId }] }
        )

        const participant = game.participants?.find(p => p.userId === currentUserId)
        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `👥 ${participant?.characterName || 'Joueur'} a créé le groupe "${newGroup.name}"`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true, groupId: newGroupId })
      }

      // Rejoindre un sous-groupe
      if (action === 'joinGroup') {
        if (!groupId) {
          return res.status(400).json({ error: 'groupId requis' })
        }

        const group = game.syncGroups?.find(g => g.id === groupId)
        if (!group) {
          return res.status(404).json({ error: 'Groupe non trouvé' })
        }

        await games.updateOne(
          { _id: new ObjectId(gameId), 'syncGroups.id': groupId },
          { 
            $addToSet: { 'syncGroups.$.members': currentUserId },
            $set: { 
              'participants.$[elem].syncMode': 'syncWithGroup',
              'participants.$[elem].syncGroupId': groupId
            }
          },
          { arrayFilters: [{ 'elem.userId': currentUserId }] }
        )

        const participant = game.participants?.find(p => p.userId === currentUserId)
        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `👥 ${participant?.characterName || 'Joueur'} a rejoint le groupe "${group.name}"`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Quitter un sous-groupe (revenir en async ou sync maître)
      if (action === 'leaveGroup') {
        const { returnMode = 'asyncIndependent' } = req.body
        const currentGroup = game.syncGroups?.find(g => g.members?.includes(currentUserId))
        
        if (currentGroup) {
          await games.updateOne(
            { _id: new ObjectId(gameId), 'syncGroups.id': currentGroup.id },
            { $pull: { 'syncGroups.$.members': currentUserId } }
          )
        }

        await games.updateOne(
          { _id: new ObjectId(gameId), 'participants.userId': currentUserId },
          { 
            $set: { 
              'participants.$.syncMode': returnMode,
              'participants.$.syncGroupId': null
            }
          }
        )

        const participant = game.participants?.find(p => p.userId === currentUserId)
        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `👤 ${participant?.characterName || 'Joueur'} a quitté le groupe`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Inviter un joueur dans son groupe (le leader peut inviter)
      if (action === 'inviteToGroup') {
        if (!targetUserId || !groupId) {
          return res.status(400).json({ error: 'targetUserId et groupId requis' })
        }

        const group = game.syncGroups?.find(g => g.id === groupId)
        if (!group) {
          return res.status(404).json({ error: 'Groupe non trouvé' })
        }

        // Vérifier que l'inviteur est dans le groupe
        if (!group.members?.includes(currentUserId)) {
          return res.status(403).json({ error: 'Non membre du groupe' })
        }

        // Ajouter une invitation pendante (le joueur devra accepter)
        await games.updateOne(
          { _id: new ObjectId(gameId), 'syncGroups.id': groupId },
          { $addToSet: { 'syncGroups.$.pendingInvites': targetUserId } }
        )

        const inviter = game.participants?.find(p => p.userId === currentUserId)
        const target = game.participants?.find(p => p.userId === targetUserId)
        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `📩 ${inviter?.characterName} invite ${target?.characterName} à rejoindre "${group.name}"`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Supprimer un groupe vide (owner ou leader uniquement)
      if (action === 'deleteGroup') {
        if (!groupId) {
          return res.status(400).json({ error: 'groupId requis' })
        }

        const group = game.syncGroups?.find(g => g.id === groupId)
        if (!group) {
          return res.status(404).json({ error: 'Groupe non trouvé' })
        }

        if (!isOwner && group.leaderId !== currentUserId) {
          return res.status(403).json({ error: 'Seul le leader ou le maître peut supprimer' })
        }

        // Remettre tous les membres en asyncIndependent
        const members = group.members || []
        for (const memberId of members) {
          await games.updateOne(
            { _id: new ObjectId(gameId), 'participants.userId': memberId },
            { 
              $set: { 
                'participants.$.syncMode': 'asyncIndependent',
                'participants.$.syncGroupId': null
              }
            }
          )
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $pull: { syncGroups: { id: groupId } } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🗑️ Le groupe "${group.name}" a été dissous`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    } catch (error) {
      console.error('Sync groups error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

