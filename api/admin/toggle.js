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

  // Désactiver le mode admin
  if (disable) {
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isAdmin: false } }
    )
    return res.status(200).json({ isAdmin: false })
  }

  // Activer le mode admin
  if (code !== ADMIN_CODE) {
    return res.status(403).json({ error: 'Code incorrect' })
  }

  await users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { isAdmin: true } }
  )

  return res.status(200).json({ isAdmin: true })
}





