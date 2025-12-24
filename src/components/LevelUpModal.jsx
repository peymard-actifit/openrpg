import '../styles/levelup.css'

const STATS = [
  { key: 'strength', label: 'Force', icon: '💪' },
  { key: 'intelligence', label: 'Intelligence', icon: '🧠' },
  { key: 'wisdom', label: 'Sagesse', icon: '🦉' },
  { key: 'dexterity', label: 'Dextérité', icon: '🏃' },
  { key: 'constitution', label: 'Constitution', icon: '❤️' },
  { key: 'mana', label: 'Mana', icon: '✨' }
]

export default function LevelUpModal({ isOpen, newLevel, currentStats, onChoose }) {
  if (!isOpen) return null

  return (
    <div className="levelup-overlay">
      <div className="levelup-modal">
        <div className="levelup-header">
          <h2>⬆️ Niveau {newLevel} !</h2>
          <p>Choisissez une caractéristique à améliorer (+1)</p>
        </div>

        <div className="levelup-stats">
          {STATS.map(stat => (
            <button
              key={stat.key}
              className="stat-choice"
              onClick={() => onChoose(stat.key)}
            >
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-name">{stat.label}</span>
              <span className="stat-value">
                {currentStats?.[stat.key] || 10} → {(currentStats?.[stat.key] || 10) + 1}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}




