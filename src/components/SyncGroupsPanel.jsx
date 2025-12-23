import { useState, useEffect } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function SyncGroupsPanel({ gameId, currentUserId, onModeChange }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchGroups()
    const interval = setInterval(fetchGroups, 5000)
    return () => clearInterval(interval)
  }, [gameId])

  async function fetchGroups() {
    try {
      const result = await api.getSyncGroups(gameId)
      setData(result)
    } catch (err) {
      console.error('Erreur récupération groupes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangeMode(newMode, groupId = null) {
    try {
      await api.changeSyncMode(gameId, newMode, groupId)
      fetchGroups()
      if (onModeChange) onModeChange(newMode)
    } catch (err) {
      console.error('Erreur changement mode:', err)
    }
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return
    try {
      const result = await api.createSyncGroup(gameId, newGroupName.trim())
      setShowCreateGroup(false)
      setNewGroupName('')
      fetchGroups()
    } catch (err) {
      console.error('Erreur création groupe:', err)
    }
  }

  async function handleJoinGroup(groupId) {
    try {
      await api.joinSyncGroup(gameId, groupId)
      fetchGroups()
    } catch (err) {
      console.error('Erreur rejoindre groupe:', err)
    }
  }

  async function handleLeaveGroup() {
    try {
      await api.leaveSyncGroup(gameId)
      fetchGroups()
    } catch (err) {
      console.error('Erreur quitter groupe:', err)
    }
  }

  if (loading || !data) return null

  const modeIcons = {
    master: '👑',
    syncWithMaster: '🔗',
    asyncIndependent: '📨',
    syncWithGroup: '👥'
  }

  const modeLabels = {
    master: 'Maître',
    syncWithMaster: 'Sync Maître',
    asyncIndependent: 'Indépendant',
    syncWithGroup: 'Sous-groupe'
  }

  return (
    <div className="sync-groups-panel">
      <button 
        className="sync-mode-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mode-icon">{modeIcons[data.currentMode]}</span>
        <span className="mode-label">{modeLabels[data.currentMode]}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="sync-dropdown">
          <div className="sync-section">
            <h4>Mode de synchronisation</h4>
            
            {!data.isOwner && (
              <>
                <button 
                  className={`mode-option ${data.currentMode === 'syncWithMaster' ? 'active' : ''}`}
                  onClick={() => handleChangeMode('syncWithMaster')}
                >
                  <span>🔗 Synchrone avec le Maître</span>
                  <small>Fil principal de l'histoire</small>
                </button>

                <button 
                  className={`mode-option ${data.currentMode === 'asyncIndependent' ? 'active' : ''}`}
                  onClick={() => handleChangeMode('asyncIndependent')}
                >
                  <span>📨 Asynchrone Indépendant</span>
                  <small>Votre propre fil narratif</small>
                </button>
              </>
            )}

            {data.isOwner && (
              <div className="master-info">
                <span>👑 Vous êtes le Maître</span>
                <small>Vous contrôlez le fil principal</small>
              </div>
            )}
          </div>

          {/* Sous-groupes existants */}
          {data.syncGroups?.length > 0 && (
            <div className="sync-section">
              <h4>Sous-groupes</h4>
              {data.syncGroups.map(group => {
                const isMember = group.members?.includes(currentUserId)
                const isCurrentGroup = data.currentGroupId === group.id
                
                return (
                  <div 
                    key={group.id} 
                    className={`group-item ${isCurrentGroup ? 'current' : ''}`}
                  >
                    <div className="group-info">
                      <span className="group-name">👥 {group.name}</span>
                      <span className="group-members">
                        {group.members?.length || 0} membre(s)
                      </span>
                    </div>
                    {isMember ? (
                      <button 
                        className="btn-sm btn-secondary"
                        onClick={handleLeaveGroup}
                      >
                        Quitter
                      </button>
                    ) : (
                      <button 
                        className="btn-sm btn-primary"
                        onClick={() => handleJoinGroup(group.id)}
                      >
                        Rejoindre
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Créer un groupe */}
          <div className="sync-section">
            {showCreateGroup ? (
              <div className="create-group-form">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nom du groupe..."
                  maxLength={30}
                />
                <div className="form-actions">
                  <button 
                    className="btn-sm btn-secondary"
                    onClick={() => setShowCreateGroup(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    className="btn-sm btn-primary"
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                  >
                    Créer
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="create-group-btn"
                onClick={() => setShowCreateGroup(true)}
              >
                ➕ Créer un sous-groupe
              </button>
            )}
          </div>

          {/* Explication */}
          <div className="sync-help">
            <p>
              <strong>🔗 Sync Maître</strong> : Actions synchronisées avec le maître
            </p>
            <p>
              <strong>📨 Indépendant</strong> : Votre propre aventure
            </p>
            <p>
              <strong>👥 Sous-groupe</strong> : Sync avec d'autres joueurs, async vs maître
            </p>
          </div>
        </div>
      )}
    </div>
  )
}


