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
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.8,
      max_tokens: 2000,
      presence_penalty: 0.3,
      frequency_penalty: 0.3
    })

    const content = completion.choices[0].message.content

    // Parser les balises spéciales
    const playerDied = content.includes('[MORT:')
    const levelUp = content.includes('[LEVEL_UP:')
    
    let deathReason = null
    let statIncrease = null

    if (playerDied) {
      const match = content.match(/\[MORT:\s*([^\]]+)\]/)
      if (match) deathReason = match[1]
    }

    if (levelUp) {
      const match = content.match(/\[LEVEL_UP:\s*([^\]]+)\]/)
      if (match) statIncrease = match[1].toLowerCase()
    }

    return res.status(200).json({
      content,
      playerDied,
      deathReason,
      levelUp,
      statIncrease
    })
  } catch (error) {
    console.error('OpenAI Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de communication avec l\'IA',
      details: error.message 
    })
  }
}

