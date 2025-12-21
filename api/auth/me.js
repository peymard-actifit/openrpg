import { ObjectId } from 'mongodb'
import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const userId = getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const users = await getCollection('users')
    const user = await users.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' })
    }

    // Récupérer le profil
    const profiles = await getCollection('profiles')
    const profile = await profiles.findOne({ userId: userId })

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email
      },
      profile: profile ? {
        ...profile,
        _id: profile._id.toString()
      } : null
    })
  } catch (error) {
    console.error('Me error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}

