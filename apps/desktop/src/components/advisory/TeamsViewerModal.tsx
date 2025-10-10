"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Users } from "lucide-react";

type TeamRole = { title: string; count: number; notes?: string; majors?: string[] };

export default function TeamsViewerModal({
  open,
  onClose,
  roles,
  total,
}: {
  open: boolean;
  onClose: () => void;
  roles: TeamRole[];
  total: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-[100] w-full max-w-3xl bg-card rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden"
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Project Teams</h3>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-black/60 text-white hover:bg-black/80">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh] no-scrollbar">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Team Size</div>
                <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-sm font-semibold">
                  {total}
                </div>
              </div>

              {roles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No team roles defined for this project.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roles.map((r, idx) => (
                    <motion.div
                      key={`${r.title}-${idx}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/30 border border-border shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate" title={r.title}>{r.title || 'Role'}</div>
                          {r.notes && (
                            <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap leading-snug">{r.notes}</div>
                          )}
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-white/60 dark:bg-white/10 text-xs font-semibold text-foreground border border-border">x{r.count || 0}</div>
                      </div>
                      {Array.isArray(r.majors) && r.majors.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.majors.map((m, i) => (
                            <span key={i} className="text-[10px] px-2 py-[2px] rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

