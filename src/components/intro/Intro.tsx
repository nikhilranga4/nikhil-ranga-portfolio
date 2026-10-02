import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ChevronsDown, SkipForward } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useIntro } from "@/lib/intro";
import { lenisRef } from "@/lib/lenis";
import { cn } from "@/lib/utils";
import IntroLite from "./IntroLite";
import { STEPS, phase, stepAt } from "./timeline";

const loadScene = () => import("./IntroScene");
const IntroScene = lazy(loadScene);

/** How long the 3D chunk may take before we switch to the lite intro for this visit. */
const SCENE_TIMEOUT_MS = 8000;

type Mode = "3d" | "lite";

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Pick the 3D intro only when the device and connection can comfortably handle it. */
function pickMode(): Mode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "lite";
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (connection?.saveData) return "lite";
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return "lite";
  return hasWebGL() ? "3d" : "lite";
}

/** Fade out and remove the HTML boot shell from index.html. */
function hideBootShell() {
  const el = document.getElementById("boot");
  if (!el || el.dataset.hiding) return;
  el.dataset.hiding = "true";
  el.classList.add("boot-hide");
  window.setTimeout(() => el.remove(), 700);
}

/** Warm up the heavier chunks the page needs after the intro, without competing with it. */
function prefetchSite() {
  const run = () => {
    void import("@/components/three/HeroScene");
    void import("@/components/three/Stage3D");
  };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 800);
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const RailStep = ({ index, progress }: { index: number; progress: MotionValue<number> }) => {
  const fill = useTransform(progress, (p) => phase(p, STEPS[index].phase));
  return (
    <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-foreground/15">
      <motion.span className="bg-candy absolute inset-0 origin-left rounded-full" style={{ scaleX: fill }} />
    </span>
  );
};

/**
 * The scroll-driven intro: a pinned stage at the top of the page. Scrolling down types the 3D
 * name in, connects to a server, gets a 200 OK, deploys to a desktop and flies into its screen,
 * which hands over to the real hero sitting right underneath. Scrolling up rewinds it all.
 */
const Intro = () => {
  const { progress, finish } = useIntro();
  const { colors, palette } = useTheme();
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>(pickMode);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [step, setStep] = useState(0);
  const reduced = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches).current;

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    progress.set(p);
    setStep(stepAt(p));
    if (p > 0.97) finish();
  });

  const stageOpacity = useTransform(scrollYProgress, [0.92, 1], [1, 0]);
  const stagePointer = useTransform(scrollYProgress, (p) => (p > 0.97 ? "none" : "auto"));
  const hintOpacity = useTransform(scrollYProgress, [0, 0.04], [1, 0]);

  // Always start at the top (unless a section was linked directly, which skips the intro)
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const hash = window.location.hash;
    const target = hash && hash !== "#intro" ? document.querySelector<HTMLElement>(hash) : null;
    if (target) {
      finish();
      const jump = () => {
        const y = target.getBoundingClientRect().top + window.scrollY - (hash === "#home" ? 0 : 90);
        if (lenisRef.current) lenisRef.current.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      };
      window.setTimeout(jump, 60);
      window.setTimeout(jump, 600);
    } else {
      window.scrollTo(0, 0);
    }
    progress.set(scrollYProgress.get());
  }, [finish, progress, scrollYProgress]);

  // Pause the 3D while the intro is off-screen
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The lite intro is ready as soon as it renders; the 3D one when its first frame is drawn.
  // If the 3D chunk is slow (bad network) fall back instead of leaving the visitor waiting.
  useEffect(() => {
    if (mode === "lite") {
      setReady(true);
      return;
    }
    const timer = window.setTimeout(() => setMode((m) => (ready ? m : "lite")), SCENE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [mode, ready]);

  useEffect(() => {
    if (!ready) return;
    hideBootShell();
    prefetchSite();
  }, [ready]);

  const skip = () => {
    finish();
    const hero = document.getElementById("home");
    if (!hero) return;
    const y = hero.getBoundingClientRect().top + window.scrollY;
    if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      id="intro"
      aria-label="Intro"
      className={cn("relative z-30", reduced ? "h-[260svh]" : "h-[460svh] lg:h-[520vh]")}
    >
      <motion.div
        style={{ opacity: stageOpacity, pointerEvents: stagePointer }}
        className="sticky top-0 h-[100svh] overflow-hidden bg-background"
      >
        {/* Backdrop */}
        <div aria-hidden className="grid-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-1/15 blur-3xl" />

        {mode === "3d" ? (
          <SceneBoundary onError={() => setMode("lite")}>
            <Suspense fallback={null}>
              <div className="absolute inset-0">
                <IntroScene progress={progress} colors={colors} palette={palette} active={active} onReady={() => setReady(true)} />
              </div>
            </Suspense>
          </SceneBoundary>
        ) : (
          <IntroLite progress={progress} />
        )}

        {/* Top bar: brand and skip */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
          <span className="chip text-muted-foreground">
            <span className="text-brand-1">~/</span>nikhil.dev
          </span>
          <button
            type="button"
            onClick={skip}
            className="chip group cursor-pointer text-foreground transition-colors hover:border-brand-1 hover:text-brand-1"
          >
            Skip intro
            <SkipForward className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Caption and progress rail */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-8">
          <motion.div style={{ opacity: hintOpacity }} className="flex flex-col items-center gap-1 text-muted-foreground">
            <span className="font-mono text-xs uppercase tracking-[0.25em]">scroll to boot</span>
            <ChevronsDown className="h-5 w-5 animate-bounce text-brand-1" />
          </motion.div>
          <p className="glass rounded-full px-4 py-1.5 font-mono text-xs text-foreground sm:text-sm">
            <span className="text-brand-2">{step === 2 ? "✓" : ">"}</span> {STEPS[step].caption}
          </p>
          <div className="flex w-[min(22rem,100%)] items-center gap-1.5">
            {STEPS.map((s, i) => (
              <RailStep key={s.phase} index={i} progress={progress} />
            ))}
          </div>
          <div className="flex w-[min(22rem,100%)] justify-between font-mono text-[0.6rem] uppercase tracking-widest text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s.phase} className={cn(i === step && "text-foreground")}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Intro;
