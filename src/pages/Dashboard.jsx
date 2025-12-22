import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import '../styles/dashboard.css'

const STAT_ICONS = [
  { key: 'strength', icon: '💪' },
  { key: 'intelligence', icon: '🧠' },
  { key: 'wisdom', icon: '🦉' },
  { key: 'dexterity', icon: '🏃' },
  { key: 'constitution', icon: '❤️' },
  { key: 'mana', icon: '✨' }
]

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewGame, setShowNewGame] = useState(false)
  const [showArchives, setShowArchives] = useState(false)
  const [newGameTitle, setNewGameTitle] = useState('')
  const [newGamePrompt, setNewGamePrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    initDashboard()
  }, [])

  async function initDashboard() {
    try {
      // D'abord vérifier les parties terminées
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

      // Puis charger les parties
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

  async function handleContinueArchived(game) {
    try {
      const newGame = await api.createGame(
        `${game.title} (Suite)`,
        game.initialPrompt,
        game.currentStats || profile?.stats
      )
      await api.updateGame(newGame.id, {
        inventory: game.inventory || [],
        alignment: game.alignment || { goodEvil: 0, lawChaos: 0 },
        level: game.level || 1,
        rerolls: game.rerolls || 0
      })
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

  function handleLogout() {
    signOut()
    navigate('/')
  }

  const activeGames = games.filter(g => g.status === 'active')
  const archivedGames = games.filter(g => g.status === 'archived')
  const victoryGames = archivedGames.filter(g => g.victory === true)
  const deathGames = archivedGames.filter(g => g.victory === false || g.deathReason)

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
        <Link to="/" className="logo-small">⚔️ OpenRPG</Link>
        <div className="header-right">
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Déconnexion
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Résumé du personnage */}
        <div className="character-card">
          <div className="character-identity">
            <h2>{profile?.characterName || 'Aventurier'}</h2>
            <div className="character-physical">
              {profile?.age && <span>🎂 {profile.age} ans</span>}
              {profile?.sex && <span>{profile.sex === 'M' ? '♂️' : profile.sex === 'F' ? '♀️' : '⚧️'}</span>}
              {profile?.height && <span>📏 {profile.height} cm</span>}
              {profile?.weight && <span>⚖️ {profile.weight} kg</span>}
            </div>
          </div>
          <div className="character-stats-row">
            {STAT_ICONS.map(stat => (
              <div key={stat.key} className="stat-chip">
                <span className="stat-icon">{stat.icon}</span>
                <span className="stat-val">{profile?.stats?.[stat.key] || 10}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section parties en cours */}
        <section className="games-section">
          <div className="section-header">
            <h2>🎮 Parties en cours ({activeGames.length})</h2>
            <div className="section-actions">
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowArchives(!showArchives)}
              >
                📁 Archives ({archivedGames.length})
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setShowNewGame(true)}
              >
                + Nouvelle Aventure
              </button>
            </div>
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
                  className="game-card"
                  onClick={() => navigate(`/game/${game.id}`)}
                  title={game.initialPrompt}
                >
                  <span className="game-icon">📜</span>
                  <div className="game-info">
                    <h3>{game.title}</h3>
                    <span className="game-level">Niveau {game.level || 1}</span>
                    {game.inventory?.length > 0 && (
                      <span className="game-inventory">🎒 {game.inventory.length}</span>
                    )}
                  </div>
                  <button 
                    className="sync-btn"
                    onClick={(e) => handleSyncInventory(game.id, e)}
                    title="Synchroniser l'inventaire"
                  >
                    🔄
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Archives */}
        {showArchives && archivedGames.length > 0 && (
          <section className="games-section archives">
            <h2>📁 Archives</h2>
            
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
                        {game.victoryReason && (
                          <span className="archive-reason">{game.victoryReason}</span>
                        )}
                      </div>
                      <div className="archive-actions">
                        <button 
                          className="btn btn-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/archive/${game.id}`)
                          }}
                        >
                          👁️ Voir
                        </button>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContinueArchived(game)
                          }}
                        >
                          ➕ Suite
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deathGames.length > 0 && (
              <div className="archive-group">
                <h3>💀 Tombés au combat ({deathGames.length})</h3>
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
                        {game.deathReason && (
                          <span className="death-reason">{game.deathReason}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  placeholder="Ex: Je suis un chevalier dans un royaume médiéval fantastique. Je dois retrouver l'épée légendaire volée par un dragon..."
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
    </div>
  )
}
