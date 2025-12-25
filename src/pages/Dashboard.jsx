import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import InvitationNotifications from '../components/InvitationNotifications'
import packageJson from '../../package.json'
import '../styles/dashboard.css'

const STAT_ICONS = [
  { key: 'strength', icon: '💪', name: 'FOR' },
  { key: 'intelligence', icon: '🧠', name: 'INT' },
  { key: 'wisdom', icon: '🦉', name: 'SAG' },
  { key: 'dexterity', icon: '🏃', name: 'DEX' },
  { key: 'constitution', icon: '❤️', name: 'CON' },
  { key: 'mana', icon: '✨', name: 'MAN' }
]

// Prompt câblé - Style de l'IA
const HARDCODED_PROMPT = "L'IA doit utiliser le style tranchant et incisif de l'écrivain Joe Abercrombie. Une description odorante, tactile et sensitive des choses. Une vue très prosaïque et simple et en même temps beaucoup d'humour."

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
  const [showConsignes, setShowConsignes] = useState(false)
  const [showAdminPrompt, setShowAdminPrompt] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userConsignes, setUserConsignes] = useState('')
  const [newGameTitle, setNewGameTitle] = useState('')
  const [newGamePrompt, setNewGamePrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [checking, setChecking] = useState(false)
  const [draggedGame, setDraggedGame] = useState(null)
  const [dragOverArchive, setDragOverArchive] = useState(false)
  const [gamesOnlineStatus, setGamesOnlineStatus] = useState({})
  
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
      setUserConsignes(profile.consignes || '')
    }
  }, [profile])

  // Initialiser le statut admin depuis l'API
  useEffect(() => {
    if (user?.isAdmin) {
      setIsAdmin(true)
      setShowAllGames(true)
    }
  }, [user])

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
      
      // Vérifier le statut en ligne pour les parties multijoueur
      const multiplayerGames = (data || []).filter(g => g.isMultiplayer && g.status === 'active')
      for (const game of multiplayerGames) {
        checkGameOnlineStatus(game.id)
      }
    } catch (err) {
      console.error('Erreur chargement parties:', err)
    } finally {
      setLoading(false)
    }
  }

  async function checkGameOnlineStatus(gameId) {
    try {
      const status = await api.checkOnlineStatus(gameId)
      setGamesOnlineStatus(prev => ({
        ...prev,
        [gameId]: status
      }))
    } catch (err) {
      console.error('Erreur vérification statut:', err)
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

  async function handleSaveConsignes() {
    try {
      await api.updateProfile({ consignes: userConsignes })
      await refreshProfile()
      setShowConsignes(false)
      setShowUserMenu(false)
    } catch (err) {
      console.error('Erreur sauvegarde consignes:', err)
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
      
      // Rafraîchir les listes avant de naviguer
      await fetchGames()
      if (isAdmin) {
        await fetchAllGames()
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
        setShowAllGames(true) // Afficher automatiquement les parties
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
        <Link 
          to="/" 
          className="logo-small" 
          title={isAdmin 
            ? `Un jeu de rôle sans limites, sans règles et dans tous les univers ! A vous de jouer\n\n🔒 PROMPT CÂBLÉ:\n${HARDCODED_PROMPT}` 
            : "Un jeu de rôle sans limites, sans règles et dans tous les univers ! A vous de jouer"
          }
        >
          ⚔️ OpenRPG <span className="version-badge">v{packageJson.version}</span>
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
                <button onClick={() => { setShowConsignes(true); setShowUserMenu(false); }}>
                  📝 Consignes pour OpenRPG
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
              <span className="admin-count">
                {new Set(allGames.map(g => g.userId || g.playerName)).size}/{allGames.length}
              </span>
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
                  className={`game-card ${game.isMultiplayer ? 'multiplayer' : ''} ${
                    game.isMultiplayer && gamesOnlineStatus[game.id] && !gamesOnlineStatus[game.id].canPlay ? 'unavailable' : ''
                  }`}
                  onClick={() => {
                    if (game.isMultiplayer && gamesOnlineStatus[game.id] && !gamesOnlineStatus[game.id].canPlay) {
                      alert('Le maître de cette partie n\'est pas en ligne. Attendez son retour.')
                      return
                    }
                    navigate(`/game/${game.id}`)
                  }}
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
                      title={game.initialPrompt}
                    >
                      <span className="game-icon">💀</span>
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
                          title="Voir l'archive"
                        >
                          👁️
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContinueArchived(game)
                          }}
                          title="Reprendre cette aventure"
                        >
                          ▶️
                        </button>
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
            <h2>👁️ Toutes les parties ({allGames.length})</h2>
            <div className="admin-games-list">
              {allGames.map(game => (
                <div 
                  key={game.id} 
                  className={`admin-game-row ${game.status === 'archived' ? 'archived' : ''} ${game.deletedByOwner ? 'soft-deleted' : ''}`}
                  title={game.deletedByOwner 
                    ? `⚠️ Supprimée par le créateur le ${new Date(game.deletedByOwner.deletedAt).toLocaleDateString('fr-FR')}\n\n${game.initialPrompt}`
                    : game.initialPrompt
                  }
                >
                  <span className={`online-indicator ${game.playerOnline ? 'online' : 'offline'}`}>
                    {game.playerOnline ? '🟢' : '⚫'}
                  </span>
                  <span className="game-status-icon">
                    {game.deletedByOwner ? '🚫' : game.status === 'archived' ? (game.victory ? '🏆' : '💀') : '📜'}
                  </span>
                  <div 
                    className="admin-game-info clickable"
                    onClick={() => navigate(`/game/${game.id}`)}
                  >
                    <span className="admin-game-title">
                      {game.title}
                      {game.deletedByOwner && <span className="deleted-badge">Masquée</span>}
                    </span>
                    <span className="admin-game-player">👤 {game.playerName}</span>
                  </div>
                  <span className="admin-game-level">Nv.{game.level || 1}</span>
                  <span className="admin-game-status">
                    {game.deletedByOwner 
                      ? 'Supprimée' 
                      : game.status === 'archived' ? (game.victory ? 'Victoire' : 'Mort') : 'En cours'
                    }
                  </span>
                  <div className="admin-game-actions">
                    <button 
                      className="admin-action-btn continue"
                      title="Créer une copie dans mes parties"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleContinueArchived(game)
                      }}
                    >
                      ▶️
                    </button>
                    {game.status === 'archived' && (
                      <button 
                        className="admin-action-btn reopen"
                        title="Rouvrir la partie (pour le joueur original)"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm(`Rouvrir la partie "${game.title}" ?`)) {
                            try {
                              await api.reopenGame(game.id)
                              await Promise.all([fetchGames(), fetchAllGames()])
                            } catch (err) {
                              alert('Erreur: ' + err.message)
                            }
                          }
                        }}
                      >
                        🔄
                      </button>
                    )}
                    <button 
                      className="admin-action-btn delete"
                      title="Supprimer la partie"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (confirm(`⚠️ Supprimer définitivement "${game.title}" de ${game.playerName} ?\n\nCette action est irréversible !`)) {
                          try {
                            await api.deleteGame(game.id)
                            await Promise.all([fetchGames(), fetchAllGames()])
                          } catch (err) {
                            alert('Erreur: ' + err.message)
                          }
                        }
                      }}
                    >
                      🗑️
                    </button>
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

      {/* Modal édition profil - version compacte */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal modal-profile-compact" onClick={e => e.stopPropagation()}>
            <h2>👤 Personnage</h2>

            <div className="profile-form-compact">
              {/* Ligne 1: Nom + Age + Sexe */}
              <div className="form-row-compact">
                <div className="input-compact name-input">
                  <input
                    type="text"
                    value={editProfile.characterName}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, characterName: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
                <div className="input-compact mini">
                  <input
                    type="number"
                    value={editProfile.age}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Âge"
                  />
                </div>
                <div className="input-compact mini">
                  <select
                    value={editProfile.sex}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, sex: e.target.value }))}
                  >
                    <option value="">-</option>
                    <option value="M">♂️</option>
                    <option value="F">♀️</option>
                    <option value="X">⚧️</option>
                  </select>
                </div>
                <div className="input-compact mini">
                  <input
                    type="number"
                    value={editProfile.height}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="cm"
                  />
                </div>
                <div className="input-compact mini">
                  <input
                    type="number"
                    value={editProfile.weight}
                    onChange={(e) => setEditProfile(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="kg"
                  />
                </div>
              </div>

              {/* Ligne 2: Stats sur une seule ligne */}
              <div className="stats-row-compact">
                {STAT_ICONS.map(stat => (
                  <div key={stat.key} className="stat-compact">
                    <span className="stat-label">{stat.icon}</span>
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

            <div className="modal-actions-compact">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEditProfile(false)}>
                ✕
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSaveProfile}>
                💾
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal consignes pour OpenRPG */}
      {showConsignes && (
        <div className="modal-overlay" onClick={() => setShowConsignes(false)}>
          <div className="modal modal-consignes" onClick={e => e.stopPropagation()}>
            <h2>📝 Consignes pour OpenRPG</h2>
            <p className="modal-hint">
              Ces consignes seront appliquées à toutes vos parties. Elles permettent de personnaliser le style de l'IA.
            </p>

            <div className="input-group">
              <label>Vos instructions personnalisées</label>
              <textarea
                value={userConsignes}
                onChange={(e) => setUserConsignes(e.target.value)}
                placeholder="Ex: Je préfère les descriptions courtes et percutantes. Ajoute des références à la culture pop quand c'est approprié..."
                rows={6}
              />
            </div>

            <div className="consignes-info">
              <strong>💡 Exemples de consignes :</strong>
              <ul>
                <li>Style narratif (sombre, épique, humoristique...)</li>
                <li>Longueur des réponses préférée</li>
                <li>Thèmes à privilégier ou éviter</li>
                <li>Références culturelles appréciées</li>
              </ul>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowConsignes(false)}
              >
                Annuler
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleSaveConsignes}
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
