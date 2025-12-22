import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'

/**
 * Système de vote pour décisions de groupe
 * 
 * Structure d'un vote:
 * {
 *   id: string,
 *   question: string,
 *   options: [{ text: string, votes: [userId] }],
 *   createdBy: userId,
 *   createdByName: string,
 *   targetGroup: 'all' | 'master' | groupId,
 *   status: 'open' | 'closed',
 *   createdAt: Date,
 *   closedAt: Date | null
 * }
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
  const profile = await profiles.findOne({
    $or: [{ userId: userId }, { id: userId }]
  })
  const playerName = profile?.characterName || 'Joueur'

  // GET - Récupérer les votes en cours
  if (req.method === 'GET') {
    const votes = game.votes || []
    const openVotes = votes.filter(v => v.status === 'open')
    
    return res.status(200).json({
      votes: openVotes.map(v => ({
        ...v,
        hasVoted: v.options.some(opt => opt.votes?.includes(userId))
      })),
      closedVotes: votes.filter(v => v.status === 'closed').slice(-5) // 5 derniers
    })
  }

  // POST - Actions sur les votes
  if (req.method === 'POST') {
    const { action, voteId, question, options, optionIndex, targetGroup } = req.body

    try {
      // Créer un nouveau vote
      if (action === 'create') {
        if (!question || !options || options.length < 2) {
          return res.status(400).json({ error: 'Question et au moins 2 options requises' })
        }

        const newVote = {
          id: new ObjectId().toString(),
          question,
          options: options.map(text => ({ text, votes: [] })),
          createdBy: userId,
          createdByName: playerName,
          targetGroup: targetGroup || 'all', // 'all', 'master', ou groupId
          status: 'open',
          createdAt: new Date(),
          closedAt: null
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $push: { votes: newVote } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🗳️ ${playerName} a lancé un vote : "${question}"`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true, voteId: newVote.id })
      }

      // Voter
      if (action === 'vote') {
        if (!voteId || typeof optionIndex !== 'number') {
          return res.status(400).json({ error: 'voteId et optionIndex requis' })
        }

        const vote = game.votes?.find(v => v.id === voteId)
        if (!vote) {
          return res.status(404).json({ error: 'Vote non trouvé' })
        }

        if (vote.status !== 'open') {
          return res.status(400).json({ error: 'Vote fermé' })
        }

        // Vérifier si déjà voté
        const hasVoted = vote.options.some(opt => opt.votes?.includes(userId))
        if (hasVoted) {
          return res.status(400).json({ error: 'Vous avez déjà voté' })
        }

        if (optionIndex < 0 || optionIndex >= vote.options.length) {
          return res.status(400).json({ error: 'Option invalide' })
        }

        // Ajouter le vote
        await games.updateOne(
          { _id: new ObjectId(gameId), 'votes.id': voteId },
          { $push: { [`votes.$.options.${optionIndex}.votes`]: userId } }
        )

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🗳️ ${playerName} a voté`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ success: true })
      }

      // Fermer un vote (créateur ou owner)
      if (action === 'close') {
        if (!voteId) {
          return res.status(400).json({ error: 'voteId requis' })
        }

        const vote = game.votes?.find(v => v.id === voteId)
        if (!vote) {
          return res.status(404).json({ error: 'Vote non trouvé' })
        }

        if (vote.createdBy !== userId && !isOwner) {
          return res.status(403).json({ error: 'Non autorisé' })
        }

        await games.updateOne(
          { _id: new ObjectId(gameId), 'votes.id': voteId },
          { 
            $set: { 
              'votes.$.status': 'closed',
              'votes.$.closedAt': new Date()
            } 
          }
        )

        // Calculer le résultat
        const winner = vote.options.reduce((max, opt) => 
          (opt.votes?.length || 0) > (max.votes?.length || 0) ? opt : max
        , vote.options[0])

        await gameChats.insertOne({
          gameId,
          userId: 'system',
          characterName: 'Système',
          content: `🗳️ Vote terminé : "${vote.question}" → Résultat : "${winner.text}"`,
          createdAt: new Date(),
          isSystem: true
        })

        return res.status(200).json({ 
          success: true,
          result: winner.text,
          votes: vote.options.map(opt => ({
            text: opt.text,
            count: opt.votes?.length || 0
          }))
        })
      }

      // Supprimer un vote (créateur ou owner)
      if (action === 'delete') {
        if (!voteId) {
          return res.status(400).json({ error: 'voteId requis' })
        }

        const vote = game.votes?.find(v => v.id === voteId)
        if (!vote) {
          return res.status(404).json({ error: 'Vote non trouvé' })
        }

        if (vote.createdBy !== userId && !isOwner) {
          return res.status(403).json({ error: 'Non autorisé' })
        }

        await games.updateOne(
          { _id: new ObjectId(gameId) },
          { $pull: { votes: { id: voteId } } }
        )

        return res.status(200).json({ success: true })
      }

      return res.status(400).json({ error: 'Action inconnue' })
    } catch (error) {
      console.error('Votes error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

