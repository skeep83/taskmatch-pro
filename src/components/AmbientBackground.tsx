/**
 * Barely-visible ambient decoration: drifting gradient haze and thin
 * gradient lines. Purely decorative (aria-hidden, pointer-events: none),
 * disabled automatically for prefers-reduced-motion users.
 */
export const AmbientBackground = () => (
  <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
    {/* Haze blobs */}
    <div
      className="ambient-blob"
      style={{ width: 520, height: 520, top: "-8%", left: "-6%", background: "hsl(var(--brand-1))", animationDelay: "0s" }}
    />
    <div
      className="ambient-blob"
      style={{ width: 460, height: 460, top: "34%", right: "-8%", background: "hsl(var(--brand-2))", animationDelay: "-9s", animationDuration: "34s" }}
    />
    <div
      className="ambient-blob"
      style={{ width: 420, height: 420, bottom: "4%", left: "22%", background: "hsl(var(--brand-3))", opacity: 0.1, animationDelay: "-18s", animationDuration: "40s" }}
    />

    {/* Thin gradient lines */}
    <div className="ambient-line" style={{ top: "18%", left: "8%", width: "44%", animationDelay: "0s" }} />
    <div className="ambient-line" style={{ top: "47%", right: "6%", width: "38%", animationDelay: "-7s", animationDuration: "28s" }} />
    <div className="ambient-line" style={{ top: "72%", left: "18%", width: "30%", animationDelay: "-13s", animationDuration: "25s" }} />
    <div style={{ position: "absolute", top: "30%", left: "55%", width: "26%", transform: "rotate(-14deg)" }}>
      <div className="ambient-line" style={{ position: "relative", width: "100%", animationDelay: "-4s", animationDuration: "31s" }} />
    </div>
  </div>
);
