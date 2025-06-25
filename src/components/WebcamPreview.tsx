import { useState, useEffect, useRef } from 'react'

// Type definitions for Chrome extension APIs
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string
        getURL: (path: string) => string
        onMessage: {
          addListener: (callback: (message: any) => void) => void
          removeListener: (callback: (message: any) => void) => void
        }
      }
      tabs?: {
        query: (queryInfo: { active: boolean; currentWindow: boolean }) => Promise<Array<{ id?: number }>>
        sendMessage: (tabId: number, message: any) => Promise<any>
        create: (createProperties: { url: string }) => void
      }
    }
  }
}

// Helper to safely access chrome APIs
const getChromeAPI = () => {
  if (typeof window !== 'undefined' && window.chrome) {
    return window.chrome
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).chrome) {
    return (globalThis as any).chrome
  }
  return null
}

interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  canvasRef: React.RefObject<HTMLCanvasElement>
  onAnalyze: () => void
  isAnalyzing: boolean
  onStatusUpdate: (status: string) => void
}

export default function WebcamPreview({ 
  videoRef, 
  canvasRef, 
  onAnalyze, 
  isAnalyzing, 
  onStatusUpdate 
}: WebcamPreviewProps) {
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isRequestingCamera, setIsRequestingCamera] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'requesting' | 'granted' | 'denied'>('unknown')
  const streamRef = useRef<MediaStream | null>(null)

  // Check if we're in an extension context
  const chrome = getChromeAPI()
  const isExtension = chrome?.runtime?.id !== undefined

  // Request permission through content script
  const requestPermissionViaContentScript = async (): Promise<boolean> => {
    if (!isExtension || !chrome?.tabs) return false

    try {
      // Get active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (!tab?.id) {
        throw new Error('No active tab found')
      }

      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'requestCameraPermission'
      })

      console.log('LiveVerify: Permission request response:', response)
      return response?.success || false
    } catch (error) {
      console.error('LiveVerify: Error requesting permission via content script:', error)
      return false
    }
  }

  // Check permission status via content script
  const checkPermissionStatus = async (): Promise<boolean> => {
    if (!isExtension || !chrome?.tabs) return false

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (!tab?.id) return false

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'checkCameraPermission'
      })

      return response?.granted || false
    } catch (error) {
      console.error('LiveVerify: Error checking permission status:', error)
      return false
    }
  }

  // Open permission page in new tab
  const openPermissionPage = () => {
    if (isExtension && chrome?.runtime?.getURL && chrome?.tabs?.create) {
      const permissionUrl = chrome.runtime.getURL('permission.html')
      chrome.tabs.create({ url: permissionUrl })
    }
  }

  const startCamera = async () => {
    try {
      setIsRequestingCamera(true)
      onStatusUpdate('Checking camera permission...')
      setCameraError(null)
      setPermissionStatus('requesting')
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser')
      }

      // First, try to check existing permission status
      if (isExtension) {
        const hasPermission = await checkPermissionStatus()
        if (!hasPermission) {
          onStatusUpdate('Requesting camera permission via content script...')
          const permissionGranted = await requestPermissionViaContentScript()
          
          if (!permissionGranted) {
            setPermissionStatus('denied')
            throw new Error('Permission request failed. Please try opening the permission page manually.')
          }
        }
      }
      
      // Camera constraints optimized for extension popup
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 320, max: 640 },
          height: { ideal: 240, max: 480 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      }

      onStatusUpdate('Accessing camera...')
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        // Wait for video metadata to load
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not available'))
            return
          }
          
          const video = videoRef.current
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            resolve()
          }
          
          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video loading failed'))
          }
          
          video.addEventListener('loadedmetadata', onLoadedMetadata)
          video.addEventListener('error', onError)
          
          // Timeout after 10 seconds
          setTimeout(() => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            video.removeEventListener('error', onError)
            reject(new Error('Video loading timeout'))
          }, 10000)
        })

        // Start playing the video
        if (videoRef.current) {
          await videoRef.current.play()
          setIsCameraActive(true)
          setPermissionStatus('granted')
          onStatusUpdate('Camera ready - Click "Scan Frame" to analyze')
        }
      }
    } catch (error: unknown) {
      console.error('Camera access error:', error)
      
      let errorMessage = 'Camera access failed'
      let showPermissionButton = false
      
      if (error && typeof error === 'object' && 'name' in error) {
        const errorName = (error as { name?: string }).name || ''
        
        switch (errorName) {
          case 'NotAllowedError':
            errorMessage = 'Camera permission denied. Please allow camera access.'
            showPermissionButton = true
            setPermissionStatus('denied')
            break
          case 'NotFoundError':
            errorMessage = 'No camera found on this device'
            break
          case 'NotReadableError':
            errorMessage = 'Camera is already in use by another application'
            break
          case 'OverconstrainedError':
            errorMessage = 'Camera does not support the required settings'
            break
          case 'SecurityError':
            errorMessage = 'Camera access blocked due to security restrictions'
            showPermissionButton = true
            break
          case 'AbortError':
            errorMessage = 'Camera access was cancelled'
            break
          default:
            if (error && 'message' in error && typeof error.message === 'string') {
              errorMessage = error.message
              if (error.message.includes('Permission request failed')) {
                showPermissionButton = true
              }
            }
        }
      }
      
      setCameraError(errorMessage)
      onStatusUpdate(errorMessage)
      setIsCameraActive(false)
      
      // Show permission button for permission-related errors
      if (showPermissionButton && isExtension) {
        setCameraError(errorMessage + ' Click "Open Permission Page" below to grant access.')
      }
    } finally {
      setIsRequestingCamera(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsCameraActive(false)
    setCameraError(null)
    setPermissionStatus('unknown')
    onStatusUpdate('Camera stopped')
  }

  // Listen for permission updates from content script
  useEffect(() => {
    if (!isExtension || !chrome?.runtime?.onMessage) return

    const handleMessage = (message: any) => {
      if (message.action === 'cameraPermissionUpdate') {
        console.log('LiveVerify: Received permission update:', message)
        
        if (message.granted) {
          setPermissionStatus('granted')
          // If camera was previously denied, show success message
          if (permissionStatus === 'denied') {
            setCameraError(null)
            onStatusUpdate('Camera permission granted! Click "Start Camera" to continue.')
          }
        } else {
          setPermissionStatus('denied')
          setCameraError(message.error || 'Camera permission denied')
        }
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    
    return () => {
      if (chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage)
      }
    }
  }, [isExtension, permissionStatus, onStatusUpdate, chrome])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Camera Error Alert */}
      {cameraError && (
        <div className="bg-red-900/50 border border-red-600 text-red-200 px-3 py-2 rounded text-sm">
          <div className="flex items-start space-x-2">
            <span>❌</span>
            <div className="flex-1">
              <p className="font-semibold">Camera Error</p>
              <p className="text-xs mt-1">{cameraError}</p>
              
              {/* Permission Button */}
              {permissionStatus === 'denied' && isExtension && (
                <button
                  onClick={openPermissionPage}
                  className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                >
                  Open Permission Page
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Permission Status */}
      {permissionStatus === 'requesting' && (
        <div className="bg-blue-900/50 border border-blue-600 text-blue-200 px-3 py-2 rounded text-sm">
          <div className="flex items-center space-x-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Requesting camera permission...</span>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="video-container relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-48 object-cover bg-black rounded-lg"
          style={{ display: isCameraActive ? 'block' : 'none' }}
        />
        {!isCameraActive && (
          <div className="w-full h-48 flex items-center justify-center bg-gray-800 rounded-lg">
            <div className="text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Camera Preview</p>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Camera Controls */}
      <div className="space-y-2">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            disabled={isRequestingCamera}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
          >
            {isRequestingCamera ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 7L16 12L23 17V7Z" fill="currentColor"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            )}
            <span>{isRequestingCamera ? 'Requesting Access...' : 'Start Camera'}</span>
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isAnalyzing ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
              <span>{isAnalyzing ? 'Analyzing...' : 'Scan Frame'}</span>
            </button>
            <button
              onClick={stopCamera}
              className="w-full text-gray-400 hover:text-white px-4 py-1 text-sm transition-colors"
            >
              Stop Camera
            </button>
          </div>
        )}
      </div>

      {/* Help Text */}
      {!isCameraActive && !cameraError && (
        <div className="text-xs text-gray-500 text-center">
          Click "Start Camera" to begin deepfake detection
        </div>
      )}
    </div>
  )
}