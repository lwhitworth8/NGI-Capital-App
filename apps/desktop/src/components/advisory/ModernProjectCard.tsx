"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { Calendar, Clock, Users, MapPin, Building2, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
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
      <div className="p-5 flex gap-5">
        {/* Hero Image - PowerPoint/PDF proportions */}
        <motion.div
          className="relative w-64 aspect-[16/9] rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/30"
          animate={{ scale: isHovered ? 1.02 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {heroSrc ? (
            isPDF ? (
              <PDFPreview 
                src={heroSrc} 
                className="w-full h-full object-cover" 
                alt="PDF Preview"
              />
            ) : (
              <img src={heroSrc} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Image</span>
            </div>
          )}
        </motion.div>

        {/* Project Details */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Title with proper spacing for Open button */}
          <div className="pr-20">
            <h3 className="text-xl font-bold text-foreground tracking-tight leading-tight line-clamp-2">
              {project.project_name || "Untitled Project"}
            </h3>
          </div>

          {/* Summary (one line under title, slightly larger) */}
          <p className="text-[15px] text-foreground/90 line-clamp-2 leading-relaxed">{project.summary}</p>

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

          {/* Clients - Single line layout */}
          {clientLogos.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              {clientLogos.map((client: any, idx: number) => (
                <div
                  key={`${client.name}-${idx}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 border border-border/50 backdrop-blur-sm flex-shrink-0"
                >
                  {client.url ? (
                    <>
                      <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center bg-white dark:bg-gray-800 rounded-sm p-0.5">
                        <img
                          src={withBasePath(client.url)}
                          alt={client.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{client.name}</span>
                    </>
                  ) : (
                    <span className="text-xs font-medium text-foreground">{client.name}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Metadata widgets - All blue, single line */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {(project.location_text || (project as any).mode) && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">
                  {(() => {
                    const mode = String((project as any).mode || '').toLowerCase();
                    const loc = String(project.location_text || '').trim();
                    if (mode === 'hybrid' && loc) return `Hybrid • ${loc}`;
                    if (mode === 'in_person' && loc) return `In Person • ${loc}`;
                    return loc || (mode === 'remote' ? 'Remote' : '');
                  })()}
                </span>
              </div>
            )}
            {typeof (project as any).team_size === "number" && (project as any).team_size > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Users className="w-3.5 h-3.5" />
                <span>Team {(project as any).team_size}</span>
              </div>
            )}
            {typeof (project as any).default_hourly_rate === 'number' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex-shrink-0">
                <DollarSign className="w-3.5 h-3.5" />
                <span>
                  {(() => {
                    const r = (project as any).default_hourly_rate as number;
                    const cur = String((project as any).pay_currency || 'USD').toUpperCase();
                    try { return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(r)}/hr`; } catch { return `${r}/hr`; }
                  })()}
                </span>
              </div>
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
