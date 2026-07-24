import { cn } from "@/lib/utils";

/**
 * Layered ambient background — soft radial glows that slowly breathe behind the
 * content, plus a whisper of film grain so the gradients read as material
 * rather than banded digital fills.
 *
 * Pure CSS: no runtime, no images, no network. The three glows animate only
 * transform/opacity (GPU-composited, 60fps, zero layout cost) and are frozen
 * for anyone with prefers-reduced-motion by the global rule in globals.css.
 *
 * Sits at -z-10 so it paints above the page's base colour but beneath all
 * content. The wrapper it lives under must therefore not paint an opaque
 * background over it — landing uses a transparent shell for exactly this.
 *
 * Not a client component: it holds no state and no hooks, so it stays out of
 * the JS bundle entirely.
 */
export function AmbientBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className
      )}
    >
      {/* Base wash, so the glows sit on brand ground rather than raw canvas. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, color-mix(in oklch, var(--aurora-1), transparent 82%), transparent 60%)",
        }}
      />

      {/* Three drifting glows. blur-3xl fuses them into soft light. */}
      <div
        className="animate-aurora-a absolute -top-[20vmax] -left-[10vmax] h-[60vmax] w-[60vmax] rounded-full blur-3xl will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--aurora-1), transparent 65%)",
        }}
      />
      <div
        className="animate-aurora-b absolute -top-[10vmax] -right-[15vmax] h-[55vmax] w-[55vmax] rounded-full blur-3xl will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--aurora-2), transparent 65%)",
        }}
      />
      <div
        className="animate-aurora-c absolute -bottom-[25vmax] left-[15vmax] h-[55vmax] w-[55vmax] rounded-full blur-3xl will-change-transform"
        style={{
          background: "radial-gradient(circle, var(--aurora-3), transparent 65%)",
        }}
      />

      {/* Film grain, held very faint. */}
      <div className="bg-noise absolute inset-0 opacity-[0.035] mix-blend-overlay dark:opacity-[0.05]" />
    </div>
  );
}
