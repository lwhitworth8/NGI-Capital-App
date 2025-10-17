"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { PDFPreview } from "./PDFPreview";

const KNOWN_CLIENTS: Record<string, string> = {
  "UC Endowment": "/clients/uc-endowment.svg",
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

interface ModernProjectCardProps {
  project: AdvisoryProject;
  onEdit: () => void;
  onPreview: () => void;
  index: number;
}

// Client Badge Component matching Edit Project page style
function ClientBadge({ client, basePath }: { client: { name: string; url: string }; basePath: string }) {
  const [imageError, setImageError] = useState(false);
  const logoUrl = client.url.startsWith("/clients/") ? `${basePath}${client.url}` : client.url;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border shadow-sm"
    >
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-800 rounded p-0.5">
        {client.url && !imageError ? (
          <img
            src={logoUrl}
            alt={client.name}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        ) : (
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        )}
      </div>
      <span className="text-sm font-medium text-foreground">
        {client.name}
      </span>
    </motion.div>
  );
}

export default function ModernProjectCard({ project, onEdit, onPreview, index }: ModernProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusIsActive = String(project.status).toLowerCase() === "active";
  const statusIsClosed = String(project.status).toLowerCase() === "closed";
  // Get hero image or first available material (PDF/PowerPoint)
  const getFirstAvailableMaterial = () => {
    if (project.hero_image_url) return project.hero_image_url;
    
    // Check gallery images first
    if ((project as any).gallery_urls?.[0]) return (project as any).gallery_urls[0];
    
    // Check showcase PDF
    if ((project as any).showcase_pdf_url) return (project as any).showcase_pdf_url;
    
    return "";
  };
  
  const hero = getFirstAvailableMaterial();
  const isAbsolute = (u: string) => /^(\/|https?:|blob:|data:)/.test(u);
  const heroSrc = hero ? (isAbsolute(String(hero)) ? String(hero) : `/${hero}`) : "";
  const isPDF = heroSrc?.toLowerCase().endsWith('.pdf');

  const withBasePath = (u?: string) => {
    const s = String(u || "");
    if (!s) return s;
    if (/^(https?:|data:|blob:)/.test(s)) return s;
    if (s.startsWith("/clients/")) return `/admin${s}`;
    return s;
  };
  
  // Debug logging
  console.log('ModernProjectCard: Project:', project.project_name);
  console.log('ModernProjectCard: Hero material:', hero);
  console.log('ModernProjectCard: Hero src:', heroSrc);
  console.log('ModernProjectCard: Is PDF:', isPDF);

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_BASE_URL || "/admin";
  const basePath = baseUrl.replace(/^https?:\/\/[^/]+/i, "") || "";

  const partnerLogos = (project as any).partner_logos || [];

  // Parse client logos from partner_logos array or fallback to client_name
  const clientLogos = (() => {
    if (partnerLogos.length > 0) {
      return partnerLogos.map((p: any) => ({
        name: p.name || p.client_name || "",
        url: p.logo_url || p.url || KNOWN_CLIENTS[p.name || p.client_name || ""] || ""
      })).filter((c: any) => c.name);
    }
    // Fallback: parse comma-separated client names from client_name field
    const clientNameStr = (project.client_name || "").trim();
    if (!clientNameStr) return [];
    
    // Split by comma and create individual badges for each client
    const clientNames = clientNameStr.split(',').map(name => name.trim()).filter(Boolean);
    return clientNames.map(name => ({
      name,
      url: KNOWN_CLIENTS[name] || ""
    }));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPreview}
      className="group relative w-full rounded-2xl border border-border bg-card cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-blue-500/50"
    >
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold ${
            statusIsActive
              ? "bg-green-500 text-white"
              : statusIsClosed
              ? "bg-gray-500 text-white"
              : "bg-yellow-500 text-white"
          }`}
        >
          {statusIsActive ? "Open" : statusIsClosed ? "Closed" : "Draft"}
        </motion.span>
      </div>

      {/* Card Content */}
      <div className="px-4 pt-4 pb-3 flex flex-col sm:flex-row gap-4">
        {/* Hero Image - Rounded for cleaner UI design */}
        <motion.div
          className="relative w-full sm:w-64 h-48 sm:h-36 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/30"
          animate={{ scale: isHovered ? 1.02 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {heroSrc ? (
            isPDF ? (
              <PDFPreview 
                src={heroSrc} 
                className="w-full h-full object-contain" 
                alt="PDF Preview"
              />
            ) : (
              <img src={heroSrc} alt="" className="w-full h-full object-contain" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Image</span>
            </div>
          )}
        </motion.div>

        {/* Project Details */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          {/* Title with proper spacing for Open button */}
          <div className="pr-20">
            <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight line-clamp-2">
              {project.project_name || "Untitled Project"}
            </h3>
          </div>

          {/* Summary (minimal spacing from title) */}
          <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{project.summary}</p>

          {/* Location line moved below into widgets */}
          {false && (
            <div className="flex items-center gap-1.5 text-xs text-foreground/80">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span className="truncate">
                {(project as any).mode === 'hybrid' && project.location_text ? `Hybrid • ${project.location_text}` :
                 (project as any).mode === 'in_person' && project.location_text ? `In Person • ${project.location_text}` :
                 project.location_text || ((project as any).mode === 'remote' ? 'Remote' : '')}
              </span>
            </div>
          )}

          {/* All tags - Clients first, then metadata */}
          <div className="flex items-center gap-2 overflow-x-auto py-2 -my-2 pl-2 -ml-2">
            {/* Client tags - Same styling as metadata */}
            {clientLogos.length > 0 && clientLogos.map((client: any, idx: number) => (
              <motion.div
                key={`${client.name}-${idx}`}
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span className="truncate">{client.name}</span>
              </motion.div>
            ))}
            {(project.location_text || (project as any).mode) && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span className="truncate">
                  {(() => {
                    const mode = String((project as any).mode || '').toLowerCase();
                    const loc = String(project.location_text || '').trim();
                    if (mode === 'hybrid' && loc) return `Hybrid • ${loc}`;
                    if (mode === 'in_person' && loc) return `In Person • ${loc}`;
                    return loc || (mode === 'remote' ? 'Remote' : '');
                  })()}
                </span>
              </motion.div>
            )}
            {typeof (project as any).team_size === "number" && (project as any).team_size > 0 && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span>Team Size: {(project as any).team_size}</span>
              </motion.div>
            )}
            {(project.start_date && project.end_date) && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span>
                  {(() => {
                    try {
                      const getOrdinal = (day: number) => {
                        if (day > 3 && day < 21) return 'th';
                        switch (day % 10) {
                          case 1: return 'st';
                          case 2: return 'nd';
                          case 3: return 'rd';
                          default: return 'th';
                        }
                      };
                      
                      const formatDate = (dateStr: string) => {
                        // Ensure consistent date parsing by using UTC
                        const d = new Date(dateStr + 'T00:00:00.000Z');
                        if (isNaN(d.getTime())) {
                          // Fallback for invalid dates
                          return dateStr;
                        }
                        const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
                        const day = d.getUTCDate();
                        return `${month} ${day}${getOrdinal(day)}`;
                      };
                      
                      const startFormatted = formatDate(project.start_date);
                      const endFormatted = formatDate(project.end_date);
                      
                      return `${startFormatted} - ${endFormatted}`;
                    } catch (error) {
                      // Fallback to raw dates if formatting fails
                      return `${project.start_date} - ${project.end_date}`;
                    }
                  })()}
                </span>
              </motion.div>
            )}
          </div>

          {/* No leads on overview */}
        </div>
      </div>

      {/* Edit Button - Appears on Hover */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-4 left-4 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background/95 backdrop-blur-sm hover:bg-muted transition-colors shadow-lg"
        >
          Edit Project
        </button>
      </motion.div>
    </motion.div>
  );
}
