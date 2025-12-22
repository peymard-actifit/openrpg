import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  try {
    const presence = await getCollection('presence')
    const profiles = await getCollection('profiles')

    const profile = await profiles.findOne({ 
      $or: [{ userId: userId }, { id: userId }]
    })

    await presence.updateOne(
      { userId: userId },
      { 
        $set: {
          userId: userId,
          characterName: profile?.characterName || 'Joueur',
          lastSeen: new Date(),
          isOnline: true
        }
      },
      { upsert: true }
    )

    const thirtySecondsAgo = new Date(Date.now() - 30000)
    await presence.updateMany(
      { lastSeen: { $lt: thirtySecondsAgo } },
      { $set: { isOnline: false } }
    )

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Presence heartbeat error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
