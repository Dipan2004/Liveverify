import type { ApiResponse, AnalysisResult } from '../types'

const API_BASE_URL = 'http://localhost:5000'

export async function analyzeImage(imageData: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageData,
      timestamp: new Date().toISOString()
    })
  })

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`)
  }

  const data: ApiResponse = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'Analysis failed')
  }

  return {
    success: data.success,
    label: data.label as 'Real' | 'Fake' | 'Suspicious',
    confidence: data.confidence,
    timestamp: data.timestamp,
    image_info: data.image_info
  }
}

export async function verifyMedia(mediaData: string, mimeType: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/verify-media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      media: mediaData,
      type: mimeType,
      timestamp: new Date().toISOString()
    })
  })

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`)
  }

  const data: ApiResponse = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'Verification failed')
  }

  return {
    success: data.success,
    label: data.label as 'Real' | 'Fake' | 'Suspicious',
    confidence: data.confidence,
    timestamp: data.timestamp,
    media_info: data.media_info
  }
}