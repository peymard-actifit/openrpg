import { useState } from 'react'
import '../styles/dice.css'

export default function Dice({ onRoll, disabled }) {
  const [value, setValue] = useState(null)
  const [rolling, setRolling] = useState(false)

  async function roll() {
    if (rolling || disabled) return
    
    setRolling(true)
    
    // Animation de roulement
    const rollDuration = 1000
    const intervalTime = 80
    let elapsed = 0
    
    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 6) + 1)
      elapsed += intervalTime
      
      if (elapsed >= rollDuration) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * 6) + 1
        setValue(finalValue)
        setRolling(false)
        if (onRoll) onRoll(finalValue)
      }
    }, intervalTime)
  }

  const dots = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
  }

  return (
    <div className={`dice-container ${rolling ? 'rolling' : ''}`}>
      <button 
        className="dice-button"
        onClick={roll}
        disabled={disabled || rolling}
        title="Lancer le dé"
      >
        <div className="dice-face">
          {value && dots[value]?.map((pos, i) => (
            <div 
              key={i} 
              className="dice-dot"
              style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
            />
          ))}
          {!value && <span className="dice-prompt">🎲</span>}
        </div>
      </button>
      {value && !rolling && (
        <div className="dice-result-label">{value}</div>
      )}
    </div>
  )
}

