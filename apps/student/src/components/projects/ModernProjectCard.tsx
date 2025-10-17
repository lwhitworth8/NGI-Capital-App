"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { PDFPreview } from "./PDFPreview";

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
  "KKR": "https://logo.clearbit.com/kkr.com",
  "Apollo Global": "https://logo.clearbit.com/apollo.com",
  "Carlyle Group": "https://logo.clearbit.com/carlyle.com",
  "TPG Capital": "https://logo.clearbit.com/tpg.com",
  "Bain Capital": "https://logo.clearbit.com/bain.com",
};

interface ModernProjectCardProps {
  project: any;
  onPreview: () => void;
  index: number;
}

export default function ModernProjectCard({ project, onPreview, index }: ModernProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Record<number, boolean>>({});

  const statusIsActive = String(project.status).toLowerCase() === "active";
  const statusIsClosed = String(project.status).toLowerCase() === "closed";
  // Get hero image or first available material (PDF/PowerPoint)
  const getFirstAvailableMaterial = () => {
    if (project.hero_image_url) return project.hero_image_url;
    
    // Check gallery images first
    if (project.gallery_urls?.[0]) return project.gallery_urls[0];
    
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
    if (s.startsWith("/clients/")) return `/student${s}`;
    return s;
  };

  const partnerLogos = project.partner_logos || [];

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
    const clientNames = clientNameStr.split(',').map((name: string) => name.trim()).filter(Boolean);
    return clientNames.map((name: string) => ({
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
          {/* Title with proper spacing for status badge */}
          <div className="pr-20">
            <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-tight line-clamp-2">
              {project.project_name || "Untitled Project"}
            </h3>
          </div>

          {/* Summary (minimal spacing from title) */}
          <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">{project.summary}</p>

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
            {(project.location_text || project.mode) && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span className="truncate">
                  {(() => {
                    const mode = String(project.mode || '').toLowerCase();
                    const loc = String(project.location_text || '').trim();
                    if (mode === 'hybrid' && loc) return `Hybrid • ${loc}`;
                    if (mode === 'in_person' && loc) return `In Person • ${loc}`;
                    return loc || (mode === 'remote' ? 'Remote' : '');
                  })()}
                </span>
              </motion.div>
            )}
            {typeof project.team_size === "number" && project.team_size > 0 && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border text-xs text-foreground flex-shrink-0 cursor-pointer hover:bg-muted hover:border-border/80 hover:shadow-md"
              >
                <span>Team Size: {project.team_size}</span>
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

          {/* Project Leads (unchanged) */}
          {project._lead_names && project._lead_names.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Leads:</span> {project._lead_names.join(", ")}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
