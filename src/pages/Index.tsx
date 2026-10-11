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
import Background from "@/components/Background";
import FloatingShapes from "@/components/FloatingShapes";
import GitHubContributions from "@/components/GitHubContributions";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import SmoothScroll from "@/components/SmoothScroll";
import BackToTop from "@/components/BackToTop";
import { IntroContext } from "@/lib/intro";
import { lenisRef } from "@/lib/lenis";

const Stage3D = lazy(() => import("@/components/three/Stage3D"));

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

/** Global 3D overlay: the 3D cursor (mouse users) and the scroll-guide robot. */
const GlobalStage = () => {
  const { colors, buddy } = useTheme();
  const reduceMotion = !!useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    setFinePointer(window.matchMedia("(pointer: fine)").matches);
  }, []);

  const cursor = finePointer && !reduceMotion;
  if (!cursor && !buddy) return null;

  return (
    <SilentBoundary>
      <Suspense fallback={null}>
        <Stage3D colors={colors} cursor={cursor} robot={buddy} reduceMotion={reduceMotion} />
      </Suspense>
    </SilentBoundary>
  );
};

/**
 * Resolves once the page mounted underneath the loader has settled: the hero's 3D scene has
 * compiled its shaders and drawn, and a couple of frames have gone by since. Falls back after a
 * few seconds so a slow device (or no WebGL) never leaves the intro stuck.
 */
function useSettled(mounted: boolean, sceneReady: boolean) {
  const [settled, setSettled] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const timer = window.setTimeout(() => setTimedOut(true), 3500);
    return () => window.clearTimeout(timer);
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !sceneReady) return;
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
  }, [mounted, sceneReady]);

  return settled || timedOut;
}

const Index = () => {
  // The site mounts underneath the loader as the last key is typed, and the loader only wipes away
  // once the intro has finished AND the site has settled, so the wipe never stutters.
  const [siteMounted, setSiteMounted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const settled = useSettled(siteMounted, sceneReady);
  const loading = !(introDone && settled);
  const handleReady = useCallback(() => setSiteMounted(true), []);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const intro = useMemo(() => ({ revealed: !loading, sceneReady: handleSceneReady }), [loading, handleSceneReady]);
  const handleDone = useCallback(() => {
    setSiteMounted(true);
    setIntroDone(true);
  }, []);

  // No scrolling the hidden page while the loader covers it
  useEffect(() => {
    if (!loading) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [loading]);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (loading) {
      lenis?.stop();
      return;
    }
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true, force: true });
    lenis?.start();
  }, [loading, siteMounted]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AnimatePresence>{loading && <Loader onReady={handleReady} onDone={handleDone} />}</AnimatePresence>

      {siteMounted && (
        <IntroContext.Provider value={intro}>
          <SmoothScroll>
            <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
              <Background />
              <ScrollProgress />
              <CustomCursor />
              <GlobalStage />
              <Navbar />
              <BackToTop />

              <main className="relative z-10">
                <FloatingShapes />
                <Hero />
                <About />
                <Education />
                <Experience />
                <Skills />
                <Projects />
                <GitHubContributions />
              </main>
              <div className="relative z-10">
                <Footer />
              </div>
            </div>
          </SmoothScroll>
        </IntroContext.Provider>
      )}
    </ThemeProvider>
  );
};

export default Index;
