import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import Dice from '../components/Dice'
import Inventory from '../components/Inventory'
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
        { role: 'user', content: '[SYSTÈME] Analyse l\'historique et vérifie la cohérence de l\'inventaire. Si des objets ont été trouvés mais pas ajoutés, ou utilisés/perdus mais toujours présents, corrige.' }
      ], { game, profile, inventory })

      processAIResponse(response, true)
    } catch (err) {
      console.error('Erreur vérification inventaire:', err)
    }
  }

  function buildInventoryCheckPrompt() {
    return `Tu es le système de gestion d'inventaire d'OpenRPG.
    
INVENTAIRE ACTUEL: ${inventory.length > 0 ? inventory.map(i => `${i.icon} ${i.name}`).join(', ') : 'Vide'}

Analyse l'historique des messages. Identifie:
1. Les objets mentionnés comme TROUVÉS/OBTENUS/REÇUS/RAMASSÉS mais absents de l'inventaire → ajoute-les avec [OBJET:nom|icône|description]
2. Les objets mentionnés comme UTILISÉS/PERDUS/DONNÉS/DÉTRUITS/CONSOMMÉS mais encore présents → retire-les avec [RETIRER:nom]

IMPORTANT: Inclus TOUS les objets importants mentionnés (or, armes, équipements, consommables, clés, etc.)

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
      setAlignment(gameData.alignment || { goodEvil: 0, lawChaos: 0 })

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
    confirmAndSend(`🎲 ${value}`)
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
        { role: 'user', content: `Contexte de l'aventure: ${game.initialPrompt}. Lance l'aventure de manière immersive. Établis une quête principale claire et présente au moins un élément de tension ou un antagoniste potentiel. Si le joueur reçoit des objets de départ, liste-les.` }
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

  // Demande de confirmation avant envoi
  function prepareMessage() {
    const msg = input.trim()
    if (!msg) return
    
    setPendingMessage(msg)
    setShowConfirm(true)
  }

  function cancelMessage() {
    setShowConfirm(false)
    // Garde le message dans l'input pour modification
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

    // Changement d'alignement
    if (response.alignmentChange) {
      const newAlignment = {
        goodEvil: Math.max(-100, Math.min(100, alignment.goodEvil + (response.alignmentChange.goodEvil || 0))),
        lawChaos: Math.max(-100, Math.min(100, alignment.lawChaos + (response.alignmentChange.lawChaos || 0)))
      }
      setAlignment(newAlignment)
      api.updateGame(gameId, { alignment: newAlignment })
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
    const turnCount = messages.filter(m => m.role === 'user').length

    return `Tu es le Maître du Jeu d'OpenRPG, un jeu de rôle textuel immersif et DRAMATIQUE.

═══════════════════════════════════════════
CONTEXTE & RÉFÉRENCES
═══════════════════════════════════════════
${game?.initialPrompt}

IMPORTANT: Utilise tes connaissances sur cet univers/contexte pour enrichir l'histoire avec des références authentiques (lieux, personnages, événements, objets typiques de cet univers).

═══════════════════════════════════════════
PERSONNAGE
═══════════════════════════════════════════
Nom: ${profile?.characterName}
Niveau: ${game?.level} (Tour ${turnCount + 1})
Force: ${game?.currentStats?.strength}/20 | Intelligence: ${game?.currentStats?.intelligence}/20
Sagesse: ${game?.currentStats?.wisdom}/20 | Dextérité: ${game?.currentStats?.dexterity}/20
Constitution: ${game?.currentStats?.constitution}/20 | Mana: ${game?.currentStats?.mana}/20

ALIGNEMENT ACTUEL:
• Bon/Mauvais: ${alignment.goodEvil} (${alignment.goodEvil > 30 ? 'Bon' : alignment.goodEvil < -30 ? 'Mauvais' : 'Neutre'})
• Loyal/Chaotique: ${alignment.lawChaos} (${alignment.lawChaos > 30 ? 'Loyal' : alignment.lawChaos < -30 ? 'Chaotique' : 'Neutre'})

═══════════════════════════════════════════
INVENTAIRE (${inventory.length} objets)
═══════════════════════════════════════════
${inventory.length > 0 ? inventory.map(i => `• ${i.icon} ${i.name}: ${i.description}`).join('\n') : '(Vide)'}

═══════════════════════════════════════════
RÈGLES CRITIQUES
═══════════════════════════════════════════

🎲 LANCER DE DÉ - DEMANDE SOUVENT [LANCER_DE]:
   • TOUTE action incertaine, risquée ou spectaculaire
   • Combats, acrobaties, persuasion, discrétion
   • Actions surprenantes du joueur
   • Si le succès n'est pas garanti → dé !
   Résultats: 1=échec critique, 2-3=échec, 4-5=réussite, 6=critique

💀 MODE HARDCORE: Mort permanente, dangers réels

📦 INVENTAIRE (CRUCIAL - NE JAMAIS OUBLIER):
   • TOUT objet reçu/trouvé/acheté → [OBJET:nom|icône|description]
   • Objet utilisé/perdu/vendu/donné → [RETIRER:nom]
   • Inclure: or, armes, armures, potions, clés, documents, tout!

⚖️ ALIGNEMENT (évolue selon les actions):
   • Action bonne/altruiste → [ALIGN:+10,0] (bon)
   • Action mauvaise/égoïste → [ALIGN:-10,0] (mauvais)
   • Action ordonnée/honorable → [ALIGN:0,+10] (loyal)
   • Action imprévisible/rebelle → [ALIGN:0,-10] (chaotique)
   • Cumule si l'action est double (ex: [ALIGN:+10,-10])

⬆️ PROGRESSION - Régulière:
   • Tous les 5-8 tours environ → [LEVEL_UP]
   • Après victoire importante → [LEVEL_UP]
   • Après résolution de quête → [LEVEL_UP]

═══════════════════════════════════════════
STORYTELLING DRAMATIQUE
═══════════════════════════════════════════

🔥 TENSION: Retournements, trahisons, révélations
👤 ANTAGONISTES: Ennemis récurrents, motivés
⚡ ÉVÉNEMENTS: Vols, embuscades, dilemmes moraux
📜 QUÊTE: Obstacles, interférences, évolution
🎭 CONSÉQUENCES: Les actions ont un impact durable

═══════════════════════════════════════════
CONSIGNES FINALES
═══════════════════════════════════════════
• Réponds dans la langue du joueur
• N'utilise JAMAIS [IMAGE:]
• Demande des jets de dé RÉGULIÈREMENT
• Fais évoluer l'alignement selon les choix
• Donne des objets régulièrement
• Fais monter de niveau régulièrement`
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
          <button className="inventory-btn" onClick={() => setInventoryOpen(true)}>
            🎒 {inventory.length}
          </button>
        </div>
        <div className="game-title" title={game?.initialPrompt}>
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
                <div className="dice-request">🎲 Le Maître du Jeu demande un lancer de dé !</div>
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
                <Dice onRoll={handleDiceRoll} disabled={sending || !diceRequested} />
                
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
  
  formatted = formatted.replace(/\[LANCER_DE\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 MORT — $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
