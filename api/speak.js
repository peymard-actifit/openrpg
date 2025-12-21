import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text, voice = 'onyx' } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Texte requis' })
    }

    // Nettoyer le texte des balises spéciales
    const cleanText = text
      .replace(/\[IMAGE:[^\]]+\]/g, '')
      .replace(/\[SON:[^\]]+\]/g, '')
      .replace(/\[MORT:[^\]]+\]/g, 'Vous êtes mort.')
      .replace(/\[LEVEL_UP:[^\]]+\]/g, 'Niveau supérieur!')
      .trim()

    if (!cleanText) {
      return res.status(400).json({ error: 'Texte vide après nettoyage' })
    }

    // Limiter la longueur pour éviter les coûts excessifs
    const truncatedText = cleanText.substring(0, 4000)

    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice, // onyx = voix grave, alloy = neutre, nova = féminine
      input: truncatedText
    })

    const buffer = Buffer.from(await mp3.arrayBuffer())

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', buffer.length)
    return res.send(buffer)
  } catch (error) {
    console.error('TTS Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de synthèse vocale',
      details: error.message 
    })
  }
}

