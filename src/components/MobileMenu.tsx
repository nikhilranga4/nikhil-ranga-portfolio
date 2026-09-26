import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Github, Linkedin, Mail, Moon, Phone, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { PaletteOrb } from "@/components/ui/palette-orb";
import { lenisRef } from "@/lib/lenis";
import { MOBILE_MENU_ID, NAV_ITEMS } from "@/lib/nav";
import { PALETTES } from "@/lib/palettes";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { href: "https://github.com/nikhilranga4", label: "GitHub", icon: Github },
  { href: "https://www.linkedin.com/in/nikhilranga21", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:nikhilranga43@gmail.com", label: "Email", icon: Mail },
  { href: "tel:+917989068826", label: "Phone", icon: Phone },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  active: string;
  /** Screen point the burst grows from (the toggle button's centre) */
  origin: { x: number; y: number };
}

/**
 * Full-screen playful menu for phones and tablets: a gradient circle bursts out of the menu
 * button, big bouncy links cascade in, and theme + social controls slide up at the bottom.
 * Rendered below the navbar so the morphing toggle stays on top as the close button.
 */
const MobileMenu = ({ open, onClose, active, origin }: MobileMenuProps) => {
  const { palette, setPalette, resolvedMode, setTheme } = useTheme();
  const firstLink = useRef<HTMLAnchorElement>(null);

  // Lock scrolling, wire Escape, flag <html> so the WebGL overlay can hide
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.classList.add("menu-open");
    lenisRef.current?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => firstLink.current?.focus({ preventScroll: true }), 450);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onResize = () => window.innerWidth >= 1024 && onClose();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      root.classList.remove("menu-open");
      lenisRef.current?.start();
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, onClose]);

  const at = `${origin.x}px ${origin.y}px`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id={MOBILE_MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          data-lenis-prevent
          initial={{ clipPath: `circle(0px at ${at})` }}
          animate={{ clipPath: `circle(150vmax at ${at})` }}
          exit={{ clipPath: `circle(0px at ${at})`, transition: { duration: 0.45, ease: [0.65, 0, 0.35, 1], delay: 0.1 } }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          className="fixed inset-0 z-40 overflow-y-auto overscroll-contain text-white lg:hidden"
        >
          {/* Backdrop: animated palette gradient, blobs, grid, grain */}
          <div aria-hidden className="bg-candy fixed inset-0 animate-gradient-x" />
          <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -left-20 top-10 h-72 w-72 animate-blob rounded-full bg-brand-3/50 blur-3xl" />
            <div
              className="absolute -right-24 top-1/3 h-80 w-80 animate-blob rounded-full bg-brand-4/40 blur-3xl"
              style={{ animationDelay: "-5s" }}
            />
            <div
              className="absolute -bottom-24 left-1/4 h-72 w-72 animate-blob rounded-full bg-brand-1/60 blur-3xl"
              style={{ animationDelay: "-10s" }}
            />
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:44px_44px]" />
            <div className="noise absolute inset-0 opacity-10 mix-blend-overlay" />
            {/* Tumbling decorations */}
            <div className="absolute right-6 top-[5.2rem] h-10 w-10 [perspective:500px]">
              <div className="relative h-full w-full animate-tumble preserve-3d [animation-duration:9s]">
                {["translateZ(20px)", "rotateY(90deg) translateZ(20px)", "rotateY(180deg) translateZ(20px)", "rotateY(-90deg) translateZ(20px)", "rotateX(90deg) translateZ(20px)", "rotateX(-90deg) translateZ(20px)"].map((t) => (
                  <div key={t} className="absolute inset-0 rounded-lg border border-white/60 bg-white/15" style={{ transform: t }} />
                ))}
              </div>
            </div>
            <div className="absolute -right-16 top-1/3 h-56 w-56 animate-spin-slow rounded-full border-[3px] border-dashed border-white/25" />
          </div>

          <div className="relative flex min-h-full flex-col px-6 pb-8 pt-24 sm:px-10">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-white/70"
            >
              // where to?
            </motion.p>

            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-1 [perspective:800px]">
                {NAV_ITEMS.map((item, i) => {
                  const isActive = active === item.id;
                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 60, rotateX: -70 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      exit={{ opacity: 0, y: -20, transition: { duration: 0.15, delay: (NAV_ITEMS.length - i) * 0.02 } }}
                      transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.25 + i * 0.06 }}
                      style={{ transformOrigin: "50% 100%" }}
                    >
                      <motion.a
                        ref={i === 0 ? firstLink : undefined}
                        href={`#${item.id}`}
                        onClick={onClose}
                        whileTap={{ scale: 0.95, rotate: -2 }}
                        className="group flex items-center gap-3 rounded-2xl px-2 py-2 outline-none focus-visible:bg-white/15 sm:gap-4"
                      >
                        <span className="w-6 shrink-0 font-mono text-xs text-white/60">0{i + 1}</span>
                        <span className="w-9 shrink-0 text-center text-[1.75rem] transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125 group-focus-visible:rotate-12">
                          {item.emoji}
                        </span>
                        <span
                          className={cn(
                            "relative min-w-0 font-display text-[clamp(2rem,10.5vw,2.75rem)] font-extrabold leading-none tracking-tight transition-transform duration-300 group-hover:translate-x-2 sm:text-6xl",
                            isActive ? "text-white" : "text-white/85"
                          )}
                        >
                          {item.label}
                          {isActive && (
                            <motion.span
                              initial={{ scale: 0, rotate: -40 }}
                              animate={{ scale: 1, rotate: -8 }}
                              transition={{ type: "spring", stiffness: 400, damping: 12, delay: 0.7 }}
                              className="absolute -right-3 -top-4 whitespace-nowrap rounded-full bg-white px-2 py-0.5 font-mono text-[0.6rem] font-bold tracking-normal text-brand-2 shadow-lg"
                            >
                              you&apos;re here ✦
                            </motion.span>
                          )}
                        </span>
                        {!isActive && (
                          <ArrowRight className="ml-auto h-6 w-6 shrink-0 -translate-x-3 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100" />
                        )}
                      </motion.a>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 160, damping: 20, delay: 0.7 }}
              className="mt-auto pt-10"
            >
              <div className="rounded-3xl border border-white/25 bg-white/10 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm font-bold">Pick a vibe</span>
                  <div className="flex rounded-full bg-black/20 p-1">
                    {(["light", "dark"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={(e) => setTheme(mode, { x: e.clientX, y: e.clientY })}
                        aria-label={`${mode} mode`}
                        aria-pressed={resolvedMode === mode}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                          resolvedMode === mode ? "bg-white text-brand-2" : "text-white/80"
                        )}
                      >
                        {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  {PALETTES.map((p) => (
                    <motion.button
                      key={p.id}
                      type="button"
                      aria-label={`${p.name} theme`}
                      aria-pressed={palette === p.id}
                      onClick={(e) => setPalette(p.id, { x: e.clientX, y: e.clientY })}
                      whileTap={{ scale: 0.85, rotate: -10 }}
                      className={cn(
                        "rounded-full p-[3px] transition-all",
                        palette === p.id ? "bg-white shadow-lg" : "bg-white/10"
                      )}
                    >
                      <PaletteOrb id={p.id} size="h-10 w-10" />
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-2.5">
                  {SOCIALS.map(({ href, label, icon: Icon }) => (
                    <motion.a
                      key={label}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      aria-label={label}
                      whileTap={{ scale: 0.85, y: 2 }}
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-white/10 shadow-[0_4px_0_0_rgba(255,255,255,0.9)] transition-transform active:translate-y-1 active:shadow-none"
                    >
                      <Icon className="h-5 w-5" />
                    </motion.a>
                  ))}
                </div>
                <span className="font-mono text-[0.65rem] text-white/70">© {new Date().getFullYear()} Nikhil Ranga</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
