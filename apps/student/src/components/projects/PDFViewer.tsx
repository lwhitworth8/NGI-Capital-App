"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { FileText, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'

// Declare global PDF.js
declare global {
  interface Window {
    pdfjsLib: any
  }
}

interface PDFViewerProps {
  src: string
  className?: string
  currentPage?: number
  onPageChange?: (page: number) => void
  totalPages?: number
  onTotalPagesChange?: (pages: number) => void
}

export function PDFViewer({ 
  src, 
  className = "", 
  currentPage: externalCurrentPage, 
  onPageChange, 
  totalPages: externalTotalPages, 
  onTotalPagesChange 
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  const [pdf, setPdf] = useState<any>(null)
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)
  const [internalTotalPages, setInternalTotalPages] = useState(0)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use external control if provided, otherwise use internal state
  const currentPage = externalCurrentPage ?? internalCurrentPage
  const totalPages = externalTotalPages ?? internalTotalPages

  useEffect(() => {
    let mounted = true

    const loadPDF = async () => {
      try {
        setError(null)
        console.log('Loading PDF from:', src)

        // Load PDF.js from CDN to avoid Node.js canvas dependency
        if (!window.pdfjsLib) {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          
          return new Promise<void>((resolve, reject) => {
            script.onload = async () => {
              try {
                // @ts-ignore - PDF.js loaded from CDN
                const pdfjsLib = window.pdfjsLib
                
                // Set worker source
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

                console.log('PDF.js loaded, loading document...')
                const loadingTask = pdfjsLib.getDocument({
                  url: src,
                  withCredentials: false,
                  httpHeaders: {}
                })
                const pdfDoc = await loadingTask.promise

                console.log('PDF loaded successfully, pages:', pdfDoc.numPages)

                if (mounted) {
                  setPdf(pdfDoc)
                  setInternalTotalPages(pdfDoc.numPages)
                  setInternalCurrentPage(1)
                  onTotalPagesChange?.(pdfDoc.numPages)
                  resolve()
                }
              } catch (err: any) {
                console.error('PDF loading error:', err)
                if (mounted) {
                  setError(err.message || 'Failed to load PDF')
                  reject(err)
                }
              }
            }
            
            script.onerror = () => {
              console.error('Failed to load PDF.js script')
              if (mounted) {
                setError('Failed to load PDF.js library')
                reject(new Error('Failed to load PDF.js library'))
              }
            }
            
            document.head.appendChild(script)
          })
        } else {
          // PDF.js already loaded
          try {
            console.log('PDF.js already loaded, loading document...')
            const pdfjsLib = window.pdfjsLib
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

            const loadingTask = pdfjsLib.getDocument({
              url: src,
              withCredentials: false,
              httpHeaders: {}
            })
            const pdfDoc = await loadingTask.promise

            console.log('PDF loaded successfully, pages:', pdfDoc.numPages)

            if (mounted) {
              setPdf(pdfDoc)
              setInternalTotalPages(pdfDoc.numPages)
              setInternalCurrentPage(1)
              onTotalPagesChange?.(pdfDoc.numPages)
            }
          } catch (err: any) {
            console.error('PDF loading error:', err)
            if (mounted) {
              setError(err.message || 'Failed to load PDF')
            }
          }
        }
      } catch (err: any) {
        console.error('PDF loading error:', err)
        if (mounted) {
          setError(err.message || 'Failed to load PDF')
        }
      }
    }

    loadPDF()

    return () => {
      mounted = false
    }
  }, [src])

  useEffect(() => {
    if (pdf && canvasRef.current) {
      renderPage()
    }
  }, [pdf, currentPage, scale])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [])

  const renderPage = async () => {
    if (!pdf || !canvasRef.current || !containerRef.current) return

    // Cancel any existing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    try {
      // Create a temporary canvas for pre-rendering
      const tempCanvas = document.createElement('canvas')
      const tempContext = tempCanvas.getContext('2d')
      const mainCanvas = canvasRef.current
      const container = containerRef.current
      const mainContext = mainCanvas.getContext('2d')

      if (!tempContext || !mainContext) {
        return
      }

      // Set temporary canvas size
      tempCanvas.width = container.clientWidth
      tempCanvas.height = container.clientHeight

      // Fill temporary canvas with background
      tempContext.fillStyle = '#1f2937'
      tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

      const page = await pdf.getPage(currentPage)

      // Calculate scale to cover the entire container (like object-cover)
      const viewport = page.getViewport({ scale: 1 })
      const scaleX = tempCanvas.width / viewport.width
      const scaleY = tempCanvas.height / viewport.height
      const coverScale = Math.max(scaleX, scaleY) * scale

      // Use the cover scale for rendering
      const scaledViewport = page.getViewport({ scale: coverScale })

      // Calculate position to center the scaled PDF on the canvas
      const x = (tempCanvas.width - scaledViewport.width) / 2
      const y = (tempCanvas.height - scaledViewport.height) / 2

      const renderContext = {
        canvasContext: tempContext,
        viewport: scaledViewport,
        transform: [1, 0, 0, 1, x, y], // Apply transform for centering
      }

      // Render to temporary canvas first
      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      renderTaskRef.current = null

      // Now copy the rendered content to the main canvas in one operation
      mainCanvas.width = tempCanvas.width
      mainCanvas.height = tempCanvas.height
      mainContext.drawImage(tempCanvas, 0, 0)
    } catch (err) {
      console.error('Page rendering error:', err)
      renderTaskRef.current = null
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      if (onPageChange) {
        onPageChange(newPage)
      } else {
        setInternalCurrentPage(newPage)
      }
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      if (onPageChange) {
        onPageChange(newPage)
      } else {
        setInternalCurrentPage(newPage)
      }
    }
  }

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }

  // Animated pagination dots for many pages
  const getPaginationDots = useCallback((currentPage: number, totalPages: number) => {
    const dots = []
    const maxVisibleDots = 7 // Show up to 7 dots
    
    if (totalPages <= maxVisibleDots) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        dots.push({
          page: i,
          isCurrent: i === currentPage,
          isEllipsis: false
        })
      }
    } else {
      // Show first page
      dots.push({
        page: 1,
        isCurrent: currentPage === 1,
        isEllipsis: false
      })
      
      // Calculate range around current page
      const start = Math.max(2, currentPage - 2)
      const end = Math.min(totalPages - 1, currentPage + 2)
      
      // Add ellipsis if needed after first page
      if (start > 2) {
        dots.push({
          page: 0,
          isCurrent: false,
          isEllipsis: true
        })
      }
      
      // Add pages around current
      for (let i = start; i <= end; i++) {
        dots.push({
          page: i,
          isCurrent: i === currentPage,
          isEllipsis: false
        })
      }
      
      // Add ellipsis if needed before last page
      if (end < totalPages - 1) {
        dots.push({
          page: 0,
          isCurrent: false,
          isEllipsis: true
        })
      }
      
      // Add last page
      if (totalPages > 1) {
        dots.push({
          page: totalPages,
          isCurrent: currentPage === totalPages,
          isEllipsis: false
        })
      }
    }
    
    return dots
  }, [])

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      if (onPageChange) {
        onPageChange(pageNumber)
      } else {
        setInternalCurrentPage(pageNumber)
      }
    }
  }


  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <div className="text-center p-8">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">PDF Error</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open PDF in New Tab
          </a>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-gray-900 ${className}`}>
      {/* PDF Canvas - Fill entire space with smooth transitions */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-8 z-20">
          <div className="text-center">
            <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">PDF Error</h3>
            <p className="text-sm mb-4">{error}</p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open PDF in New Tab
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
