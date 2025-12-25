import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkAdminStatus() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    const users = db.collection('users')
    const games = db.collection('games')
    
    // Récupérer tous les utilisateurs
    const allUsers = await users.find({}).toArray()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('              STATUT ADMIN DES UTILISATEURS')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    for (const user of allUsers) {
      const uid = user._id?.toString() || user.id
      console.log(`👤 ${user.email}`)
      console.log(`   _id: ${user._id}`)
      console.log(`   id: ${user.id || 'non défini'}`)
      console.log(`   isAdmin: ${user.isAdmin === true ? '✅ OUI' : '❌ NON'}`)
      console.log('')
    }
    
    // Compter les parties
    const allGames = await games.find({}).toArray()
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`              TOTAL PARTIES: ${allGames.length}`)
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    // Vérifier si la requête admin fonctionnerait
    const adminUser = allUsers.find(u => u.isAdmin === true)
    if (adminUser) {
      console.log(`✅ Admin trouvé: ${adminUser.email}`)
      
      // Simuler la requête de l'API all.js
      const query = {
        $or: [
          { id: adminUser._id?.toString() },
          { _id: adminUser._id }
        ]
      }
      const foundUser = await users.findOne(query)
      console.log(`   Requête API trouve: ${foundUser ? '✅ OUI' : '❌ NON'}`)
    } else {
      console.log('❌ Aucun utilisateur admin trouvé!')
      console.log('\n💡 Pour activer un admin manuellement, utilisez:')
      console.log('   db.users.updateOne({ email: "votre@email.com" }, { $set: { isAdmin: true } })')
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

checkAdminStatus()


