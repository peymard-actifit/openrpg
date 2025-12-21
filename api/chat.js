import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, gameContext } = req.body

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.9,
      max_tokens: 1500,
      presence_penalty: 0.3,
      frequency_penalty: 0.2
    })

    const content = completion.choices[0].message.content

    // Parser les balises spéciales
    const playerDied = content.includes('[MORT:')
    const levelUp = content.includes('[LEVEL_UP')
    
    let deathReason = null
    if (playerDied) {
      const match = content.match(/\[MORT:\s*([^\]]+)\]/)
      if (match) deathReason = match[1]
    }

    // Extraire les objets AJOUTÉS [OBJET:nom|icône|description]
    const newItems = []
    const itemMatches = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^\]]+)\]/g)
    for (const match of itemMatches) {
      newItems.push({
        name: match[1].trim(),
        icon: match[2].trim(),
        description: match[3].trim()
      })
    }

    // Extraire les objets RETIRÉS [RETIRER:nom]
    const removedItems = []
    const removeMatches = content.matchAll(/\[RETIRER:\s*([^\]]+)\]/g)
    for (const match of removeMatches) {
      removedItems.push(match[1].trim())
    }

    // Extraire les changements d'alignement [ALIGN:goodEvil,lawChaos]
    let alignmentChange = null
    const alignMatch = content.match(/\[ALIGN:\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*\]/)
    if (alignMatch) {
      alignmentChange = {
        goodEvil: parseInt(alignMatch[1]),
        lawChaos: parseInt(alignMatch[2])
      }
    }

    return res.status(200).json({
      content,
      playerDied,
      deathReason,
      levelUp,
      newItems,
      removedItems,
      alignmentChange
    })
  } catch (error) {
    console.error('OpenAI Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de communication avec l\'IA',
      details: error.message 
    })
  }
}
