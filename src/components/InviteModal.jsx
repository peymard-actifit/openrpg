import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function InviteModal({ gameId, onClose, onInviteSent }) {
  const [onlinePlayers, setOnlinePlayers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(null)
  const [mode, setMode] = useState('sync')

  useEffect(() => {
    fetchOnlinePlayers()
    const interval = setInterval(fetchOnlinePlayers, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchOnlinePlayers() {
    try {
      const players = await api.getOnlinePlayers()
      setOnlinePlayers(players)
    } catch (err) {
      console.error('Erreur récupération joueurs:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite(playerId) {
    setSending(playerId)
    try {
      await api.sendInvitation(gameId, playerId, mode)
      if (onInviteSent) onInviteSent()
      alert('Invitation envoyée !')
    } catch (err) {
      alert(err.message || 'Erreur envoi invitation')
    } finally {
      setSending(null)
    }
  }

  const filteredPlayers = onlinePlayers.filter(p => 
    p.characterName.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-invite" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 Inviter des joueurs</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="invite-content">
          <div className="mode-selector">
            <label>Mode d'invitation :</label>
            <div className="mode-options">
              <button 
                className={`mode-btn ${mode === 'sync' ? 'active' : ''}`}
                onClick={() => setMode('sync')}
              >
                🔗 Synchrone
                <span className="mode-desc">Jouez ensemble, mêmes réponses</span>
              </button>
              <button 
                className={`mode-btn ${mode === 'async' ? 'active' : ''}`}
                onClick={() => setMode('async')}
              >
                📨 Asynchrone
                <span className="mode-desc">Réponses indépendantes</span>
              </button>
            </div>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Rechercher un joueur..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>

          <div className="players-list">
            {loading ? (
              <div className="loading-players">Chargement...</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="no-players">
                {filter ? 'Aucun joueur trouvé' : 'Aucun joueur en ligne'}
              </div>
            ) : (
              filteredPlayers.map(player => (
                <div key={player.userId} className="player-row">
                  <div className="player-info">
                    <span className="player-status online">●</span>
                    <span className="player-name">{player.characterName}</span>
                  </div>
                  <button
                    className="invite-btn"
                    onClick={() => handleInvite(player.userId)}
                    disabled={sending === player.userId}
                  >
                    {sending === player.userId ? '...' : '➕ Inviter'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

