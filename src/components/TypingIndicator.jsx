import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function TypingIndicator({ gameId, isMultiplayer }) {
  const [typingPlayers, setTypingPlayers] = useState([])

  useEffect(() => {
    if (!isMultiplayer) return

    fetchTyping()
    const interval = setInterval(fetchTyping, 1500)
    return () => clearInterval(interval)
  }, [gameId, isMultiplayer])

  async function fetchTyping() {
    try {
      const data = await api.getTypingStatus(gameId)
      setTypingPlayers(data.typing || [])
    } catch (err) {
      // Silently ignore
    }
  }

  if (!isMultiplayer || typingPlayers.length === 0) {
    return null
  }

  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div className="typing-text">
        {typingPlayers.map((p, i) => (
          <div key={p.userId} className="typing-player">
            <span className="typing-name">{p.playerName}</span>
            {p.draft && (
              <span className="typing-preview"> écrit: "{p.draft}..."</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

