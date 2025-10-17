"use client"

import { useEffect, useRef, useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

interface InvoicePDFPreviewProps {
  invoiceData: any
  entityId: number
  className?: string
}

// Declare global PDF.js
declare global {
  interface Window {
    pdfjsLib: any
  }
}

export function InvoicePDFPreview({ invoiceData, entityId, className = "" }: InvoicePDFPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const generatePreview = async () => {
      if (!invoiceData || !invoiceData.customer_id) {
        setError("Incomplete invoice data")
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Generate preview PDF
        const response = await fetch(`/api/accounting/ar/invoices/preview?entity_id=${entityId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invoiceData)
        })

        if (!response.ok) {
          throw new Error(`Failed to generate preview: ${response.statusText}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        if (mounted) {
          setPdfUrl(url)
          await loadPDFPreview(url)
        }
      } catch (err: any) {
        console.error('PDF preview error:', err)
        if (mounted) {
          setError(err.message || 'Failed to generate PDF preview')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    const loadPDFPreview = async (url: string) => {
      try {
        // Load PDF.js from CDN
        if (!window.pdfjsLib) {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load PDF.js'))
            document.head.appendChild(script)
          })
        }

        const pdfjsLib = window.pdfjsLib
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({
          url: url,
          withCredentials: false,
          httpHeaders: {}
        })

        const pdfDoc = await loadingTask.promise

        if (!mounted) return

        // Get first page
        const page = await pdfDoc.getPage(1)
        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        // Calculate display size
        const containerWidth = canvas.parentElement?.clientWidth || 400
        const scale = Math.min(containerWidth / page.getViewport({ scale: 1 }).width, 1)
        const viewport = page.getViewport({ scale })

        // Set canvas size
        canvas.width = viewport.width
        canvas.height = viewport.height

        // Fill background with white
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)

        // Render page
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }

        await page.render(renderContext).promise
      } catch (err: any) {
        console.error('PDF render error:', err)
        if (mounted) {
          setError(err.message || 'Failed to render PDF preview')
        }
      }
    }

    generatePreview()

    return () => {
      mounted = false
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [invoiceData, entityId])

  return (
    <div className={`relative ${className}`}>
      {/* Canvas for PDF rendering */}
      <canvas
        ref={canvasRef}
        className={`w-full h-auto ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            <div className="text-sm text-gray-500">Generating PDF preview...</div>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-col items-center space-y-2">
            <FileText className="w-8 h-8 text-gray-400" />
            <div className="text-sm text-gray-500 text-center px-4">
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
