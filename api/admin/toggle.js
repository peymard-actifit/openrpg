import { ObjectId } from 'mongodb'
import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'

const ADMIN_CODE = '12411241'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, disable } = req.body
  const users = await getCollection('users')

  // Trouver l'utilisateur (par _id ObjectId ou id string)
  const userQuery = {
    $or: [
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
      { id: userId }
    ]
  }

  // Désactiver le mode admin
  if (disable) {
    await users.updateOne(userQuery, { $set: { isAdmin: false } })
    return res.status(200).json({ isAdmin: false })
  }

  // Activer le mode admin
  if (code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Code incorrect' })
  }

  const result = await users.updateOne(userQuery, { $set: { isAdmin: true } })
  console.log('Admin toggle result:', result.modifiedCount, 'user updated for userId:', userId)

  return res.status(200).json({ isAdmin: true })
}





