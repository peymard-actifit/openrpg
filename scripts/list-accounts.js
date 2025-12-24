import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function listAccountsAndGames() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    
    // Récupérer tous les utilisateurs
    const users = await db.collection('users').find({}).toArray()
    const profiles = await db.collection('profiles').find({}).toArray()
    const games = await db.collection('games').find({}).toArray()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('                    COMPTES OPENRPG')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`Total: ${users.length} compte(s)\n`)
    
    for (const user of users) {
      const profile = profiles.find(p => p.userId === user.id || p.userId === user._id?.toString())
      const userGames = games.filter(g => g.userId === user.id || g.userId === user._id?.toString() || g.ownerId === user.id)
      
      console.log(`\n👤 ${user.email || user.username || 'Email inconnu'}`)
      console.log(`   ID: ${user.id || user._id}`)
      if (profile) {
        console.log(`   Personnage: ${profile.characterName || 'Non défini'}`)
        console.log(`   Stats: FOR:${profile.stats?.force || 0} DEX:${profile.stats?.dexterite || 0} INT:${profile.stats?.intelligence || 0}`)
      }
      console.log(`   Créé le: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}`)
      console.log(`   Parties: ${userGames.length}`)
      
      if (userGames.length > 0) {
        for (const game of userGames) {
          const status = game.victory ? '🏆 Victoire' : (game.deathReason ? '💀 Mort' : (game.status === 'active' ? '▶️ En cours' : '📦 Archivée'))
          console.log(`      - "${game.title || 'Sans titre'}" (${status}) - Niveau ${game.level || 1}`)
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('                    RÉSUMÉ')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`Comptes: ${users.length}`)
    console.log(`Profils: ${profiles.length}`)
    console.log(`Parties: ${games.length}`)
    
    const activeGames = games.filter(g => g.status === 'active' && !g.victory && !g.deathReason)
    const victoryGames = games.filter(g => g.victory)
    const deadGames = games.filter(g => g.deathReason)
    
    console.log(`  - En cours: ${activeGames.length}`)
    console.log(`  - Victoires: ${victoryGames.length}`)
    console.log(`  - Morts: ${deadGames.length}`)
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

listAccountsAndGames()

