import { getCollection } from '../lib/mongodb.js'
import { comparePassword, generateToken } from '../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' })
    }

    const users = await getCollection('users')
    
    const user = await users.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    if (!comparePassword(password, user.password)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const token = generateToken(user._id.toString())

    return res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Erreur de connexion' })
  }
}

