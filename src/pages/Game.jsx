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
  const [inventoryChecked, setInventoryChecked] = useState(false)
  
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech()

  useEffect(() => {
    fetchGame()
  }, [gameId])

  useEffect(() => {
    if (lastMessageRef.current && messagesContainerRef.current) {
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

  // Vérification d'inventaire pour les parties en cours
  useEffect(() => {
    if (gameStarted && messages.length > 0 && !inventoryChecked && !sending) {
      checkInventoryConsistency()
    }
  }, [gameStarted, messages, inventoryChecked])

  async function checkInventoryConsistency() {
    if (inventoryChecked || messages.length < 3) return
    setInventoryChecked(true)

    // Demander à l'IA de vérifier l'inventaire
    const historyForCheck = messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const response = await api.sendToAI([
        { role: 'system', content: buildInventoryCheckPrompt() },
        ...historyForCheck,
        { role: 'user', content: '[SYSTÈME] Analyse l\'historique et vérifie la cohérence de l\'inventaire. Si des objets ont été trouvés mais pas ajoutés, ou utilisés/perdus mais toujours présents, corrige.' }
      ], { game, profile, inventory })

      processAIResponse(response)
    } catch (err) {
      console.error('Erreur vérification inventaire:', err)
    }
  }

  function buildInventoryCheckPrompt() {
    return `Tu es le système de gestion d'inventaire d'OpenRPG.
    
INVENTAIRE ACTUEL: ${inventory.length > 0 ? inventory.map(i => `${i.icon} ${i.name}`).join(', ') : 'Vide'}

Analyse l'historique des messages. Identifie:
1. Les objets mentionnés comme TROUVÉS/OBTENUS mais absents de l'inventaire → ajoute-les avec [OBJET:nom|icône|description]
2. Les objets mentionnés comme UTILISÉS/PERDUS/DONNÉS/DÉTRUITS mais encore présents → retire-les avec [RETIRER:nom]

Réponds UNIQUEMENT avec les balises nécessaires, sans texte narratif. Si tout est cohérent, ne réponds rien.`
  }

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
        { role: 'user', content: `Contexte de l'aventure: ${game.initialPrompt}. Lance l'aventure de manière immersive. Établis une quête principale claire et présente au moins un élément de tension ou un antagoniste potentiel.` }
      ], { game, profile, stats: game.currentStats })

      const aiMessage = await api.addMessage(gameId, 'assistant', response.content)
      setMessages([aiMessage])
      setGameStarted(true)
      setInventoryChecked(true)
      
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

    // Ajout d'objets
    if (response.newItems && response.newItems.length > 0) {
      const updatedInventory = [...inventory, ...response.newItems]
      setInventory(updatedInventory)
      api.updateGame(gameId, { inventory: updatedInventory })
    }

    // Retrait d'objets
    if (response.removedItems && response.removedItems.length > 0) {
      const updatedInventory = inventory.filter(item => 
        !response.removedItems.some(removed => 
          item.name.toLowerCase().includes(removed.toLowerCase()) ||
          removed.toLowerCase().includes(item.name.toLowerCase())
        )
      )
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
    return `Tu es le Maître du Jeu d'OpenRPG, un jeu de rôle textuel immersif et DRAMATIQUE.

═══════════════════════════════════════════
CONTEXTE DE L'AVENTURE
═══════════════════════════════════════════
${game?.initialPrompt}

═══════════════════════════════════════════
PERSONNAGE
═══════════════════════════════════════════
Nom: ${profile?.characterName}
Niveau: ${game?.level}
Force: ${game?.currentStats?.strength}/20 | Intelligence: ${game?.currentStats?.intelligence}/20
Sagesse: ${game?.currentStats?.wisdom}/20 | Dextérité: ${game?.currentStats?.dexterity}/20
Constitution: ${game?.currentStats?.constitution}/20 | Mana: ${game?.currentStats?.mana}/20

═══════════════════════════════════════════
INVENTAIRE (${inventory.length} objets)
═══════════════════════════════════════════
${inventory.length > 0 ? inventory.map(i => `• ${i.icon} ${i.name}: ${i.description}`).join('\n') : '(Vide)'}

═══════════════════════════════════════════
RÈGLES DU JEU
═══════════════════════════════════════════

🎲 DÉ D6 - Pour actions risquées, utilise [LANCER_DE]:
   • 1 = Échec CRITIQUE (conséquences graves, perte possible)
   • 2-3 = Échec (complications)
   • 4-5 = Réussite
   • 6 = Réussite CRITIQUE (bonus exceptionnel)
   • Stats 15+ = avantage narratif

💀 MODE HARDCORE:
   • La mort est PERMANENTE
   • Les dangers sont RÉELS
   • Pas de seconde chance

📦 GESTION INVENTAIRE (CRUCIAL):
   • Objet TROUVÉ/REÇU → [OBJET:nom|icône|description courte]
   • Objet UTILISÉ/PERDU/DONNÉ/DÉTRUIT/VOLÉ → [RETIRER:nom de l'objet]
   • Vérifie TOUJOURS la cohérence avec les actions du joueur

⬆️ PROGRESSION:
   • Exploit majeur → [LEVEL_UP]
   • Mort → [MORT:description]

═══════════════════════════════════════════
STORYTELLING DRAMATIQUE (IMPORTANT)
═══════════════════════════════════════════

Tu dois créer une aventure VIVANTE avec:

🔥 TENSION NARRATIVE:
   • Introduis des retournements de situation inattendus
   • Les alliés peuvent trahir, les ennemis peuvent aider
   • Les choix ont des conséquences à long terme

👤 ANTAGONISTES:
   • Crée des ennemis récurrents avec leurs propres motivations
   • Ils évoluent, s'adaptent, reviennent
   • Certains peuvent être raisonnés, d'autres non

⚡ ÉVÉNEMENTS DRAMATIQUES:
   • Pertes (objets volés, alliés blessés, lieux détruits)
   • Dilemmes moraux sans bonne réponse
   • Révélations qui changent tout
   • Poursuites, embuscades, pièges

🎭 AUTOUR DU PERSONNAGE:
   • Son passé peut le rattraper
   • Ses actions ont des répercussions
   • Des PNJ se souviennent de lui
   • Sa réputation le précède

📜 QUÊTE PRINCIPALE:
   • Maintiens un fil conducteur clair
   • Ajoute des obstacles et complications
   • Les antagonistes interfèrent avec ses objectifs
   • La quête peut évoluer/se transformer

═══════════════════════════════════════════
CONSIGNES FINALES
═══════════════════════════════════════════
• Réponds dans la langue du joueur
• Sois immersif et descriptif
• N'utilise JAMAIS [IMAGE:]
• Fais vivre le monde autour du personnage
• Surprends le joueur régulièrement`
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

  // Retirer les tags système du texte affiché
  formatted = formatted.replace(/\[OBJET:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[RETIRER:[^\]]+\]/g, '')
  
  formatted = formatted.replace(/\[LANCER_DE\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 MORT — $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
