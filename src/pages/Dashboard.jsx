import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import '../styles/dashboard.css'

export default function Dashboard() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewGame, setShowNewGame] = useState(false)
  const [newGamePrompt, setNewGamePrompt] = useState('')
  const [newGameTitle, setNewGameTitle] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchGames()
  }, [user])

  async function fetchGames() {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGames(data || [])
    } catch (err) {
      console.error('Erreur chargement parties:', err)
    } finally {
      setLoading(false)
    }
  }

  async function createGame() {
    if (!newGamePrompt.trim() || !newGameTitle.trim()) return
    
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .insert([{
          user_id: user.id,
          title: newGameTitle,
          initial_prompt: newGamePrompt,
          status: 'active',
          level: 1,
          current_stats: {
            strength: profile.strength,
            intelligence: profile.intelligence,
            wisdom: profile.wisdom,
            dexterity: profile.dexterity,
            constitution: profile.constitution,
            mana: profile.mana
          }
        }])
        .select()
        .single()

      if (error) throw error
      navigate(`/game/${data.id}`)
    } catch (err) {
      console.error('Erreur création partie:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  const activeGames = games.filter(g => g.status === 'active')
  const archivedGames = games.filter(g => g.status === 'archived')

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <Link to="/" className="logo-small">⚔️ OpenRPG</Link>
        <div className="header-right">
          <div className="profile-badge">
            <span className="profile-name">{profile?.character_name}</span>
            <span className="profile-level">Niveau de base</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <section className="character-summary">
          <h2>👤 Mon Personnage</h2>
          <div className="character-stats">
            <StatDisplay label="Force" value={profile?.strength} icon="💪" />
            <StatDisplay label="Intelligence" value={profile?.intelligence} icon="🧠" />
            <StatDisplay label="Sagesse" value={profile?.wisdom} icon="🦉" />
            <StatDisplay label="Dextérité" value={profile?.dexterity} icon="🏃" />
            <StatDisplay label="Constitution" value={profile?.constitution} icon="❤️" />
            <StatDisplay label="Mana" value={profile?.mana} icon="✨" />
          </div>
        </section>

        <section className="games-section">
          <div className="section-header">
            <h2>🎮 Mes Aventures</h2>
            <button className="btn btn-primary" onClick={() => setShowNewGame(true)}>
              + Nouvelle Partie
            </button>
          </div>

          {loading ? (
            <div className="loading">Chargement des parties...</div>
          ) : activeGames.length === 0 ? (
            <div className="no-games">
              <p>Aucune aventure en cours</p>
              <p className="hint">Créez votre première partie pour commencer !</p>
            </div>
          ) : (
            <div className="games-grid">
              {activeGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </section>

        {archivedGames.length > 0 && (
          <section className="games-section archived">
            <h2>💀 Archives (Parties Terminées)</h2>
            <div className="games-grid">
              {archivedGames.map(game => (
                <GameCard key={game.id} game={game} archived />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal Nouvelle Partie */}
      {showNewGame && (
        <div className="modal-overlay" onClick={() => setShowNewGame(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>📜 Nouvelle Aventure</h2>
            <p className="modal-hint">
              Décrivez le contexte de votre aventure. Ce prompt initial ne pourra 
              plus être modifié une fois la partie lancée.
            </p>

            <div className="input-group">
              <label>Titre de la partie</label>
              <input
                type="text"
                value={newGameTitle}
                onChange={(e) => setNewGameTitle(e.target.value)}
                placeholder="Ex: La Quête du Dragon Noir"
              />
            </div>

            <div className="input-group">
              <label>Contexte de l'aventure</label>
              <textarea
                value={newGamePrompt}
                onChange={(e) => setNewGamePrompt(e.target.value)}
                placeholder="Décrivez l'univers, l'ambiance, le type d'aventure... Ex: Un monde médiéval fantastique où les dragons ont réapparu après 1000 ans de sommeil. Je suis un chevalier errant cherchant à découvrir pourquoi..."
                rows={6}
              />
            </div>

            <div className="modal-warning">
              ⚠️ Mode Hardcore actif : La mort de votre personnage sera définitive.
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNewGame(false)}>
                Annuler
              </button>
              <button 
                className="btn btn-primary" 
                onClick={createGame}
                disabled={!newGamePrompt.trim() || !newGameTitle.trim() || creating}
              >
                {creating ? 'Création...' : 'Commencer l\'Aventure'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatDisplay({ label, value, icon }) {
  return (
    <div className="stat-display">
      <span className="stat-icon">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value || 0}</span>
    </div>
  )
}

function GameCard({ game, archived }) {
  const navigate = useNavigate()
  
  function handleClick() {
    if (archived) {
      navigate(`/archive/${game.id}`)
    } else {
      navigate(`/game/${game.id}`)
    }
  }

  const gameIcons = ['🏰', '🐉', '⚔️', '🧙', '🌲', '🗡️', '🛡️', '📜']
  const icon = gameIcons[game.id.charCodeAt(0) % gameIcons.length]

  return (
    <div className={`game-card ${archived ? 'archived' : ''}`} onClick={handleClick}>
      <div className="game-icon">{icon}</div>
      <div className="game-info">
        <h3>{game.title}</h3>
        <p className="game-level">Niveau {game.level}</p>
        {archived && <span className="death-badge">💀 Mort</span>}
      </div>
    </div>
  )
}

