import { useState, useRef, useCallback } from 'react'
import WebcamPreview from './components/WebcamPreview'
import UploadForm from './components/UploadForm'
import ResultCard from './components/ResultCard'
import { analyzeImage, verifyMedia } from './utils/api'
import type { AnalysisResult } from './types'

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState('Ready to start camera')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleWebcamAnalysis = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return

    try {
      setIsAnalyzing(true)
      setStatus('Capturing frame...')

      // Capture frame from video
      const canvas = canvasRef.current
      const video = videoRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      
      setStatus('Analyzing image for deepfakes...')
      
      // Send to backend for analysis
      const analysisResult = await analyzeImage(imageData)
      
      setResult(analysisResult)
      setStatus('Analysis complete')
      
    } catch (error) {
      console.error('Analysis error:', error)
      setStatus('Analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsAnalyzing(false)
    }
  }, [isAnalyzing])

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      setIsAnalyzing(true)
      setStatus('Processing file...')

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })

      setStatus('Analyzing media for deepfakes...')

      // Send to backend for verification
      const analysisResult = await verifyMedia(base64Data, file.type)
      
      setResult(analysisResult)
      setStatus('Analysis complete')
      
    } catch (error) {
      console.error('Upload error:', error)
      setStatus('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const updateStatus = useCallback((message: string) => {
    setStatus(message)
  }, [])

  return (
    <div className="w-full min-h-screen bg-gray-900 text-white">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L20 9L13.09 15.74L12 22L10.91 15.74L4 9L10.91 8.26L12 2Z" fill="#4F46E5"/>
            <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
          </svg>
          <h1 className="text-lg font-semibold">LiveVerify</h1>
        </div>

        {/* Webcam Section */}
        <WebcamPreview
          videoRef={videoRef}
          canvasRef={canvasRef}
          onAnalyze={handleWebcamAnalysis}
          isAnalyzing={isAnalyzing}
          onStatusUpdate={updateStatus}
        />

        {/* Upload Section */}
        <UploadForm
          onFileUpload={handleFileUpload}
          isProcessing={isAnalyzing}
        />

        {/* Results */}
        {result && (
          <ResultCard result={result} />
        )}

        {/* Status */}
        <div className="text-xs text-gray-400 opacity-80">
          {status}
        </div>
      </div>
    </div>
  )



  
}

export default App
