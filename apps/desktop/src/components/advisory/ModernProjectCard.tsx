"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { Calendar, Clock, Users, MapPin, Briefcase } from "lucide-react";

const KNOWN_CLIENTS: Record<string, string> = {
  "UC Investments": "/clients/uc-investments.svg",
  "BlackRock": "/clients/blackrock.svg",
  "Blackstone": "/clients/blackstone.svg",
  "Vail Resorts": "/clients/vail-logo.png",
  "Tesla": "/clients/tesla-logo.png",
};

interface ModernProjectCardProps {
  project: AdvisoryProject;
  onEdit: () => void;
  onPreview: () => void;
  index: number;
}

export default function ModernProjectCard({ project, onEdit, onPreview, index }: ModernProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusIsActive = String(project.status).toLowerCase() === "active";
  const statusIsClosed = String(project.status).toLowerCase() === "closed";
  const hero = project.hero_image_url || ((project as any).gallery_urls?.[0]) || "";
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

  const autoClientLogo = (() => {
    const name = (project.client_name || "").trim();
    if (!name) return null;
    const url = KNOWN_CLIENTS[name];
    return url ? { name, url } : null;
  })();

  const partnerLogos = (project as any).partner_logos || [];
  const backerLogos = (project as any).backer_logos || [];

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
      {/* Card Content */}
      <div className="p-5 flex gap-5">
        {/* Smaller Hero Image - Top Left */}
        <motion.div
          className="relative w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20"
          animate={{ scale: isHovered ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {heroSrc ? (
            <img src={heroSrc} alt={project.project_name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
          {/* Status Badge Overlay */}
          <div className="absolute top-2 right-2">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold backdrop-blur-sm ${
                statusIsActive
                  ? "bg-green-500/90 text-white"
                  : statusIsClosed
                  ? "bg-gray-500/90 text-white"
                  : "bg-yellow-500/90 text-white"
              }`}
            >
              {statusIsActive ? "Active" : statusIsClosed ? "Closed" : "Draft"}
            </motion.span>
          </div>
        </motion.div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Title & Client */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-foreground group-hover:text-blue-600 transition-colors line-clamp-1">
                {project.project_name}
              </h3>
            </div>

            {/* Client with Logo */}
            <div className="mt-2 flex items-center gap-2">
              {(autoClientLogo || partnerLogos[0]) && (
                <img
                  src={withBasePath((autoClientLogo?.url || (partnerLogos[0] as any)?.url) as string)}
                  alt={project.client_name || "Client"}
                  className="h-6 w-6 object-contain rounded"
                />
              )}
              <span className="text-sm font-medium text-muted-foreground">{project.client_name}</span>
            </div>
          </div>

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
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>{project.commitment_hours_per_week}h/wk</span>
              </div>
            )}
            {typeof (project as any).team_size === "number" && (project as any).team_size > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <Users className="w-3.5 h-3.5 text-green-600" />
                <span>Team {(project as any).team_size}</span>
              </div>
            )}
            {project.location_text && (
              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <span className="truncate">{project.location_text}</span>
              </div>
            )}
          </div>

          {/* Partners/Backers Logos */}
          {([...partnerLogos, ...backerLogos].length > 0) && (
            <div className="flex items-center gap-3">
              {[autoClientLogo, ...partnerLogos, ...backerLogos]
                .filter(Boolean)
                .slice(0, 4)
                .map((logo: any, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border"
                  >
                    <img src={withBasePath(logo.url)} alt={logo.name} className="h-4 w-4 object-contain" />
                    <span className="text-[10px] text-muted-foreground hidden sm:inline">{logo.name}</span>
                  </motion.div>
                ))}
            </div>
          )}

          {/* Project Leads */}
          {(project as any)._lead_names && (project as any)._lead_names.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Leads:</span> {(project as any)._lead_names.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Appear on Hover */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Deactivate logic here
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            Deactivate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="ml-auto px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Full View
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

