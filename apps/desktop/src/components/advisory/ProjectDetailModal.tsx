"use client";

import { useState, useEffect, useRef } from "react";
import { advisoryGetProject } from "@/lib/api";

// Declare global PDF.js
declare global {
  interface Window {
    pdfjsLib: any
  }
}
import { motion, AnimatePresence } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { X, Calendar, Clock, Users, MapPin, FileText, Download, Eye, Send, Briefcase, ChevronLeft, ChevronRight } from "lucide-react";
import { ShowcaseViewer } from "./ShowcaseViewer";
import { ShowcaseCarousel } from "./ShowcaseCarousel";
import { CoffeeChatsPanel } from "./CoffeeChatsPanel";
import { ApplicationsPanel } from "./ApplicationsPanel";
import TeamsViewerModal from "./TeamsViewerModal";
import { PDFViewer } from "./PDFViewer";

interface ProjectDetailModalProps {
  project: AdvisoryProject | null;
  onClose: () => void;
}

const KNOWN_CLIENTS: Record<string, string> = {
  "UC Investments": "/clients/uc-investments.svg",
  "Liverpool FC": "https://logo.clearbit.com/liverpoolfc.com",
  "Fenway Sports Group": "https://logo.clearbit.com/fenway-sports.com",
  "BlackRock": "https://logo.clearbit.com/blackrock.com",
  "Blackstone": "https://logo.clearbit.com/blackstone.com",
  "Goldman Sachs": "https://logo.clearbit.com/goldmansachs.com",
  "JPMorgan": "https://logo.clearbit.com/jpmorganchase.com",
  "Morgan Stanley": "https://logo.clearbit.com/morganstanley.com",
  "Citi": "https://logo.clearbit.com/citi.com",
  "Wells Fargo": "https://logo.clearbit.com/wellsfargo.com",
  "Vanguard": "https://logo.clearbit.com/vanguard.com",
  "Fidelity": "https://logo.clearbit.com/fidelity.com",
  "UBS": "https://logo.clearbit.com/ubs.com",
  "HSBC": "https://logo.clearbit.com/hsbc.com",
  "Bank of America": "https://logo.clearbit.com/bankofamerica.com",
  "Haas Finance Group": "/clients/haas-finance.svg",
  "KKR": "https://logo.clearbit.com/kkr.com",
  "Apollo Global": "https://logo.clearbit.com/apollo.com",
  "Carlyle Group": "https://logo.clearbit.com/carlyle.com",
  "TPG Capital": "https://logo.clearbit.com/tpg.com",
  "Bain Capital": "https://logo.clearbit.com/bain.com",
};

