import '../styles/alignment.css'

export default function AlignmentDisplay({ alignment = { goodEvil: 0, lawChaos: 0 } }) {
  // Valeurs de -100 à +100
  const goodEvil = alignment.goodEvil || 0
  const lawChaos = alignment.lawChaos || 0

  function getLabel(value, positive, negative) {
    if (value > 50) return positive
    if (value < -50) return negative
    return 'Neutre'
  }

  function getColor(value, positiveColor, negativeColor) {
    if (value > 30) return positiveColor
    if (value < -30) return negativeColor
    return 'var(--text-muted)'
  }

  return (
    <div className="alignment-display">
      <div className="alignment-axis">
        <span className="axis-label evil">👿</span>
        <div className="axis-track">
          <div 
            className="axis-marker"
            style={{ 
              left: `${50 + goodEvil / 2}%`,
              background: getColor(goodEvil, 'var(--gold)', 'var(--crimson)')
            }}
          />
          <div className="axis-center" />
        </div>
        <span className="axis-label good">😇</span>
      </div>
      
      <div className="alignment-axis">
        <span className="axis-label chaotic">🌀</span>
        <div className="axis-track">
          <div 
            className="axis-marker"
            style={{ 
              left: `${50 + lawChaos / 2}%`,
              background: getColor(lawChaos, 'var(--mana-blue)', 'var(--crimson-bright)')
            }}
          />
          <div className="axis-center" />
        </div>
        <span className="axis-label lawful">⚖️</span>
      </div>
    </div>
  )
}

