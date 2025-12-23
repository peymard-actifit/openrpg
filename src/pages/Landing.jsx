import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/landing.css'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="landing">
      <div className="landing-bg">
        <div className="particles"></div>
      </div>
      
      <header className="landing-header">
        <h1 className="logo">
          <span className="logo-icon">⚔️</span>
          OpenRPG
        </h1>
      </header>

      <main className="landing-content">
        <div className="hero">
          <h2 className="hero-title">Jeux de Rôles Ouvert</h2>
          <p className="hero-subtitle">
            Plongez dans des aventures infinies générées par l'Intelligence Artificielle.
            <br />
            Créez votre personnage, forgez votre destinée, affrontez votre mort.
          </p>
          
          <div className="hero-features">
            <div className="feature">
              <span className="feature-icon">🎲</span>
              <span>Histoires Uniques</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚔️</span>
              <span>Mode Hardcore</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🧙</span>
              <span>Évolution Infinie</span>
            </div>
          </div>

          <div className="hero-actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                Mes Aventures
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Créer un Compte
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Se Connecter
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="landing-info">
          <div className="info-card">
            <h3>🎭 Créez Votre Héros</h3>
            <p>
              Définissez votre personnage avec des caractéristiques uniques : 
              Force, Intelligence, Sagesse, Dextérité, Constitution et Mana.
            </p>
          </div>
          <div className="info-card">
            <h3>📜 Écrivez Votre Histoire</h3>
            <p>
              Chaque partie commence par votre prompt. L'IA génère ensuite 
              un monde unique où vos choix façonnent le récit.
            </p>
          </div>
          <div className="info-card">
            <h3>💀 Mort Permanente</h3>
            <p>
              En mode hardcore, chaque mort est définitive. Vos parties 
              terminées deviennent des archives de vos exploits passés.
            </p>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>OpenRPG © 2025 — L'aventure n'attend que vous</p>
      </footer>
    </div>
  )
}



