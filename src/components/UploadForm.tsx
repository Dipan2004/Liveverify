import { useState, useRef } from 'react'

interface UploadFormProps {
  onFileUpload: (file: File) => void
  isProcessing: boolean
}

export default function UploadForm({ onFileUpload, isProcessing }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    } else {
      setSelectedFile(null)
    }
  }

  const handleUpload = () => {
    if (selectedFile && !isProcessing) {
      onFileUpload(selectedFile)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB'
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-200 mb-3">Upload Media</h2>
      
      <div className="space-y-3">
        {/* File Input */}
        <div>
          <label htmlFor="fileInput" className="block text-xs text-gray-400 mb-2">
            Select image or video file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            id="fileInput"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600 file:cursor-pointer cursor-pointer"
          />
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="bg-gray-700 rounded-md p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-200 font-medium truncate">
                  {selectedFile.name}
                </div>
                <div className="text-gray-400 text-xs">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </div>
              </div>
              <button
                onClick={clearFile}
                className="text-gray-400 hover:text-white ml-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isProcessing}
          className="w-full flex items-center justify-center space-x-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{isProcessing ? 'Processing...' : 'Verify Media'}</span>
        </button>
      </div>
    </div>
  )
}