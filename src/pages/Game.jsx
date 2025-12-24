import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import Dice from '../components/Dice'
import Inventory, { InventoryPreview } from '../components/Inventory'
import LevelUpModal from '../components/LevelUpModal'
import RerollPrompt from '../components/RerollPrompt'
import StatsPanel from '../components/StatsPanel'
import { VoiceInput, VoiceOutput, useTextToSpeech } from '../components/VoiceControls'
import ParticipantsPanel from '../components/ParticipantsPanel'
import GameChat from '../components/GameChat'
import InviteModal from '../components/InviteModal'
import SyncStatus from '../components/SyncStatus'
import SyncGroupsPanel from '../components/SyncGroupsPanel'
import packageJson from '../../package.json'
import '../styles/game.css'

// Prompt câblé - Style de base de l'IA (priorité basse)
const HARDCODED_PROMPT = "L'IA doit prendre systématiquement le style de Joe Abercrombie pour s'exprimer, rajouter des éléments d'humour quand cela est possible, ne pas être trop gentille et parfois mettre le joueur en position de mourir s'il ne fait pas l'action la plus logique pour s'en sortir."

export default function Game() {
  const { gameId } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const messagesContainerRef = useRef(null)
  const lastMessageRef = useRef(null)
  const inputRef = useRef(null)
  
  const [game, setGame] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [diceRequested, setDiceRequested] = useState(false)
  const [diceType, setDiceType] = useState(6)
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [autoCorrect, setAutoCorrect] = useState(true)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [inventory, setInventory] = useState([])
  const [levelUpPending, setLevelUpPending] = useState(false)
  const [pendingLevel, setPendingLevel] = useState(null)
  const [inventoryChecked, setInventoryChecked] = useState(false)
  const [alignment, setAlignment] = useState({ goodEvil: 0, lawChaos: 0 })
  const [pendingMessage, setPendingMessage] = useState(null)
  const [correctedMessage, setCorrectedMessage] = useState(null)
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rerolls, setRerolls] = useState(0)
  const [pendingDiceResult, setPendingDiceResult] = useState(null)
  const [showRerollPrompt, setShowRerollPrompt] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [waitingForPlayers, setWaitingForPlayers] = useState(false)
  const [lastSyncActions, setLastSyncActions] = useState(null)
  
  const { speak, stop: stopSpeaking } = useTextToSpeech()

  useEffect(() => {
    fetchGame()
    
    // Heartbeat de présence
    api.sendHeartbeat()
    const heartbeatInterval = setInterval(() => {
      api.sendHeartbeat()
    }, 20000)
    
    // Récupérer l'ID utilisateur courant
    api.getMe().then(data => {
      if (data.user) {
        setCurrentUserId(data.user.id)
      }
    }).catch(() => {})
    
    return () => clearInterval(heartbeatInterval)
  }, [gameId])

  useEffect(() => {
    if (lastMessageRef.current && messagesContainerRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Focus automatique sur l'input après chaque nouveau message
    if (messages.length > 0 && inputRef.current && !sending && !showConfirm) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, sending])

  useEffect(() => {
    if (voiceOutputEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'assistant') {
        speak(lastMessage.content)
      }
    }
  }, [messages, voiceOutputEnabled])

  // Synchroniser l'inventaire au chargement si vide ou incomplet
  useEffect(() => {
    if (gameStarted && messages.length >= 1 && !inventoryChecked && !sending && !loading) {
      syncInventoryOnLoad()
    }
  }, [gameStarted, messages, inventoryChecked, loading])

  // Focus sur input après fermeture de la confirmation
  useEffect(() => {
    if (!showConfirm && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showConfirm])

  // Écouter Entrée pour confirmer quand le modal est affiché (pas pendant la correction)
  useEffect(() => {
    if (!showConfirm || isCorrecting) return

    function handleGlobalKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        // Si une correction existe, l'utiliser automatiquement
        confirmAndSend(!!correctedMessage)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        cancelMessage()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [showConfirm, pendingMessage, isCorrecting, correctedMessage])

  async function syncInventoryOnLoad() {
    if (inventoryChecked) return
    setInventoryChecked(true)

    // Si inventaire vide et qu'il y a des messages, forcer la synchronisation
    if (inventory.length === 0 && messages.length > 0) {
      console.log('🔄 Inventaire vide - Synchronisation forcée via API...')
      
      try {
        const result = await api.syncInventory(gameId)
        if (result.synced && result.inventory?.length > 0) {
          setInventory(result.inventory)
          console.log('✅ Inventaire synchronisé:', result.inventory.map(i => i.name).join(', '))
        }
      } catch (err) {
        console.error('Erreur sync inventaire:', err)
      }
    }
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
      setRerolls(gameData.rerolls || 0)
      
      // Vérifier si l'utilisateur est le propriétaire
      const meData = await api.getMe()
      if (meData.user) {
        setCurrentUserId(meData.user.id)
        setIsOwner(gameData.ownerId === meData.user.id || gameData.userId === meData.user.id)
      }

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
    const diceMatch = content.match(/\[LANCER_D(\d+)\]/)
    if (diceMatch) {
      setDiceType(parseInt(diceMatch[1]))
      setDiceRequested(true)
    } else if (content.includes('[LANCER_DE]')) {
      setDiceType(6)
      setDiceRequested(true)
    } else {
      setDiceRequested(false)
      setDiceType(6)
    }
  }

  function handleDiceRoll(value, type) {
    const threshold = Math.floor(type / 3)
    
    // Si résultat faible et relances disponibles, proposer de relancer
    if (value <= threshold && rerolls > 0) {
      setPendingDiceResult({ value, type })
      setShowRerollPrompt(true)
    } else {
      finalizeDiceRoll(value, type)
    }
  }

  function handleReroll() {
    setShowRerollPrompt(false)
    setRerolls(prev => prev - 1)
    api.updateGame(gameId, { rerolls: rerolls - 1 })
    
    // Relancer le dé
    const newValue = Math.floor(Math.random() * pendingDiceResult.type) + 1
    finalizeDiceRoll(newValue, pendingDiceResult.type)
    setPendingDiceResult(null)
  }

  function handleKeepResult() {
    setShowRerollPrompt(false)
    finalizeDiceRoll(pendingDiceResult.value, pendingDiceResult.type)
    setPendingDiceResult(null)
  }

  function finalizeDiceRoll(value, type) {
    setDiceRequested(false)
    sendMessageDirect(`🎲 D${type}: ${value}`)
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
    
    // Gagner une relance à chaque niveau
    const newRerolls = rerolls + 1
    setRerolls(newRerolls)
    
    await api.updateGame(gameId, { 
      level: pendingLevel,
      currentStats: newStats,
      rerolls: newRerolls
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
        { role: 'user', content: `Contexte: ${game.initialPrompt}

LANCE L'AVENTURE avec les équipements de départ.

⚠️ RAPPEL CRITIQUE: Pour CHAQUE objet de départ, tu DOIS écrire:
[OBJET:nom|icône|description|valeur]

Exemple si le personnage a un bâton et une potion:
[OBJET:Bâton|🪵|Arme simple|10]
[OBJET:Potion de soin|🧪|Restaure 10 PV|25]

Commence l'histoire et liste les objets avec leurs balises.` }
      ], { game, profile, stats: game.currentStats })

      const aiMessage = await api.addMessage(gameId, 'assistant', response.content)
      setMessages([aiMessage])
      setGameStarted(true)
      setInventoryChecked(true)
      
      // Passer l'inventaire courant (vide au démarrage)
      processAIResponse(response, false, [])
    } catch (err) {
      console.error('Erreur démarrage:', err)
    } finally {
      setSending(false)
    }
  }

  async function prepareMessage() {
    const msg = input.trim()
    if (!msg) return
    
    // Détection de réponses courtes (numéros, choix simples) → envoi direct
    const isQuickChoice = /^[0-9]+$/.test(msg) || // Juste un numéro
                          /^[a-zA-Z]$/.test(msg) || // Juste une lettre
                          msg.length <= 3 // Très court (oui, non, ok...)
    
    if (isQuickChoice) {
      setInput('')
      sendMessageDirect(msg)
      return
    }
    
    setPendingMessage(msg)
    setCorrectedMessage(null)
    setShowConfirm(true)
    
    // Si la correction automatique est désactivée, ne pas appeler l'API
    if (!autoCorrect) {
      return
    }
    
    setIsCorrecting(true)
    
    try {
      const result = await api.correctText(msg)
      if (result.hasChanges && result.corrected) {
        setCorrectedMessage(result.corrected)
      }
    } catch (err) {
      console.error('Erreur correction:', err)
    } finally {
      setIsCorrecting(false)
    }
  }

  function cancelMessage() {
    setShowConfirm(false)
    setCorrectedMessage(null)
  }
  
  function confirmAndSend(useCorrection = false) {
    const messageToSend = useCorrection && correctedMessage ? correctedMessage : pendingMessage
    setShowConfirm(false)
    setInput('')
    setCorrectedMessage(null)
    sendMessageDirect(messageToSend)
    setPendingMessage(null)
  }

  async function sendMessageDirect(messageToSend) {
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

      // Mode sync en attente
      if (response.waiting) {
        setWaitingForPlayers(true)
        return
      }

      setWaitingForPlayers(false)

      // Actions synchronisées
      if (response.syncComplete && response.playerActions) {
        setLastSyncActions(response.playerActions)
      }

      const aiMsg = await api.addMessage(gameId, 'assistant', response.content)
      setMessages(prev => [...prev, aiMsg])

      // Passer l'inventaire actuel pour éviter les problèmes de closure
      processAIResponse(response, false, inventory)
    } catch (err) {
      console.error('Erreur envoi:', err)
    } finally {
      setSending(false)
    }
  }

  function processAIResponse(response, silent = false, currentInventory = null) {
    checkForDiceRequest(response.content)

    // Utiliser l'inventaire passé ou l'état actuel
    let workingInventory = currentInventory !== null ? currentInventory : inventory

    // Ajouter les nouveaux objets (depuis balises)
    if (response.newItems && response.newItems.length > 0) {
      workingInventory = [...workingInventory, ...response.newItems]
      setInventory(workingInventory)
      api.updateGame(gameId, { inventory: workingInventory })
      
      if (!silent) {
        console.log('📦 Objets ajoutés:', response.newItems.map(i => i.name).join(', '))
      }
    } else if (!silent && response.content) {
      // Pas de balises détectées - forcer sync pour vérifier les changements
      console.log('🔄 Aucune balise [OBJET:] détectée, sync automatique...')
      api.syncInventory(gameId).then(result => {
        if (result.synced && result.inventory) {
          // Mettre à jour seulement si l'inventaire a changé
          if (result.inventory.length !== workingInventory.length) {
            setInventory(result.inventory)
            console.log('✅ Inventaire synchronisé:', result.inventory.map(i => i.name).join(', '))
          }
        }
      }).catch(err => console.error('Erreur sync:', err))
    }

    // Retirer les objets utilisés
    if (response.removedItems && response.removedItems.length > 0) {
      workingInventory = workingInventory.filter(item => 
        !response.removedItems.some(removed => 
          item.name.toLowerCase().includes(removed.toLowerCase()) ||
          removed.toLowerCase().includes(item.name.toLowerCase())
        )
      )
      setInventory(workingInventory)
      api.updateGame(gameId, { inventory: workingInventory })
      
      if (!silent) {
        console.log('🗑️ Objets retirés:', response.removedItems.join(', '))
      }
    }

    if (response.alignmentChange) {
      setAlignment(prev => {
        const newAlignment = {
          goodEvil: Math.max(-100, Math.min(100, prev.goodEvil + (response.alignmentChange.goodEvil || 0))),
          lawChaos: Math.max(-100, Math.min(100, prev.lawChaos + (response.alignmentChange.lawChaos || 0)))
        }
        api.updateGame(gameId, { alignment: newAlignment })
        return newAlignment
      })
    }

    // Bonus de relance
    if (response.bonusReroll) {
      setRerolls(prev => {
        const newRerolls = prev + 1
        api.updateGame(gameId, { rerolls: newRerolls })
        return newRerolls
      })
    }

    if (response.playerDied) {
      api.updateGame(gameId, { 
        status: 'archived',
        victory: false,
        deathReason: response.deathReason 
      })
      setTimeout(() => navigate(`/archive/${gameId}`), 4000)
    }

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
    const userConsignes = profile?.consignes || ''

    return `Tu es le Maître du Jeu d'OpenRPG, un jeu de rôle textuel immersif.

═══════════════════════════════════════════
🎭 STYLE DE NARRATION (PROMPT CÂBLÉ)
═══════════════════════════════════════════
${HARDCODED_PROMPT}

${userConsignes ? `═══════════════════════════════════════════
📝 CONSIGNES PERSONNALISÉES DU JOUEUR
═══════════════════════════════════════════
${userConsignes}

⚠️ Ces consignes personnalisées PRIMENT sur le prompt câblé ci-dessus.
` : ''}
═══════════════════════════════════════════
CONTEXTE DE L'HISTOIRE
═══════════════════════════════════════════
${game?.initialPrompt}

Utilise tes connaissances de cet univers.

═══════════════════════════════════════════
PERSONNAGE - ${profile?.characterName} (Niveau ${game?.level}, Tour ${turnCount + 1})
═══════════════════════════════════════════
FOR: ${game?.currentStats?.strength} | INT: ${game?.currentStats?.intelligence} | SAG: ${game?.currentStats?.wisdom}
DEX: ${game?.currentStats?.dexterity} | CON: ${game?.currentStats?.constitution} | MANA: ${game?.currentStats?.mana}
Alignement: ${alignment.goodEvil > 30 ? 'Bon' : alignment.goodEvil < -30 ? 'Mauvais' : 'Neutre'} / ${alignment.lawChaos > 30 ? 'Loyal' : alignment.lawChaos < -30 ? 'Chaotique' : 'Neutre'}
Relances disponibles: ${rerolls}

═══════════════════════════════════════════
INVENTAIRE (${inventory.length})
═══════════════════════════════════════════
${inventory.length > 0 ? inventory.map(i => `${i.icon} ${i.name} (${i.value || 0}💰)`).join(', ') : 'Vide'}

═══════════════════════════════════════════
⚠️ RÈGLE CRITIQUE - OBJETS ⚠️
═══════════════════════════════════════════
CHAQUE FOIS qu'un objet est mentionné, tu DOIS utiliser les balises:

✅ OBTENIR → [OBJET:nom|icône|description|valeur]
✅ PERDRE  → [RETIRER:nom]

EXEMPLES OBLIGATOIRES:
- Bâton → [OBJET:Bâton en bois|🪵|Arme simple, dégâts 1D6|5]
- Potion → [OBJET:Potion de soin|🧪|Restaure 10 PV|25]
- Or → [OBJET:50 pièces d'or|💰|Monnaie|50]
- Clé → [OBJET:Clé rouillée|🔑|Ouvre une porte inconnue|2]

❌ INTERDIT: Mentionner un objet SANS sa balise [OBJET:...]
❌ INTERDIT: Dire "vous recevez une épée" sans [OBJET:Épée|⚔️|...|...]

═══════════════════════════════════════════
AUTRES RÈGLES
═══════════════════════════════════════════
🎲 DÉS (action incertaine): [LANCER_D20] ou [LANCER_D6] ou [LANCER_D100]
⚖️ ALIGNEMENT: [ALIGN:goodEvil,lawChaos]
⬆️ NIVEAU (après exploit): [LEVEL_UP]
🔄 BONUS RELANCE: [BONUS_REROLL]
💀 MORT: [MORT:description]
🏆 VICTOIRE: [VICTOIRE:accomplissement]

═══════════════════════════════════════════
STORYTELLING
═══════════════════════════════════════════
• PNJ mémorables, tension, retournements
• N'utilise JAMAIS [IMAGE:]`
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showConfirm) {
        confirmAndSend()
      } else if (input.trim()) {
        prepareMessage()
      }
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
          <span className="version-badge">v{packageJson.version}</span>
          <div className="inventory-btn-wrapper">
            <button className="inventory-btn" onClick={() => setInventoryOpen(true)}>
              🎒 {inventory.length}
            </button>
            <InventoryPreview items={inventory} />
          </div>
          {rerolls > 0 && (
            <span className="reroll-badge" title="Relances disponibles">
              🔄 {rerolls}
            </span>
          )}
        </div>
        <div className="game-title-wrapper">
          <div className="game-title">
            <h1>{game?.title}</h1>
            <span className="game-level">Niveau {game?.level}</span>
          </div>
          <div className="title-tooltip">
            <div className="tooltip-content">{game?.initialPrompt}</div>
          </div>
        </div>
        <div className="game-controls">
          {game?.isMultiplayer && (
            <SyncGroupsPanel 
              gameId={gameId}
              currentUserId={currentUserId}
            />
          )}
          <ParticipantsPanel 
            gameId={gameId}
            currentUserId={currentUserId}
            isOwner={isOwner}
            onInviteClick={() => setShowInviteModal(true)}
          />
          <button
            className={`auto-correct-toggle ${autoCorrect ? 'active' : ''}`}
            onClick={() => setAutoCorrect(!autoCorrect)}
            title={autoCorrect ? 'Correction auto activée' : 'Correction auto désactivée'}
          >
            {autoCorrect ? '✨' : '📝'}
          </button>
          <VoiceInput onTranscript={handleVoiceTranscript} disabled={sending} />
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

      {/* Statut sync multijoueur */}
      {game?.isMultiplayer && waitingForPlayers && (
        <SyncStatus 
          gameId={gameId} 
          isMultiplayer={game.isMultiplayer}
          onAllReady={() => {
            setWaitingForPlayers(false)
            fetchGame() // Recharger pour récupérer la réponse
          }}
        />
      )}

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
              {/* Actions combinées si sync */}
              {lastSyncActions && lastSyncActions.length > 1 && (
                <div className="combined-actions">
                  <h4>🎭 Actions des joueurs</h4>
                  {lastSyncActions.map((action, i) => (
                    <div key={i} className="action-item">
                      <span className="action-player">{action.name}:</span>
                      <span className="action-text">"{action.action}"</span>
                    </div>
                  ))}
                </div>
              )}
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
                  {isCorrecting ? (
                    <>
                      <div className="confirm-text correcting">"{pendingMessage}"</div>
                      <div className="confirm-hint">
                        <span className="correcting-spinner">✨</span> Vérification orthographique...
                      </div>
                    </>
                  ) : correctedMessage ? (
                    <>
                      <div className="confirm-text original">
                        <span className="label">Avant :</span> "{pendingMessage}"
                      </div>
                      <div className="confirm-text corrected">
                        <span className="label">✨ Après :</span> "{correctedMessage}"
                      </div>
                      <div className="confirm-hint">Entrée = envoyer la version corrigée</div>
                      <div className="confirm-actions">
                        <button className="btn btn-secondary" onClick={cancelMessage}>
                          ✏️ Modifier
                        </button>
                        <button className="btn btn-outline" onClick={() => confirmAndSend(false)}>
                          📝 Garder mes fautes
                        </button>
                        <button className="btn btn-primary" onClick={() => confirmAndSend(true)}>
                          ✓ Envoyer
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="confirm-text">"{pendingMessage}"</div>
                      <div className="confirm-hint">✓ Aucune faute détectée - Appuyez sur Entrée</div>
                      <div className="confirm-actions">
                        <button className="btn btn-secondary" onClick={cancelMessage}>
                          ✏️ Modifier
                        </button>
                        <button className="btn btn-primary" onClick={confirmAndSend}>
                          ✓ Envoyer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              <div className="input-container">
                <Dice 
                  diceType={diceType}
                  requested={diceRequested}
                  onRoll={handleDiceRoll}
                />
                
                <div className="input-wrapper">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Que faites-vous ?"
                    disabled={sending || showConfirm}
                    rows={1}
                  />
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

      {showRerollPrompt && pendingDiceResult && (
        <RerollPrompt
          diceResult={pendingDiceResult.value}
          diceType={pendingDiceResult.type}
          rerollsAvailable={rerolls}
          onReroll={handleReroll}
          onKeep={handleKeepResult}
        />
      )}

      {/* Multi-joueur */}
      {game?.isMultiplayer && currentUserId && (
        <GameChat gameId={gameId} currentUserId={currentUserId} />
      )}

      {showInviteModal && (
        <InviteModal
          gameId={gameId}
          onClose={() => setShowInviteModal(false)}
          onInviteSent={() => {}}
        />
      )}
    </div>
  )
}

function formatMessage(content) {
  let formatted = content

  formatted = formatted.replace(/\[OBJET:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[RETIRER:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[ALIGN:[^\]]+\]/g, '')
  formatted = formatted.replace(/\[BONUS_REROLL\]/g, '<div class="bonus-notice">🔄 +1 Relance !</div>')
  formatted = formatted.replace(/\[LANCER_D\d+\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[LANCER_DE\]/g, '<span class="dice-inline">🎲</span>')
  formatted = formatted.replace(/\[MORT:\s*([^\]]+)\]/g, '<div class="death-notice">💀 MORT — $1</div>')
  formatted = formatted.replace(/\[VICTOIRE:\s*([^\]]+)\]/g, '<div class="victory-notice">🏆 VICTOIRE — $1</div>')
  formatted = formatted.replace(/\[LEVEL_UP\]/g, '<div class="level-up-notice">⬆️ NIVEAU SUPÉRIEUR !</div>')

  return <div dangerouslySetInnerHTML={{ __html: formatted.replace(/\n/g, '<br/>') }} />
}
