import { useState, useEffect } from 'react'
import '../styles/dice.css'

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function Dice({ diceType = 6, requested = false, onRoll }) {
  const [rolling, setRolling] = useState(false)
  const [currentFace, setCurrentFace] = useState(0)
  const [result, setResult] = useState(null)
  const [displayType, setDisplayType] = useState(6)

  // Mettre à jour le type de dé affiché quand il change
  useEffect(() => {
    if (diceType !== displayType) {
      setDisplayType(diceType)
      setResult(null) // Reset le résultat quand le type change
    }
  }, [diceType])

  // Reset quand une nouvelle demande arrive
  useEffect(() => {
    if (requested) {
      setResult(null)
    }
  }, [requested])

  function roll() {
    if (rolling) return
    
    setRolling(true)
    setResult(null)
    
    // Animation rapide de rotation
    let ticks = 0
    const maxTicks = 15
    const interval = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6))
      ticks++
      
      if (ticks >= maxTicks) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * displayType) + 1
        setResult(finalValue)
        setRolling(false)
        
        // Si demandé par l'IA, envoyer le résultat
        if (requested && onRoll) {
          setTimeout(() => {
            onRoll(finalValue, displayType)
          }, 500)
        }
      }
    }, 60)
  }

  const isActive = requested && !rolling

  return (
    <div className="dice-container">
      <button 
        className={`dice-btn ${rolling ? 'rolling' : ''} ${isActive ? 'requested' : ''} ${result ? 'has-result' : ''}`}
        onClick={roll}
        title={isActive ? `Cliquez pour lancer le D${displayType} !` : `D${displayType}`}
      >
        <div className="dice-inner">
          {rolling ? (
            <span className="dice-spinning">{DICE_FACES[currentFace]}</span>
          ) : result ? (
            <span className="dice-result">{result}</span>
          ) : (
            <span className="dice-face">{displayType <= 6 ? '🎲' : displayType}</span>
          )}
        </div>
        <span className="dice-label">D{displayType}</span>
        {isActive && <span className="dice-ping" />}
      </button>
      {isActive && !rolling && (
        <div className="dice-prompt">Lancez !</div>
      )}
    </div>
  )
}
