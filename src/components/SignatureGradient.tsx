import React, { useEffect, useRef } from "react";

export const SignatureGradient: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let x = 50, y = 30;
    let cachedRect: DOMRect | null = null;
    let rectUpdateQueued = false;

    const updateRect = () => {
      if (el) {
        cachedRect = el.getBoundingClientRect();
        rectUpdateQueued = false;
      }
    };

    const queueRectUpdate = () => {
      if (!rectUpdateQueued) {
        rectUpdateQueued = true;
        requestAnimationFrame(updateRect);
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!cachedRect) {
        cachedRect = el.getBoundingClientRect();
      }
      
      const nx = ((e.clientX - cachedRect.left) / cachedRect.width) * 100;
      const ny = ((e.clientY - cachedRect.top) / cachedRect.height) * 100;
      x = nx; y = ny;
      if (!raf) raf = requestAnimationFrame(update);
    };

    const update = () => {
      el.style.setProperty("--gx", `${x}%`);
      el.style.setProperty("--gy", `${y}%`);
      raf = 0;
    };

    const onResize = () => {
      queueRectUpdate();
    };

    // Initial rect calculation
    updateRect();

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mql.matches) {
      el.addEventListener("mousemove", onMove);
      window.addEventListener("resize", onResize, { passive: true });
    }
    
    return () => {
      if (!mql.matches) {
        el.removeEventListener("mousemove", onMove);
        window.removeEventListener("resize", onResize);
      }
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="absolute inset-0 -z-10"
      style={{
        background:
          "radial-gradient(600px circle at var(--gx,50%) var(--gy,30%), hsl(var(--brand-1)/0.25), transparent 60%), radial-gradient(800px circle at 80% 20%, hsl(var(--brand-2)/0.2), transparent 60%)",
        filter: "blur(0px)",
      }}
    />
  );
};
