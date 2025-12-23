import { getCollection } from '../lib/mongodb.js'
import { hashPassword, generateToken } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
    }

    const users = await getCollection('users')
    
    // Vérifier si l'email existe déjà
    const existingUser = await users.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' })
    }

    // Créer l'utilisateur
    const result = await users.insertOne({
      email: email.toLowerCase(),
      password: hashPassword(password),
      createdAt: new Date()
    })

    const token = generateToken(result.insertedId.toString())

    return res.status(201).json({
      token,
      user: {
        id: result.insertedId.toString(),
        email: email.toLowerCase()
      }
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: 'Erreur lors de l\'inscription' })
  }
}



