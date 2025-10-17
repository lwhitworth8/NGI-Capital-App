"use client";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";

export function MVV() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    let ctx: any;
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (!rootRef.current) return;
        ctx = gsap.context(() => {
          const leftBlocks = rootRef.current!.querySelectorAll(".mvv-left");
          const rightBlocks = rootRef.current!.querySelectorAll(".mvv-right");
          gsap.set([leftBlocks, rightBlocks], { autoAlpha: 0 });
          gsap.fromTo(leftBlocks, { x: -16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.15 });
          gsap.fromTo(rightBlocks, { x: 16, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.15, delay: 0.15 });
        }, rootRef);
      } catch {
        // No gsap: render without animation
      }
    })();
    return () => {
      if (ctx?.revert) ctx.revert();
    };
  }, []);

  return (
    <Card ref={rootRef} className="p-0 rounded-t-none border-t-0 -mt-px">
      <div className="relative">
        {/* Center connection rail */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-3 bottom-3 -translate-x-1/2 w-px bg-border" />

        <div className="p-4 md:p-5 space-y-4">
          {/* Mission - Left */}
          <div className="flex justify-start">
            <div className="mvv-left relative max-w-[88%] rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Mission</div>
              <div className="mt-1 text-sm md:text-base font-semibold text-foreground">
                Democratize opportunities and positive impacts for future leaders of the world.
              </div>
              {/* connector to center */}
              <div aria-hidden className="absolute top-1/2 -right-3 h-0.5 w-3 bg-border" />
              <div aria-hidden className="absolute top-1/2 -right-[9px] h-2 w-2 rounded-full bg-border" />
            </div>
          </div>

          {/* Vision - Right */}
          <div className="flex justify-end">
            <div className="mvv-right relative max-w-[88%] rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground text-right">Vision</div>
              <div className="mt-1 text-sm md:text-base font-semibold text-foreground text-right">
                Cultivate an environment with an emphasis on continuous learning and provide a culture of passion for our stakeholders to do what they love as catalysts of change.
              </div>
              {/* connector to center */}
              <div aria-hidden className="absolute top-1/2 -left-3 h-0.5 w-3 bg-border" />
              <div aria-hidden className="absolute top-1/2 -left-[9px] h-2 w-2 rounded-full bg-border" />
            </div>
          </div>

          {/* Values - Left */}
          <div className="flex justify-start">
            <div className="mvv-left relative max-w-[88%] rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Values</div>
              <div className="mt-1 text-sm md:text-base font-semibold text-foreground">
                People are the core of our business; we value supporting people in accomplishing their dreams and goals.
              </div>
              {/* connector to center */}
              <div aria-hidden className="absolute top-1/2 -right-3 h-0.5 w-3 bg-border" />
              <div aria-hidden className="absolute top-1/2 -right-[9px] h-2 w-2 rounded-full bg-border" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}


