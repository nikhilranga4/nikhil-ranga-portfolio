import { cn } from "@/lib/utils";

/** A glossy sphere rendered in a palette's own colours (via a scoped data-palette attribute). */
export function PaletteOrb({ id, size = "h-11 w-11" }: { id: string; size?: string }) {
  return (
    <span
      data-palette={id}
      className={cn("relative block rounded-full shadow-[0_8px_20px_-6px_hsl(var(--brand-1)/0.7)]", size)}
      style={{
        background:
          "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.85) 0 8%, transparent 22%), conic-gradient(from 200deg, hsl(var(--brand-1)), hsl(var(--brand-2)), hsl(var(--brand-3)), hsl(var(--brand-1)))",
      }}
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 70% 80%, rgba(0,0,0,0.35), transparent 60%)" }}
      />
    </span>
  );
}

export default PaletteOrb;
