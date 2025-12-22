import { useState, useRef, useEffect } from 'react'
import '../styles/voice.css'

export function VoiceInput({ onTranscript, disabled }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await sendToWhisper(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Erreur micro:', err)
      alert('Impossible d\'accéder au microphone')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  async function sendToWhisper(audioBlob) {
    setIsProcessing(true)
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Erreur transcription')

      const { text } = await response.json()
      if (text && onTranscript) {
        onTranscript(text)
      }
    } catch (err) {
      console.error('Erreur Whisper:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <button
      className={`voice-btn voice-input ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing}
      title={isRecording ? 'Arrêter l\'enregistrement' : 'Parler'}
    >
      {isProcessing ? (
        <span className="voice-icon">⏳</span>
      ) : isRecording ? (
        <span className="voice-icon recording-icon">🔴</span>
      ) : (
        <span className="voice-icon">🎤</span>
      )}
    </button>
  )
}

export function VoiceOutput({ enabled, onToggle }) {
  return (
    <button
      className={`voice-btn voice-output ${enabled ? 'active' : ''}`}
      onClick={onToggle}
      title={enabled ? 'Désactiver la voix' : 'Activer la voix'}
    >
      <span className="voice-icon">{enabled ? '🔊' : '🔇'}</span>
    </button>
  )
}

export function useTextToSpeech() {
  const audioRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  async function speak(text) {
    if (!text || isSpeaking) return

    setIsSpeaking(true)
    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) throw new Error('Erreur TTS')

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('Erreur TTS:', err)
      setIsSpeaking(false)
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }

  return { speak, stop, isSpeaking }
}


