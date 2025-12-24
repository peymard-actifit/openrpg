import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function debugIds() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('openrpg-db')
    const users = db.collection('users')
    
    const allUsers = await users.find({}).toArray()
    
    for (const user of allUsers) {
      console.log(`\n👤 ${user.email}`)
      console.log(`   _id type: ${typeof user._id}`)
      console.log(`   _id value: ${user._id}`)
      console.log(`   _id instanceof ObjectId: ${user._id instanceof ObjectId}`)
      
      const idStr = user._id.toString()
      console.log(`   _id.toString(): ${idStr}`)
      console.log(`   ObjectId.isValid(idStr): ${ObjectId.isValid(idStr)}`)
      
      // Test de recherche
      try {
        const foundByObjectId = await users.findOne({ _id: new ObjectId(idStr) })
        console.log(`   findOne({ _id: new ObjectId(idStr) }): ${foundByObjectId ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`)
      } catch (e) {
        console.log(`   findOne({ _id: new ObjectId(idStr) }): ❌ ERREUR: ${e.message}`)
      }
      
      // Test avec l'ID brut
      const foundByRaw = await users.findOne({ _id: user._id })
      console.log(`   findOne({ _id: user._id }): ${foundByRaw ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`)
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

debugIds()

