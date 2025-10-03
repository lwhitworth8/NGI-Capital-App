"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react'

interface ShowcaseViewerProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName?: string
}

export function ShowcaseViewer({ isOpen, onClose, fileUrl, fileName = 'Showcase' }: ShowcaseViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isPDF = fileUrl?.toLowerCase().endsWith('.pdf')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed ${isFullscreen ? 'inset-0' : 'inset-8 md:inset-16'} bg-background rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-border`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{fileName}</h3>
                <p className="text-xs text-muted-foreground">Project Showcase Materials</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 overflow-hidden bg-muted/30">
              {isPDF ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  className="w-full h-full border-none"
                  title="PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  <div className="max-w-4xl w-full">
                    <div className="p-8 rounded-xl border border-border bg-card text-center">
                      <h3 className="text-xl font-semibold text-foreground mb-4">
                        PowerPoint Presentation
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        PowerPoint files can be downloaded and viewed in Microsoft PowerPoint, Google Slides, or compatible applications.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <a
                          href={fileUrl}
                          download
                          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download File
                        </a>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 rounded-xl border border-border text-foreground font-semibold hover:bg-accent transition-colors"
                        >
                          Open in New Tab
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

