import { useState } from 'react'
import '../styles/dice.css'

export default function Dice({ onRoll, disabled, diceType = 6, requested = false }) {
  const [rolling, setRolling] = useState(false)
  const [lastValue, setLastValue] = useState(null)
  const [showResult, setShowResult] = useState(false)

  function roll() {
    if (rolling) return
    
    setRolling(true)
    setShowResult(false)
    
    // Animation de roulement
    let count = 0
    const interval = setInterval(() => {
      setLastValue(Math.floor(Math.random() * diceType) + 1)
      count++
      if (count > 12) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * diceType) + 1
        setLastValue(finalValue)
        setRolling(false)
        setShowResult(true)
        
        // Si c'était demandé par l'IA, envoyer le résultat
        if (requested && onRoll) {
          setTimeout(() => {
            onRoll(finalValue, diceType)
            setShowResult(false)
            setLastValue(null)
          }, 1000)
        }
      }
    }, 70)
  }

  function getDiceEmoji() {
    if (diceType <= 6) return '🎲'
    if (diceType <= 10) return '🔟'
    if (diceType <= 20) return '🎯'
    return '💯'
  }

  return (
    <button 
      className={`dice-btn ${rolling ? 'rolling' : ''} ${requested ? 'requested' : ''} ${showResult ? 'result' : ''}`}
      onClick={roll}
      title={requested ? `Lancez le D${diceType} !` : `D${diceType} (pour le fun)`}
    >
      <span className="dice-face">
        {rolling ? '?' : (showResult && lastValue ? lastValue : getDiceEmoji())}
      </span>
      <span className="dice-type">D{diceType}</span>
      {requested && !rolling && !showResult && (
        <span className="dice-ping"></span>
      )}
    </button>
  )
}
