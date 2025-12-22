// API Client pour communiquer avec le backend MongoDB

const API_BASE = '/api'

let authToken = localStorage.getItem('openrpg_token')

function setToken(token) {
  authToken = token
  if (token) {
    localStorage.setItem('openrpg_token', token)
  } else {
    localStorage.removeItem('openrpg_token')
  }
}

function getToken() {
  return authToken
}

async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || 'Erreur API')
  }

  return data
}

// Auth
export async function register(email, password) {
  const data = await apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(data.token)
  return data
}

export async function login(email, password) {
  const data = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(data.token)
  return data
}

export async function logout() {
  setToken(null)
}

export async function getMe() {
  return apiCall('/auth/me')
}

// Profile
export async function getProfile() {
  return apiCall('/profile')
}

export async function createProfile(profileData) {
  return apiCall('/profile', {
    method: 'POST',
    body: JSON.stringify(profileData)
  })
}

export async function updateProfile(profileData) {
  return apiCall('/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  })
}

// Games
export async function getGames() {
  return apiCall('/games')
}

export async function getGame(gameId) {
  return apiCall(`/games/${gameId}`)
}

export async function createGame(title, initialPrompt, currentStats) {
  return apiCall('/games', {
    method: 'POST',
    body: JSON.stringify({ title, initialPrompt, currentStats })
  })
}

export async function updateGame(gameId, updates) {
  return apiCall(`/games/${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  })
}

// Messages
export async function getMessages(gameId) {
  return apiCall(`/games/${gameId}/messages`)
}

export async function addMessage(gameId, role, content) {
  return apiCall(`/games/${gameId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content })
  })
}

// Chat IA
export async function sendToAI(messages, gameContext) {
  return apiCall('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, gameContext })
  })
}

// Vérifier les parties terminées
export async function checkFinishedGames() {
  return apiCall('/games/check-finished', {
    method: 'POST'
  })
}

// Synchroniser l'inventaire d'une partie
export async function syncInventory(gameId) {
  return apiCall('/games/sync-inventory', {
    method: 'POST',
    body: JSON.stringify({ gameId })
  })
}

export function isAuthenticated() {
  return !!authToken
}

export { setToken, getToken }
