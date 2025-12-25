import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { prompt } = req.body

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Style fantasy RPG médiéval, ambiance sombre et épique: ${prompt}`,
      n: 1,
      size: '1024x1024',
      quality: 'standard'
    })

    return res.status(200).json({
      url: response.data[0].url
    })
  } catch (error) {
    console.error('DALL-E Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de génération d\'image',
      details: error.message 
    })
  }
}






