import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

/**
 * Inventaire partagé - stocké dans le compte du joueur maître
 * Tous les joueurs de la partie peuvent y accéder
 */

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const games = await getCollection('games')
  const gameChats = await getCollection('game_chats')
  const profiles = await getCollection('profiles')
  const { gameId } = req.query

  const game = await games.findOne({ _id: new ObjectId(gameId) })
  if (!game) {
    return res.status(404).json({ error: 'Partie non trouvée' })
  }

  const isOwner = game.ownerId === userId || game.userId === userId
  const isParticipant = game.participants?.some(p => p.userId === userId && p.status !== 'removed')
  
  if (!isOwner && !isParticipant) {
    return res.status(403).json({ error: 'Non autorisé' })
  }

  // Récupérer le profil du participant
  const profile = await profiles.findOne({
    $or: [{ userId: userId }, { id: userId }]
  })
  const playerName = profile?.characterName || 'Joueur'

  // GET - Récupérer l'inventaire partagé
  if (req.method === 'GET') {
    return res.status(200).json({
      sharedInventory: game.sharedInventory || [],
      isOwner
    })
  }

  // POST - Actions sur l'inventaire partagé
  if (req.method === 'POST') {
    const { action, item, itemIndex } = req.body

    try {
      // Ajouter un objet à l'inventaire partagé
      if (action === 'add') {
        if (!item || !item.name) {
          return res.status(400).json({ error: 'Objet invalide' })
        }

        const newItem = {
          ...item,
          addedBy: userId,
          addedByName: playerName,
          addedAt: new Date()
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $push: { sharedInventory: newItem } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `📦 ${playerName} a ajouté "${item.name}" à l'inventaire partagé`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Retirer un objet de l'inventaire partagé (prendre pour soi)
      if (action === 'take') {
        if (typeof itemIndex !== 'number') {
          return res.status(400).json({ error: 'Index invalide' })
        }

        const sharedInventory = game.sharedInventory || []
        if (itemIndex < 0 || itemIndex >= sharedInventory.length) {
          return res.status(400).json({ error: 'Index hors limites' })
        }

        const takenItem = sharedInventory[itemIndex]

        // Retirer de l'inventaire partagé
        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $pull: { sharedInventory: { name: takenItem.name, addedAt: takenItem.addedAt } } }
        )

        // Ajouter à l'inventaire personnel de la partie
        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $push: { [`playerInventories.${userId}`]: { ...takenItem, takenAt: new Date() } } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🎒 ${playerName} a pris "${takenItem.name}" de l'inventaire partagé`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true, item: takenItem })
      }

      // Déposer un objet personnel dans l'inventaire partagé
      if (action === 'deposit') {
        if (!item || !item.name) {
          return res.status(400).json({ error: 'Objet invalide' })
        }

        // Retirer de l'inventaire personnel
        const personalInventory = game.playerInventories?.[userId] || game.inventory || []
        const itemToDeposit = personalInventory.find(i => i.name === item.name)
        
        if (!itemToDeposit) {
          return res.status(400).json({ error: 'Objet non trouvé dans votre inventaire' })
        }

        // Ajouter à l'inventaire partagé
        const sharedItem = {
          ...itemToDeposit,
          addedBy: userId,
          addedByName: playerName,
          addedAt: new Date()
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { 
            $push: { sharedInventory: sharedItem },
            $pull: { [`playerInventories.${userId}`]: { name: item.name } }
          }
        )

        // Si c'est l'inventaire principal de la partie (ancien système)
        if (!game.playerInventories) {
          await games.updateOne(
            { _id: new ObjectId(gameId) },
            { $pull: { inventory: { name: item.name } } }
          )
        }

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `📦 ${playerName} a déposé "${item.name}" dans l'inventaire partagé`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Jeter un objet de l'inventaire partagé (owner uniquement)
      if (action === 'discard') {
        if (!isOwner) {
          return res.status(403).json({ error: 'Seul le maître peut jeter des objets partagés' })
        }

        if (typeof itemIndex !== 'number') {
          return res.status(400).json({ error: 'Index invalide' })
        }

        const sharedInventory = game.sharedInventory || []
        if (itemIndex < 0 || itemIndex >= sharedInventory.length) {
          return res.status(400).json({ error: 'Index hors limites' })
        }

        const discardedItem = sharedInventory[itemIndex]

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $pull: { sharedInventory: { name: discardedItem.name, addedAt: discardedItem.addedAt } } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🗑️ Le maître a jeté "${discardedItem.name}" de l'inventaire partagé`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    } catch (error) {
      console.error('Shared inventory error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

