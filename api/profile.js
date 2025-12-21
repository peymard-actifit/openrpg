import { getCollection } from './lib/mongodb.js'
import { getUserIdFromRequest } from './lib/auth.js'

export default async function handler(req, res) {
  const userId = getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' })
  }

  const profiles = await getCollection('profiles')

  // GET - Récupérer le profil
  if (req.method === 'GET') {
    try {
      const profile = await profiles.findOne({ userId })
      
      if (!profile) {
        return res.status(404).json({ error: 'Profil non trouvé' })
      }

      return res.status(200).json({
        ...profile,
        _id: profile._id.toString()
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  }

  // POST - Créer le profil
  if (req.method === 'POST') {
    try {
      const existingProfile = await profiles.findOne({ userId })
      if (existingProfile) {
        return res.status(400).json({ error: 'Profil déjà existant' })
      }

      const {
        characterName,
        age,
        gender,
        height,
        weight,
        strength,
        intelligence,
        wisdom,
        dexterity,
        constitution,
        mana
      } = req.body

      if (!characterName || !gender) {
        return res.status(400).json({ error: 'Nom et sexe requis' })
      }

      const profile = {
        userId,
        characterName,
        age: age || 25,
        gender,
        height: height || 170,
        weight: weight || 70,
        strength: strength || 10,
        intelligence: intelligence || 10,
        wisdom: wisdom || 10,
        dexterity: dexterity || 10,
        constitution: constitution || 10,
        mana: mana || 10,
        createdAt: new Date()
      }

      const result = await profiles.insertOne(profile)

      return res.status(201).json({
        ...profile,
        _id: result.insertedId.toString()
      })
    } catch (error) {
      console.error('Create profile error:', error)
      return res.status(500).json({ error: 'Erreur lors de la création du profil' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

