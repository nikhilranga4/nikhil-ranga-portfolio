import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { ModeToggle } from "@/components/mode-toggle";
import ThemePicker from "@/components/ThemePicker";
import MobileMenu from "@/components/MobileMenu";
import { MenuToggle } from "@/components/ui/menu-toggle";
import { MOBILE_MENU_ID, NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { useIntro } from "@/lib/intro";

const Navbar = () => {
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Hidden while the intro plays; it slides in as the intro hands over to the hero
  const { progress } = useIntro();
  const [inIntro, setInIntro] = useState(() => progress.get() < 0.95);
  useMotionValueEvent(progress, "change", (p) => setInIntro(p < 0.95));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const toggleMenu = () => {
    const rect = toggleRef.current?.getBoundingClientRect();
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    setMenuOpen((o) => !o);
  };

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={inIntro ? { y: -80, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className={cn(
          "fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:px-4",
          inIntro && "pointer-events-none"
        )}
      >
        <nav
          className={cn(
            "glass flex w-full max-w-5xl items-center justify-between gap-2 rounded-full py-2 pl-2.5 pr-2 transition-all duration-500",
            scrolled && !menuOpen && "shadow-[0_12px_40px_-12px_hsl(var(--brand-2)/0.45)]",
            menuOpen && "!border-white/25 !bg-white/10"
          )}
        >
          <a href="#home" className="group flex items-center gap-2" aria-label="Back to top">
            <span className="bg-candy flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-extrabold text-on-grad shadow-glow-1 transition-transform duration-300 group-hover:rotate-[20deg] group-hover:scale-110">
              NR
            </span>
            <span className={cn("font-display text-lg font-bold transition-colors duration-500", menuOpen && "text-on-grad")}>
              nikhil<span className={menuOpen ? "text-on-grad/70" : "text-brand-1"}>.</span>dev
            </span>
          </a>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={cn(
                    "group/nav relative isolate block rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:px-4",
                    active === item.id ? "text-on-grad" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active === item.id && (
                    <motion.span
                      layoutId="nav-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      className="bg-candy absolute inset-0 -z-10 rounded-full shadow-glow-1"
                    />
                  )}
                  {/* Emoji pops up above the link on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 translate-y-2 scale-50 text-base opacity-0 transition-all duration-300 group-hover/nav:translate-y-0 group-hover/nav:scale-100 group-hover/nav:opacity-100"
                  >
                    {item.emoji}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            {/* On phones these live in the menu footer instead */}
            <div className="hidden items-center gap-2 sm:flex">
              <ThemePicker />
              <ModeToggle />
            </div>
            <MenuToggle
              ref={toggleRef}
              open={menuOpen}
              onToggle={toggleMenu}
              controls={MOBILE_MENU_ID}
              className="lg:hidden"
            />
          </div>
        </nav>
      </motion.header>

      <MobileMenu open={menuOpen} onClose={closeMenu} active={active} origin={origin} />
    </>
  );
};

export default Navbar;
