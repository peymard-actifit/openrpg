import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import CreateProfile from './pages/CreateProfile'
import Dashboard from './pages/Dashboard'
import Game from './pages/Game'
import Archive from './pages/Archive'

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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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

