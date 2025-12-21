import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import '../styles/create-profile.css'

const TOTAL_STAT_POINTS = 60
const MAX_STAT = 20
const MIN_STAT = 1

export default function CreateProfile() {
  const { createProfile, profile } = useAuth()
  const navigate = useNavigate()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Étape 1: Informations de base
  const [characterName, setCharacterName] = useState('')
  const [age, setAge] = useState(25)
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState(70)
  
  // Étape 2: Caractéristiques (sur 20)
  const [stats, setStats] = useState({
    strength: 10,
    intelligence: 10,
    wisdom: 10,
    dexterity: 10,
    constitution: 10,
    mana: 10
  })

  const totalPoints = Object.values(stats).reduce((sum, val) => sum + val, 0)
  const remainingPoints = TOTAL_STAT_POINTS - totalPoints

  function updateStat(stat, delta) {
    const newValue = stats[stat] + delta
    if (newValue < MIN_STAT || newValue > MAX_STAT) return
    if (delta > 0 && remainingPoints <= 0) return
    
    setStats(prev => ({ ...prev, [stat]: newValue }))
  }

  async function handleSubmit() {
    if (remainingPoints !== 0) {
      setError(`Vous devez distribuer exactement ${TOTAL_STAT_POINTS} points`)
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const { error } = await createProfile({
        character_name: characterName,
        age,
        gender,
        height,
        weight,
        strength: stats.strength,
        intelligence: stats.intelligence,
        wisdom: stats.wisdom,
        dexterity: stats.dexterity,
        constitution: stats.constitution,
        mana: stats.mana
      })
      
      if (error) throw error
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du profil')
    } finally {
      setLoading(false)
    }
  }

  // Si profil existe déjà, rediriger
  if (profile) {
    navigate('/dashboard')
    return null
  }

  return (
    <div className="create-profile-page">
      <div className="create-profile-container">
        <h1>🧙 Création du Personnage</h1>
        
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>1. Identité</div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>2. Caractéristiques</div>
        </div>

        {error && <div className="profile-error">{error}</div>}

        {step === 1 && (
          <div className="profile-step">
            <div className="input-group">
              <label>Nom du Personnage</label>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Ex: Aldric le Brave"
                required
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Âge</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 18)}
                  min="16"
                  max="999"
                />
              </div>

              <div className="input-group">
                <label>Sexe</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Choisir...</option>
                  <option value="male">Masculin</option>
                  <option value="female">Féminin</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Taille (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 150)}
                  min="50"
                  max="300"
                />
              </div>

              <div className="input-group">
                <label>Poids (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value) || 50)}
                  min="20"
                  max="500"
                />
              </div>
            </div>

            <button 
              className="btn btn-primary btn-full"
              onClick={() => setStep(2)}
              disabled={!characterName || !gender}
            >
              Continuer
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="profile-step">
            <div className="stats-header">
              <h2>Répartition des Points</h2>
              <div className={`points-remaining ${remainingPoints === 0 ? 'complete' : remainingPoints < 0 ? 'over' : ''}`}>
                Points restants: <span>{remainingPoints}</span>
              </div>
            </div>

            <div className="stats-grid">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="stat-control">
                  <div className="stat-info">
                    <span className="stat-icon">{getStatIcon(key)}</span>
                    <span className="stat-label">{getStatLabel(key)}</span>
                  </div>
                  <div className="stat-adjuster">
                    <button 
                      className="stat-btn"
                      onClick={() => updateStat(key, -1)}
                      disabled={value <= MIN_STAT}
                    >
                      −
                    </button>
                    <span className="stat-value">{value}</span>
                    <button 
                      className="stat-btn"
                      onClick={() => updateStat(key, 1)}
                      disabled={value >= MAX_STAT || remainingPoints <= 0}
                    >
                      +
                    </button>
                  </div>
                  <div className="stat-bar-mini">
                    <div className="stat-fill-mini" style={{ width: `${(value / MAX_STAT) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Retour
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading || remainingPoints !== 0}
              >
                {loading ? 'Création...' : 'Créer mon Héros'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getStatIcon(stat) {
  const icons = {
    strength: '💪',
    intelligence: '🧠',
    wisdom: '🦉',
    dexterity: '🏃',
    constitution: '❤️',
    mana: '✨'
  }
  return icons[stat] || '📊'
}

function getStatLabel(stat) {
  const labels = {
    strength: 'Force',
    intelligence: 'Intelligence',
    wisdom: 'Sagesse',
    dexterity: 'Dextérité',
    constitution: 'Constitution',
    mana: 'Mana'
  }
  return labels[stat] || stat
}

