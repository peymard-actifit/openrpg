import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

const ADMIN_CODE = '12411241'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  // Vérifier le statut admin
  const users = await getCollection('users')
  const user = await users.findOne({ _id: userId })
  
  if (!user?.isAdmin) {
    return res.status(403).json({ error: 'Accès non autorisé' })
  }

  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

  // GET - Toutes les parties de tous les utilisateurs
  if (req.method === 'GET') {
    try {
      const allGames = await games
        .find({ status: 'active' })
        .sort({ updatedAt: -1 })
        .toArray()

      // Récupérer les profils pour avoir les noms
      const userIds = [...new Set(allGames.map(g => g.userId))]
      const allProfiles = await profiles.find({ userId: { $in: userIds } }).toArray()
      const profileMap = {}
      allProfiles.forEach(p => { profileMap[p.userId] = p.characterName })

      return res.status(200).json(
        allGames.map(g => ({
          ...g,
          id: g._id.toString(),
          _id: undefined,
          playerName: profileMap[g.userId] || 'Inconnu'
        }))
      )
    } catch (error) {
      console.error('Get all games error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}



