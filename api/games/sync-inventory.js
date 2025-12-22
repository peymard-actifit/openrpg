import { getCollection } from '../lib/mongodb.js'
import { getUserIdFromRequest } from '../lib/auth.js'
import { ObjectId } from 'mongodb'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const { gameId } = req.body

  if (!gameId || !ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: 'ID de partie invalide' })
  }

  try {
    const games = await getCollection('games')
    const messagesCol = await getCollection('messages')

    const game = await games.findOne({ 
      _id: new ObjectId(gameId),
      userId 
    })

    if (!game) {
      return res.status(404).json({ error: 'Partie non trouvée' })
    }

    // Récupérer tous les messages
    const allMessages = await messagesCol
      .find({ gameId })
      .sort({ createdAt: 1 })
      .toArray()

    if (allMessages.length === 0) {
      return res.status(200).json({ inventory: game.inventory || [], synced: false })
    }

    // Construire l'historique pour l'analyse
    const history = allMessages.map(m => `${m.role === 'user' ? 'JOUEUR' : 'MJ'}: ${m.content}`).join('\n\n')

    // Demander à l'IA d'analyser l'inventaire
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un système d'analyse d'inventaire pour un JDR.

Analyse l'historique de cette partie et liste TOUS les objets que le joueur devrait avoir dans son inventaire actuellement.

Pour chaque objet, utilise ce format EXACT:
[OBJET:nom|icône|description courte|valeur estimée]

Règles:
- Inclus TOUS les objets mentionnés comme trouvés, reçus, achetés
- EXCLUS les objets mentionnés comme utilisés, vendus, perdus, donnés, détruits
- L'or/argent compte comme objet (ex: [OBJET:50 pièces d'or|💰|Monnaie|50])
- Armes, armures, potions, clés, documents, tout doit être listé
- Si rien n'est à inventorier, ne réponds rien

Réponds UNIQUEMENT avec les balises [OBJET:...], une par ligne.`
        },
        {
          role: 'user',
          content: `Contexte initial: ${game.initialPrompt}\n\nHistorique:\n${history}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const content = completion.choices[0].message.content || ''
    
    // Parser les objets
    const newInventory = []
    const matches = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]/g)
    for (const match of matches) {
      newInventory.push({
        name: match[1].trim(),
        icon: match[2].trim(),
        description: match[3].trim(),
        value: parseInt(match[4]) || 0
      })
    }

    // Mettre à jour la partie
    await games.updateOne(
      { _id: new ObjectId(gameId) },
      { $set: { inventory: newInventory, updatedAt: new Date() } }
    )

    return res.status(200).json({ 
      inventory: newInventory,
      synced: true,
      itemCount: newInventory.length
    })
  } catch (error) {
    console.error('Sync inventory error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}


