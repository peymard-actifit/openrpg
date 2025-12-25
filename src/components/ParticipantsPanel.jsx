import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function ParticipantsPanel({ 
  gameId, 
  currentUserId, 
  isOwner,
  onInviteClick,
  onParticipantsChange
}) {
  const [participants, setParticipants] = useState([])
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [masterOnlyWatch, setMasterOnlyWatch] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchParticipants()
    const interval = setInterval(fetchParticipants, 10000)
    return () => clearInterval(interval)
  }, [gameId])

  async function fetchParticipants() {
    try {
      const data = await api.getParticipants(gameId)
      setParticipants(data.participants || [])
      setIsMultiplayer(data.isMultiplayer)
      setMasterOnlyWatch(data.masterOnlyWatch)
    } catch (err) {
      console.error('Erreur participants:', err)
    }
  }

  async function handleAction(action, targetUserId, mode) {
    try {
      const result = await api.updateParticipant(gameId, action, targetUserId, mode)
      fetchParticipants()
      
      // Notifier le parent si les participants ont changé (notamment pour désactiver le mode multijoueur)
      if (onParticipantsChange) {
        onParticipantsChange()
      }
    } catch (err) {
      console.error('Erreur action participant:', err)
    }
  }

  async function toggleMasterWatch() {
    try {
      await api.setMasterOnlyWatch(gameId, !masterOnlyWatch)
      setMasterOnlyWatch(!masterOnlyWatch)
    } catch (err) {
      console.error('Erreur toggle master watch:', err)
    }
  }

  const activeParticipants = participants.filter(p => p.status !== 'removed')

  return (
    <div className="participants-panel">
      <button 
        className="participants-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        👥 {activeParticipants.length > 0 ? activeParticipants.length : ''}
        {!isMultiplayer && <span className="solo-badge">Solo</span>}
      </button>

      {isOpen && (
        <div className="participants-dropdown">
          <div className="participants-header">
            <h4>👥 Participants</h4>
            {isOwner && (
              <button className="invite-small-btn" onClick={onInviteClick}>
                ➕
              </button>
            )}
          </div>

          {isOwner && isMultiplayer && (
            <div className="master-controls">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={masterOnlyWatch}
                  onChange={toggleMasterWatch}
                />
                <span>Mode spectateur (ne pas jouer)</span>
              </label>
            </div>
          )}

          <div className="participants-list">
            {activeParticipants.length === 0 ? (
              <div className="no-participants">
                Mode solo
                {isOwner && (
                  <button className="btn btn-sm" onClick={onInviteClick}>
                    Inviter des joueurs
                  </button>
                )}
              </div>
            ) : (
              activeParticipants.map(p => (
                <div key={p.userId} className={`participant-row ${p.status}`}>
                  <div className="participant-info">
                    <span className={`status-dot ${p.status}`}></span>
                    <span className="participant-name">{p.characterName}</span>
                    <span className={`mode-tag ${p.mode}`}>
                      {p.mode === 'sync' ? '🔗' : '📨'}
                    </span>
                  </div>

                  {p.userId === currentUserId ? (
                    <div className="self-controls">
                      <button
                        className={`mode-toggle ${p.mode === 'sync' ? 'active' : ''}`}
                        onClick={() => handleAction('changeMode', currentUserId, 'sync')}
                        title="Mode synchrone"
                      >
                        🔗
                      </button>
                      <button
                        className={`mode-toggle ${p.mode === 'async' ? 'active' : ''}`}
                        onClick={() => handleAction('changeMode', currentUserId, 'async')}
                        title="Mode asynchrone"
                      >
                        📨
                      </button>
                    </div>
                  ) : isOwner && (
                    <button
                      className="remove-btn"
                      onClick={() => handleAction('remove', p.userId)}
                      title="Retirer ce joueur"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Joueurs retirés (visible par le owner) */}
          {isOwner && participants.filter(p => p.status === 'removed').length > 0 && (
            <div className="removed-section">
              <h5>Joueurs retirés</h5>
              {participants.filter(p => p.status === 'removed').map(p => (
                <div key={p.userId} className="participant-row removed">
                  <span className="participant-name">{p.characterName}</span>
                  <button
                    className="reinvite-btn"
                    onClick={() => handleAction('reinvite', p.userId)}
                  >
                    🔄 Réinviter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

