/**
 * Fixed decorative backdrop: drifting aurora blobs, a perspective grid floor and film grain.
 * Pure CSS so it costs almost nothing and never competes with the hero's WebGL context.
 */
const Background = () => {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      {/* Aurora blobs */}
      <div className="absolute -left-[10%] -top-[15%] h-[55vmax] w-[55vmax] animate-blob rounded-full bg-brand-1/25 blur-[110px] dark:bg-brand-1/20" />
      <div
        className="absolute -right-[15%] top-[20%] h-[50vmax] w-[50vmax] animate-blob rounded-full bg-brand-2/25 blur-[120px] dark:bg-brand-2/25"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-[20%] left-[20%] h-[45vmax] w-[45vmax] animate-blob rounded-full bg-brand-3/20 blur-[120px] dark:bg-brand-3/15"
        style={{ animationDelay: "-12s" }}
      />

      {/* Perspective grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[60vh] [perspective:600px]">
        <div
          className="grid-bg absolute inset-x-[-50%] bottom-0 h-[200%] origin-bottom [transform:rotateX(62deg)]"
          style={{
            maskImage: "linear-gradient(to top, black 10%, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 70%)",
          }}
        />
      </div>

      {/* Film grain */}
      <div className="noise absolute inset-0 opacity-[0.06] mix-blend-overlay dark:opacity-[0.08]" />
    </div>
  );
};

export default Background;
