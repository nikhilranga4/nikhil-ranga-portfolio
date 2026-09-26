import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "github", label: "GitHub" },
];

const Navbar = () => {
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.2 }}
      className="fixed inset-x-0 top-3 z-50 flex justify-center px-4"
    >
      <nav
        className={cn(
          "glass flex w-full max-w-5xl items-center justify-between gap-2 rounded-full py-2 pl-3 pr-2 transition-shadow duration-300",
          scrolled && "shadow-[0_12px_40px_-12px_hsl(var(--neon-violet)/0.45)]"
        )}
      >
        <a href="#home" className="group flex items-center gap-2" aria-label="Back to top">
          <span className="bg-candy flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-extrabold text-white shadow-glow-pink transition-transform duration-300 group-hover:rotate-[20deg] group-hover:scale-110">
            NR
          </span>
          <span className="hidden font-display text-lg font-bold sm:inline">
            nikhil<span className="text-neon-pink">.</span>dev
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={cn(
                  "relative isolate block rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active === item.id ? "text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active === item.id && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="bg-candy absolute inset-0 -z-10 rounded-full shadow-glow-pink"
                  />
                )}
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <Sheet>
            <SheetTrigger
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/70 md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="glass border-l-0">
              <SheetTitle className="font-display text-2xl">
                <span className="text-gradient">Menu</span>
              </SheetTitle>
              <ul className="mt-8 flex flex-col gap-2">
                {NAV_ITEMS.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <SheetClose asChild>
                      <a
                        href={`#${item.id}`}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3 font-display text-xl font-semibold transition-colors",
                          active === item.id ? "bg-candy text-white" : "hover:bg-muted"
                        )}
                      >
                        {item.label}
                        <span className="font-mono text-xs opacity-60">0{i + 1}</span>
                      </a>
                    </SheetClose>
                  </motion.li>
                ))}
              </ul>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </motion.header>
  );
};

export default Navbar;
