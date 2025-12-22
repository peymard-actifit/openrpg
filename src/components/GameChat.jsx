import { useState, useEffect, useRef } from 'react'
import * as api from '../lib/api'
import '../styles/multiplayer.css'

export default function GameChat({ gameId, currentUserId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef(null)
  const lastFetchRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      fetchMessages()
      setUnread(0)
    }
    
    const interval = setInterval(() => {
      fetchMessages()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [gameId, isOpen])

  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  async function fetchMessages() {
    try {
      const since = lastFetchRef.current || new Date(Date.now() - 3600000).toISOString()
      const data = await api.getGameChat(gameId, since)
      
      if (data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMessages = data.filter(m => !existingIds.has(m.id))
          
          if (newMessages.length > 0 && !isOpen) {
            setUnread(prev => prev + newMessages.length)
          }
          
          return [...prev, ...newMessages].slice(-100)
        })
        lastFetchRef.current = new Date().toISOString()
      }
    } catch (err) {
      console.error('Erreur récupération chat:', err)
    }
  }

  async function handleSend() {
    if (!input.trim()) return
    
    try {
      await api.sendGameChat(gameId, input.trim())
      setInput('')
      fetchMessages()
    } catch (err) {
      console.error('Erreur envoi message:', err)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={`game-chat ${isOpen ? 'open' : ''}`}>
      <button 
        className="chat-toggle"
        onClick={() => { setIsOpen(!isOpen); setUnread(0); }}
      >
        💬 Chat
        {unread > 0 && <span className="chat-unread">{unread}</span>}
      </button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <h4>💬 Chat de partie</h4>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-empty">Aucun message. Dites bonjour !</div>
            ) : (
              messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`chat-message ${msg.userId === currentUserId ? 'own' : ''} ${msg.isSystem ? 'system' : ''}`}
                >
                  {!msg.isSystem && (
                    <span className="chat-author">{msg.characterName}</span>
                  )}
                  <span className="chat-content">{msg.content}</span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              maxLength={500}
            />
            <button onClick={handleSend} disabled={!input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

