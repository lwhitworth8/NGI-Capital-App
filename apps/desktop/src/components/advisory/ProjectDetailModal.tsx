"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AdvisoryProject } from "@/types";
import { X, Calendar, Clock, Users, MapPin, FileText, Download, Eye, Send, Briefcase } from "lucide-react";
import { ShowcaseViewer } from "./ShowcaseViewer";
import { CoffeeChatsPanel } from "./CoffeeChatsPanel";
import { ApplicationsPanel } from "./ApplicationsPanel";

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
  const [showShowcase, setShowShowcase] = useState(false);
  const [showCoffeePanel, setShowCoffeePanel] = useState(false);
  const [showAppsPanel, setShowAppsPanel] = useState(false);
  const [projectLeads, setProjectLeads] = useState<string[]>([]);

  // Fetch project leads
  useEffect(() => {
    if (project?.id) {
      fetch(`/api/advisory/projects/${project.id}/leads`, {
        headers: {
          "Authorization": "Bearer " + (localStorage.getItem("adminToken") || ""),
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.leads && Array.isArray(data.leads)) {
            setProjectLeads(data.leads);
          }
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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Full Backdrop Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          className="relative bg-card border border-border rounded-2xl shadow-2xl max-w-5xl w-full max-h-[88vh] overflow-hidden flex flex-col mx-4"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1">
            {/* Hero Image - Full aspect ratio without cropping */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-full aspect-[21/9] bg-gradient-to-br from-blue-600 to-blue-800"
            >
              {heroSrc ? (
                <img
                  src={heroSrc}
                  alt={project.project_name}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
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
                      ? "bg-green-500 text-white"
                      : statusIsClosed
                      ? "bg-gray-500 text-white"
                      : "bg-yellow-500 text-white"
                  }`}
                >
                  {statusIsActive ? "Open" : statusIsClosed ? "Closed" : "Draft"}
                </span>
              </motion.div>
            </motion.div>

              {/* Content */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Main Content */}
                  <div className="lg:col-span-2 space-y-6">
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
                                  src={withBasePath(client.logo)}
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

                {typeof (project as any).team_size === "number" && (project as any).team_size > 0 && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{(project as any).team_size}</div>
                      <div className="text-xs text-muted-foreground">Team Size</div>
                    </div>
                  </div>
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
                        <div className="flex flex-wrap gap-2">
                          {projectLeads.map((email, idx) => (
                            <span key={idx} className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
                              {email}
                            </span>
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

      {/* Showcase Viewer Modal */}
      {project.showcase_pdf_url && (
        <ShowcaseViewer
          isOpen={showShowcase}
          onClose={() => setShowShowcase(false)}
          fileUrl={project.showcase_pdf_url}
          fileName={`${project.project_name} - Showcase`}
        />
      )}
    </AnimatePresence>
  );
}


