"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { X, Calendar, Clock, Users, MapPin, FileText, Download } from "lucide-react";
import { useEffect } from "react";

interface ProjectDetailModalProps {
  project: AdvisoryProject | null;
  onClose: () => void;
}

const KNOWN_CLIENTS: Record<string, string> = {
  "Vail Resorts": "/clients/vail-logo.png",
  "Tesla": "/clients/tesla-logo.png",
  "UC Berkeley": "/clients/ucb-logo.png",
};

export default function ProjectDetailModal({ project, onClose }: ProjectDetailModalProps) {
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: "spring", duration: 0.6, bounce: 0.25 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1">
            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-full aspect-[21/9] bg-gradient-to-br from-blue-600 to-purple-600"
            >
              {heroSrc ? (
                <img
                  src={heroSrc}
                  alt={project.project_name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="absolute top-6 left-6"
              >
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm ${
                    statusIsActive
                      ? "bg-green-500/90 text-white"
                      : statusIsClosed
                      ? "bg-gray-500/90 text-white"
                      : "bg-yellow-500/90 text-white"
                  }`}
                >
                  {statusIsActive ? "Active" : statusIsClosed ? "Closed" : "Draft"}
                </span>
              </motion.div>
            </motion.div>

            {/* Content */}
            <div className="p-8 space-y-8">
              {/* Title & Client */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h1 className="text-4xl font-bold text-foreground tracking-tight">
                  {project.project_name}
                </h1>
                
                <div className="flex items-center gap-3">
                  {(autoClientLogo || partnerLogos[0]) && (
                    <img
                      src={withBasePath((autoClientLogo?.url || (partnerLogos[0] as any)?.url) as string)}
                      alt={project.client_name || "Client"}
                      className="h-8 w-8 object-contain"
                    />
                  )}
                  <span className="text-xl text-muted-foreground font-medium">
                    {project.client_name}
                  </span>
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

              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
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
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{project.commitment_hours_per_week}</div>
                      <div className="text-xs text-muted-foreground">Hrs/Week</div>
                    </div>
                  </div>
                )}

                {typeof (project as any).team_size === "number" && (project as any).team_size > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{(project as any).team_size}</div>
                      <div className="text-xs text-muted-foreground">Team Size</div>
                    </div>
                  </div>
                )}

                {project.location_text && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground truncate">{project.location_text}</div>
                      <div className="text-xs text-muted-foreground">Location</div>
                    </div>
                  </div>
                )}
              </motion.div>

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

              {/* Showcase PDF (for closed projects) */}
              {statusIsClosed && project.showcase_pdf_url && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Project Showcase
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        View the final deliverable and learn from this completed project
                      </p>
                    </div>
                    <a
                      href={project.showcase_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </motion.div>
              )}

              {/* Partners & Backers */}
              {([...partnerLogos, ...backerLogos].length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  <h3 className="text-lg font-semibold text-foreground">Partners & Sponsors</h3>
                  <div className="flex flex-wrap items-center gap-6">
                    {[autoClientLogo, ...partnerLogos, ...backerLogos]
                      .filter(Boolean)
                      .map((logo: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <img
                            src={withBasePath(logo.url)}
                            alt={logo.name}
                            className="h-8 w-8 object-contain"
                          />
                          <span className="text-sm font-medium text-foreground">{logo.name}</span>
                        </div>
                      ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

