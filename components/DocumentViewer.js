import { useState } from 'react'
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react'

export default function DocumentViewer({ document, onClose }) {
  const [zoom, setZoom] = useState(100)

  if (!document) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full m-4 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {document.title}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-600">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 25))}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => window.open(document.url, '_blank')}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          {document.type === 'application/pdf' ? (
            <iframe
              src={document.url}
              className="w-full h-full min-h-[600px] border rounded"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Aperçu non disponible pour ce type de document</p>
              <button
                onClick={() => window.open(document.url, '_blank')}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Télécharger le document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
