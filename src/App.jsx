import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CreateProfile from './pages/CreateProfile'
import Dashboard from './pages/Dashboard'
import Game from './pages/Game'
import Archive from './pages/Archive'

// Route publique - redirige vers dashboard si déjà connecté
function PublicRoute({ children }) {
  const { user, loading, profile } = useAuth()
  
  if (loading) {
    return <div className="loading-screen">Chargement...</div>
  }
  
  // Si l'utilisateur est connecté et a un profil, rediriger vers dashboard
  if (user && profile) {
    return <Navigate to="/dashboard" replace />
  }
  
  // Si l'utilisateur est connecté mais n'a pas de profil, rediriger vers création
  if (user && !profile) {
    return <Navigate to="/create-profile" replace />
  }
  
  return children
}

function ProtectedRoute({ children }) {
  const { user, loading, profile } = useAuth()
  
  if (loading) {
    return <div className="loading-screen">Chargement...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (!profile && window.location.pathname !== '/create-profile') {
    return <Navigate to="/create-profile" />
  }
  
  return children
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={
          <PublicRoute>
            <Landing />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } />
        <Route path="/create-profile" element={
          <ProtectedRoute>
            <CreateProfile />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/game/:gameId" element={
          <ProtectedRoute>
            <Game />
          </ProtectedRoute>
        } />
        <Route path="/archive/:gameId" element={
          <ProtectedRoute>
            <Archive />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  )
}

export default App


