import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Github, Linkedin, Mail, Moon, Phone, Sun } from "lucide-react";
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

const EASE = [0.65, 0, 0.35, 1] as const;

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  active: string;
  /** Screen point the burst grows from (the toggle button's centre) */
  origin: { x: number; y: number };
}

const SectionLabel = ({ children }: { children: string }) => (
  <p className="mb-3 font-mono text-[0.68rem] font-medium uppercase tracking-[0.25em] text-on-grad/65">{children}</p>
);

/**
 * Full-screen menu for phones and tablets: a gradient circle bursts out of the menu button,
 * then a clean list of sections slides in, with appearance and contact controls below.
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
  const paletteName = PALETTES.find((p) => p.id === palette)?.name;

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
          exit={{ clipPath: `circle(0px at ${at})`, transition: { duration: 0.45, ease: EASE, delay: 0.1 } }}
          transition={{ duration: 0.7, ease: EASE }}
          className="fixed inset-0 z-40 overflow-y-auto overscroll-contain text-on-grad lg:hidden"
        >
          {/* Backdrop: animated palette gradient with soft light and grain */}
          <div aria-hidden className="bg-candy fixed inset-0 animate-gradient-x" />
          <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute -left-24 top-16 h-72 w-72 animate-blob rounded-full bg-white/20 blur-3xl" />
            <div
              className="absolute -right-24 bottom-24 h-80 w-80 animate-blob rounded-full bg-brand-3/40 blur-3xl"
              style={{ animationDelay: "-8s" }}
            />
            <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="noise absolute inset-0 opacity-10 mix-blend-overlay" />
          </div>

          <div className="relative mx-auto flex min-h-full max-w-xl flex-col px-5 pb-8 pt-24 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="mb-5 px-1"
            >
              <SectionLabel>Navigation</SectionLabel>
              <p className="font-display text-2xl font-semibold leading-tight">Where would you like to go?</p>
            </motion.div>

            <nav aria-label="Mobile">
              <ul className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-1.5 backdrop-blur-md">
                {NAV_ITEMS.map((navItem, i) => {
                  const isActive = active === navItem.id;
                  const Icon = navItem.icon;
                  return (
                    <motion.li
                      key={navItem.id}
                      initial={{ opacity: 0, x: -24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
                      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.3 + i * 0.05 }}
                    >
                      <motion.a
                        ref={i === 0 ? firstLink : undefined}
                        href={`#${navItem.id}`}
                        onClick={onClose}
                        aria-current={isActive ? "location" : undefined}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "group flex items-center gap-3.5 rounded-2xl px-3 py-3 outline-none transition-colors",
                          isActive
                            ? "bg-white text-slate-900 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)]"
                            : "hover:bg-white/10 focus-visible:bg-white/15"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                            isActive ? "bg-candy text-on-grad shadow-glow-1" : "bg-white/15 ring-1 ring-white/20"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-display text-lg font-semibold leading-tight">{navItem.label}</span>
                            {isActive && (
                              <span className="rounded-full bg-brand-1/15 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-brand-1">
                                Current
                              </span>
                            )}
                          </span>
                          <span className={cn("block truncate text-sm", isActive ? "text-slate-500" : "text-on-grad/70")}>
                            {navItem.hint}
                          </span>
                        </span>
                        <span className={cn("font-mono text-[0.7rem]", isActive ? "text-slate-400" : "text-on-grad/50")}>
                          0{i + 1}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-0.5",
                            isActive ? "text-brand-1" : "text-on-grad/60"
                          )}
                        />
                      </motion.a>
                    </motion.li>
                  );
                })}
              </ul>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.65 }}
              className="mt-6 grid gap-4"
            >
              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                <div className="mb-3 flex items-center justify-between">
                  <SectionLabel>Appearance</SectionLabel>
                  <span className="-mt-3 text-xs font-medium text-on-grad/80">{paletteName}</span>
                </div>
                <div className="mb-4 flex justify-around">
                  {PALETTES.map((p) => (
                    <motion.button
                      key={p.id}
                      type="button"
                      aria-label={`${p.name} theme`}
                      aria-pressed={palette === p.id}
                      onClick={(e) => setPalette(p.id, { x: e.clientX, y: e.clientY })}
                      whileTap={{ scale: 0.88 }}
                      className={cn(
                        "rounded-full p-[3px] ring-offset-0 transition-all",
                        palette === p.id ? "bg-white shadow-lg" : "bg-white/10 hover:bg-white/25"
                      )}
                    >
                      <PaletteOrb id={p.id} size="h-9 w-9" />
                    </motion.button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-full bg-black/20 p-1">
                  {(["light", "dark"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={(e) => setTheme(mode, { x: e.clientX, y: e.clientY })}
                      aria-pressed={resolvedMode === mode}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold capitalize transition-colors",
                        resolvedMode === mode ? "bg-white text-brand-2 shadow" : "text-on-grad/80 hover:text-on-grad"
                      )}
                    >
                      {mode === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
                <SectionLabel>Connect</SectionLabel>
                <div className="grid grid-cols-4 gap-2">
                  {SOCIALS.map(({ href, label, icon: Icon }) => (
                    <motion.a
                      key={label}
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.92 }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 py-3 text-xs font-medium ring-1 ring-white/15 transition-colors hover:bg-white/20"
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </motion.a>
                  ))}
                </div>
              </div>

              <p className="text-center text-xs text-on-grad/60">© {new Date().getFullYear()} Nikhil Ranga · Built with React &amp; Three.js</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
