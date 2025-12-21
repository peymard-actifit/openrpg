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
      temperature: 0.85,
      max_tokens: 1500,
      presence_penalty: 0.2,
      frequency_penalty: 0.1
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

    // Extraire les objets [OBJET:nom|icône|description]
    const newItems = []
    const itemMatches = content.matchAll(/\[OBJET:([^|]+)\|([^|]+)\|([^\]]+)\]/g)
    for (const match of itemMatches) {
      newItems.push({
        name: match[1].trim(),
        icon: match[2].trim(),
        description: match[3].trim()
      })
    }

    return res.status(200).json({
      content,
      playerDied,
      deathReason,
      levelUp,
      newItems
    })
  } catch (error) {
    console.error('OpenAI Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de communication avec l\'IA',
      details: error.message 
    })
  }
}
