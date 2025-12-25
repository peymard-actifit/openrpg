import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { text } = req.body

    if (!text || text.trim().length < 3) {
      return res.status(200).json({ corrected: text, hasChanges: false })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Tu es un correcteur orthographique et grammatical français.
Corrige UNIQUEMENT les fautes d'orthographe, de grammaire et de ponctuation.
NE MODIFIE PAS le sens, le style, ou le contenu du message.
NE RAJOUTE PAS de texte, de ponctuation supplémentaire ou de formules de politesse.
Garde le ton et le registre de langue (familier, soutenu, etc.)
Réponds UNIQUEMENT avec le texte corrigé, sans explication ni commentaire.
Si le texte est déjà correct, renvoie-le tel quel.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1,
      max_tokens: 500
    })

    const corrected = completion.choices[0].message.content.trim()
    const hasChanges = corrected.toLowerCase() !== text.toLowerCase()

    return res.status(200).json({ 
      corrected, 
      original: text,
      hasChanges 
    })
  } catch (error) {
    console.error('Correction error:', error)
    // En cas d'erreur, renvoyer le texte original
    return res.status(200).json({ 
      corrected: req.body.text, 
      hasChanges: false,
      error: 'Correction indisponible'
    })
  }
}




