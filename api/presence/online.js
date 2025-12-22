import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    const presence = await getCollection('presence')

    const thirtySecondsAgo = new Date(Date.now() - 30000)
    const onlinePlayers = await presence.find({
      lastSeen: { $gte: thirtySecondsAgo },
      userId: { $ne: uid }
    }).toArray()

    return res.status(200).json(
      onlinePlayers.map(p => ({
        userId: p.userId,
        characterName: p.characterName,
        lastSeen: p.lastSeen
      }))
    )
  } catch (error) {
    console.error('Get online players error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
