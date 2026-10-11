import { useEffect, type ReactNode } from "react";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";

/**
 * Buttery inertia scrolling via Lenis. Also routes every in-page `#anchor` link through Lenis so
 * navigation glides instead of jumping. Disabled for people who prefer reduced motion.
 */
const SmoothScroll = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenisRef.current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const link = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      const hash = link?.getAttribute("href");
      if (!link || !hash || hash === "#") return;
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) return;
      e.preventDefault();
      const go = () => lenis.scrollTo(hash === "#home" ? 0 : target, { offset: -90, duration: 1.4 });
      // Links inside the mobile sheet: wait for it to close and release its scroll lock
      if (link.closest('[role="dialog"]')) setTimeout(go, 350);
      else go();
      history.replaceState(null, "", hash);
    };
    // Capture phase so it runs before Radix closes the mobile sheet and unmounts the link
    document.addEventListener("click", onClick, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("click", onClick, true);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
};

export default SmoothScroll;
