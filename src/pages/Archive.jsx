import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as api from '../lib/api'
import '../styles/archive.css'

export default function Archive() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [game, setGame] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArchive()
  }, [gameId])

  async function fetchArchive() {
    try {
      const gameData = await api.getGame(gameId)
      setGame(gameData)

      const messagesData = await api.getMessages(gameId)
      setMessages(messagesData || [])
    } catch (err) {
      console.error('Erreur:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="archive-loading">Chargement des archives...</div>
  }

  return (
    <div className="archive-page">
      <header className="archive-header">
        <Link to="/dashboard" className="back-btn">← Retour au Dashboard</Link>
      </header>

      <main className="archive-content">
        <div className="archive-hero">
          <div className="death-icon">💀</div>
          <h1>{game?.title}</h1>
          <p className="archive-subtitle">Partie Archivée</p>
          
          <div className="archive-stats">
            <div className="archive-stat">
              <span className="stat-label">Niveau Atteint</span>
              <span className="stat-value">{game?.level}</span>
            </div>
            <div className="archive-stat">
              <span className="stat-label">Messages</span>
              <span className="stat-value">{messages.length}</span>
            </div>
          </div>

          {game?.deathReason && (
            <div className="death-reason">
              <h3>Cause de la Mort</h3>
              <p>{game.deathReason}</p>
            </div>
          )}
        </div>

        <div className="archive-prompt">
          <h2>📜 Contexte Initial</h2>
          <p>{game?.initialPrompt}</p>
        </div>

        <div className="archive-story">
          <h2>📖 L'Histoire Complète</h2>
          <div className="story-messages">
            {messages.map((msg, index) => (
              <div key={msg.id || index} className={`archive-message ${msg.role}`}>
                <div className="message-role">
                  {msg.role === 'user' ? '🧙 Vous' : '📜 Narrateur'}
                </div>
                <div className="message-text">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="archive-epitaph">
          <p>
            <em>
              "Ci-gît {game?.title}, une aventure qui restera dans les mémoires.
              Niveau {game?.level} atteint avant la fin tragique."
            </em>
          </p>
        </div>
      </main>
    </div>
  )
}
