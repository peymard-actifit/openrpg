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

      // Normaliser les stats
      const stats = profile.stats || {
        strength: profile.strength || 10,
        intelligence: profile.intelligence || 10,
        wisdom: profile.wisdom || 10,
        dexterity: profile.dexterity || 10,
        constitution: profile.constitution || 10,
        mana: profile.mana || 10
      }

      return res.status(200).json({
        _id: profile._id.toString(),
        characterName: profile.characterName,
        age: profile.age,
        sex: profile.sex || profile.gender,
        height: profile.height,
        weight: profile.weight,
        stats,
        consignes: profile.consignes || ''
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

      const { characterName, age, sex, gender, height, weight, stats } = req.body
      const finalSex = sex || gender

      if (!characterName) {
        return res.status(400).json({ error: 'Nom requis' })
      }

      const finalStats = stats || {
        strength: req.body.strength || 10,
        intelligence: req.body.intelligence || 10,
        wisdom: req.body.wisdom || 10,
        dexterity: req.body.dexterity || 10,
        constitution: req.body.constitution || 10,
        mana: req.body.mana || 10
      }

      const profile = {
        userId,
        characterName,
        age: age || 25,
        sex: finalSex || 'X',
        height: height || 170,
        weight: weight || 70,
        stats: finalStats,
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

  // PUT - Mettre à jour le profil
  if (req.method === 'PUT') {
    try {
      const existingProfile = await profiles.findOne({ userId })
      if (!existingProfile) {
        return res.status(404).json({ error: 'Profil non trouvé' })
      }

      const { characterName, age, sex, height, weight, stats, consignes } = req.body

      const updateData = {
        updatedAt: new Date()
      }

      if (characterName !== undefined) updateData.characterName = characterName
      if (age !== undefined) updateData.age = age
      if (sex !== undefined) updateData.sex = sex
      if (height !== undefined) updateData.height = height
      if (weight !== undefined) updateData.weight = weight
      if (stats !== undefined) updateData.stats = stats
      if (consignes !== undefined) updateData.consignes = consignes

      await profiles.updateOne(
        { userId },
        { $set: updateData }
      )

      const updatedProfile = await profiles.findOne({ userId })

      return res.status(200).json({
        _id: updatedProfile._id.toString(),
        characterName: updatedProfile.characterName,
        age: updatedProfile.age,
        sex: updatedProfile.sex,
        height: updatedProfile.height,
        weight: updatedProfile.weight,
        stats: updatedProfile.stats,
        consignes: updatedProfile.consignes || ''
      })
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
