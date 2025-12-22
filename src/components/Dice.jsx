import { useState, useEffect } from 'react'
import '../styles/dice.css'

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

export default function Dice({ diceType = 6, requested = false, onRoll }) {
  const [rolling, setRolling] = useState(false)
  const [currentFace, setCurrentFace] = useState(0)
  const [result, setResult] = useState(null)

  function roll() {
    if (rolling) return
    
    setRolling(true)
    setResult(null)
    
    // Animation rapide de rotation
    let ticks = 0
    const maxTicks = 20
    const interval = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6))
      ticks++
      
      if (ticks >= maxTicks) {
        clearInterval(interval)
        const finalValue = Math.floor(Math.random() * diceType) + 1
        setResult(finalValue)
        setRolling(false)
        
        // Si demandé par l'IA, envoyer le résultat
        if (requested && onRoll) {
          onRoll(finalValue, diceType)
        }
      }
    }, 50)
  }

  return (
    <div className="dice-container">
      <button 
        className={`dice-btn ${rolling ? 'rolling' : ''} ${requested ? 'requested' : ''} ${result ? 'has-result' : ''}`}
        onClick={roll}
        title={requested ? `Lancez le D${diceType} !` : 'Lancer pour le fun'}
      >
        <div className="dice-inner">
          {rolling ? (
            <span className="dice-spinning">{DICE_FACES[currentFace]}</span>
          ) : result ? (
            <span className="dice-result">{result}</span>
          ) : (
            <span className="dice-face">{diceType <= 6 ? '🎲' : `D${diceType}`}</span>
          )}
        </div>
        <span className="dice-label">D{diceType}</span>
      </button>
      {requested && !rolling && !result && (
        <div className="dice-prompt">Cliquez !</div>
      )}
    </div>
  )
}
