import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function fixAdmin() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    const users = db.collection('users')
    
    // Retirer admin de tous les comptes
    await users.updateMany({}, { $set: { isAdmin: false } })
    console.log('✅ Admin retiré de tous les comptes')
    
    // Remettre admin uniquement sur apydya@gmail.com
    const result = await users.updateOne(
      { email: 'apydya@gmail.com' },
      { $set: { isAdmin: true } }
    )
    console.log(`✅ Admin activé pour apydya@gmail.com (${result.modifiedCount} modifié)`)
    
    // Vérifier
    const allUsers = await users.find({}).toArray()
    console.log('\nStatut actuel:')
    for (const user of allUsers) {
      console.log(`   ${user.email}: isAdmin = ${user.isAdmin ? '✅ OUI' : '❌ NON'}`)
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

fixAdmin()

