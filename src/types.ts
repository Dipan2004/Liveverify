export interface AnalysisResult {
  success: boolean
  label: 'Real' | 'Fake' | 'Suspicious'
  confidence: number
  timestamp: string
  image_info?: {
    format: string
    size: number[] | number
  }
  media_info?: {
    type: string
    format: string
    size: number[] | number
  }
}

export interface ApiResponse {
  success: boolean
  label: string
  confidence: number
  timestamp: string
  image_info?: any
  media_info?: any
  error?: string
  message?: string
}






