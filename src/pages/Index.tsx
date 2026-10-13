import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Skills from "@/components/Skills";
import Education from "@/components/Education";
import Experience from "@/components/Experience";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import Footer from "@/components/Footer";
import RideIn from "@/components/RideIn";
import GitHubContributions from "@/components/GitHubContributions";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import SmoothScroll from "@/components/SmoothScroll";
import BackToTop from "@/components/BackToTop";
import { IntroContext, useIntroRevealed, useIntroSceneReady } from "@/lib/intro";
import { lenisRef } from "@/lib/lenis";
import { setIntroActive, unlockAudio } from "@/lib/music";
import { heroProgress, setIntroStage, useIntroStage, type IntroStage } from "@/lib/hero-state";

/** Never hold the page longer than this, whatever happens to the 3D intro */
const INTRO_FAILSAFE_MS = 14000;

const Stage3D = lazy(() => import("@/components/three/Stage3D"));
// Start fetching the 3D world right away; the boot screen waits for it to compile
const worldImport = import("@/components/three/world/HeroWorld");
const HeroWorld = lazy(() => worldImport);

/** If WebGL fails for the overlay, just drop it — the page works fine without it. */
class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** If WebGL fails for the world, drop it and skip straight past the intro. */
class WorldBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
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

function usePortrait() {
  const query = "(max-aspect-ratio: 1/1)";
  const [portrait, setPortrait] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setPortrait(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return portrait;
}

/**
 * The page-wide 3D world, fixed behind everything: the hero's keyboard, door and room, the glass
 * floor breaking, and the free fall past the city that the sections drop through.
 */
const WorldLayer = () => {
  const { colors, resolvedMode } = useTheme();
  const reduceMotion = !!useReducedMotion();
  const revealed = useIntroRevealed();
  const sceneReady = useIntroSceneReady();
  const portrait = usePortrait();
  const onStage = useCallback((next: IntroStage) => setIntroStage(next), []);
  const onError = useCallback(() => {
    setIntroStage("done");
    sceneReady();
  }, [sceneReady]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <WorldBoundary onError={onError}>
        <Suspense fallback={null}>
          <HeroWorld
            progress={heroProgress}
            revealed={revealed}
            portrait={portrait}
            mode={resolvedMode === "light" ? "day" : "night"}
            reduceMotion={reduceMotion}
            colors={colors}
            onReady={sceneReady}
            onStage={onStage}
          />
        </Suspense>
      </WorldBoundary>
      {/* Vignette (CSS: cheaper than a post-processing pass); softer over the day sky */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_52%,rgb(2_8_9/0.4))] dark:bg-[radial-gradient(ellipse_at_center,transparent_48%,rgb(2_8_9/0.72))]" />
    </div>
  );
};

/** Global 3D overlay: the 3D cursor (mouse users) and the scroll-guide robot. */
const GlobalStage = () => {
  const { colors, buddy } = useTheme();
  const reduceMotion = !!useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  // Started a moment after the hero's intro has played, while the browser is idle, so its
  // one-off setup never competes with the boot, the intro or a moving frame
  const introDone = useIntroStage() === "done";
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setFinePointer(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!introDone || started) return;
    let idle = 0;
    const timer = window.setTimeout(() => {
      const start = () => setStarted(true);
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(start, { timeout: 2000 });
      else start();
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [introDone, started]);

  const cursor = finePointer && !reduceMotion;
  if (!started || (!cursor && !buddy)) return null;

  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <Stage3D colors={colors} cursor={cursor} robot={buddy} reduceMotion={reduceMotion} />
      </Suspense>
    </SilentBoundary>
  );
};

/**
 * Resolves once the hero's 3D world has compiled its shaders and drawn, and a couple of frames
 * have gone by since. Falls back after a few seconds so a slow device (or no WebGL) never leaves
 * the boot screen stuck.
 */
function useSettled(sceneReady: boolean) {
  const [settled, setSettled] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 9000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sceneReady) return;
    let raf = 0;
    let timer = 0;
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        timer = window.setTimeout(() => setSettled(true), 150);
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [sceneReady]);

  return settled || timedOut;
}

/**
 * Holds scrolling while the boot screen or the 3D intro plays, and keeps offering sound during
 * it. Lives in its own component so intro stage changes re-render only this, not the whole page.
 * Rendered after <SmoothScroll> so Lenis exists by the time its effects run.
 */
const IntroLock = ({ loading }: { loading: boolean }) => {
  const stage = useIntroStage();
  const [failsafe, setFailsafe] = useState(false);
  const introPlaying = !failsafe && stage !== "done";
  const locked = loading || introPlaying;

  useEffect(() => {
    const timer = window.setTimeout(() => setFailsafe(true), INTRO_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [locked]);

  // The intro's key clicks need audio: try now, and unlock on the first key press / tap
  useEffect(() => {
    if (!introPlaying) {
      setIntroActive(false);
      return;
    }
    unlockAudio();
    const onGesture = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === "Escape" || e.metaKey || e.ctrlKey)) return;
      unlockAudio();
    };
    const gestures = ["keydown", "pointerdown", "touchend"] as const;
    gestures.forEach((g) => window.addEventListener(g, onGesture, { capture: true, passive: true }));
    return () => gestures.forEach((g) => window.removeEventListener(g, onGesture, { capture: true }));
  }, [introPlaying]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (locked) {
      lenis?.stop();
      return;
    }
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
    lenis?.start();
  }, [locked]);

  return null;
};

const Index = () => {
  // The site mounts straight away under a short boot screen; once the hero's 3D world has compiled,
  // the boot screen fades and the world plays its keyboard intro. Scrolling waits for that intro.
  const [booted, setBooted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const settled = useSettled(sceneReady);
  const loading = !booted;
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleBooted = useCallback(() => setBooted(true), []);
  const intro = useMemo(() => ({ revealed: booted, sceneReady: handleSceneReady }), [booted, handleSceneReady]);
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AnimatePresence>{loading && <Loader ready={settled} onDone={handleBooted} />}</AnimatePresence>

      <IntroContext.Provider value={intro}>
          <SmoothScroll>
            <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
              <WorldLayer />
              <ScrollProgress />
              <CustomCursor />
              <GlobalStage />
              <Navbar />
              <BackToTop />

              <main className="relative z-10">
                <Hero />
                {/* The drop to the road; then each section rides in on a truck in the convoy */}
                <div aria-hidden className="h-[85svh]" />
                <RideIn index={0}>
                  <About />
                </RideIn>
                <RideIn index={1}>
                  <Education />
                </RideIn>
                <RideIn index={2}>
                  <Experience />
                </RideIn>
                <RideIn index={3}>
                  <Skills />
                </RideIn>
                <RideIn index={4}>
                  <Projects />
                </RideIn>
                <RideIn index={5}>
                  <GitHubContributions />
                </RideIn>
              </main>
              <div className="relative z-10 pb-[18vh]">
                <RideIn index={6}>
                  <Footer />
                </RideIn>
              </div>
            </div>
          </SmoothScroll>
        </IntroContext.Provider>
      <IntroLock loading={loading} />
    </ThemeProvider>
  );
};

export default Index;
