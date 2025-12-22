import '../styles/reroll.css'

export default function RerollPrompt({ 
  diceResult, 
  diceType, 
  rerollsAvailable, 
  onReroll, 
  onKeep 
}) {
  const threshold = Math.floor(diceType / 3)
  const canReroll = diceResult <= threshold && rerollsAvailable > 0

  if (!canReroll) return null

  return (
    <div className="reroll-prompt">
      <div className="reroll-content">
        <div className="reroll-result">
          <span className="result-value">{diceResult}</span>
          <span className="result-label">sur D{diceType}</span>
        </div>
        <div className="reroll-message">
          Résultat faible ! Relancer ?
        </div>
        <div className="reroll-info">
          🔄 {rerollsAvailable} relance{rerollsAvailable > 1 ? 's' : ''} disponible{rerollsAvailable > 1 ? 's' : ''}
        </div>
        <div className="reroll-actions">
          <button className="btn btn-secondary" onClick={onKeep}>
            Garder
          </button>
          <button className="btn btn-primary" onClick={onReroll}>
            🔄 Relancer
          </button>
        </div>
      </div>
    </div>
  )
}


