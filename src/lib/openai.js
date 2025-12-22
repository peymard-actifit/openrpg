// OpenAI API calls go through our serverless function for security
export async function sendToAI(messages, gameContext) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      gameContext
    })
  })
  
  if (!response.ok) {
    throw new Error('Erreur de communication avec l\'IA')
  }
  
  return response.json()
}

export async function generateImage(prompt) {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt })
  })
  
  if (!response.ok) {
    throw new Error('Erreur de génération d\'image')
  }
  
  return response.json()
}


