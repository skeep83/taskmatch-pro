import React, { useEffect, useRef } from "react";

export const SignatureGradient: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let x = 50, y = 30;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 100;
      const ny = ((e.clientY - rect.top) / rect.height) * 100;
      x = nx; y = ny;
      if (!raf) raf = requestAnimationFrame(update);
    };

    const update = () => {
      el.style.setProperty("--gx", `${x}%`);
      el.style.setProperty("--gy", `${y}%`);
      raf = 0;
    };

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mql.matches) el.addEventListener("mousemove", onMove);
    return () => {
      if (!mql.matches) el.removeEventListener("mousemove", onMove);
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
