import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function setAllAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    const users = db.collection('users')
    
    // Mettre tous les utilisateurs en admin
    const result = await users.updateMany(
      {},
      { $set: { isAdmin: true } }
    )
    
    console.log(`✅ ${result.modifiedCount} utilisateur(s) mis en admin`)
    
    // Vérifier
    const allUsers = await users.find({}).toArray()
    console.log('\nStatut actuel:')
    for (const user of allUsers) {
      console.log(`   ${user.email}: isAdmin = ${user.isAdmin}`)
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

setAllAdmin()

