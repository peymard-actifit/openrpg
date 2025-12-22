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

export async function deleteGame(gameId) {
  return apiCall(`/games/${gameId}`, {
    method: 'DELETE'
  })
}

export async function getAllGames() {
  return apiCall('/games/all')
}

export async function toggleAdmin(code, disable = false) {
  return apiCall('/admin/toggle', {
    method: 'POST',
    body: JSON.stringify({ code, disable })
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

// ==========================================
// MULTI-JOUEUR
// ==========================================

// Présence - Heartbeat
export async function sendHeartbeat() {
  return apiCall('/presence/heartbeat', { method: 'POST' })
}

// Présence - Joueurs en ligne
export async function getOnlinePlayers() {
  return apiCall('/presence/online')
}

// Invitations - Liste des invitations reçues
export async function getInvitations() {
  return apiCall('/invitations')
}

// Invitations - Envoyer une invitation
export async function sendInvitation(gameId, toUserId, mode = 'sync') {
  return apiCall('/invitations', {
    method: 'POST',
    body: JSON.stringify({ gameId, toUserId, mode })
  })
}

// Invitations - Répondre (accepter/refuser)
export async function respondInvitation(invitationId, action) {
  return apiCall(`/invitations/${invitationId}`, {
    method: 'POST',
    body: JSON.stringify({ action })
  })
}

// Participants - Récupérer la liste
export async function getParticipants(gameId) {
  return apiCall(`/games/participants?gameId=${gameId}`)
}

// Participants - Actions (changeMode, remove, reinvite, pause, resume)
export async function updateParticipant(gameId, action, targetUserId, mode) {
  return apiCall(`/games/participants?gameId=${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, targetUserId, mode })
  })
}

// Participants - Mode maître regarde seulement
export async function setMasterOnlyWatch(gameId, masterOnlyWatch) {
  return apiCall(`/games/participants?gameId=${gameId}`, {
    method: 'PATCH',
    body: JSON.stringify({ masterOnlyWatch })
  })
}

// Chat de partie
export async function getGameChat(gameId, since) {
  const params = since ? `?gameId=${gameId}&since=${since}` : `?gameId=${gameId}`
  return apiCall(`/games/chat${params}`)
}

// Chat - Envoyer un message
export async function sendGameChat(gameId, content, isSystem = false) {
  return apiCall(`/games/chat?gameId=${gameId}`, {
    method: 'POST',
    body: JSON.stringify({ content, isSystem })
  })
}

export function isAuthenticated() {
  return !!authToken
}

export { setToken, getToken }
