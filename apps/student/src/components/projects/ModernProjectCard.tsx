"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div
      className="w-full rounded-xl border border-border bg-card cursor-pointer hover:bg-accent/20 transition-colors"
      onClick={onPreview}
    >
      <div className="flex items-center p-4 gap-4">
        <div className="relative w-40 md:w-48 aspect-[16/9] bg-black rounded-md overflow-hidden flex-shrink-0">
          {heroSrc ? (
            isPDF ? (
              <PDFPreview 
                src={heroSrc} 
                className="absolute inset-0 w-full h-full object-cover" 
                alt="PDF Preview"
              />
            ) : (
              <img src={heroSrc} alt="hero" className="absolute inset-0 w-full h-full object-cover" />
            )
          ) : (
            <div className="absolute inset-0 w-full h-full bg-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {/* Title + Status */}
          <div className="flex items-start gap-2">
            <div className="text-base md:text-lg font-semibold truncate">{project.project_name}</div>
            <span className={`text-xxs ml-auto ${statusIsActive ? 'text-green-600' : 'text-muted-foreground'}`}>
              {statusIsActive ? 'Active' : statusIsClosed ? 'Closed' : (String(project.status || '').charAt(0).toUpperCase() + String(project.status || '').slice(1))}
            </span>
          </div>
          
          {/* Client Logos - Multiple logos in a row */}
          {clientLogos.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {clientLogos.map((client: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  transition={{ delay: 0.1 * idx, type: "spring", stiffness: 400, damping: 25 }}
                  className="inline-flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background/80 border-2 border-border/60 backdrop-blur-sm flex-shrink-0 cursor-pointer hover:bg-background hover:border-border hover:shadow-lg"
                >
                  {client.url && !logoErrors[idx] ? (
                    <>
                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-900 rounded-md p-1 shadow-sm">
                        <img
                          src={withBasePath(client.url)}
                          alt={client.name}
                          className="w-full h-full object-contain"
                          onError={() => setLogoErrors(prev => ({ ...prev, [idx]: true }))}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{client.name}</span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-foreground">{client.name}</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Summary */}
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.summary}</div>
          
          {/* Blue Metadata Tags */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {(project.location_text || project.mode) && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 border-2 border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0 cursor-pointer hover:bg-blue-500/15 hover:border-blue-500/40 hover:shadow-md"
              >
                <span className="truncate">
                  {(() => {
                    const mode = String(project.mode || '').toLowerCase();
                    const loc = String(project.location_text || '').trim();
                    if (mode === 'hybrid' && loc) return `Hybrid - ${loc}`;
                    if (mode === 'in_person' && loc) return `In Person - ${loc}`;
                    return loc || (mode === 'remote' ? 'Remote' : '');
                  })()}
                </span>
              </motion.div>
            )}
            {(project.start_date && project.end_date) && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 border-2 border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0 cursor-pointer hover:bg-blue-500/15 hover:border-blue-500/40 hover:shadow-md"
              >
                <span className="truncate">
                  {(() => {
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
                      const d = new Date(dateStr);
                      const month = d.toLocaleDateString('en-US', { month: 'short' });
                      const day = d.getDate();
                      return `${month} ${day}${getOrdinal(day)}`;
                    };
                    return `${formatDate(project.start_date)} - ${formatDate(project.end_date)}`;
                  })()}
                </span>
              </motion.div>
            )}
            {typeof project.team_size === "number" && project.team_size > 0 && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 border-2 border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0 cursor-pointer hover:bg-blue-500/15 hover:border-blue-500/40 hover:shadow-md"
              >
                <span>{project.team_size} {project.team_size === 1 ? 'Open Position' : 'Open Positions'}</span>
              </motion.div>
            )}
            {typeof (project as any).default_hourly_rate === 'number' && (
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-500/10 border-2 border-blue-500/20 text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0 cursor-pointer hover:bg-blue-500/15 hover:border-blue-500/40 hover:shadow-md"
              >
                <span>
                  {(() => {
                    const r = (project as any).default_hourly_rate as number;
                    const cur = String((project as any).pay_currency || 'USD').toUpperCase();
                    try { return `${new Intl.NumberFormat(undefined, { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(r)}/hr`; } catch { return `$${r}/hr`; }
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
    </div>
  );
}
