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

    // Chercher la partie (propriétaire OU participant)
    const game = await games.findOne({ 
      _id: new ObjectId(gameId),
      $or: [
        { userId },
        { ownerId: userId },
        { 'participants.userId': userId }
      ]
    })

    if (!game) {
      console.log('Partie non trouvée pour userId:', userId, 'gameId:', gameId)
      return res.status(404).json({ error: 'Partie non trouvée' })
    }

    // Récupérer tous les messages
    const allMessages = await messagesCol
      .find({ gameId })
      .sort({ createdAt: 1 })
      .toArray()

    console.log(`Sync inventory: ${allMessages.length} messages trouvés pour gameId ${gameId}`)

    if (allMessages.length === 0) {
      return res.status(200).json({ inventory: game.inventory || [], synced: false })
    }

    // Construire l'historique pour l'analyse (limiter à 5000 caractères)
    const history = allMessages.map(m => `${m.role === 'user' ? 'JOUEUR' : 'MJ'}: ${m.content}`).join('\n\n').slice(0, 5000)

    // Demander à l'IA d'analyser l'inventaire
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un système d'extraction d'inventaire pour un JDR.

MISSION: Extraire TOUS les objets que le joueur POSSÈDE actuellement.

FORMAT OBLIGATOIRE pour chaque objet:
[OBJET:nom|icône|description|valeur]

EXEMPLES:
[OBJET:Bâton en bois|🪵|Arme simple, dégâts 1D6|5]
[OBJET:Potion de soin|🧪|Restaure 10 points de vie|25]
[OBJET:Sac à dos|🎒|Permet de transporter des objets|15]
[OBJET:50 pièces d'or|💰|Monnaie|50]

ICÔNES POSSIBLES: 🪵 🗡️ ⚔️ 🛡️ 🧪 💰 🔑 📜 💍 📿 🧥 👢 🧤 🎒 🏹 📖 🗺️

RÈGLES:
- Liste TOUS les équipements de départ mentionnés
- Liste TOUS les objets trouvés/reçus
- EXCLUS les objets utilisés/perdus/vendus
- Réponds UNIQUEMENT avec les balises, RIEN d'autre`
        },
        {
          role: 'user',
          content: `CONTEXTE: ${game.initialPrompt}\n\nHISTORIQUE:\n${history}\n\nListe les objets possédés:`
        }
      ],
      temperature: 0.2,
      max_tokens: 800
    })

    const content = completion.choices[0].message.content || ''
    console.log('Réponse IA sync-inventory:', content)
    
    // Parser les objets - format avec valeur
    const newInventory = []
    const matchesWithValue = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]/g)
    for (const match of matchesWithValue) {
      newInventory.push({
        name: match[1].trim(),
        icon: match[2].trim(),
        description: match[3].trim(),
        value: parseInt(match[4]) || 0
      })
    }
    
    // Parser aussi format sans valeur (au cas où)
    const matchesNoValue = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^\]|]+)\](?!\d)/g)
    for (const match of matchesNoValue) {
      const name = match[1].trim()
      if (!newInventory.some(i => i.name === name)) {
        newInventory.push({
          name,
          icon: match[2].trim(),
          description: match[3].trim(),
          value: 0
        })
      }
    }

    console.log('Objets extraits:', newInventory.length, newInventory.map(i => i.name))

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
    return res.status(500).json({ error: 'Erreur serveur', details: error.message })
  }
}


