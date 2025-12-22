import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import InvitationNotifications from '../components/InvitationNotifications'
import '../styles/dashboard.css'

const STAT_ICONS = [
  { key: 'strength', icon: '💪', name: 'Force' },
  { key: 'intelligence', icon: '🧠', name: 'Intelligence' },
  { key: 'wisdom', icon: '🦉', name: 'Sagesse' },
  { key: 'dexterity', icon: '🏃', name: 'Dextérité' },
  { key: 'constitution', icon: '❤️', name: 'Constitution' },
  { key: 'mana', icon: '✨', name: 'Mana' }
]

export default function Dashboard() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [allGames, setAllGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewGame, setShowNewGame] = useState(false)
  const [showArchives, setShowArchives] = useState(false)
  const [showAllGames, setShowAllGames] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [newGameTitle, setNewGameTitle] = useState('')
  const [newGamePrompt, setNewGamePrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [draggedGame, setDraggedGame] = useState(null)
  const [dragOverArchive, setDragOverArchive] = useState(false)
  
  const [editProfile, setEditProfile] = useState({
    characterName: '',
    age: '',
    sex: '',
    height: '',
    weight: '',
    stats: {
      strength: 10,
      intelligence: 10,
      wisdom: 10,
      dexterity: 10,
      constitution: 10,
      mana: 10
    }
  })

  useEffect(() => {
    initDashboard()
    
    // Heartbeat de présence
    api.sendHeartbeat()
    const heartbeatInterval = setInterval(() => {
      api.sendHeartbeat()
    }, 20000) // Toutes les 20 secondes
    
    return () => clearInterval(heartbeatInterval)
  }, [])

  useEffect(() => {
    if (profile) {
      setEditProfile({
        characterName: profile.characterName || '',
        age: profile.age || '',
        sex: profile.sex || '',
        height: profile.height || '',
        weight: profile.weight || '',
        stats: profile.stats || {
          strength: 10,
          intelligence: 10,
          wisdom: 10,
          dexterity: 10,
          constitution: 10,
          mana: 10
        }
      })
    }
  }, [profile])

  useEffect(() => {
    if (isAdmin) {
      fetchAllGames()
    }
  }, [isAdmin])

  async function initDashboard() {
    try {
      setChecking(true)
      try {
        const checkResult = await api.checkFinishedGames()
        if (checkResult.archived > 0) {
          console.log(`${checkResult.archived} partie(s) archivée(s) automatiquement`)
        }
      } catch (err) {
        console.error('Erreur vérification parties:', err)
      }
      setChecking(false)
      await fetchGames()
    } catch (err) {
      console.error('Erreur initialisation:', err)
      setLoading(false)
    }
  }

  async function fetchGames() {
    try {
      const data = await api.getGames()
      setGames(data || [])
    } catch (err) {
      console.error('Erreur chargement parties:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAllGames() {
    try {
      const data = await api.getAllGames()
      setAllGames(data || [])
    } catch (err) {
      console.error('Erreur chargement toutes parties:', err)
    }
  }

  async function handleCreateGame(e) {
    e.preventDefault()
    if (!newGameTitle.trim() || !newGamePrompt.trim()) return

    setCreating(true)
    try {
      const newGame = await api.createGame(
        newGameTitle.trim(),
        newGamePrompt.trim(),
        profile?.stats || {
          strength: 10,
          intelligence: 10,
          wisdom: 10,
          dexterity: 10,
          constitution: 10,
          mana: 10
        }
      )
      navigate(`/game/${newGame.id}`)
    } catch (err) {
      console.error('Erreur création:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteGame(gameId, e) {
    e.stopPropagation()
    if (!confirm('Supprimer cette partie définitivement ?')) return
    
    try {
      await api.deleteGame(gameId)
      fetchGames()
    } catch (err) {
      console.error('Erreur suppression:', err)
    }
  }

  async function handleSaveProfile() {
    try {
      await api.updateProfile(editProfile)
      await refreshProfile()
      setShowEditProfile(false)
      setShowUserMenu(false)
    } catch (err) {
      console.error('Erreur sauvegarde profil:', err)
    }
  }

  async function handleContinueArchived(game) {
    try {
      // Déterminer la version
      let version = 2
      const vMatch = game.title.match(/v(\d+)$/)
      if (vMatch) {
        version = parseInt(vMatch[1]) + 1
      }
      
      // Créer le nouveau titre
      let baseTitle = game.title.replace(/\s*v\d+$/, '')
      const newTitle = `${baseTitle} v${version}`
      
      // Créer la nouvelle partie avec le même prompt
      const newGame = await api.createGame(
        newTitle,
        game.initialPrompt,
        profile?.stats || game.currentStats
      )
      
      // Copier l'état de la partie archivée
      await api.updateGame(newGame.id, {
        inventory: game.inventory || [],
        alignment: game.alignment || { goodEvil: 0, lawChaos: 0 },
        level: game.level || 1,
        rerolls: game.rerolls || 0
      })
      
      // Copier tous les messages de l'ancienne partie
      const oldMessages = await api.getMessages(game.id)
      for (const msg of oldMessages) {
        await api.addMessage(newGame.id, msg.role, msg.content)
      }
      
      navigate(`/game/${newGame.id}`)
    } catch (err) {
      console.error('Erreur continuation:', err)
    }
  }

  async function handleSyncInventory(gameId, e) {
    e.stopPropagation()
    try {
      const result = await api.syncInventory(gameId)
      if (result.synced) {
        alert(`Inventaire synchronisé : ${result.itemCount} objet(s)`)
        fetchGames()
      }
    } catch (err) {
      console.error('Erreur sync inventaire:', err)
    }
  }

  async function handleToggleAdmin() {
    if (isAdmin) {
      try {
        await api.toggleAdmin(null, true)
        setIsAdmin(false)
        setAllGames([])
        setShowAllGames(false)
      } catch (err) {
        console.error('Erreur désactivation admin:', err)
      }
    } else {
      setShowAdminPrompt(true)
    }
    setShowUserMenu(false)
  }

  async function handleAdminCode() {
    try {
      const result = await api.toggleAdmin(adminCode)
      if (result.isAdmin) {
        setIsAdmin(true)
        setShowAdminPrompt(false)
        setAdminCode('')
        fetchAllGames()
      }
    } catch (err) {
      alert('Code incorrect')
    }
  }

  function handleStatChange(key, value) {
    const numVal = parseInt(value) || 0
    const clampedVal = Math.max(0, Math.min(20, numVal))
    setEditProfile(prev => ({
      ...prev,
      stats: { ...prev.stats, [key]: clampedVal }
    }))
  }

  function handleDragStart(e, game) {
    setDraggedGame(game)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('dragging')
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    setDraggedGame(null)
    setDragOverArchive(false)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverArchive(true)
  }

  function handleDragLeave() {
    setDragOverArchive(false)
  }

  async function handleDrop(e) {
    e.preventDefault()
    setDragOverArchive(false)
    
    if (draggedGame && draggedGame.status === 'active') {
      try {
        await api.updateGame(draggedGame.id, {
          status: 'archived',
          victory: true,
          victoryReason: 'Archivée manuellement'
        })
        fetchGames()
        setShowArchives(true)
      } catch (err) {
        console.error('Erreur archivage:', err)
      }
    }
    setDraggedGame(null)
  }

  function handleLogout() {
    signOut()
    navigate('/')
  }

  const activeGames = games.filter(g => g.status === 'active')
  const archivedGames = games.filter(g => g.status === 'archived')
  const victoryGames = archivedGames.filter(g => g.victory === true)
  const deathGames = archivedGames.filter(g => g.victory === false || (g.deathReason && !g.victory))

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">
          {checking ? '🔍 Vérification des parties...' : 'Chargement...'}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link to="/" className="logo-small" title="Un jeu de rôle sans limites, sans règles et dans tous les univers ! A vous de jouer">
          ⚔️ OpenRPG
        </Link>
        <div className="header-right">
          <InvitationNotifications />
          <div className="user-menu-wrapper">
            <button 
              className={`user-menu-btn ${isAdmin ? 'admin' : ''}`}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              {isAdmin && <span className="admin-badge">👑</span>}
              👤 {profile?.characterName || 'Menu'}
              <span className="menu-arrow">{showUserMenu ? '▲' : '▼'}</span>
            </button>
            {showUserMenu && (
              <div className="user-menu-dropdown">
                <button onClick={() => { setShowEditProfile(true); setShowUserMenu(false); }}>
                  ⚙️ Modifier le personnage
                </button>
                <button onClick={handleToggleAdmin}>
                  {isAdmin ? '🔓 Désactiver Admin' : '🔐 Mode Admin'}
                </button>
                <button onClick={handleLogout}>
                  🚪 Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Barre personnage + archives + admin */}
        <div className="character-bar">
          <div 
            className="character-card"
            onClick={() => setShowEditProfile(true)}
            title="Cliquez pour modifier"
          >
            <div className="character-identity">
              <h2>{profile?.characterName || 'Aventurier'}</h2>
              <div className="character-physical">
                {profile?.age && <span>🎂 {profile.age}</span>}
                {profile?.sex && <span>{profile.sex === 'M' ? '♂️' : profile.sex === 'F' ? '♀️' : '⚧️'}</span>}
                {profile?.height && <span>📏 {profile.height}cm</span>}
                {profile?.weight && <span>⚖️ {profile.weight}kg</span>}
              </div>
            </div>
            <div className="character-stats-row">
              {STAT_ICONS.map(stat => (
                <div key={stat.key} className="stat-chip" title={stat.name}>
                  <span className="stat-icon">{stat.icon}</span>
                  <span className="stat-val">{profile?.stats?.[stat.key] || 10}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone archive compacte */}
          <div 
            className={`archive-zone ${dragOverArchive ? 'drag-over' : ''} ${draggedGame ? 'visible' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setShowArchives(!showArchives)}
          >
            <span className="archive-icon">📁</span>
            <span className="archive-count">{archivedGames.length}</span>
            {showArchives && <span className="archive-arrow">▲</span>}
          </div>

          {/* Zone admin */}
          {isAdmin && (
            <div 
              className={`admin-zone ${showAllGames ? 'active' : ''}`}
              onClick={() => setShowAllGames(!showAllGames)}
            >
              <span className="admin-icon">👁️</span>
              <span className="admin-count">{allGames.length}</span>
              {showAllGames && <span className="admin-arrow">▲</span>}
            </div>
          )}
        </div>

        {/* Section parties en cours */}
        <section className="games-section">
          <div className="section-header">
            <h2>🎮 Parties en cours ({activeGames.length})</h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowNewGame(true)}
            >
              + Nouvelle Aventure
            </button>
          </div>

          {activeGames.length === 0 ? (
            <div className="no-games">
              <p>Aucune aventure en cours</p>
              <span className="hint">Créez votre première aventure !</span>
            </div>
          ) : (
            <div className="games-grid">
              {activeGames.map(game => (
                <div 
                  key={game.id} 
                  className={`game-card ${game.isMultiplayer ? 'multiplayer' : ''}`}
                  onClick={() => navigate(`/game/${game.id}`)}
                  title={game.initialPrompt}
                  draggable
                  onDragStart={(e) => handleDragStart(e, game)}
                  onDragEnd={handleDragEnd}
                >
                  {game.isMultiplayer && <span className="multiplayer-badge">👥</span>}
                  <span className="game-icon">📜</span>
                  <div className="game-info">
                    <h3>{game.title}</h3>
                    <span className="game-level">Niveau {game.level || 1}</span>
                    {game.inventory?.length > 0 && (
                      <span className="game-inventory">🎒 {game.inventory.length}</span>
                    )}
                    {game.participants?.length > 0 && (
                      <div className="participants-avatars">
                        {game.participants.slice(0, 4).map((p, i) => (
                          <span 
                            key={i} 
                            className={`participant-avatar ${p.userId === game.ownerId ? 'owner' : ''}`}
                            title={p.characterName}
                          >
                            {p.characterName?.charAt(0) || '?'}
                          </span>
                        ))}
                        {game.participants.length > 4 && (
                          <span className="participant-avatar">+{game.participants.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="card-actions">
                    <button 
                      className="delete-btn"
                      onClick={(e) => handleDeleteGame(game.id, e)}
                      title="Supprimer la partie"
                    >
                      🗑️
                    </button>
                    <button 
                      className="sync-btn"
                      onClick={(e) => handleSyncInventory(game.id, e)}
                      title="Synchroniser l'inventaire"
                    >
                      🔄
                    </button>
                  </div>
                  <div className="drag-hint">⋮⋮</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Archives */}
        {showArchives && archivedGames.length > 0 && (
          <section className="games-section archives">
            {victoryGames.length > 0 && (
              <div className="archive-group">
                <h3>🏆 Victoires ({victoryGames.length})</h3>
                <div className="games-grid">
                  {victoryGames.map(game => (
                    <div 
                      key={game.id} 
                      className="game-card victory"
                      title={game.initialPrompt}
                    >
                      <span className="game-icon">🏆</span>
                      <div className="game-info">
                        <h3>{game.title}</h3>
                        <span className="game-level">Niveau {game.level || 1}</span>
                      </div>
                      <div className="archive-actions">
                        <button 
                          className="btn btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/archive/${game.id}`)
                          }}
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContinueArchived(game)
                          }}
                          title="Continuer cette aventure"
                        >
                          ▶️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deathGames.length > 0 && (
              <div className="archive-group">
                <h3>💀 Tombés ({deathGames.length})</h3>
                <div className="games-grid">
                  {deathGames.map(game => (
                    <div 
                      key={game.id} 
                      className="game-card dead"
                      onClick={() => navigate(`/archive/${game.id}`)}
                      title={game.initialPrompt}
                    >
                      <span className="game-icon">💀</span>
                      <div className="game-info">
                        <h3>{game.title}</h3>
                        <span className="game-level">Niveau {game.level || 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Toutes les parties (Admin) */}
        {isAdmin && showAllGames && allGames.length > 0 && (
          <section className="games-section all-games">
            <h2>👁️ Toutes les parties en cours ({allGames.length})</h2>
            <div className="games-grid">
              {allGames.map(game => (
                <div 
                  key={game.id} 
                  className="game-card admin-view"
                  title={game.initialPrompt}
                >
                  <span className="game-icon">📜</span>
                  <div className="game-info">
                    <h3>{game.title}</h3>
                    <span className="game-player">👤 {game.playerName}</span>
                    <span className="game-level">Niveau {game.level || 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal nouvelle partie */}
      {showNewGame && (
        <div className="modal-overlay" onClick={() => setShowNewGame(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📜 Nouvelle Aventure</h2>
            <p className="modal-hint">
              Décrivez le contexte de votre aventure. L'IA créera l'histoire.
            </p>
            
            <form onSubmit={handleCreateGame}>
              <div className="input-group">
                <label>Titre de l'aventure</label>
                <input
                  type="text"
                  value={newGameTitle}
                  onChange={(e) => setNewGameTitle(e.target.value)}
                  placeholder="Ex: La Quête du Dragon"
                  required
                />
              </div>

              <div className="input-group">
                <label>Contexte / Prompt initial</label>
                <textarea
                  value={newGamePrompt}
                  onChange={(e) => setNewGamePrompt(e.target.value)}
                  placeholder="Ex: Je suis un chevalier dans un royaume médiéval fantastique..."
                  rows={5}
                  required
                />
              </div>

              <div className="modal-warning">
                ⚠️ Mode Hardcore : La mort est permanente !
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowNewGame(false)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Création...' : '⚔️ Commencer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal édition profil */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal modal-profile" onClick={e => e.stopPropagation()}>
            <h2>👤 Modifier le Personnage</h2>
            <p className="modal-hint">
              Ces caractéristiques sont vos stats de départ pour toutes les aventures.
            </p>

            <div className="profile-form">
              <div className="form-row">
                <div className="input-group">
                  <label>Nom du personnage</label>
                  <input
                    type="text"
                    value={editProfile.characterName}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, characterName: e.target.value }))}
                    placeholder="Votre nom d'aventurier"
                  />
                </div>
              </div>

              <div className="form-row physical-row">
                <div className="input-group small">
                  <label>Âge</label>
                  <input
                    type="number"
                    value={editProfile.age}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="25"
                  />
                </div>
                <div className="input-group small">
                  <label>Sexe</label>
                  <select
                    value={editProfile.sex}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, sex: e.target.value }))}
                  >
                    <option value="">-</option>
                    <option value="M">♂️ M</option>
                    <option value="F">♀️ F</option>
                    <option value="X">⚧️ X</option>
                  </select>
                </div>
                <div className="input-group small">
                  <label>Taille (cm)</label>
                  <input
                    type="number"
                    value={editProfile.height}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="175"
                  />
                </div>
                <div className="input-group small">
                  <label>Poids (kg)</label>
                  <input
                    type="number"
                    value={editProfile.weight}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="70"
                  />
                </div>
              </div>

              <div className="stats-section">
                <h3>Caractéristiques (0-20)</h3>
                <div className="stats-grid">
                  {STAT_ICONS.map(stat => (
                    <div key={stat.key} className="stat-input-group">
                      <label>
                        <span className="stat-icon">{stat.icon}</span>
                        {stat.name}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={editProfile.stats[stat.key]}
                        onChange={(e) => handleStatChange(stat.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowEditProfile(false)}
              >
                Annuler
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveProfile}
              >
                💾 Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal code admin */}
      {showAdminPrompt && (
        <div className="modal-overlay" onClick={() => setShowAdminPrompt(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <h2>🔐 Mode Admin</h2>
            <p className="modal-hint">
              Entrez le code administrateur pour accéder à toutes les parties.
            </p>

            <div className="input-group">
              <label>Code Admin</label>
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === 'Enter' && handleAdminCode()}
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => { setShowAdminPrompt(false); setAdminCode(''); }}
              >
                Annuler
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleAdminCode}
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
