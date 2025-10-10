"use client"

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, Users, MapPin, Briefcase, FileText, Send, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useUser } from '@clerk/nextjs'
import type { PublicProject } from '@/lib/api'
import { ShowcaseViewer } from './ShowcaseViewer'
import { ShowcaseCarousel } from './ShowcaseCarousel'
import { PDFViewer } from './PDFViewer'
import { ApplicationModal } from './ApplicationModal'
import { CoffeeChatModal } from './CoffeeChatModal'

interface StudentProjectModalProps {
  isOpen: boolean
  project: PublicProject | null
  onClose: () => void
}

// Known client logos - using Clearbit Logo API
const KNOWN_CLIENTS: Record<string, string> = {
  'UC Investments': '/clients/uc-investments.svg',
  'Liverpool FC': 'https://logo.clearbit.com/liverpoolfc.com',
  'Fenway Sports Group': 'https://logo.clearbit.com/fenway-sports.com',
  'BlackRock': 'https://logo.clearbit.com/blackrock.com',
  'Blackstone': 'https://logo.clearbit.com/blackstone.com',
  'Goldman Sachs': 'https://logo.clearbit.com/goldmansachs.com',
  'JPMorgan': 'https://logo.clearbit.com/jpmorganchase.com',
  'Morgan Stanley': 'https://logo.clearbit.com/morganstanley.com',
  'Citi': 'https://logo.clearbit.com/citi.com',
  'Wells Fargo': 'https://logo.clearbit.com/wellsfargo.com',
  'Vanguard': 'https://logo.clearbit.com/vanguard.com',
  'Fidelity': 'https://logo.clearbit.com/fidelity.com',
  'UBS': 'https://logo.clearbit.com/ubs.com',
  'HSBC': 'https://logo.clearbit.com/hsbc.com',
  'Bank of America': 'https://logo.clearbit.com/bankofamerica.com',
  'Haas Finance Group': '/clients/haas-finance.svg',
  'KKR': 'https://logo.clearbit.com/kkr.com',
  'Apollo Global': 'https://logo.clearbit.com/apollo.com',
  'Carlyle Group': 'https://logo.clearbit.com/carlyle.com',
  'TPG Capital': 'https://logo.clearbit.com/tpg.com',
  'Bain Capital': 'https://logo.clearbit.com/bain.com',
}

