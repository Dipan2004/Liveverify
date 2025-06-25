import type { AnalysisResult } from '../types'

interface ResultCardProps {
  result: AnalysisResult
}

export default function ResultCard({ result }: ResultCardProps) {
  const getResultDisplay = () => {
    switch (result.label.toLowerCase()) {
      case 'real':
        return {
          icon: '✅',
          text: 'Real',
          color: 'text-green-400',
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-500/30'
        }
      case 'fake':
        return {
          icon: '❌',
          text: 'Fake',
          color: 'text-red-400',
          bgColor: 'bg-red-900/20',
          borderColor: 'border-red-500/30'
        }
      case 'suspicious':
        return {
          icon: '⚠️',
          text: 'Suspicious',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-500/30'
        }
      default:
        return {
          icon: '❓',
          text: 'Unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/20',
          borderColor: 'border-gray-500/30'
        }
    }
  }

  const display = getResultDisplay()

  return (
    <div className={`fade-in-up border rounded-lg p-4 ${display.bgColor} ${display.borderColor}`}>
      <div className="text-center">
        {/* Icon */}
        <div className="text-2xl mb-2">
          {display.icon}
        </div>
        
        {/* Result Text */}
        <h3 className={`text-lg font-semibold mb-1 ${display.color}`}>
          {display.text}
        </h3>
        
        {/* Confidence */}
        <div className="text-sm text-gray-400">
          Confidence: {result.confidence}%
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              result.label.toLowerCase() === 'real' ? 'bg-green-500' :
              result.label.toLowerCase() === 'fake' ? 'bg-red-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
        
        {/* Additional Info */}
        {(result.image_info || result.media_info) && (
          <div className="mt-3 pt-3 border-t border-gray-600 text-xs text-gray-500">
            {result.image_info && (
              <div>
                Format: {result.image_info.format} • 
                Size: {Array.isArray(result.image_info.size) 
                  ? `${result.image_info.size[0]}×${result.image_info.size[1]}` 
                  : result.image_info.size}
              </div>
            )}
            {result.media_info && (
              <div>
                Type: {result.media_info.type} • 
                Format: {result.media_info.format}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}