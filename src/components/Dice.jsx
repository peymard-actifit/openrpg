import { useState } from 'react'
import '../styles/dice.css'

export default function Dice({ onRoll, disabled, diceType = 6 }) {
  const [rolling, setRolling] = useState(false)
  const [lastValue, setLastValue] = useState(null)

  function roll() {
    if (disabled || rolling) return
    
    setRolling(true)
    
    // Animation de roulement
    let count = 0
    const interval = setInterval(() => {
      setLastValue(Math.floor(Math.random() * diceType) + 1)
      count++
      if (count > 10) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * diceType) + 1
        setLastValue(finalValue)
        setRolling(false)
        onRoll(finalValue, diceType)
      }
    }, 80)
  }

  function getDiceIcon() {
    if (diceType === 6) return '🎲'
    return `D${diceType}`
  }

  return (
    <button 
      className={`dice-btn ${rolling ? 'rolling' : ''} ${disabled ? 'disabled' : 'active'}`}
      onClick={roll}
      disabled={disabled}
      title={disabled ? 'Attendez une demande de dé' : `Lancer un D${diceType}`}
    >
      <span className="dice-face">
        {rolling ? '?' : (lastValue || getDiceIcon())}
      </span>
      {!disabled && <span className="dice-type">D{diceType}</span>}
    </button>
  )
}
