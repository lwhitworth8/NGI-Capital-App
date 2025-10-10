"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Download, Maximize2, FileText } from 'lucide-react'

interface ShowcaseCarouselProps {
  images: string[]
  isOpen: boolean
  onClose: () => void
  projectName: string
  initialIndex?: number
}

export function ShowcaseCarousel({ 
  images, 
  isOpen, 
  onClose, 
  projectName, 
  initialIndex = 0 
}: ShowcaseCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Reset to initial index when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex]
  const isAbsolute = (url: string) => /^(\/|https?:|blob:|data:)/.test(url)
  const imageSrc = isAbsolute(currentImage) ? currentImage : `/${currentImage}`
  
  // Check if current file is a PDF
  const isPDF = imageSrc?.toLowerCase().endsWith('.pdf')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`relative ${isFullscreen ? 'w-full h-full' : 'w-[90vw] h-[80vh] max-w-6xl'} bg-black rounded-2xl overflow-hidden shadow-2xl`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{projectName}</h3>
                <p className="text-sm text-gray-300">
                  Showcase Materials {currentIndex + 1} of {images.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={imageSrc}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="relative w-full h-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {isPDF ? (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  <iframe
                    src={`${imageSrc}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                    className="w-full h-full border-none"
                    title={`${projectName} showcase PDF ${currentIndex + 1}`}
                  />
                </motion.div>
              ) : (
                <motion.img
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  src={imageSrc}
                  alt={`${projectName} showcase ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    console.error('Failed to load image:', imageSrc)
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
            </AnimatePresence>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 backdrop-blur-sm"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 backdrop-blur-sm"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => {
                  const thumbSrc = isAbsolute(image) ? image : `/${image}`
                  const isThumbPDF = thumbSrc?.toLowerCase().endsWith('.pdf')
                  return (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === currentIndex
                          ? 'border-white scale-110'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                    >
                      {isThumbPDF ? (
                        <div className="w-full h-full bg-red-600 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                      ) : (
                        <img
                          src={thumbSrc}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                      {index === currentIndex && (
                        <div className="absolute inset-0 bg-white/20" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {images.length > 1 && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
              <div className="flex gap-1">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      index === currentIndex
                        ? 'bg-white scale-125'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
