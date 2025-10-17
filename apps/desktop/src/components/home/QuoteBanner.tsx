"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";

type Quote = { id?: number|null; text: string; author?: string|null; source?: string|null };

function wrapWords(text: string): React.ReactNode[] {
  // Split on spaces but preserve punctuation; render each word in its own inline-block span
  const tokens = text.split(/(\s+)/);
  // Determine first and last non-space token indices
  let first = -1, last = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (!/^\s+$/.test(tokens[i]) && tokens[i] !== "") { first = i; break; }
  }
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (!/^\s+$/.test(tokens[i]) && tokens[i] !== "") { last = i; break; }
  }
  return tokens.map((part, idx) => {
    if (/^\s+$/.test(part) || part === "") return <span key={`ws-${idx}`}>{part}</span>;
    let display = part;
    if (idx === first) display = '"' + display; // opening quote
    if (idx === last) display = display + '"';  // closing quote
    return (
      <span key={`w-${idx}`} className="word inline-block align-baseline will-change-transform opacity-0">
        {display}
      </span>
    );
  });
}

export default function QuoteBanner({ connectedBelow = false }: { connectedBelow?: boolean }) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const rootRef = useRef<HTMLDivElement|null>(null);
  const textRef = useRef<HTMLQuoteElement|null>(null);
  const authorRef = useRef<HTMLDivElement|null>(null);
  const shimmerRef = useRef<HTMLDivElement|null>(null);

  const prefersReduced = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/quotes/random', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setQuote(data as Quote);
      } catch {
        if (!active) return;
        setQuote({
          text: "In the old legend the wise men finally boiled down the history of mortal affairs into the single phrase, \"This too will pass.\" Confronted with a like challenge to distill the secret of sound investment into three words, we venture the motto, MARGIN OF SAFETY.",
          author: "Benjamin Graham"
        });
      }
    })();
    return () => { active = false };
  }, []);

  // Helper: reveal text immediately (no animation)
  const revealStatic = () => {
    try {
      if (textRef.current) {
        const words = textRef.current.querySelectorAll('span.word');
        words.forEach((el) => { (el as HTMLElement).style.opacity = '1'; (el as HTMLElement).style.transform = 'none'; });
      }
      if (authorRef.current) { authorRef.current.style.opacity = '1'; authorRef.current.style.transform = 'none'; }
    } catch {}
  }

  useLayoutEffect(() => {
    if (prefersReduced) { revealStatic(); return; } // respect reduced motion but keep content visible
    let ctx: any;
    (async () => {
      try {
        const { gsap } = await import('gsap');
        if (!rootRef.current) return;
        ctx = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          // Container pop-in
          if (rootRef.current) tl.from(rootRef.current, { y: 8, autoAlpha: 0, duration: 0.25 });
          // Words: animate in sequence from their own positions
          if (textRef.current) {
            const words = textRef.current.querySelectorAll('span.word');
            const count = words.length || 1;
            // Slow, readable entrance: scale total duration with quote length
            // Target ~4.5s for ~80 words, clamped between 1.2s and 6s
            const targetTotal = Math.min(6.0, Math.max(1.2, (count / 80) * 4.5));
            const each = targetTotal / count;
            tl.fromTo(
              words,
              { y: 8, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.28, ease: 'power1.out', stagger: { each, from: 0 } },
              "<+0.02"
            );
          }
          // Author: appears after the last word
          if (authorRef.current) tl.to(authorRef.current, { y: 0, autoAlpha: 1, duration: 0.22 }, ">-0.02");
          // Shimmer once
          if (shimmerRef.current) {
            gsap.set(shimmerRef.current, { backgroundPositionX: '0%' });
            tl.to(shimmerRef.current, { backgroundPositionX: '100%', duration: 0.8, ease: 'power2.out' }, "<");
          }
        }, rootRef);
      } catch {
        // GSAP not available; reveal statically
        revealStatic();
      }
    })();
    return () => { if (ctx?.revert) ctx.revert(); };
  }, [quote?.text, prefersReduced]);

  const text = quote?.text || '';
  const author = quote?.author || '';

  const wrapped = useMemo(() => wrapWords(text), [text]);

  // Ensure author line renders with ASCII dash (avoid any stray non-ASCII glyphs)
  React.useEffect(() => {
    try {
      if (authorRef.current) {
        authorRef.current.textContent = `- ${author || 'Unknown'}`;
      }
    } catch {}
  }, [author]);

  return (
    <section aria-label="Daily Quote" className="">
      <div
        ref={rootRef}
        className={`relative overflow-hidden border border-border bg-gradient-to-r from-blue-100 via-blue-50 to-white dark:from-blue-900/30 dark:via-blue-900/10 dark:to-transparent p-3 md:p-4 min-h-[160px] md:min-h-[180px] ${connectedBelow ? 'rounded-t-2xl rounded-b-none border-b-0' : 'rounded-2xl'}`}
      >
        {/* Shimmer overlay */}
        <div ref={shimmerRef} className="pointer-events-none absolute inset-0" style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay'
        }} />
        <div className="relative mx-auto max-w-2xl">
          <blockquote ref={textRef} className="inline text-[15px] md:text-[17px] leading-7 font-semibold text-black dark:text-white">
            {wrapped}
          </blockquote>
          <div ref={authorRef} className="opacity-0 mt-2 text-xs md:text-sm text-black dark:text-white text-right pr-1 select-none">
            — {author || 'Unknown'}
          </div>
        </div>
      </div>
    </section>
  );
}
