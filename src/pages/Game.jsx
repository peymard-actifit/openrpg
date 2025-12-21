import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { sendToAI } from '../lib/openai'
import '../styles/game.css'

export default function Game() {
  const { gameId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const messagesEndRef = useRef(null)
  
  const [game, setGame] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  useEffect(() => {
    fetchGame()
  }, [gameId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function fetchGame() {
    try {
      // Charger la partie
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .eq('user_id', user.id)
        .single()

      if (gameError) throw gameError
      
      if (gameData.status === 'archived') {
        navigate(`/archive/${gameId}`)
        return
      }
      
      setGame(gameData)

      // Charger les messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('game_messages')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])
      setGameStarted(messagesData && messagesData.length > 0)
    } catch (err) {
      console.error('Erreur:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function startGame() {
    setSending(true)
    try {
      const systemPrompt = buildSystemPrompt()
      const initialMessage = `**Contexte de l'aventure:**\n${game.initial_prompt}\n\n*L'aventure commence...*`
      
      // Appel à l'API pour générer le début
      const response = await sendToAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Démarre cette aventure. Contexte: ${game.initial_prompt}. Présente la scène d'ouverture de manière immersive et termine par une situation où le joueur doit faire un choix ou agir.` }
      ], {
        game,
        profile,
        stats: game.current_stats
      })

      // Sauvegarder le message système et la réponse
      const { data: aiMessage } = await supabase
        .from('game_messages')
        .insert([{
          game_id: gameId,
          role: 'assistant',
          content: response.content
        }])
        .select()
        .single()

      setMessages([aiMessage])
      setGameStarted(true)
    } catch (err) {
      console.error('Erreur démarrage:', err)
    } finally {
      setSending(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    
    const userMessage = input.trim()
    setInput('')
    setSending(true)

    try {
      // Ajouter le message utilisateur
      const { data: userMsg } = await supabase
        .from('game_messages')
        .insert([{
          game_id: gameId,
          role: 'user',
          content: userMessage
        }])
        .select()
        .single()

      setMessages(prev => [...prev, userMsg])

      // Construire l'historique pour l'IA
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }))

      // Appel IA
      const response = await sendToAI([
        { role: 'system', content: buildSystemPrompt() },
        ...history
      ], {
        game,
        profile,
        stats: game.current_stats
      })

      // Vérifier si le joueur est mort
      const isDead = response.playerDied || false
      const levelUp = response.levelUp || false
      const statIncrease = response.statIncrease || null

      // Sauvegarder la réponse IA
      const { data: aiMsg } = await supabase
        .from('game_messages')
        .insert([{
          game_id: gameId,
          role: 'assistant',
          content: response.content
        }])
        .select()
        .single()

      setMessages(prev => [...prev, aiMsg])

      // Gérer la mort
      if (isDead) {
        await supabase
          .from('games')
          .update({ status: 'archived', death_reason: response.deathReason })
          .eq('id', gameId)
        
        setTimeout(() => navigate(`/archive/${gameId}`), 3000)
      }

      // Gérer le level up
      if (levelUp && statIncrease) {
        const newStats = { ...game.current_stats }
        newStats[statIncrease] = (newStats[statIncrease] || 10) + 1
        
        await supabase
          .from('games')
          .update({ 
            level: game.level + 1,
            current_stats: newStats
          })
          .eq('id', gameId)
        
        setGame(prev => ({
          ...prev,
          level: prev.level + 1,
          current_stats: newStats
        }))
      }
    } catch (err) {
      console.error('Erreur envoi:', err)
    } finally {
      setSending(false)
    }
  }

  function buildSystemPrompt() {
    return `Tu es le Maître du Jeu (MJ) d'un jeu de rôle textuel immersif appelé OpenRPG.

CONTEXTE DE LA PARTIE:
${game?.initial_prompt}

PERSONNAGE DU JOUEUR:
- Nom: ${profile?.character_name}
- Âge: ${profile?.age} ans
- Sexe: ${profile?.gender}
- Taille: ${profile?.height} cm
- Poids: ${profile?.weight} kg
- Niveau actuel: ${game?.level}

CARACTÉRISTIQUES (sur 20):
- Force: ${game?.current_stats?.strength}
- Intelligence: ${game?.current_stats?.intelligence}
- Sagesse: ${game?.current_stats?.wisdom}
- Dextérité: ${game?.current_stats?.dexterity}
- Constitution: ${game?.current_stats?.constitution}
- Mana: ${game?.current_stats?.mana}

RÈGLES DU JEU:
1. MODE HARDCORE: Le joueur peut mourir définitivement. Sois juste mais impitoyable.
2. Utilise les caractéristiques pour déterminer le succès des actions (jets de dés virtuels).
3. Décris les scènes de manière immersive et cinématique.
4. Propose toujours des choix ou des situations où le joueur doit agir.
5. Si le joueur tente quelque chose de risqué, fais un jet basé sur ses stats.
6. Après des accomplissements significatifs, le joueur peut gagner un niveau.
7. Réponds toujours dans la langue utilisée par le joueur.
8. Tu peux décrire des images entre [IMAGE: description] pour générer des illustrations.
9. Tu peux suggérer des sons entre [SON: description] pour l'ambiance.

FORMAT DE RÉPONSE:
Réponds de manière narrative et immersive. Sois créatif avec les descriptions.
Si le joueur meurt, termine par [MORT: raison de la mort].
Si le joueur monte de niveau, termine par [LEVEL_UP: nom_de_la_stat_augmentée].`
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return <div className="game-loading">Chargement de l'aventure...</div>
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <Link to="/dashboard" className="back-btn">← Retour</Link>
        <div className="game-title">
          <h1>{game?.title}</h1>
          <span className="game-level">Niveau {game?.level}</span>
        </div>
        <div className="game-stats-mini">
          <span title="Force">💪 {game?.current_stats?.strength}</span>
          <span title="Intelligence">🧠 {game?.current_stats?.intelligence}</span>
          <span title="Constitution">❤️ {game?.current_stats?.constitution}</span>
          <span title="Mana">✨ {game?.current_stats?.mana}</span>
        </div>
      </header>

      <main className="game-main">
        {!gameStarted ? (
          <div className="game-intro">
            <div className="intro-card">
              <h2>📜 Votre Quête</h2>
              <div className="intro-prompt">
                {game?.initial_prompt}
              </div>
              <div className="intro-warning">
                ⚠️ Mode Hardcore actif. Chaque décision compte. La mort est permanente.
              </div>
              <button 
                className="btn btn-primary btn-large"
                onClick={startGame}
                disabled={sending}
              >
                {sending ? 'Préparation...' : '⚔️ Commencer l\'Aventure'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div key={msg.id || index} className={`message ${msg.role}`}>
                  <div className="message-content">
                    {formatMessage(msg.content)}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="message assistant">
                  <div className="message-content typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Que faites-vous ?"
                disabled={sending}
                rows={2}
              />
              <button 
                className="send-btn"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function formatMessage(content) {
  // Parser les balises spéciales [IMAGE:], [SON:], [MORT:], [LEVEL_UP:]
  let formatted = content

  // Images
  formatted = formatted.replace(/\[IMAGE:\s*([^\]]+)\]/g, (_, desc) => 
    `<div class="game-image-placeholder">🖼️ ${desc}</div>`
  )

  // Sons
  formatted = formatted.replace(/\[SON:\s*([^\]]+)\]/g, (_, desc) => 
    `<div class="game-sound-placeholder">🔊 ${desc}</div>`
  )

  // Mort
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, (_, reason) => 
    `<div class="death-notice">💀 VOUS ÊTES MORT<br/><small>${reason}</small></div>`
  )

  // Level Up
  formatted = formatted.replace(/\[LEVEL_UP:\s*([^\]]+)\]/g, (_, stat) => 
    `<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !<br/><small>+1 en ${stat}</small></div>`
  )

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}

