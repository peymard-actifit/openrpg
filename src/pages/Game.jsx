import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import Dice from '../components/Dice'
import Inventory from '../components/Inventory'
import LevelUpModal from '../components/LevelUpModal'
import { VoiceInput, VoiceOutput, useTextToSpeech } from '../components/VoiceControls'
import '../styles/game.css'

export default function Game() {
  const { gameId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const messagesContainerRef = useRef(null)
  const lastMessageRef = useRef(null)
  
  const [game, setGame] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [diceRequested, setDiceRequested] = useState(false)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState([])
  const [levelUpPending, setLevelUpPending] = useState(false)
  const [pendingLevel, setPendingLevel] = useState(null)
  
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech()

  useEffect(() => {
    fetchGame()
  }, [gameId])

  // Scroll au début du dernier message quand un nouveau message arrive
  useEffect(() => {
    if (lastMessageRef.current && messagesContainerRef.current) {
      // Scroll pour que le dernier message soit en haut de la zone visible
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [messages])

  useEffect(() => {
    if (voiceOutputEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        speak(lastMessage.content)
      }
    }
  }, [messages, voiceOutputEnabled])

  async function fetchGame() {
    try {
      const gameData = await api.getGame(gameId)
      
      if (gameData.status === 'archived') {
        navigate(`/archive/${gameId}`)
        return
      }
      
      setGame(gameData)
      setInventory(gameData.inventory || [])

      const messagesData = await api.getMessages(gameId)
      setMessages(messagesData || [])
      setGameStarted(messagesData && messagesData.length > 0)
      
      if (messagesData && messagesData.length > 0) {
        const lastMsg = messagesData[messagesData.length - 1]
        if (lastMsg.role === 'assistant' && lastMsg.content.includes('[LANCER_DE]')) {
          setDiceRequested(true)
        }
      }
    } catch (err) {
      console.error('Erreur:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  function handleDiceRoll(value) {
    setDiceRequested(false)
    sendMessage(`🎲 ${value}`)
  }

  function handleVoiceTranscript(text) {
    setInput(prev => prev + (prev ? ' ' : '') + text)
  }

  async function handleLevelUpChoice(statKey) {
    const newStats = { ...game.currentStats }
    newStats[statKey] = (newStats[statKey] || 10) + 1
    
    await api.updateGame(gameId, { 
      level: pendingLevel,
      currentStats: newStats
    })
    
    setGame(prev => ({
      ...prev,
      level: pendingLevel,
      currentStats: newStats
    }))
    
    setLevelUpPending(false)
    setPendingLevel(null)
  }

  async function startGame() {
    setSending(true)
    try {
      const systemPrompt = buildSystemPrompt()
      
      const response = await api.sendToAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Contexte de l'aventure: ${game.initialPrompt}. Lance l'aventure de manière immersive.` }
      ], { game, profile, stats: game.currentStats })

      const aiMessage = await api.addMessage(gameId, 'assistant', response.content)
      setMessages([aiMessage])
      setGameStarted(true)
      
      processAIResponse(response)
    } catch (err) {
      console.error('Erreur démarrage:', err)
    } finally {
      setSending(false)
    }
  }

  async function sendMessage(overrideMessage = null) {
    const messageToSend = overrideMessage || input.trim()
    if (!messageToSend || sending) return
    
    if (!overrideMessage) setInput('')
    setSending(true)

    try {
      const userMsg = await api.addMessage(gameId, 'user', messageToSend)
      setMessages(prev => [...prev, userMsg])

      // Garder les 15 derniers messages pour le contexte
      const history = [...messages, userMsg].slice(-15).map(m => ({
        role: m.role,
        content: m.content
      }))

      const response = await api.sendToAI([
        { role: 'system', content: buildSystemPrompt() },
        ...history
      ], { game, profile, stats: game.currentStats, inventory })

      const aiMsg = await api.addMessage(gameId, 'assistant', response.content)
      setMessages(prev => [...prev, aiMsg])

      processAIResponse(response)
    } catch (err) {
      console.error('Erreur envoi:', err)
    } finally {
      setSending(false)
    }
  }

  function processAIResponse(response) {
    if (response.content.includes('[LANCER_DE]')) {
      setDiceRequested(true)
    }

    if (response.newItems && response.newItems.length > 0) {
      const updatedInventory = [...inventory, ...response.newItems]
      setInventory(updatedInventory)
      api.updateGame(gameId, { inventory: updatedInventory })
    }

    if (response.playerDied) {
      api.updateGame(gameId, { 
        status: 'archived', 
        deathReason: response.deathReason 
      })
      setTimeout(() => navigate(`/archive/${gameId}`), 4000)
    }

    if (response.levelUp) {
      setPendingLevel(game.level + 1)
      setLevelUpPending(true)
    }
  }

  function buildSystemPrompt() {
    return `Tu es le Maître du Jeu d'OpenRPG, un jeu de rôle textuel immersif.

CONTEXTE DE L'AVENTURE:
${game?.initialPrompt}

PERSONNAGE:
- Nom: ${profile?.characterName}
- Niveau: ${game?.level}
- Force: ${game?.currentStats?.strength}/20
- Intelligence: ${game?.currentStats?.intelligence}/20
- Sagesse: ${game?.currentStats?.wisdom}/20
- Dextérité: ${game?.currentStats?.dexterity}/20
- Constitution: ${game?.currentStats?.constitution}/20
- Mana: ${game?.currentStats?.mana}/20

INVENTAIRE: ${inventory.length > 0 ? inventory.map(i => i.name).join(', ') : 'Vide'}

RÈGLES:
1. MODE HARDCORE: La mort du personnage est permanente. Sois juste mais les dangers sont réels.
2. DÉ D6: Pour les actions risquées ou incertaines, demande au joueur de lancer le dé avec [LANCER_DE].
   - Résultat 1: Échec critique (conséquences graves)
   - Résultat 2-3: Échec
   - Résultat 4-5: Réussite
   - Résultat 6: Réussite critique (bonus)
   - Les stats élevées (15+) donnent un avantage.
3. OBJETS: Quand le joueur trouve ou reçoit un objet important, ajoute [OBJET:nom|icône|description]
4. LEVEL UP: Après un exploit majeur, ajoute [LEVEL_UP] - le joueur choisira quelle stat améliorer.
5. MORT: Si le personnage meurt, termine par [MORT:description de la mort]
6. Réponds dans la langue du joueur.
7. Sois descriptif et immersif, crée une atmosphère.
8. N'utilise JAMAIS de balise [IMAGE:].`
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (loading) {
    return <div className="game-loading">Chargement...</div>
  }

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-btn">←</Link>
          <button className="inventory-btn" onClick={() => setInventoryOpen(true)}>
            🎒 {inventory.length}
          </button>
        </div>
        <div className="game-title">
          <h1>{game?.title}</h1>
          <span className="game-level">Niveau {game?.level}</span>
        </div>
        <div className="game-controls">
          <VoiceOutput 
            enabled={voiceOutputEnabled} 
            onToggle={() => {
              if (voiceOutputEnabled) stopSpeaking()
              setVoiceOutputEnabled(!voiceOutputEnabled)
            }} 
          />
          <div className="game-stats-mini">
            <span>💪{game?.currentStats?.strength}</span>
            <span>🧠{game?.currentStats?.intelligence}</span>
            <span>❤️{game?.currentStats?.constitution}</span>
          </div>
        </div>
      </header>

      <main className="game-main">
        {!gameStarted ? (
          <div className="game-intro">
            <div className="intro-card">
              <h2>📜 {game?.title}</h2>
              <div className="intro-prompt">{game?.initialPrompt}</div>
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
            <div className="messages-container" ref={messagesContainerRef}>
              {messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`message ${msg.role}`}
                  ref={index === messages.length - 1 ? lastMessageRef : null}
                >
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
            </div>

            <div className="input-area">
              {diceRequested && (
                <div className="dice-request">🎲 Le Maître du Jeu demande un lancer de dé !</div>
              )}
              
              <div className="input-container">
                <Dice onRoll={handleDiceRoll} disabled={sending || !diceRequested} />
                
                <div className="input-wrapper">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Que faites-vous ?"
                    disabled={sending}
                    rows={1}
                  />
                  <VoiceInput onTranscript={handleVoiceTranscript} disabled={sending} />
                </div>
                
                <button 
                  className="send-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || sending}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      <Inventory 
        items={inventory} 
        isOpen={inventoryOpen} 
        onClose={() => setInventoryOpen(false)} 
      />

      <LevelUpModal
        isOpen={levelUpPending}
        newLevel={pendingLevel}
        currentStats={game?.currentStats}
        onChoose={handleLevelUpChoice}
      />
    </div>
  )
}

function formatMessage(content) {
  let formatted = content

  // Retirer les tags d'objets du texte affiché
  formatted = formatted.replace(/\[OBJET:[^\]]+\]/g, '')
  
  formatted = formatted.replace(/\[LANCER_DE\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 MORT — $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
