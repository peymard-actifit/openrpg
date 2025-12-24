import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function checkGames() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    const games = db.collection('games')
    const messages = db.collection('messages')
    const profiles = db.collection('profiles')
    
    const allGames = await games.find({}).toArray()
    const allProfiles = await profiles.find({}).toArray()
    
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('              ANALYSE DES PARTIES')
    console.log('═══════════════════════════════════════════════════════════════\n')
    
    for (const game of allGames) {
      const profile = allProfiles.find(p => p.userId === game.userId)
      const gameMessages = await messages.find({ gameId: game._id.toString() }).sort({ createdAt: 1 }).toArray()
      
      console.log(`\n🎮 "${game.title}"`)
      console.log(`   Joueur: ${profile?.characterName || 'Inconnu'}`)
      console.log(`   Statut: ${game.status} | Niveau: ${game.level || 1}`)
      console.log(`   Victoire: ${game.victory ? '✅ OUI' : '❌ NON'}`)
      console.log(`   Mort: ${game.deathReason ? `💀 ${game.deathReason}` : '❌ NON'}`)
      console.log(`   Messages: ${gameMessages.length}`)
      
      console.log(`\n   📜 QUÊTE INITIALE:`)
      console.log(`   "${game.initialPrompt}"`)
      
      if (game.status === 'archived') {
        console.log(`\n   ⚠️  PARTIE ARCHIVÉE - Raison:`)
        if (game.victory) {
          console.log(`   🏆 Victoire: ${game.victoryReason || 'Non spécifiée'}`)
        } else if (game.deathReason) {
          console.log(`   💀 Mort: ${game.deathReason}`)
        } else {
          console.log(`   ❓ AUCUNE RAISON VALIDE - DEVRAIT ÊTRE ROUVERTE`)
        }
      }
      
      // Afficher les derniers messages pour contexte
      if (gameMessages.length > 0) {
        console.log(`\n   📝 DERNIERS MESSAGES (3 derniers):`)
        const lastMessages = gameMessages.slice(-3)
        for (const msg of lastMessages) {
          const role = msg.role === 'user' ? '👤' : '🤖'
          const content = msg.content?.substring(0, 150) || ''
          console.log(`   ${role} ${content}${msg.content?.length > 150 ? '...' : ''}`)
        }
      }
      
      console.log('\n   ' + '─'.repeat(60))
    }
    
    // Résumé
    const activeGames = allGames.filter(g => g.status === 'active')
    const archivedGames = allGames.filter(g => g.status === 'archived')
    const victoryGames = allGames.filter(g => g.victory)
    const deadGames = allGames.filter(g => g.deathReason)
    const invalidArchived = archivedGames.filter(g => !g.victory && !g.deathReason)
    
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('              RÉSUMÉ')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`Total: ${allGames.length} parties`)
    console.log(`  - En cours: ${activeGames.length}`)
    console.log(`  - Archivées: ${archivedGames.length}`)
    console.log(`    - Victoires: ${victoryGames.length}`)
    console.log(`    - Morts: ${deadGames.length}`)
    console.log(`    - ⚠️  Sans raison valide: ${invalidArchived.length}`)
    
    if (invalidArchived.length > 0) {
      console.log('\n⚠️  PARTIES À ROUVRIR:')
      for (const game of invalidArchived) {
        console.log(`   - "${game.title}" (ID: ${game._id})`)
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

checkGames()

