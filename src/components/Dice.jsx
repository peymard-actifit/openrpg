import { useState, useEffect, useRef } from 'react'
import '../styles/dice.css'

// Faces selon le type de dé
const DICE_VISUALS = {
  2: ['🪙', '🪙'],
  3: ['1️⃣', '2️⃣', '3️⃣'],
  6: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'],
  10: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  20: ['🎲', '⚔️', '🛡️', '⚡', '🔥', '💎', '👑', '🌟', '💀', '⚔️'],
  100: ['🎰', '💯', '🎲', '🔮', '✨']
}

export default function Dice({ diceType = 6, requested = false, onRoll }) {
  const [rolling, setRolling] = useState(false)
  const [displayValue, setDisplayValue] = useState(null)
  const [result, setResult] = useState(null)
  const previousDiceType = useRef(diceType)
  const previousRequested = useRef(requested)

  // Reset quand le type de dé change
  useEffect(() => {
    if (diceType !== previousDiceType.current) {
      setResult(null)
      setDisplayValue(null)
      previousDiceType.current = diceType
    }
  }, [diceType])

  // Reset quand une nouvelle demande arrive
  useEffect(() => {
    if (requested && !previousRequested.current) {
      setResult(null)
      setDisplayValue(null)
    }
    previousRequested.current = requested
  }, [requested])

  function getRandomVisual() {
    const visuals = DICE_VISUALS[diceType] || DICE_VISUALS[6]
    return visuals[Math.floor(Math.random() * visuals.length)]
  }

  function roll() {
    if (rolling) return
    
    setRolling(true)
    setResult(null)
    
    // Animation rapide avec visuels variés
    let ticks = 0
    const maxTicks = 20 // Plus de ticks pour une meilleure animation
    const interval = setInterval(() => {
      // Afficher des valeurs aléatoires pendant l'animation
      const randomValue = Math.floor(Math.random() * diceType) + 1
      setDisplayValue(randomValue)
      ticks++
      
      if (ticks >= maxTicks) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * diceType) + 1
        setResult(finalValue)
        setDisplayValue(finalValue)
        setRolling(false)
        
        // Envoyer le résultat uniquement si demandé par l'IA
        if (requested && onRoll) {
          setTimeout(() => {
            onRoll(finalValue, diceType)
          }, 500)
        }
      }
    }, 50) // Animation plus rapide
  }

  const isActive = requested && !rolling && !result

  // Déterminer l'apparence du dé selon le type
  function getDiceAppearance() {
    if (rolling) {
      return <span className="dice-spinning">{displayValue || '?'}</span>
    }
    if (result) {
      return <span className="dice-result">{result}</span>
    }
    // État idle - montrer l'icône du dé
    switch(diceType) {
      case 2: return <span className="dice-face">🪙</span>
      case 3: return <span className="dice-face">🔺</span>
      case 6: return <span className="dice-face">🎲</span>
      case 10: return <span className="dice-face">🔟</span>
      case 20: return <span className="dice-face dice-d20">⚔️</span>
      case 100: return <span className="dice-face dice-d100">💯</span>
      default: return <span className="dice-face">🎲</span>
    }
  }

  // Couleur du dé selon le type
  function getDiceClass() {
    switch(diceType) {
      case 20: return 'dice-epic'
      case 100: return 'dice-legendary'
      case 2: return 'dice-coin'
      default: return ''
    }
  }

  return (
    <div className={`dice-container ${isActive ? 'dice-requested' : ''}`}>
      <button 
        className={`dice-btn ${rolling ? 'rolling' : ''} ${isActive ? 'requested' : ''} ${result ? 'has-result' : ''} ${getDiceClass()}`}
        onClick={roll}
        title={isActive ? `Cliquez pour lancer le D${diceType} !` : `Lancer un D${diceType}`}
      >
        <div className="dice-inner">
          {getDiceAppearance()}
        </div>
        <span className={`dice-label ${isActive ? 'active' : ''}`}>D{diceType}</span>
        {isActive && <span className="dice-ping" />}
      </button>
      {isActive && (
        <div className="dice-prompt pulse">🎲 Lancez le D{diceType} !</div>
      )}
    </div>
  )
}
