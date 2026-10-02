import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { ArrowUp } from "lucide-react";

/** Floating "back to top" button whose ring fills with scroll progress. Appears after the hero. */
const BackToTop = () => {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const [show, setShow] = useState(false);

  // Appears once you're past the hero (the intro sits above it)
  useMotionValueEvent(scrollY, "change", (y) => {
    const heroTop = document.getElementById("home")?.offsetTop ?? 0;
    setShow(y > heroTop + window.innerHeight * 0.9);
  });

  return (
    <AnimatePresence>
      {show && (
        <motion.a
          href="#home"
          aria-label="Back to top"
          initial={{ opacity: 0, scale: 0.4, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.4, y: 20 }}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="group fixed bottom-5 right-4 z-[65] flex h-12 w-12 items-center justify-center rounded-full sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 [html.menu-open_&]:pointer-events-none [html.menu-open_&]:opacity-0"
        >
          <span className="glass absolute inset-0 rounded-full shadow-[0_10px_30px_-10px_hsl(var(--brand-1)/0.6)]" />
          <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
            <circle cx="24" cy="24" r="21" fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
            <motion.circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              stroke="hsl(var(--brand-1))"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ pathLength: progress }}
            />
          </svg>
          <ArrowUp className="relative h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
        </motion.a>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
