import { useState, useEffect, useRef, useCallback } from 'react';

export default function ScalablePDFViewer({ 
  url, 
  title, 
  onClose, 
  type = 'html', // 'html' | 'pdf'
  siren = null,
  onViewerToggle = null,
  onTypeChange = null, // Function to change report type (HTML/PDF)
  currentType = 'html', // Current report type
  isGenerating = false // Loading state from parent
}) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState('iframe'); // 'iframe' | 'popup'
  const [isLoading, setIsLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [showControls, setShowControls] = useState(true);
  
  // Drag functionality state
  const [isDragging, setIsDragging] = useState(false);
  const [isWindowed, setIsWindowed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const dragHandleRef = useRef(null);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 400));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 25));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  // Fit to width/height
  const handleFitToWidth = useCallback(() => {
    setZoomLevel(95); // Slightly less than 100% to account for padding
  }, []);

  const handleFitToHeight = useCallback(() => {
    setZoomLevel(80); // Adjust based on typical document proportions
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Toggle windowed mode
  const toggleWindowed = useCallback(() => {
    setIsWindowed(prev => !prev);
    if (!isWindowed) {
      // Reset to center when switching to windowed mode
      setPosition({ 
        x: (window.innerWidth - size.width) / 2, 
        y: (window.innerHeight - size.height) / 2 
      });
    }
  }, [isWindowed, size]);

  // Drag event handlers
  const handleMouseDown = useCallback((e) => {
    if (!isWindowed) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [isWindowed, position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !isWindowed) return;
    e.preventDefault();
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x)),
      y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y))
    });
  }, [isDragging, isWindowed, dragStart, size]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleResetZoom();
            break;
        }
      }
      
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
      
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen, isFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Add controls to popup window
  const addPopupControls = useCallback((popup) => {
    popup.addEventListener('load', () => {
      if (popup.document) {
        let currentZoom = 100;
        
        // Inject enhanced control panel
        const controlsDiv = popup.document.createElement('div');
        controlsDiv.innerHTML = `
          <div id="documentControls" style="
            position: fixed; 
            top: 10px; 
            right: 10px; 
            z-index: 10000; 
            background: rgba(0,0,0,0.9); 
            border-radius: 12px; 
            padding: 15px; 
            color: white; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
            min-width: 200px;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
              <span style="font-weight: 600; font-size: 14px;">🔍 Contrôles</span>
              <button id="toggleControls" style="
                background: rgba(255,255,255,0.2); 
                border: none; 
                color: white; 
                padding: 2px 6px; 
                border-radius: 4px; 
                cursor: pointer;
                font-size: 12px;
              ">−</button>
            </div>
            <div id="controlsContent">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <button id="zoomOut" style="background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">🔍−</button>
                <span id="zoomLevel" style="min-width: 50px; text-align: center; font-weight: 600;">${currentZoom}%</span>
                <button id="zoomIn" style="background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">🔍+</button>
                <button id="resetZoom" style="background: #374151; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;">↻</button>
              </div>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <button id="fitWidth" style="background: #059669; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">📐 Largeur</button>
                <button id="fitHeight" style="background: #059669; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">📏 Hauteur</button>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="printBtn" style="background: #059669; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">🖨️ Imprimer</button>
                <button id="fullscreen" style="background: #7C3AED; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; flex: 1;">⛶ Plein écran</button>
              </div>
              <div style="margin-top: 8px; font-size: 11px; color: rgba(255,255,255,0.7);">
                Raccourcis: Ctrl+/- (zoom), F11 (plein écran)
              </div>
            </div>
          </div>
        `;
        popup.document.body.appendChild(controlsDiv);

        // Add functionality to popup controls
        const updateZoom = (newZoom) => {
          currentZoom = Math.max(25, Math.min(400, newZoom));
          popup.document.getElementById('zoomLevel').textContent = currentZoom + '%';
          popup.document.body.style.zoom = currentZoom / 100;
        };

        popup.document.getElementById('zoomIn').onclick = () => updateZoom(currentZoom + 25);
        popup.document.getElementById('zoomOut').onclick = () => updateZoom(currentZoom - 25);
        popup.document.getElementById('resetZoom').onclick = () => updateZoom(100);
        popup.document.getElementById('fitWidth').onclick = () => updateZoom(95);
        popup.document.getElementById('fitHeight').onclick = () => updateZoom(80);
        popup.document.getElementById('printBtn').onclick = () => popup.print();
        popup.document.getElementById('fullscreen').onclick = () => {
          if (popup.document.documentElement.requestFullscreen) {
            popup.document.documentElement.requestFullscreen();
          }
        };

        // Toggle controls visibility
        let controlsVisible = true;
        popup.document.getElementById('toggleControls').onclick = () => {
          controlsVisible = !controlsVisible;
          const content = popup.document.getElementById('controlsContent');
          const toggle = popup.document.getElementById('toggleControls');
          if (controlsVisible) {
            content.style.display = 'block';
            toggle.textContent = '−';
          } else {
            content.style.display = 'none';
            toggle.textContent = '+';
          }
        };

        // Keyboard shortcuts for popup
        popup.document.addEventListener('keydown', (e) => {
          if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
              case '=':
              case '+':
                e.preventDefault();
                updateZoom(currentZoom + 25);
                break;
              case '-':
                e.preventDefault();
                updateZoom(currentZoom - 25);
                break;
              case '0':
                e.preventDefault();
                updateZoom(100);
                break;
            }
          }
        });
      }
    });
  }, []);

  // Open in popup with enhanced controls
  const openInPopup = useCallback(() => {
    if (url) {
      const popup = window.open(
        url,
        `document_${siren || Date.now()}`,
        'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=yes,status=yes'
      );
      
      if (popup) {
        popup.focus();
        addPopupControls(popup);
      }
    }
  }, [url, siren, addPopupControls]);

  // Apply zoom to iframe
  useEffect(() => {
    if (iframeRef.current && zoomLevel !== 100) {
      try {
        // Try to access iframe content and apply zoom
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        if (iframeDoc && iframeDoc.body) {
          iframeDoc.body.style.zoom = zoomLevel / 100;
          iframeDoc.body.style.transform = `scale(${zoomLevel / 100})`;
          iframeDoc.body.style.transformOrigin = 'top left';
        }
      } catch (e) {
        // Cross-origin restrictions - fallback to container scaling
        console.log('Cross-origin iframe, using container scaling');
      }
    }
  }, [zoomLevel, iframeKey]);

  // Force iframe reload when zoom changes significantly
  const refreshIframe = useCallback(() => {
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
    
    // Apply zoom after load
    setTimeout(() => {
      if (iframeRef.current && zoomLevel !== 100) {
        try {
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
          if (iframeDoc && iframeDoc.body) {
            iframeDoc.body.style.zoom = zoomLevel / 100;
          }
        } catch (e) {
          // Silently fail for cross-origin content
        }
      }
    }, 100);
  }, [zoomLevel]);

  // Build iframe URL with zoom parameters for PDFs
  const getIframeUrl = useCallback(() => {
    if (type === 'pdf') {
      const zoomParam = Math.round((zoomLevel / 100) * 100);
      return `${url}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH&zoom=${zoomParam}`;
    }
    return url;
  }, [url, type, zoomLevel]);

  return (
    <div 
      ref={containerRef}
      className={`fixed z-[60] ${
        isWindowed 
          ? 'bg-transparent' 
          : 'inset-0 bg-black bg-opacity-90 backdrop-blur-sm'
      } ${isFullscreen ? 'bg-black' : ''}`}
      style={isWindowed ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
      } : {}}
    >
      <div className={`flex flex-col ${
        isWindowed 
          ? 'h-full bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700' 
          : `h-full ${isFullscreen ? '' : 'p-4'}`
      }`}>
        
        {/* Enhanced Header with Controls */}
        <div className={`bg-white dark:bg-gray-900 shadow-lg ${
          isWindowed ? 'rounded-t-lg' : (isFullscreen ? 'rounded-none' : 'rounded-t-2xl')
        } ${showControls ? 'block' : 'hidden'}`}>
          <div 
            ref={dragHandleRef}
            className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${
              isWindowed ? 'cursor-move' : 'cursor-default'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <span className="mr-2">{type === 'pdf' ? '📋' : '📄'}</span>
                {title}
                {isWindowed && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-md">
                    Fenêtre flottante
                  </span>
                )}
              </h2>
              {siren && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md">
                  SIREN: {siren}
                </span>
              )}

              {/* Report Type Toggle for BODACC/INSEE reports */}
              {onTypeChange && (
                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
                  <button
                    onClick={() => onTypeChange('html')}
                    disabled={isGenerating}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      currentType === 'html'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isGenerating && currentType === 'html' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Génération...
                      </span>
                    ) : (
                      '📄 HTML'
                    )}
                  </button>
                  <button
                    onClick={() => onTypeChange('pdf')}
                    disabled={isGenerating}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      currentType === 'pdf'
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isGenerating && currentType === 'pdf' ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Génération...
                      </span>
                    ) : (
                      '📋 PDF'
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 25}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  title="Zoom arrière (Ctrl + -)"
                >
                  🔍−
                </button>
                
                <div className="px-3 py-2 min-w-[60px] text-center text-sm font-medium text-gray-900 dark:text-white">
                  {zoomLevel}%
                </div>
                
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 400}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  title="Zoom avant (Ctrl + +)"
                >
                  🔍+
                </button>
                
                <button
                  onClick={handleResetZoom}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-white dark:hover:bg-gray-700 transition-colors"
                  title="Réinitialiser zoom (Ctrl + 0)"
                >
                  ↻
                </button>
              </div>

              {/* Fit Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleFitToWidth}
                  className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  title="Ajuster à la largeur"
                >
                  📐 Largeur
                </button>
                <button
                  onClick={handleFitToHeight}
                  className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                  title="Ajuster à la hauteur"
                >
                  📏 Hauteur
                </button>
              </div>

              {/* View Mode Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={openInPopup}
                  className="px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
                  title="Ouvrir dans une nouvelle fenêtre"
                >
                  🪟 Popup
                </button>
                
                <button
                  onClick={toggleFullscreen}
                  className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  title="Plein écran (F11)"
                >
                  {isFullscreen ? '🔲' : '⛶'} {isFullscreen ? 'Quitter' : 'Plein écran'}
                </button>
              </div>

              {/* Action Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={refreshIframe}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Actualiser le document"
                >
                  🔄
                </button>
                
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Ouvrir dans un nouvel onglet"
                >
                  🔗
                </a>
                
                <button
                  onClick={() => window.print()}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Imprimer"
                >
                  🖨️
                </button>
              </div>

              {/* Toggle Basic Viewer */}
              {onViewerToggle && (
                <button
                  onClick={onViewerToggle}
                  className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                  title="Retour au visualiseur simple"
                >
                  📄 Simple
                </button>
              )}

              {/* Windowed Mode Toggle */}
              <button
                onClick={toggleWindowed}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isWindowed ? "Mode plein écran" : "Mode fenêtre"}
              >
                {isWindowed ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h2M4 16v4a2 2 0 002 2h2M16 4h2a2 2 0 012 2v2M16 20h2a2 2 0 002-2v-2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h2a2 2 0 012 2v4m0 0V7a2 2 0 012 2v2M8 7a2 2 0 00-2 2v2m12 0a2 2 0 002 2v4a2 2 0 01-2 2h-2m0 0a2 2 0 01-2-2v-4m0 0a2 2 0 00-2-2H8a2 2 0 00-2 2v4a2 2 0 002 2h2" />
                  </svg>
                )}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Fermer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Help Bar */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>💡 <strong>Raccourcis:</strong> Ctrl+/- (zoom), F11 (plein écran), Esc (fermer)</span>
              </div>
              <button
                onClick={() => setShowControls(!showControls)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showControls ? 'Masquer contrôles' : 'Afficher contrôles'}
              </button>
            </div>
          </div>
        </div>

        {/* Document Viewer Area */}
        <div className={`flex-1 relative bg-gray-100 dark:bg-gray-900 ${isFullscreen ? 'rounded-none' : 'rounded-b-2xl'} overflow-hidden`}>
          
          {/* Loading Overlay */}
          {(isLoading || isGenerating) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-90">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isGenerating ? 'Génération du rapport en cours...' : 'Chargement du document...'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {isGenerating 
                    ? `Génération du format ${currentType.toUpperCase()}` 
                    : (type === 'pdf' ? 'Préparation du PDF' : 'Chargement du contenu HTML')
                  }
                </p>
              </div>
            </div>
          )}

          {/* Zoom Level Indicator */}
          {zoomLevel !== 100 && !isLoading && !isGenerating && (
            <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm font-medium">
              Zoom: {zoomLevel}%
            </div>
          )}

          {/* Controls Toggle (when hidden) */}
          {!showControls && !isGenerating && (
            <button
              onClick={() => setShowControls(true)}
              className="absolute top-4 right-4 z-10 bg-black bg-opacity-75 text-white p-3 rounded-lg hover:bg-opacity-90 transition-all"
              title="Afficher les contrôles"
            >
              ⚙️
            </button>
          )}

          {/* Document Container */}
          {!isGenerating && (
            <div 
              className="w-full h-full overflow-auto"
              style={{
                transform: type === 'html' && zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
                transformOrigin: 'top left',
                width: type === 'html' && zoomLevel !== 100 ? `${100 / (zoomLevel / 100)}%` : '100%',
                height: type === 'html' && zoomLevel !== 100 ? `${100 / (zoomLevel / 100)}%` : '100%'
              }}
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={getIframeUrl()}
                className="w-full h-full border-0 bg-white dark:bg-gray-800"
                title={title}
                onLoad={handleIframeLoad}
                onError={() => setIsLoading(false)}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          )}

          {/* Zoom Shortcuts Hint */}
          {!isLoading && !isGenerating && (
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-xs">
              💡 Utilisez la molette + Ctrl pour zoomer rapidement
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!isFullscreen && (
          <div className="bg-white dark:bg-gray-900 rounded-b-2xl border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>📋 Type: {currentType ? currentType.toUpperCase() : type.toUpperCase()}</span>
                <span>🔍 Zoom: {zoomLevel}%</span>
                {siren && <span>🏢 SIREN: {siren}</span>}
                <span>📅 {new Date().toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400">✓ Visualiseur avancé actif</span>
                {isGenerating && (
                  <span className="text-blue-600 dark:text-blue-400 flex items-center">
                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Génération en cours...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Enhanced hook for document viewing
export function useScalableViewer() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);

  const openDocument = useCallback((documentData) => {
    setCurrentDocument(documentData);
    setIsViewerOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsViewerOpen(false);
    setCurrentDocument(null);
  }, []);

  const openBODACCReport = useCallback((siren, url, type = 'html') => {
    openDocument({
      url,
      title: `Rapport BODACC - SIREN ${siren}`,
      type,
      siren
    });
  }, [openDocument]);

  const openINSEEReport = useCallback((siren, url, type = 'html') => {
    openDocument({
      url,
      title: `Rapport INSEE - SIREN ${siren}`,
      type,
      siren
    });
  }, [openDocument]);

  return {
    isViewerOpen,
    currentDocument,
    openDocument,
    openBODACCReport,
    openINSEEReport,
    closeViewer,
    ScalableViewer: () => isViewerOpen && currentDocument ? (
      <ScalablePDFViewer 
        {...currentDocument}
        onClose={closeViewer} 
      />
    ) : null
  };
}
