import '../styles/alignment.css'

export default function AlignmentDisplay({ alignment = { goodEvil: 0, lawChaos: 0 } }) {
  const goodEvil = alignment.goodEvil || 0
  const lawChaos = alignment.lawChaos || 0

  function getPercentage(value) {
    // Convertir -100/+100 en pourcentage 0-100
    return Math.round(50 + value / 2)
  }

  function getLabel(value, positive, negative) {
    const pct = getPercentage(value)
    if (pct >= 65) return `${pct}% ${positive}`
    if (pct <= 35) return `${pct}% ${negative}`
    return `${pct}% Neutre`
  }

  return (
    <div className="alignment-display">
      <div 
        className="alignment-axis"
        title={getLabel(goodEvil, 'Bon', 'Mauvais')}
      >
        <span className="axis-label">👿</span>
        <div className="axis-track">
          <div 
            className="axis-marker"
            style={{ 
              left: `${getPercentage(goodEvil)}%`,
              background: goodEvil > 20 ? 'var(--gold)' : goodEvil < -20 ? 'var(--crimson)' : 'var(--text-muted)'
            }}
          />
          <div className="axis-center" />
        </div>
        <span className="axis-label">😇</span>
      </div>
      
      <div 
        className="alignment-axis"
        title={getLabel(lawChaos, 'Loyal', 'Chaotique')}
      >
        <span className="axis-label">🌀</span>
        <div className="axis-track">
          <div 
            className="axis-marker"
            style={{ 
              left: `${getPercentage(lawChaos)}%`,
              background: lawChaos > 20 ? 'var(--mana-blue)' : lawChaos < -20 ? 'var(--crimson-bright)' : 'var(--text-muted)'
            }}
          />
          <div className="axis-center" />
        </div>
        <span className="axis-label">⚖️</span>
      </div>
    </div>
  )
}
