import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import Dice from '../components/Dice'
import Inventory, { InventoryPreview } from '../components/Inventory'
import LevelUpModal from '../components/LevelUpModal'
import StatsPanel from '../components/StatsPanel'
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
  const [diceType, setDiceType] = useState(6)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState([])
  const [levelUpPending, setLevelUpPending] = useState(false)
  const [pendingLevel, setPendingLevel] = useState(null)
  const [inventoryChecked, setInventoryChecked] = useState(false)
  const [alignment, setAlignment] = useState({ goodEvil: 0, lawChaos: 0 })
  const [pendingMessage, setPendingMessage] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  
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

  useEffect(() => {
    if (gameStarted && messages.length > 0 && !inventoryChecked && !sending) {
      checkInventoryConsistency()
    }
  }, [gameStarted, messages, inventoryChecked])

  async function checkInventoryConsistency() {
    if (inventoryChecked || messages.length < 3) return
    setInventoryChecked(true)

    const historyForCheck = messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const response = await api.sendToAI([
        { role: 'system', content: buildInventoryCheckPrompt() },
        ...historyForCheck,
        { role: 'user', content: '[SYSTÈME] Analyse l\'historique. Ajoute les objets manquants avec leur valeur estimée.' }
      ], { game, profile, inventory })

      processAIResponse(response, true)
    } catch (err) {
      console.error('Erreur vérification inventaire:', err)
    }
  }

  function buildInventoryCheckPrompt() {
    return `Tu es le système de gestion d'inventaire d'OpenRPG.
    
INVENTAIRE ACTUEL: ${inventory.length > 0 ? inventory.map(i => `${i.icon} ${i.name}`).join(', ') : 'Vide'}

Analyse l'historique. Pour chaque objet mentionné comme obtenu mais absent:
[OBJET:nom|icône|description courte|valeur en pièces]

Exemple: [OBJET:Épée rouillée|⚔️|Vieille épée ébréchée|15]

Inclus TOUT: or (pièces d'or → 💰), armes, armures, potions, clés, etc.
Pour l'or/argent, indique la quantité dans le nom.

Réponds UNIQUEMENT avec les balises. Si tout est ok, ne réponds rien.`
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
      setAlignment(gameData.alignment || { goodEvil: 0, lawChaos: 0 })

      const messagesData = await api.getMessages(gameId)
      setMessages(messagesData || [])
      setGameStarted(messagesData && messagesData.length > 0)
      
      if (messagesData && messagesData.length > 0) {
        const lastMsg = messagesData[messagesData.length - 1]
        checkForDiceRequest(lastMsg.content)
      }
    } catch (err) {
      console.error('Erreur:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  function checkForDiceRequest(content) {
    // Cherche [LANCER_Dx] où x est le type de dé
    const diceMatch = content.match(/\[LANCER_D(\d+)\]/)
    if (diceMatch) {
      setDiceType(parseInt(diceMatch[1]))
      setDiceRequested(true)
    } else if (content.includes('[LANCER_DE]')) {
      setDiceType(6)
      setDiceRequested(true)
    }
  }

  function handleDiceRoll(value, type) {
    setDiceRequested(false)
    confirmAndSend(`🎲 D${type}: ${value}`)
  }

  function handleVoiceTranscript(text) {
    setInput(prev => prev + (prev ? ' ' : '') + text)
  }

  function handleDiscardItem(index) {
    const updatedInventory = inventory.filter((_, i) => i !== index)
    setInventory(updatedInventory)
    api.updateGame(gameId, { inventory: updatedInventory })
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
        { role: 'user', content: `Contexte: ${game.initialPrompt}. Lance l'aventure. Si le personnage commence avec des objets, liste-les tous.` }
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

  function prepareMessage() {
    const msg = input.trim()
    if (!msg) return
    
    setPendingMessage(msg)
    setShowConfirm(true)
  }

  function cancelMessage() {
    setShowConfirm(false)
  }

  function confirmAndSend(overrideMessage = null) {
    const msg = overrideMessage || pendingMessage
    setShowConfirm(false)
    setPendingMessage(null)
    if (overrideMessage) {
      sendMessage(msg)
    } else {
      setInput('')
      sendMessage(msg)
    }
  }

  async function sendMessage(messageToSend) {
    if (!messageToSend || sending) return
    
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
      ], { game, profile, stats: game.currentStats, inventory, alignment })

      const aiMsg = await api.addMessage(gameId, 'assistant', response.content)
      setMessages(prev => [...prev, aiMsg])

      processAIResponse(response)
    } catch (err) {
      console.error('Erreur envoi:', err)
    } finally {
      setSending(false)
    }
  }

  function processAIResponse(response, silent = false) {
    checkForDiceRequest(response.content)

    if (response.newItems && response.newItems.length > 0) {
      const updatedInventory = [...inventory, ...response.newItems]
      setInventory(updatedInventory)
      api.updateGame(gameId, { inventory: updatedInventory })
    }

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

    if (response.alignmentChange) {
      const newAlignment = {
        goodEvil: Math.max(-100, Math.min(100, alignment.goodEvil + (response.alignmentChange.goodEvil || 0))),
        lawChaos: Math.max(-100, Math.min(100, alignment.lawChaos + (response.alignmentChange.lawChaos || 0)))
      }
      setAlignment(newAlignment)
      api.updateGame(gameId, { alignment: newAlignment })
    }

    // Mort du joueur
    if (response.playerDied) {
      api.updateGame(gameId, { 
        status: 'archived',
        victory: false,
        deathReason: response.deathReason 
      })
      setTimeout(() => navigate(`/archive/${gameId}`), 4000)
    }

    // Victoire !
    if (response.victory) {
      api.updateGame(gameId, { 
        status: 'archived',
        victory: true,
        victoryReason: response.victoryReason 
      })
      setTimeout(() => navigate(`/archive/${gameId}`), 4000)
    }

    if (response.levelUp) {
      setPendingLevel(game.level + 1)
      setLevelUpPending(true)
    }
  }

  function buildSystemPrompt() {
    const turnCount = messages.filter(m => m.role === 'user').length

    return `Tu es le Maître du Jeu d'OpenRPG, un jeu de rôle textuel immersif.

═══════════════════════════════════════════
CONTEXTE DE L'AVENTURE
═══════════════════════════════════════════
${game?.initialPrompt}

Utilise tes connaissances de cet univers pour enrichir l'histoire.

═══════════════════════════════════════════
PERSONNAGE - ${profile?.characterName} (Niveau ${game?.level}, Tour ${turnCount + 1})
═══════════════════════════════════════════
FOR: ${game?.currentStats?.strength} | INT: ${game?.currentStats?.intelligence} | SAG: ${game?.currentStats?.wisdom}
DEX: ${game?.currentStats?.dexterity} | CON: ${game?.currentStats?.constitution} | MANA: ${game?.currentStats?.mana}

Alignement: ${alignment.goodEvil > 30 ? 'Bon' : alignment.goodEvil < -30 ? 'Mauvais' : 'Neutre'} / ${alignment.lawChaos > 30 ? 'Loyal' : alignment.lawChaos < -30 ? 'Chaotique' : 'Neutre'}

═══════════════════════════════════════════
INVENTAIRE
═══════════════════════════════════════════
${inventory.length > 0 ? inventory.map(i => `${i.icon} ${i.name} (${i.value || 0}💰)`).join(', ') : 'Vide'}

═══════════════════════════════════════════
RÈGLES
═══════════════════════════════════════════

🎲 DÉS - Seulement quand le résultat est vraiment incertain:
   [LANCER_D20] Combat, actions majeures
   [LANCER_D6] Actions simples
   [LANCER_D100] Événements très rares
   Ne demande PAS de dé pour des actions triviales ou évidentes.

📦 OBJETS:
   [OBJET:nom|icône|description|valeur] pour ajouter
   [RETIRER:nom] pour retirer

⚖️ ALIGNEMENT: [ALIGN:goodEvil,lawChaos]

⬆️ NIVEAU: [LEVEL_UP] (tous les 6-8 tours ou exploit)

═══════════════════════════════════════════
FIN DE PARTIE
═══════════════════════════════════════════

💀 MORT - Si le joueur est en danger MORTEL réel:
   [MORT:description de la mort]
   Sois juste: la mort doit être méritée par les actions/échecs.

🏆 VICTOIRE - Si l'objectif du prompt initial est ATTEINT:
   [VICTOIRE:description de l'accomplissement]
   Vérifie que la quête principale est vraiment accomplie.

═══════════════════════════════════════════
PNJ (Personnages Non-Joueurs)
═══════════════════════════════════════════
Tu peux créer et gérer des PNJ:
• Alliés, marchands, informateurs, ennemis
• Ils ont leur personnalité et motivations
• Ils se souviennent des interactions passées
• Ils peuvent trahir, aider, évoluer
• Les antagonistes peuvent revenir

═══════════════════════════════════════════
STORYTELLING
═══════════════════════════════════════════
• Crée tension, retournements, dilemmes
• Les actions ont des conséquences durables
• Objets avec valeur pour vente aux marchands
• N'utilise JAMAIS [IMAGE:]`
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      prepareMessage()
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
          <div className="inventory-btn-wrapper">
            <button className="inventory-btn" onClick={() => setInventoryOpen(true)}>
              🎒 {inventory.length}
            </button>
            <InventoryPreview items={inventory} />
          </div>
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
        </div>
      </header>

      <StatsPanel 
        stats={game?.currentStats} 
        level={game?.level}
        alignment={alignment}
      />

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
                <div className="dice-request">🎲 Lancez un D{diceType} !</div>
              )}
              
              {showConfirm && (
                <div className="confirm-message">
                  <div className="confirm-text">"{pendingMessage}"</div>
                  <div className="confirm-actions">
                    <button className="btn btn-secondary" onClick={cancelMessage}>
                      ✏️ Modifier
                    </button>
                    <button className="btn btn-primary" onClick={() => confirmAndSend()}>
                      ✓ Envoyer
                    </button>
                  </div>
                </div>
              )}
              
              <div className="input-container">
                <Dice 
                  onRoll={handleDiceRoll} 
                  requested={diceRequested && !sending}
                  diceType={diceType}
                />
                
                <div className="input-wrapper">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Que faites-vous ?"
                    disabled={sending || showConfirm}
                    rows={1}
                  />
                  <VoiceInput onTranscript={handleVoiceTranscript} disabled={sending} />
                </div>
                
                <button 
                  className="send-btn"
                  onClick={prepareMessage}
                  disabled={!input.trim() || sending || showConfirm}
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
        onDiscardItem={handleDiscardItem}
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

  // Retirer les tags système
  formatted = formatted.replace(/\[OBJET:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[RETIRER:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[ALIGN:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[LANCER_D\d+\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[LANCER_DE\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 MORT — $1</div>')
  formatted = formatted.replace(/\[VICTOIRE:\s*([^\]]+)\]/g, '<div class="victory-notice">🏆 VICTOIRE — $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
