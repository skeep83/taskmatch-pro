/**
 * Site-wide, barely-visible moving haze. Rendered as a fixed layer with
 * negative z-index, so it always paints BEHIND content blocks (neo-card,
 * panels, tables have opaque backgrounds) and never affects readability.
 * Decorative only: aria-hidden, pointer-events: none, honors
 * prefers-reduced-motion via .ambient-blob rules.
 */
export const GlobalHaze = () => (
  <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
    <div
      className="ambient-blob"
      style={{ width: 560, height: 560, top: "-12%", right: "-10%", background: "hsl(var(--brand-1))", opacity: 0.09, animationDuration: "36s" }}
    />
    <div
      className="ambient-blob"
      style={{ width: 480, height: 480, bottom: "-10%", left: "-8%", background: "hsl(var(--brand-2))", opacity: 0.08, animationDelay: "-12s", animationDuration: "44s" }}
    />
    <div
      className="ambient-blob"
      style={{ width: 380, height: 380, top: "40%", left: "38%", background: "hsl(var(--brand-3))", opacity: 0.06, animationDelay: "-24s", animationDuration: "52s" }}
    />
  </div>
);
