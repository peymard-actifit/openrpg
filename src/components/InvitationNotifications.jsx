import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function InvitationNotifications() {
  const [invitations, setInvitations] = useState([])
  const [showPanel, setShowPanel] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchInvitations()
    const interval = setInterval(fetchInvitations, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchInvitations() {
    try {
      const data = await api.getInvitations()
      setInvitations(data)
    } catch (err) {
      console.error('Erreur récupération invitations:', err)
    }
  }

  async function handleResponse(invitationId, action) {
    try {
      const result = await api.respondInvitation(invitationId, action)
      fetchInvitations()
      
      if (action === 'accept' && result.gameId) {
        navigate(`/game/${result.gameId}`)
      }
    } catch (err) {
      console.error('Erreur réponse invitation:', err)
    }
  }

  if (invitations.length === 0) return null

  return (
    <>
      <button 
        className="notification-badge"
        onClick={() => setShowPanel(!showPanel)}
      >
        📩 {invitations.length}
      </button>

      {showPanel && (
        <div className="invitations-panel">
          <div className="panel-header">
            <h3>📩 Invitations ({invitations.length})</h3>
            <button className="close-btn" onClick={() => setShowPanel(false)}>×</button>
          </div>
          
          <div className="invitations-list">
            {invitations.map(inv => (
              <div key={inv.id} className="invitation-card">
                <div className="invitation-header">
                  <span className="inviter">👤 {inv.fromName}</span>
                  <span className={`mode-badge ${inv.mode}`}>
                    {inv.mode === 'sync' ? '🔗 Sync' : '📨 Async'}
                  </span>
                </div>
                <div className="invitation-game">
                  <strong>{inv.gameTitle}</strong>
                  <p className="game-prompt">{inv.gamePrompt?.substring(0, 100)}...</p>
                </div>
                <div className="invitation-actions">
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleResponse(inv.id, 'decline')}
                  >
                    ✕ Refuser
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => handleResponse(inv.id, 'accept')}
                  >
                    ✓ Accepter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}




