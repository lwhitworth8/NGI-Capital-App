"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Users, MapPin } from "lucide-react";

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

interface ModernProjectCardProps {
  project: any;
  onPreview: () => void;
  index: number;
}

export default function ModernProjectCard({ project, onPreview, index }: ModernProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusIsActive = String(project.status).toLowerCase() === "active";
  const statusIsClosed = String(project.status).toLowerCase() === "closed";
  const hero = project.hero_image_url || project.gallery_urls?.[0] || "";
  const isAbsolute = (u: string) => /^(\/|https?:|blob:|data:)/.test(u);
  const heroSrc = hero ? (isAbsolute(String(hero)) ? String(hero) : `/${hero}`) : "";

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
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
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
        {/* Hero Image - Proper 16:9 Aspect Ratio */}
        <motion.div
          className="relative w-72 aspect-video rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-950/30"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {heroSrc ? (
            <img src={heroSrc} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground text-xs">No Image</span>
            </div>
          )}
        </motion.div>

        {/* Project Details */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Title */}
          <div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {project.project_name || "Untitled Project"}
            </h3>
          </div>

          {/* Clients - Each as a separate rectangle with logo - Theme Compatible */}
          {clientLogos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {clientLogos.map((client: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * idx }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border shadow-sm"
                >
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white dark:bg-gray-800 rounded p-0.5">
                    {client.url ? (
                      <img
                        src={withBasePath(client.url)}
                        alt={client.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{client.name}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{project.summary}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {project.duration_weeks && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{project.duration_weeks}w</span>
              </div>
            )}
            {project.commitment_hours_per_week && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{project.commitment_hours_per_week}h/wk</span>
              </div>
            )}
            {typeof project.team_size === "number" && project.team_size > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Team {project.team_size}</span>
              </div>
            )}
            {project.location_text && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span className="truncate">{project.location_text}</span>
              </div>
            )}
          </div>

          {/* Project Leads */}
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
