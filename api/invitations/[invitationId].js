import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  const uid = getUserIdFromRequest(req)
  if (!uid) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { invitationId } = req.query
  const invitations = await getCollection('invitations')
  const games = await getCollection('games')
  const profiles = await getCollection('profiles')

  // POST - Accepter ou refuser une invitation
  if (req.method === 'POST') {
    try {
      const { action } = req.body

      if (!action || !['accept', 'decline'].includes(action)) {
        return res.status(400).json({ error: 'Action invalide' })
      }

      const invitation = await invitations.findOne({ 
        _id: new ObjectId(invitationId),
        toUserId: uid,
        status: 'pending'
      })

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation non trouvée' })
      }

      if (action === 'decline') {
        await invitations.updateOne(
          { _id: new ObjectId(invitationId) },
          { $set: { status: 'declined', respondedAt: new Date() } }
        )
        return res.status(200).json({ success: true, status: 'declined' })
      }

      // Accepter l'invitation
      await invitations.updateOne(
        { _id: new ObjectId(invitationId) },
        { $set: { status: 'accepted', respondedAt: new Date() } }
      )

      const profile = await profiles.findOne({ 
        $or: [{ userId: uid }, { id: uid }]
      })

      const game = await games.findOne({ _id: new ObjectId(invitation.gameId) })
      
      // Convertir mode simple en syncMode pour compatibilité avec le chat
      const mode = invitation.mode || 'sync'
      const syncMode = mode === 'sync' ? 'syncWithMaster' : 'asyncIndependent'
      
      const participant = {
        userId: uid,
        characterName: profile?.characterName || 'Joueur',
        mode: mode,
        syncMode: syncMode,
        syncGroupId: null,
        status: 'active',
        joinedAt: new Date(),
        stats: profile?.stats || {}
      }

      await games.updateOne(
        { _id: new ObjectId(invitation.gameId) },
        { 
          $set: { 
            isMultiplayer: true,
            ownerId: game.ownerId || game.userId
          },
          $push: { participants: participant }
        }
      )

      // Pour les joueurs en mode sync, générer une introduction IA
      if (mode === 'sync') {
        try {
          const messages = await getCollection('messages')
          const gameChats = await getCollection('game_chats')
          
          // Récupérer les derniers messages pour le contexte
          const recentMessages = await messages
            .find({ gameId: invitation.gameId })
            .sort({ createdAt: -1 })
            .limit(5)
            .toArray()
          
          const characterName = profile?.characterName || 'Un nouveau héros'
          const characterStats = profile?.stats || {}
          
          // Générer l'introduction du nouveau personnage
          const introPrompt = `Tu es le Maître du Jeu dans un JDR.
Un nouveau joueur rejoint la partie en cours.

Contexte de la partie: ${game.initialPrompt}

Nouveau personnage:
- Nom: ${characterName}
- Stats: Force ${characterStats.strength || 10}, Intelligence ${characterStats.intelligence || 10}, Sagesse ${characterStats.wisdom || 10}, Dextérité ${characterStats.dexterity || 10}, Constitution ${characterStats.constitution || 10}, Mana ${characterStats.mana || 10}

Derniers événements:
${recentMessages.reverse().map(m => `${m.role === 'user' ? 'Joueur' : 'MJ'}: ${m.content.substring(0, 200)}...`).join('\n')}

Génère une courte introduction narrative (2-3 phrases max) pour faire entrer ${characterName} dans l'histoire de manière naturelle et épique. Le personnage doit arriver d'une façon qui a du sens avec le contexte actuel.

⚠️ NE PAS utiliser de balises [OBJET:], [MORT:], [LEVEL_UP], etc.`

          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: introPrompt }],
            temperature: 0.9,
            max_tokens: 300
          })

          const introContent = `🎭 **${characterName} rejoint l'aventure !**\n\n${completion.choices[0].message.content}`

          // Ajouter le message d'introduction à la partie
          await messages.insertOne({
            gameId: invitation.gameId,
            role: 'assistant',
            content: introContent,
            createdAt: new Date(),
            isIntroduction: true,
            newPlayerId: uid
          })

          // Notifier dans le chat de groupe
          await gameChats.insertOne({
            gameId: invitation.gameId,
            userId: 'system',
            characterName: 'Système',
            content: `🎭 ${characterName} a rejoint l'aventure !`,
            createdAt: new Date(),
            isSystem: true
          })
        } catch (introError) {
          console.error('Erreur génération intro:', introError)
          // Ne pas bloquer l'acceptation si l'intro échoue
        }
      }

      return res.status(200).json({ 
        success: true, 
        status: 'accepted',
        gameId: invitation.gameId
      })
    } catch (error) {
      console.error('Respond invitation error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
