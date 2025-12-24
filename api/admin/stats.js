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

    const allUsers = await users.find({}).toArray()
    const allProfiles = await profiles.find({}).toArray()
    const allGames = await games.find({}).toArray()

    const result = allUsers.map(user => {
      const uid = user.id || user._id?.toString()
      const profile = allProfiles.find(p => p.userId === uid || p.userId === user._id?.toString())
      const userGames = allGames.filter(g => g.userId === uid || g.ownerId === uid)

      return {
        id: uid,
        email: user.email || user.username || 'Email inconnu',
        characterName: profile?.characterName || 'Non défini',
        stats: profile?.stats || {},
        createdAt: user.createdAt,
        gamesCount: userGames.length,
        games: userGames.map(g => ({
          id: g._id?.toString(),
          title: g.title || 'Sans titre',
          status: g.victory ? 'victory' : (g.deathReason ? 'dead' : (g.status || 'active')),
          level: g.level || 1,
          isMultiplayer: g.isMultiplayer || false,
          createdAt: g.createdAt
        }))
      }
    })

    return res.status(200).json({
      totalUsers: allUsers.length,
      totalProfiles: allProfiles.length,
      totalGames: allGames.length,
      activeGames: allGames.filter(g => g.status === 'active' && !g.victory && !g.deathReason).length,
      victoryGames: allGames.filter(g => g.victory).length,
      deadGames: allGames.filter(g => g.deathReason).length,
      users: result
    })
  } catch (error) {
    console.error('Stats error:', error)
    return res.status(500).json({ error: 'Erreur serveur', details: error.message })
  }
}
