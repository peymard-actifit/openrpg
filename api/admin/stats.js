import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    const users = await getCollection('users')
    const profiles = await getCollection('profiles')
    const games = await getCollection('games')

    // Récupérer tous les utilisateurs
    const allUsers = await users.find({}).toArray()
    
    // Récupérer tous les profils
    const allProfiles = await profiles.find({}).toArray()
    
    // Récupérer toutes les parties
    const allGames = await games.find({}).toArray()

    // Construire la liste des comptes avec leurs parties
    const accountsWithGames = allUsers.map(user => {
      const profile = allProfiles.find(p => p.userId === user.id || p.userId === user._id?.toString())
      const userGames = allGames.filter(g => 
        g.userId === user.id || 
        g.userId === user._id?.toString() ||
        g.ownerId === user.id ||
        g.ownerId === user._id?.toString()
      )

      return {
        id: user.id || user._id?.toString(),
        email: user.email,
        characterName: profile?.characterName || 'Non défini',
        isAdmin: user.isAdmin || false,
        createdAt: user.createdAt,
        gamesCount: userGames.length,
        games: userGames.map(g => ({
          id: g._id?.toString(),
          title: g.title || 'Sans titre',
          status: g.status,
          level: g.level || 1,
          isMultiplayer: g.isMultiplayer || false,
          participantsCount: g.participants?.length || 0,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt
        }))
      }
    })

    return res.status(200).json({
      totalUsers: allUsers.length,
      totalGames: allGames.length,
      accounts: accountsWithGames
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' })
  }
}

