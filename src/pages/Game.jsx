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
  const messagesEndRef = useRef(null)
  
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

  useEffect(() => {
    scrollToBottom()
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

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        { role: 'user', content: `Contexte: ${game.initialPrompt}. Lance l'aventure.` }
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

      const history = [...messages, userMsg].slice(-10).map(m => ({
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
    // Dé demandé
    if (response.content.includes('[LANCER_DE]')) {
      setDiceRequested(true)
    }

    // Nouveaux objets
    if (response.newItems && response.newItems.length > 0) {
      const updatedInventory = [...inventory, ...response.newItems]
      setInventory(updatedInventory)
      api.updateGame(gameId, { inventory: updatedInventory })
    }

    // Mort
    if (response.playerDied) {
      api.updateGame(gameId, { 
        status: 'archived', 
        deathReason: response.deathReason 
      })
      setTimeout(() => navigate(`/archive/${gameId}`), 3000)
    }

    // Level up - choix du joueur
    if (response.levelUp) {
      setPendingLevel(game.level + 1)
      setLevelUpPending(true)
    }
  }

  function buildSystemPrompt() {
    return `Tu es le MJ d'OpenRPG. RÈGLES STRICTES:

1. RÉPONSES COURTES (3-5 phrases max). Pas de descriptions fleuries inutiles.
2. MODE HARDCORE: mort permanente possible.
3. Pour actions risquées: [LANCER_DE] (d6: 1=échec crit, 6=réussite crit)
4. OBJETS: quand le joueur trouve/obtient un objet, ajoute [OBJET:nom|icône|description courte]
5. LEVEL UP après exploits majeurs: [LEVEL_UP]
6. MORT: [MORT:raison]
7. Jamais de [IMAGE:]. Pas d'images.
8. Langue du joueur.

CONTEXTE: ${game?.initialPrompt}
PERSONNAGE: ${profile?.characterName}, Niv.${game?.level}
STATS: FOR:${game?.currentStats?.strength} INT:${game?.currentStats?.intelligence} SAG:${game?.currentStats?.wisdom} DEX:${game?.currentStats?.dexterity} CON:${game?.currentStats?.constitution} MANA:${game?.currentStats?.mana}
INVENTAIRE: ${inventory.map(i => i.name).join(', ') || 'vide'}`
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
          <span className="game-level">Niv. {game?.level}</span>
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
                {sending ? '...' : '⚔️ Commencer'}
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

            <div className="input-area">
              {diceRequested && (
                <div className="dice-request">🎲 Lancez le dé !</div>
              )}
              
              <div className="input-container">
                <Dice onRoll={handleDiceRoll} disabled={sending || !diceRequested} />
                
                <div className="input-wrapper">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Action..."
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
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
