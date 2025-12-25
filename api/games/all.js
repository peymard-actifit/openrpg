import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

const ADMIN_CODE = '12411241'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  // Vérifier le statut admin
  const users = await getCollection('users')
  // Chercher par id string OU par _id ObjectId
  const user = await users.findOne({ 
    $or: [
      { id: userId },
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null }
    ]
  })
  
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Accès non autorisé' })
  }

  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

  // GET - Toutes les parties de tous les utilisateurs (admin)
  if (req.method === 'GET') {
    try {
      // Récupérer TOUTES les parties (actives et archivées) de tous les joueurs
      const allGames = await games
        .find({})
        .sort({ updatedAt: -1 })
        .toArray()

      // Récupérer les profils pour avoir les noms
      const userIds = [...new Set(allGames.map(g => g.userId))]
      const allProfiles = await profiles.find({ userId: { $in: userIds } }).toArray()
      const profileMap = {}
      allProfiles.forEach(p => { profileMap[p.userId] = p.characterName })

      // Vérifier le statut admin des joueurs
      const allUsers = await users.find({}).toArray()
      const adminUserIds = new Set()
      allUsers.forEach(u => {
        if (u.isAdmin) {
          // Gérer les deux formats d'ID possibles
          if (u.id) adminUserIds.add(u.id)
          if (u._id) adminUserIds.add(u._id.toString())
        }
      })

      // Vérifier le statut en ligne des joueurs
      const presence = await getCollection('presence')
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const onlineUsers = await presence.find({ 
        lastSeen: { $gte: fiveMinutesAgo } 
      }).toArray()
      const onlineUserIds = new Set(onlineUsers.map(u => u.userId))

      return res.status(200).json(
        allGames.map(g => ({
          ...g,
          id: g._id.toString(),
          _id: undefined,
          playerName: profileMap[g.userId] || 'Inconnu',
          playerOnline: onlineUserIds.has(g.userId),
          playerIsAdmin: adminUserIds.has(g.userId),
          // Indique si le créateur a supprimé la partie (soft delete)
          deletedByOwner: g.deletedByOwner || null
        }))
      )
    } catch (error) {
      console.error('Get all games error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}




