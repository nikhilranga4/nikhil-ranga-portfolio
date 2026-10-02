import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMotionValue, useReducedMotion } from "framer-motion";
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
import Intro from "@/components/intro/Intro";
import { IntroContext } from "@/lib/intro";
import ScrollProgress from "@/components/ScrollProgress";
import CustomCursor from "@/components/CustomCursor";
import SmoothScroll from "@/components/SmoothScroll";
import BackToTop from "@/components/BackToTop";

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

const Index = () => {
  const [introDone, setIntroDone] = useState(false);
  const [settled, setSettled] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const introProgress = useMotionValue(0);
  const intro = useMemo(
    () => ({ done: introDone, settled, finish: finishIntro, progress: introProgress }),
    [introDone, settled, finishIntro, introProgress]
  );

  // Start the heavier 3D (hero keycaps, cursor, robot) once the hand-off has finished animating
  useEffect(() => {
    if (!introDone) return;
    const start = () => setSettled(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 600);
    return () => clearTimeout(id);
  }, [introDone]);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <IntroContext.Provider value={intro}>
        <SmoothScroll>
          <div className="relative min-h-screen overflow-x-clip bg-background text-foreground">
            <Background />
            <ScrollProgress />
            <CustomCursor />
            {/* The 3D cursor and robot wait until the intro is over so nothing competes with it */}
            {settled && <GlobalStage />}
            <Navbar />
            <BackToTop />

            <main className="relative z-10">
              <Intro />
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
    </ThemeProvider>
  );
};

export default Index;