export default function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
  // State for full project data with showcase materials
  const [fullProject, setFullProject] = useState<AdvisoryProject | null>(null);
  
  const [showShowcase, setShowShowcase] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [showCoffeePanel, setShowCoffeePanel] = useState(false);
  const [showAppsPanel, setShowAppsPanel] = useState(false);
  const [showTeamsOpen, setShowTeamsOpen] = useState(false);
  type Lead = { name: string; email: string; role?: string; employee_id?: number };
  const [projectLeads, setProjectLeads] = useState<Lead[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // PDF and image pre-loading states
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const preloadedImagesRef = useRef(new Map());
  
  // Fetch full project data when modal opens
  useEffect(() => {
    if (!project?.id) return;
    
    const fetchFullProject = async () => {
      try {
        const fullData = await advisoryGetProject(project.id);
        setFullProject(fullData);
      } catch (error) {
        console.error('Error fetching full project data:', error);
        setFullProject(project); // Fallback to basic project data
      }
    };
    
    fetchFullProject();
  }, [project?.id]);

  // Fetch project leads (prefer Employees API to get names + emails)
  useEffect(() => {
    if (project?.id) {
      const hdrs: any = { "Authorization": "Bearer " + (localStorage.getItem("adminToken") || "") };
      const KNOWN_NAMES: Record<string, string> = {
        'lwhitworth@ngicapitaladvisory.com': 'Landon Whitworth',
        'anurmamade@ngicapitaladvisory.com': 'Andre Nurmamade',
      };
      // Use Employees module richer endpoint when available
      fetch(`/api/projects/${project.id}/leads`, { headers: hdrs })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data?.leads)) {
            const leads: Lead[] = data.leads.map((r: any) => {
              const email = String(r?.employee_email || '').trim().toLowerCase();
              const rawName = String(r?.employee_name || '').trim();
              const name = rawName || KNOWN_NAMES[email] || '';
              return {
                name,
                email,
                role: r?.role,
                employee_id: r?.employee_id,
              };
            }).filter((l: any) => l.email);
            if (leads.length) { setProjectLeads(leads); return; }
          }
          // Fallback to advisory route (emails only)
          return fetch(`/api/advisory/projects/${project.id}/leads`, { headers: hdrs })
            .then(r => r.json())
            .then((d) => {
              const emails: string[] = Array.isArray(d?.leads) ? d.leads : [];
              const leads: Lead[] = emails.map(em => {
                const lower = String(em || '').trim().toLowerCase();
                const fallbackName = lower.split('@')[0].replace(/\./g,' ').replace(/\b\w/g, (s:any)=>s.toUpperCase());
                return { email: lower, name: KNOWN_NAMES[lower] || fallbackName };
              });
              setProjectLeads(leads);
            });
        })
        .catch(err => console.error("Failed to load leads:", err));
    }
  }, [project?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (project) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [project, onClose]);


  if (!project) return null;
  
  // Use full project data if available, otherwise fallback to basic project data
  const projectData = fullProject || project;
  
  // Show modal immediately, don't wait for full project data

  const statusIsActive = String(project.status).toLowerCase() === "active";
  const statusIsClosed = String(project.status).toLowerCase() === "closed";
  
  // Get all showcase materials (gallery images + showcase PDF)
  // Parse gallery_urls if it's a JSON string
  let galleryImages: string[] = [];
  try {
    const rawGalleryUrls = (projectData as any).gallery_urls;
    if (typeof rawGalleryUrls === 'string') {
      galleryImages = JSON.parse(rawGalleryUrls) || [];
    } else if (Array.isArray(rawGalleryUrls)) {
      galleryImages = rawGalleryUrls;
    }
  } catch (e) {
    console.error('Error parsing gallery_urls:', e);
    galleryImages = [];
  }
  
  const showcasePdf = projectData.showcase_pdf_url;
  
  // Combine all showcase materials
  const allShowcaseMaterials = [
    ...galleryImages,
    ...(showcasePdf ? [showcasePdf] : [])
  ];
  
  // Use actual showcase materials from the project
  const testShowcaseMaterials = allShowcaseMaterials;
  
  const hasShowcaseMaterials = testShowcaseMaterials.length > 0;
  
  // Create unified materials array (hero + showcase)
  // If no hero image but there are showcase materials, start with showcase materials
  const allMaterials = projectData.hero_image_url 
    ? [projectData.hero_image_url, ...testShowcaseMaterials]
    : testShowcaseMaterials;
  
  // Calculate total materials including PDF pages
  const getTotalPages = () => {
    if (!hasShowcaseMaterials && !projectData.hero_image_url) return 0; // No materials
    if (!hasShowcaseMaterials) return 1; // Only hero image
    
    let total = projectData.hero_image_url ? 1 : 0; // Hero image if exists
    for (const material of testShowcaseMaterials) {
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
  
  // Navigation state helpers
  const isFirstPage = currentPagePosition === 1;
  const isLastPage = currentPagePosition === totalPages;
  const isMiddlePage = currentPagePosition > 1 && currentPagePosition < totalPages;
  
  // Check if we're on hero image specifically
  const isOnHeroImage = currentImageIndex === 0 && projectData.hero_image_url;
  
  // Debug logging to see what's happening
  console.log('=== ADMIN SHOWCASE DEBUG ===');
  console.log('Project ID:', projectData.id);
  console.log('Project Name:', projectData.project_name);
  console.log('Raw Project Data:', projectData);
  console.log('Gallery URLs (raw):', (projectData as any).gallery_urls);
  console.log('Gallery URLs (parsed):', galleryImages);
  console.log('Showcase PDF (raw):', (projectData as any).showcase_pdf_url);
  console.log('Showcase PDF (parsed):', showcasePdf);
  console.log('All Showcase Materials:', allShowcaseMaterials);
  console.log('Has Showcase Materials:', hasShowcaseMaterials);
  console.log('Showcase Length:', allShowcaseMaterials.length);
  console.log('All Materials:', allMaterials);
  console.log('Current Image Index:', currentImageIndex);
  console.log('========================');
  
  // Use hero image or first showcase material
  const hero = projectData.hero_image_url || (hasShowcaseMaterials ? allShowcaseMaterials[0] : "");
  const isAbsolute = (u: string) => /^(\/|https?:|blob:|data:)/.test(u);
  const heroSrc = hero ? (isAbsolute(String(hero)) ? String(hero) : `/${hero}`) : "";
  
  const withBasePath = (u?: string) => {
    const s = String(u || "");
    if (!s) return s;
    if (/^(https?:|data:|blob:)/.test(s)) return s;
    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "/admin";
    const basePath = baseUrl.replace(/^https?:\/\/[^/]+/i, "") || "";
    if (s.startsWith("/clients/")) return `${basePath}${s}`;
    return s;
  };

  const partnerLogos = (project as any).partner_logos || [];
  const backerLogos = (project as any).backer_logos || [];
  
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
      {project && (
        <div key="project-modal-root" className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Full Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          className="fixed inset-0 md:inset-12 lg:inset-24 max-w-4xl mx-auto max-h-[80vh] bg-background rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 z-50 flex flex-col overflow-hidden"
        >
          {/* Close Button - Hide when viewing PDFs */}
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
          <div className="overflow-y-auto no-scrollbar flex-1">
            {/* Hero Image - cropped to fill, no black bars */}
            <div 
              className="relative w-full h-96 md:h-[32rem] overflow-hidden group" 
              style={{ 
                backgroundColor: 'transparent',
                position: 'relative'
              }}
            >
              {/* Double-buffer approach to prevent blue flash */}
              {allMaterials.length > 0 ? allMaterials.map((material, index) => {
                if (!material) return null;
                
                // Debug logging for materials
                console.log('Material Debug:', {
                  index,
                  material,
                  currentImageIndex,
                  isActive: index === currentImageIndex,
                  hasHeroImage: !!projectData.hero_image_url
                });
                
                const isPDF = material?.toLowerCase().endsWith('.pdf');
                const isAbsolute = (url: string) => /^(\/|https?:|blob:|data:)/.test(url);
                const materialSrc = isAbsolute(material) ? material : `/${material}`;
                
           // Use same simple URL construction as student app
           const finalSrc = materialSrc;
           
           // Debug PDF URL construction
           if (isPDF) {
             console.log('PDF URL Debug:', {
               material,
               materialSrc,
               finalSrc
             });
           }
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
                      src={finalSrc}
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
                      src={materialSrc}
                      alt={`${project.project_name} ${index === 0 ? 'hero' : 'showcase'} ${index}`}
                      className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                      style={{ 
                        opacity: 1,
                        transition: 'none',
                        display: 'block',
                        backgroundColor: 'transparent'
                      }}
                      onClick={() => {
                        if (hasShowcaseMaterials) {
                          setCurrentImageIndex(0);
                          setShowCarousel(true);
                        }
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
                  {hasShowcaseMaterials && (
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
              
         {/* Status Badge - Hide when viewing PDFs */}
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
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Main Content */}
                  <div className="lg:col-span-2 space-y-4">
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
                      
                      {/* Client badges moved below summary */}
                    </motion.div>

                    {/* Summary (under title) */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="text-base text-foreground/90"
                    >
                      {project.summary}
                    </motion.div>

                    {/* Info tag row: location, team size, hourly rate */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {(project.location_text || project.mode) && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border text-xs text-foreground/80">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span>
                            {project.mode === 'hybrid' && project.location_text ? `Hybrid • ${project.location_text}` :
                             project.mode === 'in_person' && project.location_text ? `In Person • ${project.location_text}` :
                             project.location_text || (project.mode === 'remote' ? 'Remote' : '')}
                          </span>
                        </div>
                      )}
                      {typeof (project as any).team_size === 'number' && (project as any).team_size > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowTeamsOpen(true)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border text-xs text-foreground/80 hover:shadow-md transition-colors"
                          title="View team composition"
                        >
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>Team {(project as any).team_size}</span>
                        </button>
                      )}
                      {typeof (project as any).default_hourly_rate === 'number' && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border text-xs text-foreground/80">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span>
                            {(() => {
                              const r = (project as any).default_hourly_rate as number
                              const cur = String((project as any).pay_currency || 'USD').toUpperCase()
                              try { return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(r)}/hr` } catch { return `${r}/hr` }
                            })()}
                          </span>
                        </div>
                      )}
                    </motion.div>

                    {/* Clients (badges) under title */}
                    {clientLogos.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="flex flex-wrap items-center gap-3"
                      >
                        {clientLogos.map((client: any, idx: number) => (
                          <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border shadow-sm">
                            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-800 rounded p-0.5">
                              {client.logo ? (
                                <img src={withBasePath(client.logo)} alt={client.name} className="w-full h-full object-contain" />
                              ) : (
                                <Briefcase className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-foreground">{client.name}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}

                    {/* Stats Grid */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="grid grid-cols-2 gap-4"
                    >
                {project.duration_weeks && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{project.duration_weeks}</div>
                      <div className="text-xs text-muted-foreground">Weeks</div>
                    </div>
                  </div>
                )}
                
                {project.commitment_hours_per_week && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{project.commitment_hours_per_week}</div>
                      <div className="text-xs text-muted-foreground">Hrs/Week</div>
                    </div>
                  </div>
                )}

                {false && (
                  <div />
                )}

                    </motion.div>

                    {/* Project Leads */}
                    {projectLeads && projectLeads.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="space-y-2"
                      >
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Project Leads
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {projectLeads.map((lead, idx) => (
                            <motion.a
                              key={`${lead.email}-${idx}`}
                              href={`mailto:${lead.email}`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border shadow-sm hover:shadow-md transition-colors"
                            >
                              <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                                {String(lead.name || lead.email).trim().charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">{lead.name || lead.email}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-400 break-words whitespace-normal">{lead.email}</div>
                              </div>
                            </motion.a>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Team Requirements (Majors) */}
                    {(project as any).team_requirements && Array.isArray((project as any).team_requirements) && (project as any).team_requirements.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.58 }}
                        className="space-y-2"
                      >
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Preferred Majors
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(project as any).team_requirements.map((major: string, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
                              {major}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Description */}
                    {project.description && (
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
                          {project.description}
                        </div>
                      </motion.div>
                    )}

                    {/* Showcase Materials */}
                    {project.showcase_pdf_url && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <FileText className="w-5 h-5" />
                              Project Showcase Materials
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Browse through the project deliverables, case studies, and results
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowShowcase(true)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View Materials
                            </button>
                            <a
                              href={project.showcase_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 border border-border bg-background text-foreground rounded-lg hover:bg-accent transition-colors font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Right: Admin Action Sidebar */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border"
                    >
                      <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        Admin Actions
                      </h3>
                      <p className="text-xs text-foreground/80 mb-3">Open project modals for Coffee Chats and Applications.</p>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => setShowCoffeePanel(true)}
                          className="w-full px-4 py-2.5 text-center rounded-lg bg-background border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
                        >
                          Open Coffee Chats
                        </button>
                        <button
                          onClick={() => setShowAppsPanel(true)}
                          className="w-full px-4 py-2.5 text-center rounded-lg bg-background border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors"
                        >
                          Open Applications
                        </button>
                      </div>
          </motion.div>

          {showCoffeePanel && (
            <CoffeeChatsPanel projectId={project.id} onClose={() => setShowCoffeePanel(false)} />
          )}
          {showAppsPanel && (
            <ApplicationsPanel projectId={project.id} onClose={() => setShowAppsPanel(false)} />
          )}
                  </div>
                </div>
              </div>
          </div>
        </motion.div>
      </div>
      )}

      {/* Showcase Viewer Modal */}
      {project.showcase_pdf_url && (
        <ShowcaseViewer
          key="showcase-viewer" isOpen={showShowcase}
          onClose={() => setShowShowcase(false)}
          fileUrl={project.showcase_pdf_url}
          fileName={`${project.project_name} - Showcase`}
        />
      )}
      
      {/* Showcase Carousel Modal */}
      {hasShowcaseMaterials && (
        <ShowcaseCarousel
          key="showcase-carousel" images={allShowcaseMaterials}
          isOpen={showCarousel}
          onClose={() => setShowCarousel(false)}
          projectName={project.project_name}
          initialIndex={currentImageIndex}
        />
      )}
      {/* Teams Viewer Modal */}
      <TeamsViewerModal
        open={showTeamsOpen}
        onClose={() => setShowTeamsOpen(false)}
        total={Number((project as any)?.team_size || 0)}
        roles={(() => {
          try {
            const comp = (project as any)?.team_composition;
            const arr = typeof comp === 'string' ? JSON.parse(comp) : (Array.isArray(comp) ? comp : []);
            const roles = (arr || []).map((r: any) => ({ title: String(r?.title || ''), count: Number(r?.count || 0), notes: String(r?.notes || ''), majors: Array.isArray(r?.majors) ? r.majors.map(String) : [] }));
            // fall back to majors-only if composition absent
            if (!roles.length && Array.isArray((project as any)?.team_requirements)) {
              return [{ title: 'Preferred Majors', count: Number((project as any)?.team_size || 0), notes: '', majors: (project as any).team_requirements.map((m: any)=>String(m)) }];
            }
            return roles;
          } catch { return []; }
        })()}
      />
    </AnimatePresence>
  );
}













