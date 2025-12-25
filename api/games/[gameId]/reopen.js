import { ObjectId } from 'mongodb'
import { getCollection } from '../../lib/mongodb.js'
import { getUserIdFromRequest } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.query

  if (!gameId || !ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: 'ID de partie invalide' })
  }

  // Vérifier si l'utilisateur est admin
  const users = await getCollection('users')
  const currentUser = await users.findOne({
    $or: [
      { _id: ObjectId.isValid(userId) ? new ObjectId(userId) : null },
      { id: userId }
    ]
  })
  
  if (!currentUser?.isAdmin) {
    return res.status(403).json({ error: 'Seuls les administrateurs peuvent rouvrir des parties' })
  }

  try {
    const games = await getCollection('games')
    
    // Trouver la partie
    const game = await games.findOne({ _id: new ObjectId(gameId) })
    
    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvée' })
    }
    
    if (game.status === 'active') {
      return res.status(400).json({ error: 'Cette partie est déjà active' })
    }

    // Rouvrir la partie
    await games.updateOne(
      { _id: new ObjectId(gameId) },
      {
        $set: {
          status: 'active',
          victory: false,
          victoryReason: null,
          deathReason: null,
          updatedAt: new Date()
        }
      }
    )

    return res.status(200).json({ 
      success: true, 
      message: `Partie "${game.title}" rouverte avec succès`,
      gameId: gameId
    })
  } catch (error) {
    console.error('Reopen game error:', error)
    return res.status(500).json({ error: 'Erreur lors de la réouverture' })
  }
}