export function StudentProjectModal({ isOpen, project, onClose }: StudentProjectModalProps) {
  const [showApplication, setShowApplication] = useState(false)
  const [showCoffee, setShowCoffee] = useState(false)
  const [showShowcase, setShowShowcase] = useState(false)
  const [showCarousel, setShowCarousel] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1)
  const [pdfTotalPages, setPdfTotalPages] = useState(0)
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [pdfReady, setPdfReady] = useState(false)
  const [imagesReady, setImagesReady] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const preloadedImagesRef = useRef(new Map())

  // Fetch user profile to check resume status
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Get user email from Clerk
        const clerkUser = (window as any).Clerk?.user
        const email = clerkUser?.primaryEmailAddress?.emailAddress
        
        if (!email) {
          setLoadingProfile(false)
          return
        }

        const res = await fetch('/api/public/profile', {
          headers: { 'X-Student-Email': email }
        })
        
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && project) {
      setShowApplication(false)
      setShowModal(false)
      setPdfReady(false)
      setImagesReady(false)
      
      // Pre-load all images and PDF
      const preloadAssets = async () => {
        const galleryImages = (project as any).gallery_urls || [];
        const showcasePdf = (project as any).showcase_pdf_url;
        const heroSrc = project.hero_image_url || '';
        
              // Pre-load all images and ensure they're fully rendered
              const imagePromises: Promise<HTMLImageElement | null>[] = [];
        const preloadedImages = preloadedImagesRef.current;
        
        // Create unified materials array for preloading
        const allMaterials = heroSrc 
          ? [heroSrc, ...galleryImages]
          : galleryImages;
        
        // Pre-load all materials (hero + gallery)
        allMaterials.forEach((imageUrl: string) => {
          if (imageUrl) {
            imagePromises.push(
              new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                  preloadedImages.set(imageUrl, img);
                  resolve(img);
                };
                img.onerror = () => {
                  preloadedImages.set(imageUrl, null);
                  resolve(null);
                };
                img.src = imageUrl;
              })
            );
          }
        });
        
        // Pre-load PDF if it exists
        if (showcasePdf) {
          try {
            // Load PDF.js if not already loaded
            if (!window.pdfjsLib) {
              const script = document.createElement('script')
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
              await new Promise((resolve, reject) => {
                script.onload = resolve
                script.onerror = reject
                document.head.appendChild(script)
              })
            }
            
            // Load the PDF document
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            const loadingTask = window.pdfjsLib.getDocument({
              url: showcasePdf,
              withCredentials: false,
              httpHeaders: {}
            })
            const pdfDoc = await loadingTask.promise
            setPdfTotalPages(pdfDoc.numPages)
            setPdfReady(true)
          } catch (err) {
            console.error('PDF preload error:', err)
            setPdfReady(true) // Show modal anyway
          }
        } else {
          setPdfReady(true)
        }
        
        // Wait for all images to load
        await Promise.all(imagePromises);
        setImagesReady(true);
      }
      
      preloadAssets()
    }
  }, [isOpen, project])
  
  // Show modal only when both PDF and images are ready
  useEffect(() => {
    if (isOpen && pdfReady && imagesReady) {
      setShowModal(true)
    }
  }, [isOpen, pdfReady, imagesReady])

  const hasResumeUploaded = Boolean(profile?.resume_url)
  const resumeUrl = profile?.resume_url || ''
  const hasCoffeeChat = false // TODO: Implement coffee chat tracking

  if (!project || !showModal) return null

  const statusIsActive = (project.status || 'active').toLowerCase() === 'active'
  const statusIsClosed = (project.status || 'active').toLowerCase() === 'closed'
  
  // Get all showcase materials (gallery images + showcase PDF)
  const galleryImages = (project as any).gallery_urls || [];
  const showcasePdf = (project as any).showcase_pdf_url;
  
  // Combine all showcase materials
  const allShowcaseMaterials = [
    ...galleryImages,
    ...(showcasePdf ? [showcasePdf] : [])
  ];
  
  const hasShowcaseMaterials = allShowcaseMaterials.length > 0;
  
  // Calculate total materials including PDF pages
  const getTotalPages = () => {
    if (!hasShowcaseMaterials) return 1; // Only hero image
    
    let total = 1; // Hero image
    for (const material of allShowcaseMaterials) {
      const isPDF = material?.toLowerCase().endsWith('.pdf');
      if (isPDF) {
        // For PDFs, add the total number of pages
        total += pdfTotalPages || 1;
      } else {
        total += 1; // Regular image
      }
    }
    return total;
  };
  
  const totalPages = getTotalPages();
  
  // Calculate current page position (1-based)
  const getCurrentPagePosition = () => {
    if (currentImageIndex === 0) {
      // If we're on the hero image, return 1
      return 1;
    }
    
    // If we're on a PDF, calculate based on PDF page
    const currentMaterial = allMaterials[currentImageIndex];
    const isPDF = currentMaterial?.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
      // For PDFs, the position is the PDF page number
      return pdfCurrentPage;
    } else {
      // For regular images, it's just the image index + 1
      return currentImageIndex + 1;
    }
  };
  
  const currentPagePosition = getCurrentPagePosition();
  
  // Navigation dot states
  const isFirstPage = currentPagePosition === 1;
  const isLastPage = currentPagePosition === totalPages;
  const isMiddlePage = currentPagePosition > 1 && currentPagePosition < totalPages;
  
  console.log('Navigation Debug:', {
    currentImageIndex,
    currentPagePosition,
    totalPages,
    pdfCurrentPage,
    pdfTotalPages,
    isFirstPage,
    isMiddlePage,
    isLastPage
  });
  
  // Always use hero image first, showcase materials are for navigation only
  const heroSrc = project.hero_image_url || '';
  
  // Create a unified materials array that includes hero as index 0 if it exists
  const allMaterials = heroSrc 
    ? [heroSrc, ...allShowcaseMaterials]
    : allShowcaseMaterials;
  
  // Get partner logos for multi-client display
  const partnerLogos = (project as any).partner_logos || []
  
  // Parse client logos - split comma-separated names if needed
  const clientLogos = (() => {
    if (partnerLogos.length > 0) {
      return partnerLogos.map((p: any) => ({
        name: p.name || p.client_name || "",
        logo: p.logo_url || p.url || p.logo || KNOWN_CLIENTS[p.name || p.client_name || ""] || ""
      })).filter((c: any) => c.name);
    }
    // Fallback: parse comma-separated client names
    const clientNameStr = (project.client_name || "").trim();
    if (!clientNameStr) return [];
    
    const clientNames = clientNameStr.split(',').map(name => name.trim()).filter(Boolean);
    return clientNames.map(name => ({
      name,
      logo: KNOWN_CLIENTS[name] || ""
    }));
  })();


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
            className="fixed inset-0 md:inset-12 lg:inset-24 max-w-4xl mx-auto max-h-[80vh] bg-background rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 flex flex-col overflow-hidden"
          >
            {/* Close Button - Hide when viewing PDF/PowerPoint content */}
            {(() => {
              const currentMaterial = allMaterials[currentImageIndex];
              const isPDF = currentMaterial?.toLowerCase().endsWith('.pdf');
              return !isPDF;
            })() && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>
            )}

            {/* Scrollable Content (hidden scrollbar) */}
            <div className="overflow-y-auto no-scrollbar flex-1" style={{ backgroundColor: 'transparent' }}>
              {/* Hero Image - cropped to fill, no black bars, less tall */}
              <div 
                className="relative w-full h-96 md:h-[32rem] overflow-hidden group" 
                style={{ 
                  backgroundColor: 'transparent',
                  position: 'relative' // Ensure proper positioning
                }}
              >
                {/* Double-buffer approach to prevent blue flash */}
                {allMaterials.length > 0 ? allMaterials.map((material, index) => {
                  if (!material) return null;
                  
                  const isPDF = material?.toLowerCase().endsWith('.pdf');
                  const isAbsolute = (url: string) => /^(\/|https?:|blob:|data:)/.test(url);
                  const materialSrc = isAbsolute(material) ? material : `/${material}`;
                  const isActive = index === currentImageIndex;
                  
                  return isPDF ? (
                    <div
                      key={`pdf-${index}`}
                      className={`absolute inset-0 w-full h-full ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                      style={{ 
                        transition: 'none',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <PDFViewer
                        src={materialSrc}
                        className="absolute inset-0 w-full h-full"
                        currentPage={pdfCurrentPage}
                        onPageChange={setPdfCurrentPage}
                        totalPages={pdfTotalPages}
                        onTotalPagesChange={setPdfTotalPages}
                      />
                    </div>
                  ) : (
                    <div
                      key={`img-${index}`}
                      className={`absolute inset-0 w-full h-full ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                      style={{ 
                        transition: 'none',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <img
                        src={preloadedImagesRef.current.get(materialSrc) ? preloadedImagesRef.current.get(materialSrc).src : materialSrc}
                        alt={`${project.project_name} ${index === 0 ? 'hero' : 'showcase'} ${index}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ 
                          opacity: 1,
                          transition: 'none',
                          display: 'block',
                          backgroundColor: 'transparent'
                        }}
                        onLoad={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.display = 'block';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onError={() => {
                          console.error('Failed to load image:', materialSrc);
                        }}
                      />
                    </div>
                  );
                }) : (
                  // Fallback display when no materials are available
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="text-muted-foreground">No project materials available</p>
                    </div>
                  </div>
                )}
                

                {/* Showcase Navigation Arrows - Show if there are any showcase materials */}
                {hasShowcaseMaterials && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentMaterial = allMaterials[currentImageIndex];
                        const isPDF = currentMaterial?.toLowerCase().endsWith('.pdf');
                        
                        if (isPDF && pdfTotalPages > 1) {
                          // If we're on a PDF and not on the first page, go to previous PDF page
                          if (pdfCurrentPage > 1) {
                            setPdfCurrentPage(pdfCurrentPage - 1);
                          } else {
                            // If we're on first PDF page, go to previous material
                            const prevIndex = currentImageIndex === 0 ? allMaterials.length - 1 : currentImageIndex - 1;
                            setCurrentImageIndex(prevIndex);
                            setPdfCurrentPage(1); // Reset PDF page when switching materials
                          }
                        } else {
                          // Regular material navigation
                          const prevIndex = currentImageIndex === 0 ? allMaterials.length - 1 : currentImageIndex - 1;
                          setCurrentImageIndex(prevIndex);
                          setPdfCurrentPage(1); // Reset PDF page when switching materials
                        }
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                      title="Previous"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const currentMaterial = allMaterials[currentImageIndex];
                        const isPDF = currentMaterial?.toLowerCase().endsWith('.pdf');
                        
                        if (isPDF && pdfTotalPages > 1) {
                          // If we're on a PDF and not on the last page, go to next PDF page
                          if (pdfCurrentPage < pdfTotalPages) {
                            setPdfCurrentPage(pdfCurrentPage + 1);
                          } else {
                            // If we're on last PDF page, go to next material
                            const nextIndex = currentImageIndex === allMaterials.length - 1 ? 0 : currentImageIndex + 1;
                            setCurrentImageIndex(nextIndex);
                            setPdfCurrentPage(1); // Reset PDF page when switching materials
                          }
                        } else {
                          // Regular material navigation
                          const nextIndex = currentImageIndex === allMaterials.length - 1 ? 0 : currentImageIndex + 1;
                          setCurrentImageIndex(nextIndex);
                          setPdfCurrentPage(1); // Reset PDF page when switching materials
                        }
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all duration-200 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                      title="Next"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Showcase Indicator - Smart 3-dot pagination */}
                    {totalPages > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                        {/* Left dot - active on first page only */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(0);
                            setPdfCurrentPage(1);
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            currentPagePosition === 1
                              ? 'bg-white scale-125'
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                          title={`First page (current: ${currentPagePosition}, total: ${totalPages})`}
                        />
                        
                        {/* Middle dot - active on middle pages (2 to n-1) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to a middle position
                            if (allShowcaseMaterials.length > 0) {
                              const middleIndex = Math.floor(allShowcaseMaterials.length / 2) + 1;
                              setCurrentImageIndex(middleIndex);
                              setPdfCurrentPage(1);
                            }
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            currentPagePosition > 1 && currentPagePosition < totalPages
                              ? 'bg-white scale-125'
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                          title={`Middle pages (current: ${currentPagePosition}, total: ${totalPages})`}
                        />
                        
                        {/* Right dot - active on last page only */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (allShowcaseMaterials.length > 0) {
                              setCurrentImageIndex(allShowcaseMaterials.length);
                              setPdfCurrentPage(1);
                            }
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            currentPagePosition === totalPages
                              ? 'bg-white scale-125'
                              : 'bg-white/40 hover:bg-white/60'
                          }`}
                          title={`Last page (current: ${currentPagePosition}, total: ${totalPages})`}
                        />
                      </div>
                    )}
                    
                  </>
                )}

                {/* Status Badge - Hide when viewing PDF/PowerPoint content */}
                {(() => {
                  const currentMaterial = allMaterials[currentImageIndex];
                  const isPDF = currentMaterial?.toLowerCase().endsWith('.pdf');
                  return !isPDF;
                })() && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute top-6 left-6"
                >
                  <span
                    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
                      statusIsActive
                        ? "bg-green-500 text-white"
                        : statusIsClosed
                        ? "bg-gray-500 text-white"
                        : "bg-yellow-500 text-white"
                    }`}
                  >
                    {statusIsActive ? "Open" : statusIsClosed ? "Closed" : "Draft"}
                  </span>
                </motion.div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left: Main Content */}
                  <div className="lg:col-span-2 space-y-3">
                    {/* Title & Client */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-4"
                    >
                      <h1 className="text-3xl font-bold text-foreground tracking-tight">
                        {project.project_name}
                      </h1>
                      
                      {/* Client Badges - Larger size */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {clientLogos.map((client: any, idx: number) => (
                          <div key={idx} className="inline-flex items-center gap-3 px-4 py-2.5 rounded-lg bg-background border border-border shadow-sm">
                            {client.logo && (
                              <div className="w-7 h-7 bg-white dark:bg-gray-800 rounded p-1 flex items-center justify-center">
                                <img
                                  src={client.logo}
                                  alt=""
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            )}
                            <span className="text-base font-semibold text-foreground">{client.name}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="text-lg text-muted-foreground leading-relaxed"
                    >
                      {project.summary}
                    </motion.div>
                    
                    {/* Location */}
                    {project.location_text && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">{project.location_text}</span>
                      </motion.div>
                    )}

                    {/* Stats Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="grid grid-cols-2 gap-4"
                    >
                  {(project as any).duration_weeks && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{(project as any).duration_weeks}</div>
                        <div className="text-xs text-muted-foreground">Weeks</div>
                      </div>
                    </div>
                  )}

                  {(project as any).commitment_hours_per_week && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{(project as any).commitment_hours_per_week}</div>
                        <div className="text-xs text-muted-foreground">Hrs/Week</div>
                      </div>
                    </div>
                  )}

                  {project.mode && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground capitalize truncate">{project.mode.replace('_', ' ')}</div>
                        <div className="text-xs text-muted-foreground">Mode</div>
                      </div>
                    </div>
                  )}
                </motion.div>

                    {/* Description */}
                    {(project as any).description && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-3"
                      >
                        <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                          <FileText className="w-6 h-6" />
                          Project Details
                        </h2>
                        <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {(project as any).description}
                        </div>
                      </motion.div>
                    )}

                  </div>

                  {/* Right: Action Sidebar */}
                  <div className="space-y-4">
                    {/* Coffee Chat Section */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border"
                    >
                      <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Coffee Chat
                      </h3>
                      <p className="text-xs text-foreground/80 mb-3">
                        Schedule a 15-minute chat with project leads
                      </p>
                      <button 
                        onClick={() => setShowCoffee(true)}
                        className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
                      >
                        View Times
                      </button>
                    </motion.div>

                    {/* Apply Button */}
                    {statusIsActive && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-950/30 border border-border"
                      >
                        <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                          <Send className="w-4 h-4 text-green-600" />
                          Apply Now
                        </h3>
                        <p className="text-xs text-foreground/80 mb-3">
                          Submit your application for this project
                        </p>
                        <button
                          onClick={() => setShowApplication(true)}
                          className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Start Application
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Showcase Viewer Modal */}
          {(project as any).showcase_pdf_url && (
            <ShowcaseViewer
              isOpen={showShowcase}
              onClose={() => setShowShowcase(false)}
              fileUrl={(project as any).showcase_pdf_url}
              fileName={`${project.project_name} - Showcase`}
            />
          )}
          
          {/* Application Modal */}
          <ApplicationModal
            isOpen={showApplication}
            project={project}
            onClose={() => setShowApplication(false)}
            hasResumeUploaded={hasResumeUploaded}
            resumeUrl={resumeUrl}
            hasCoffeeChat={hasCoffeeChat}
          />

          {/* Coffee Chat Modal */}
          <CoffeeChatModal isOpen={showCoffee} onClose={() => setShowCoffee(false)} />
          
          {/* Showcase Carousel Modal */}
          {hasShowcaseMaterials && (
            <ShowcaseCarousel
              images={allShowcaseMaterials}
              isOpen={showCarousel}
              onClose={() => setShowCarousel(false)}
              projectName={project.project_name}
              initialIndex={currentImageIndex}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}

