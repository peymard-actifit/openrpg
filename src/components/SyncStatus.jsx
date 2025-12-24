import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function SyncStatus({ gameId, isMultiplayer, onAllReady }) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isMultiplayer) return

    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
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

  if (!isMultiplayer || !status || status.pending === 0) {
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

      {status.submittedPlayers?.length > 0 && (
        <div className="sync-players">
          <span className="ready-label">✓ Prêts :</span>
          {status.submittedPlayers.map((p, i) => (
            <span key={i} className="player-chip ready">
              {p.playerName}
            </span>
          ))}
        </div>
      )}

      {status.waitingFor?.length > 0 && (
        <div className="sync-players">
          <span className="waiting-label">⏳ En attente :</span>
          <span className="waiting-count">
            {status.waitingFor.length} joueur(s)
          </span>
        </div>
      )}
    </div>
  )
}




