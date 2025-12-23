import OpenAI from 'openai'
import { IncomingForm } from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false
  }
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = new IncomingForm()
    
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const audioFile = files.audio?.[0] || files.audio

    if (!audioFile) {
      return res.status(400).json({ error: 'Aucun fichier audio' })
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile.filepath),
      model: 'whisper-1',
      language: 'fr'
    })

    // Nettoyer le fichier temporaire
    fs.unlinkSync(audioFile.filepath)

    return res.status(200).json({ text: transcription.text })
  } catch (error) {
    console.error('Whisper Error:', error)
    return res.status(500).json({ 
      error: 'Erreur de transcription',
      details: error.message 
    })
  }
}



