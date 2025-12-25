import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function SyncStatus({ gameId, isMultiplayer, showAlways = false, onAllReady }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isMultiplayer) return

    fetchStatus()
    const interval = setInterval(fetchStatus, 2000) // Plus réactif : 2s au lieu de 3s
    return () => clearInterval(interval)
  }, [gameId, isMultiplayer])

  async function fetchStatus() {
    try {
      setLoading(true)
      const data = await api.getPendingActions(gameId)
      setStatus(data)
      
      if (data.allSubmitted && onAllReady) {
        onAllReady()
      }
    } catch (err) {
      console.error('Erreur status sync:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isMultiplayer || !status) {
    return null
  }

  // En mode showAlways, afficher seulement s'il y a des infos intéressantes
  const hasContent = status.pending > 0 || 
                     status.typingPlayers?.length > 0 || 
                     status.submittedPlayers?.length > 0

  if (!showAlways && (status.pending === 0 && status.total === 0)) {
    return null
  }

  if (showAlways && !hasContent) {
    return null
  }

  return (
    <div className="sync-status">
      <div className="sync-header">
        <span className="sync-icon">⏳</span>
        <span className="sync-title">
          Mode Synchrone - {status.pending}/{status.total} joueurs prêts
        </span>
      </div>
      
      <div className="sync-progress">
        <div 
          className="sync-bar"
          style={{ width: `${(status.pending / status.total) * 100}%` }}
        />
      </div>

      {/* Joueurs qui ont répondu avec leurs actions */}
      {status.submittedPlayers?.length > 0 && (
        <div className="sync-section">
          <div className="sync-players submitted">
            <span className="section-label">✓ Ont répondu :</span>
            {status.submittedPlayers.map((p, i) => (
              <div key={i} className="player-action-card">
                <span className="player-name">
                  {p.isOwner ? '👑 ' : ''}
                  {p.playerName}
                </span>
                {p.action && (
                  <span className="player-action-preview">
                    "{p.action.substring(0, 60)}{p.action.length > 60 ? '...' : ''}"
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Joueurs en cours de frappe */}
      {status.typingPlayers?.length > 0 && (
        <div className="sync-section">
          <div className="sync-players typing">
            <span className="section-label">✏️ En train d'écrire :</span>
            {status.typingPlayers.map((p, i) => (
              <div key={i} className="player-typing-card">
                <span className="player-name">{p.playerName}</span>
                <span className="typing-indicator">
                  <span className="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </span>
                {p.preview && (
                  <span className="typing-preview">"{p.preview}"</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Joueurs en attente */}
      {status.waitingForNames?.length > 0 && (
        <div className="sync-section">
          <div className="sync-players waiting">
            <span className="section-label">⏳ En attente de :</span>
            {status.waitingForNames.map((p, i) => (
              <span key={i} className="player-chip waiting">
                {p.playerName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
