import { useState } from 'react'
import AlignmentDisplay from './AlignmentDisplay'
import '../styles/alignment.css'

const STATS_CONFIG = [
  { key: 'strength', icon: '💪', label: 'FOR' },
  { key: 'intelligence', icon: '🧠', label: 'INT' },
  { key: 'wisdom', icon: '🦉', label: 'SAG' },
  { key: 'dexterity', icon: '🏃', label: 'DEX' },
  { key: 'constitution', icon: '❤️', label: 'CON' },
  { key: 'mana', icon: '✨', label: 'MANA' }
]

export default function StatsPanel({ stats, level, alignment }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={`stats-panel ${collapsed ? 'collapsed' : ''}`}>
      <button className="stats-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? '◀' : '▶'}
      </button>
      
      <div className="level-badge">
        ⚔️ Niveau {level}
      </div>
      
      <div className="stats-grid">
        {STATS_CONFIG.map(stat => (
          <div key={stat.key} className="stat-mini">
            <span className="icon">{stat.icon}</span>
            <span className="value">{stats?.[stat.key] || 10}</span>
          </div>
        ))}
      </div>
      
      <AlignmentDisplay alignment={alignment} />
    </div>
  )
}



