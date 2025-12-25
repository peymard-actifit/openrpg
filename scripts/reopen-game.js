import { MongoClient, ObjectId } from 'mongodb'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ID de la partie à rouvrir (à modifier selon besoin)
const GAME_TITLE_TO_REOPEN = "Ballade en cimmérie"

async function reopenGame() {
  const client = new MongoClient(process.env.MONGODB_URI)
  
  try {
    await client.connect()
    console.log('✅ Connecté à MongoDB\n')
    
    const db = client.db('openrpg-db')
    const games = db.collection('games')
    
    // Trouver la partie archivée
    const game = await games.findOne({ 
      title: GAME_TITLE_TO_REOPEN,
      status: 'archived'
    })
    
    if (!game) {
      console.log(`❌ Partie "${GAME_TITLE_TO_REOPEN}" non trouvée ou déjà active`)
      return
    }
    
    console.log(`🎮 Partie trouvée: "${game.title}"`)
    console.log(`   ID: ${game._id}`)
    console.log(`   Statut actuel: ${game.status}`)
    console.log(`   Victoire: ${game.victory} - ${game.victoryReason}`)
    
    // Rouvrir la partie
    const result = await games.updateOne(
      { _id: game._id },
      { 
        $set: { 
          status: 'active',
          victory: false,
          victoryReason: null,
          updatedAt: new Date()
        }
      }
    )
    
    if (result.modifiedCount > 0) {
      console.log(`\n✅ Partie rouverte avec succès !`)
      console.log(`   Nouveau statut: active`)
      console.log(`   La quête peut continuer : "${game.initialPrompt.substring(0, 100)}..."`)
    } else {
      console.log(`\n❌ Erreur lors de la réouverture`)
    }
    
  } catch (error) {
    console.error('Erreur:', error)
  } finally {
    await client.close()
  }
}

reopenGame()


